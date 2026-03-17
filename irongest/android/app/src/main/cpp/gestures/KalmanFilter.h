/**
 * IronGest - Kalman Filter Implementation
 * Production-grade 2D Kalman filter for cursor position smoothing
 * 
 * This is a custom implementation - NOT a library
 * Implements constant velocity model with adaptive process noise
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

#ifndef KALMAN_FILTER_H
#define KALMAN_FILTER_H

#include <array>
#include <cmath>
#include "GestureTypes.h"

namespace irongest {
namespace gestures {

/**
 * 2D Kalman Filter for Cursor Smoothing
 * 
 * State Vector: [x, y, vx, vy] (position and velocity)
 * 
 * State Transition Model (constant velocity):
 *   x(k+1) = x(k) + vx(k) * dt
 *   y(k+1) = y(k) + vy(k) * dt
 *   vx(k+1) = vx(k)
 *   vy(k+1) = vy(k)
 * 
 * This provides smooth, jitter-free cursor movement while
 * maintaining responsiveness to actual hand movements.
 */
class KalmanFilter2D {
public:
    /**
     * Default constructor with optimal default parameters
     */
    KalmanFilter2D() {
        reset();
    }
    
    /**
     * Constructor with custom noise parameters
     * @param processNoise Process noise covariance (model uncertainty)
     * @param measurementNoise Measurement noise covariance (sensor noise)
     */
    KalmanFilter2D(float processNoise, float measurementNoise)
        : m_processNoise(processNoise)
        , m_measurementNoise(measurementNoise)
        , m_adaptiveProcessNoise(processNoise)
    {
        reset();
    }
    
    /**
     * Reset filter to initial state
     */
    void reset() {
        // State vector [x, y, vx, vy]
        m_state.fill(0.0f);
        
        // State covariance matrix (4x4, flattened row-major)
        // Initial uncertainty is high for position, unknown for velocity
        m_covariance = {
            1.0f,  0.0f,  0.0f,  0.0f,
            0.0f,  1.0f,  0.0f,  0.0f,
            0.0f,  0.0f,  10.0f, 0.0f,
            0.0f,  0.0f,  0.0f,  10.0f
        };
        
        m_initialized = false;
        m_lastTimestampNs = 0;
        m_lastVelocityMag = 0.0f;
    }
    
    /**
     * Update filter with new measurement
     * @param measuredX Measured X position (normalized or pixels)
     * @param measuredY Measured Y position (normalized or pixels)
     * @param timestampNs Measurement timestamp in nanoseconds
     * @return Smoothed position
     */
    Point update(float measuredX, float measuredY, uint64_t timestampNs) {
        if (!m_initialized) {
            // Initialize with first measurement
            m_state[0] = measuredX;
            m_state[1] = measuredY;
            m_state[2] = 0.0f;  // Unknown initial velocity
            m_state[3] = 0.0f;
            m_initialized = true;
            m_lastTimestampNs = timestampNs;
            return Point(m_state[0], m_state[1]);
        }
        
        // Calculate time delta
        float dt = static_cast<float>(timestampNs - m_lastTimestampNs) / 1e9f;
        m_lastTimestampNs = timestampNs;
        
        // Clamp dt to prevent numerical instability
        dt = std::clamp(dt, 0.001f, 0.1f);
        
        // Predict step
        predict(dt);
        
        // Update step with measurement
        updateWithMeasurement(measuredX, measuredY);
        
        return Point(m_state[0], m_state[1]);
    }
    
    /**
     * Get current filtered position
     */
    Point getPosition() const {
        return Point(m_state[0], m_state[1]);
    }
    
    /**
     * Get current velocity estimate
     */
    Point getVelocity() const {
        return Point(m_state[2], m_state[3]);
    }
    
    /**
     * Get position uncertainty (standard deviation)
     */
    Point getPositionUncertainty() const {
        return Point(
            std::sqrt(std::max(0.0f, m_covariance[0])),
            std::sqrt(std::max(0.0f, m_covariance[5]))
        );
    }
    
    /**
     * Get velocity uncertainty (standard deviation)
     */
    Point getVelocityUncertainty() const {
        return Point(
            std::sqrt(std::max(0.0f, m_covariance[10])),
            std::sqrt(std::max(0.0f, m_covariance[15]))
        );
    }
    
    /**
     * Set adaptive process noise based on movement speed
     * This makes the filter more responsive during fast movements
     * and smoother during slow movements
     */
    void setAdaptiveNoise(float velocityMagnitude) {
        // Exponential moving average of velocity
        m_lastVelocityMag = m_lastVelocityMag * 0.7f + velocityMagnitude * 0.3f;
        
        // Adaptive noise: increase with velocity
        float adaptiveFactor = 1.0f + m_lastVelocityMag * 3.0f;
        m_adaptiveProcessNoise = m_processNoise * adaptiveFactor;
    }
    
    /**
     * Force position update (for jumps/teleports)
     */
    void forcePosition(float x, float y) {
        m_state[0] = x;
        m_state[1] = y;
        // Reset velocity uncertainty for quick adaptation
        m_covariance[10] = 10.0f;
        m_covariance[15] = 10.0f;
    }
    
    /**
     * Set process noise (affects smoothness vs responsiveness)
     */
    void setProcessNoise(float noise) {
        m_processNoise = noise;
        m_adaptiveProcessNoise = noise;
    }
    
    /**
     * Set measurement noise (affects trust in measurements)
     */
    void setMeasurementNoise(float noise) {
        m_measurementNoise = noise;
    }
    
    /**
     * Check if filter is initialized
     */
    bool isInitialized() const { return m_initialized; }
    
    /**
     * Get velocity confidence (how certain we are about velocity estimate)
     */
    float getVelocityConfidence() const {
        float velocityVariance = m_covariance[10] + m_covariance[15];
        return 1.0f / (1.0f + velocityVariance * 0.1f);
    }

private:
    /**
     * Predict step: Project state forward using motion model
     * 
     * x' = F * x  (state prediction)
     * P' = F * P * F^T + Q  (covariance prediction)
     */
    void predict(float dt) {
        // State transition matrix F (4x4):
        // [1, 0, dt, 0 ]
        // [0, 1, 0,  dt]
        // [0, 0, 1,  0 ]
        // [0, 0, 0,  1 ]
        
        // Predict state: x = F * x
        m_state[0] += m_state[2] * dt;  // x = x + vx * dt
        m_state[1] += m_state[3] * dt;  // y = y + vy * dt
        // Velocity remains constant in this model
        
        // Predict covariance: P = F * P * F^T + Q
        // We compute this efficiently using the structure of F
        
        float dt2 = dt * dt;
        float dt3 = dt2 * dt;
        float dt4 = dt3 * dt;
        
        // Process noise covariance Q
        float q = m_adaptiveProcessNoise;
        float qdt4 = q * dt4 / 4.0f;
        float qdt3 = q * dt3 / 2.0f;
        float qdt2 = q * dt2;
        
        // Compute F * P (taking advantage of F's structure)
        std::array<float, 16> FP = {
            m_covariance[0] + dt * m_covariance[8],
            m_covariance[1] + dt * m_covariance[9],
            m_covariance[2] + dt * m_covariance[10],
            m_covariance[3] + dt * m_covariance[11],
            
            m_covariance[4] + dt * m_covariance[12],
            m_covariance[5] + dt * m_covariance[13],
            m_covariance[6] + dt * m_covariance[14],
            m_covariance[7] + dt * m_covariance[15],
            
            m_covariance[8],
            m_covariance[9],
            m_covariance[10],
            m_covariance[11],
            
            m_covariance[12],
            m_covariance[13],
            m_covariance[14],
            m_covariance[15]
        };
        
        // Compute (F * P) * F^T + Q
        m_covariance[0] = FP[0] + dt * FP[2] + qdt4;
        m_covariance[1] = FP[1] + dt * FP[3];
        m_covariance[2] = FP[2] + qdt3;
        m_covariance[3] = FP[3];
        
        m_covariance[4] = FP[4] + dt * FP[6];
        m_covariance[5] = FP[5] + dt * FP[7] + qdt4;
        m_covariance[6] = FP[6];
        m_covariance[7] = FP[7] + qdt3;
        
        m_covariance[8] = FP[8] + dt * FP[10] + qdt3;
        m_covariance[9] = FP[9] + dt * FP[11];
        m_covariance[10] = FP[10] + qdt2;
        m_covariance[11] = FP[11];
        
        m_covariance[12] = FP[12] + dt * FP[14];
        m_covariance[13] = FP[13] + dt * FP[15] + qdt3;
        m_covariance[14] = FP[14];
        m_covariance[15] = FP[15] + qdt2;
    }
    
    /**
     * Update step: Incorporate measurement
     * 
     * K = P * H^T * (H * P * H^T + R)^-1  (Kalman gain)
     * x = x + K * (z - H * x)            (state update)
     * P = (I - K * H) * P                (covariance update)
     */
    void updateWithMeasurement(float measuredX, float measuredY) {
        // Measurement matrix H (2x4):
        // We only measure position, not velocity
        // [1, 0, 0, 0]
        // [0, 1, 0, 0]
        
        // Innovation (measurement residual): y = z - H*x
        float y0 = measuredX - m_state[0];
        float y1 = measuredY - m_state[1];
        
        // Innovation covariance: S = H * P * H^T + R
        float S00 = m_covariance[0] + m_measurementNoise;
        float S01 = m_covariance[1];
        float S10 = m_covariance[4];
        float S11 = m_covariance[5] + m_measurementNoise;
        
        // Inverse of S (2x2)
        float detS = S00 * S11 - S01 * S10;
        if (std::abs(detS) < 1e-10f) {
            // Singular matrix, skip update
            return;
        }
        
        float invDet = 1.0f / detS;
        float Sinv00 = S11 * invDet;
        float Sinv01 = -S01 * invDet;
        float Sinv10 = -S10 * invDet;
        float Sinv11 = S00 * invDet;
        
        // Kalman gain: K = P * H^T * S^-1 (4x2)
        // Since H only picks position, K = [P(0,:); P(1,:)] * S^-1
        std::array<float, 8> K;
        K[0] = m_covariance[0] * Sinv00 + m_covariance[1] * Sinv10;
        K[1] = m_covariance[0] * Sinv01 + m_covariance[1] * Sinv11;
        K[2] = m_covariance[4] * Sinv00 + m_covariance[5] * Sinv10;
        K[3] = m_covariance[4] * Sinv01 + m_covariance[5] * Sinv11;
        K[4] = m_covariance[8] * Sinv00 + m_covariance[9] * Sinv10;
        K[5] = m_covariance[8] * Sinv01 + m_covariance[9] * Sinv11;
        K[6] = m_covariance[12] * Sinv00 + m_covariance[13] * Sinv10;
        K[7] = m_covariance[12] * Sinv01 + m_covariance[13] * Sinv11;
        
        // State update: x = x + K * y
        m_state[0] += K[0] * y0 + K[1] * y1;
        m_state[1] += K[2] * y0 + K[3] * y1;
        m_state[2] += K[4] * y0 + K[5] * y1;
        m_state[3] += K[6] * y0 + K[7] * y1;
        
        // Covariance update: P = (I - K * H) * P
        // This is the Joseph form for numerical stability
        float KH00 = K[0], KH01 = K[1];
        float KH10 = K[2], KH11 = K[3];
        float KH20 = K[4], KH21 = K[5];
        float KH30 = K[6], KH31 = K[7];
        
        std::array<float, 16> Pnew;
        Pnew[0] = (1.0f - KH00) * m_covariance[0] - KH01 * m_covariance[4];
        Pnew[1] = (1.0f - KH00) * m_covariance[1] - KH01 * m_covariance[5];
        Pnew[2] = (1.0f - KH00) * m_covariance[2] - KH01 * m_covariance[6];
        Pnew[3] = (1.0f - KH00) * m_covariance[3] - KH01 * m_covariance[7];
        
        Pnew[4] = -KH10 * m_covariance[0] + (1.0f - KH11) * m_covariance[4];
        Pnew[5] = -KH10 * m_covariance[1] + (1.0f - KH11) * m_covariance[5];
        Pnew[6] = -KH10 * m_covariance[2] + (1.0f - KH11) * m_covariance[6];
        Pnew[7] = -KH10 * m_covariance[3] + (1.0f - KH11) * m_covariance[7];
        
        Pnew[8] = -KH20 * m_covariance[0] - KH21 * m_covariance[4] + m_covariance[8];
        Pnew[9] = -KH20 * m_covariance[1] - KH21 * m_covariance[5] + m_covariance[9];
        Pnew[10] = -KH20 * m_covariance[2] - KH21 * m_covariance[6] + m_covariance[10];
        Pnew[11] = -KH20 * m_covariance[3] - KH21 * m_covariance[7] + m_covariance[11];
        
        Pnew[12] = -KH30 * m_covariance[0] - KH31 * m_covariance[4] + m_covariance[12];
        Pnew[13] = -KH30 * m_covariance[1] - KH31 * m_covariance[5] + m_covariance[13];
        Pnew[14] = -KH30 * m_covariance[2] - KH31 * m_covariance[6] + m_covariance[14];
        Pnew[15] = -KH30 * m_covariance[3] - KH31 * m_covariance[7] + m_covariance[15];
        
        m_covariance = Pnew;
    }

private:
    // State vector: [x, y, vx, vy]
    std::array<float, 4> m_state;
    
    // State covariance matrix (4x4, flattened row-major)
    std::array<float, 16> m_covariance;
    
    // Filter parameters
    float m_processNoise = 0.02f;       // Process noise covariance
    float m_measurementNoise = 0.05f;   // Measurement noise covariance
    float m_adaptiveProcessNoise = 0.02f;
    
    // State tracking
    bool m_initialized = false;
    uint64_t m_lastTimestampNs = 0;
    float m_lastVelocityMag = 0.0f;
};

/**
 * Exponential Moving Average (EMA) Smoother
 * Alternative smoothing for comparison or simpler use cases
 */
class EMASmoother {
public:
    explicit EMASmoother(float alpha = 0.2f) 
        : m_alpha(alpha)
        , m_initialized(false)
    {}
    
    Point smooth(const Point& input) {
        if (!m_initialized) {
            m_value = input;
            m_initialized = true;
            return input;
        }
        
        m_value.x = m_value.x + m_alpha * (input.x - m_value.x);
        m_value.y = m_value.y + m_alpha * (input.y - m_value.y);
        
        return m_value;
    }
    
    void reset() {
        m_initialized = false;
        m_value = Point();
    }
    
    void setAlpha(float alpha) {
        m_alpha = std::clamp(alpha, 0.01f, 1.0f);
    }
    
private:
    float m_alpha;
    bool m_initialized;
    Point m_value;
};

/**
 * Double Exponential Smoothing (Holt-Winters)
 * Better for tracking moving targets with velocity estimation
 */
class DoubleExponentialSmoother {
public:
    DoubleExponentialSmoother(float alpha = 0.3f, float beta = 0.1f)
        : m_alpha(alpha)
        , m_beta(beta)
        , m_initialized(false)
    {}
    
    Point smooth(const Point& input) {
        if (!m_initialized) {
            m_level = input;
            m_trend = Point();
            m_initialized = true;
            return input;
        }
        
        Point newLevel(
            m_alpha * input.x + (1.0f - m_alpha) * (m_level.x + m_trend.x),
            m_alpha * input.y + (1.0f - m_beta) * (m_level.y + m_trend.y)
        );
        
        m_trend = Point(
            m_beta * (newLevel.x - m_level.x) + (1.0f - m_beta) * m_trend.x,
            m_beta * (newLevel.y - m_level.y) + (1.0f - m_beta) * m_trend.y
        );
        
        m_level = newLevel;
        return m_level;
    }
    
    Point predict(int stepsAhead = 1) const {
        return Point(
            m_level.x + stepsAhead * m_trend.x,
            m_level.y + stepsAhead * m_trend.y
        );
    }
    
    void reset() {
        m_initialized = false;
        m_level = Point();
        m_trend = Point();
    }
    
private:
    float m_alpha;
    float m_beta;
    bool m_initialized;
    Point m_level;
    Point m_trend;
};

} // namespace gestures
} // namespace irongest

#endif // KALMAN_FILTER_H
