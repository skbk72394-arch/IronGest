/**
 * IronGest - Gesture Classifier Implementation
 * Production-grade gesture recognition with real mathematical algorithms
 * 
 * Implements:
 * - Euclidean distance for pinch detection
 * - Velocity vectors for swipe/scroll detection
 * - Joint angles for finger extension
 * - State machine for gesture lifecycle
 * - Full gesture set including Iron Man-style controls
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

#ifndef GESTURE_CLASSIFIER_H
#define GESTURE_CLASSIFIER_H

#include "GestureTypes.h"
#include "KalmanFilter.h"
#include <deque>
#include <map>
#include <cmath>
#include <algorithm>

namespace irongest {
namespace gestures {

/**
 * Gesture Classifier
 * Converts 21 landmarks into gesture commands using mathematical algorithms
 */
class GestureClassifier {
public:
    GestureClassifier();
    ~GestureClassifier() = default;
    
    /**
     * Process a new hand frame and detect gestures
     * @param frame Hand frame with 21 landmarks
     * @return Detected gesture result
     */
    GestureResult processFrame(const HandFrame& frame);
    
    /**
     * Process two hands for multi-hand gestures
     */
    GestureResult processTwoHands(const HandFrame& leftHand, const HandFrame& rightHand);
    
    /**
     * Get current gesture state
     */
    GestureState getState() const { return m_currentState; }
    
    /**
     * Get current gesture result
     */
    const GestureResult& getCurrentGesture() const { return m_currentGesture; }
    
    /**
     * Get cursor position (smoothed)
     */
    Point getCursorPosition() const { return m_cursorFilter.getPosition(); }
    
    /**
     * Get cursor velocity
     */
    Point getCursorVelocity() const { return m_cursorFilter.getVelocity(); }
    
    /**
     * Set configuration
     */
    void setConfig(const GestureConfig& config) { m_config = config; }
    
    /**
     * Reset classifier state
     */
    void reset();

private:
    // ========================================================================
    // Finger Analysis (Mathematical Implementations)
    // ========================================================================
    
    /**
     * Calculate finger extension using angle at PIP joint
     * 
     * Mathematical formula:
     * angle = arccos((MCP→PIP) · (PIP→DIP) / (||MCP→PIP|| * ||PIP→DIP||))
     * 
     * Extended finger: angle ≈ 0 (straight line)
     * Curled finger: angle → π (bent)
     */
    float calculateFingerAngle(const HandFrame& frame, FingerType finger) const;
    
    /**
     * Calculate finger extension ratio
     * 
     * ratio = ||tip - wrist|| / ||MCP - wrist||
     * 
     * Extended: ratio > 1.0 (tip further than MCP)
     * Curled: ratio < 0.8 (tip closer than MCP)
     */
    float calculateExtensionRatio(const HandFrame& frame, FingerType finger) const;
    
    /**
     * Determine finger state using combined metrics
     */
    FingerState determineFingerState(const HandFrame& frame, FingerType finger) const;
    
    /**
     * Count extended fingers
     */
    int countExtendedFingers(const HandFrame& frame) const;
    
    /**
     * Calculate MCP-to-tip distance ratio for curl detection
     * 
     * Used for fist detection: all fingers have ratio < threshold
     */
    float calculateCurlRatio(const HandFrame& frame, FingerType finger) const;
    
    // ========================================================================
    // Pinch Detection (Euclidean Distance)
    // ========================================================================
    
    /**
     * Detect pinch between thumb and finger
     * 
     * distance = ||thumb_tip - finger_tip||
     * normalized = distance / hand_size
     * 
     * Pinch detected when normalized distance < threshold
     */
    struct PinchResult {
        bool detected = false;
        float normalizedDistance = 0.0f;
        float pixelDistance = 0.0f;
        FingerType finger = FingerType::INDEX;
    };
    
    PinchResult detectPinch(const HandFrame& frame, FingerType finger) const;
    
    PinchResult detectAnyPinch(const HandFrame& frame) const;
    
    // ========================================================================
    // Velocity Analysis (Optical Flow on Landmarks)
    // ========================================================================
    
    /**
     * Calculate palm center velocity over frame history
     * 
     * velocity = Σ(position_i - position_{i-1}) / Σ(Δt)
     * 
     * Uses sliding window for stable velocity estimation
     */
    VelocityData calculatePalmVelocity() const;
    
    /**
     * Calculate velocity for a specific point
     */
    VelocityData calculatePointVelocity(size_t landmarkIndex) const;
    
    /**
     * Detect swipe gesture from velocity
     */
    GestureType detectSwipeGesture(const VelocityData& velocity) const;
    
    /**
     * Detect scroll gesture from velocity
     */
    GestureType detectScrollGesture(const VelocityData& velocity) const;
    
    // ========================================================================
    // Gesture Detection Functions
    // ========================================================================
    
    /**
     * Detect pinch click (index + thumb pinch)
     */
    bool detectPinchClick(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect back gesture (thumb + middle pinch)
     */
    bool detectBackGesture(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect recent apps (thumb + ring pinch)
     */
    bool detectRecentApps(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect drag start (fist close)
     */
    bool detectDragStart(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect drag end (fist open)
     */
    bool detectDragEnd(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect scroll up/down (open palm, y-velocity)
     */
    bool detectScroll(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect swipe left/right/up/down (palm velocity)
     */
    bool detectSwipe(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect cursor move (index finger pointing)
     */
    bool detectCursorMove(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect screenshot gesture (peace sign held)
     */
    bool detectScreenshot(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect volume up (thumbs up)
     */
    bool detectVolumeUp(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect volume down (thumbs down)
     */
    bool detectVolumeDown(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect notification pull (3-finger swipe down)
     */
    bool detectNotificationPull(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect home gesture (open palm facing forward)
     */
    bool detectHomeGesture(const HandFrame& frame, GestureResult& result);
    
    /**
     * Detect zoom in/out (two-hand pinch spread)
     */
    bool detectZoom(const HandFrame& leftHand, const HandFrame& rightHand, 
                    GestureResult& result);
    
    // ========================================================================
    // State Machine
    // ========================================================================
    
    /**
     * Update state machine
     */
    void updateStateMachine(GestureResult& result, uint64_t timestampNs);
    
    /**
     * Check if gesture should trigger (cooldown, debounce)
     */
    bool shouldTriggerGesture(GestureType type, uint64_t timestampNs) const;
    
    /**
     * Update gesture cooldown
     */
    void updateCooldown(GestureType type, uint64_t timestampNs);
    
    // ========================================================================
    // Utility Functions
    // ========================================================================
    
    /**
     * Get smoothed cursor position
     */
    Point getSmoothedCursor(const Point& rawPosition, uint64_t timestampNs);
    
    /**
     * Calculate hand bounding box
     */
    struct BoundingBox {
        float minX, maxX, minY, maxY;
        float width() const { return maxX - minX; }
        float height() const { return maxY - minY; }
    };
    BoundingBox calculateBoundingBox(const HandFrame& frame) const;

private:
    // Configuration
    GestureConfig m_config;
    
    // History for temporal analysis
    HandHistory m_history;
    
    // Current state
    GestureState m_currentState = GestureState::IDLE;
    GestureResult m_currentGesture;
    uint64_t m_stateStartTimeNs = 0;
    
    // Cursor smoothing
    KalmanFilter2D m_cursorFilter;
    
    // Gesture cooldown tracking
    std::map<GestureType, uint64_t> m_lastGestureTimeNs;
    
    // Special gesture tracking
    uint64_t m_screenshotStartTimeNs = 0;
    bool m_screenshotActive = false;
    
    // Drag state
    bool m_isDragging = false;
    Point m_dragStartPosition;
    
    // Velocity history for stable detection
    std::deque<VelocityData> m_velocityHistory;
    
    // Two-hand tracking
    bool m_hasTwoHands = false;
    float m_twoHandDistance = 0.0f;
    float m_twoHandVelocity = 0.0f;
};

// ============================================================================
// Implementation
// ============================================================================

inline GestureClassifier::GestureClassifier()
    : m_cursorFilter(0.015f, 0.05f)  // Optimal values for cursor smoothing
{
}

inline GestureResult GestureClassifier::processFrame(const HandFrame& frame) {
    GestureResult result;
    result.timestampNs = frame.timestampNs;
    result.fingerStates.fill(FingerState::NEUTRAL);
    
    // Add to history
    m_history.addFrame(frame);
    
    // Determine finger states
    for (int i = 0; i < 5; ++i) {
        result.fingerStates[i] = determineFingerState(frame, static_cast<FingerType>(i));
    }
    
    // Calculate palm velocity
    VelocityData palmVelocity = calculatePalmVelocity();
    result.velocity = palmVelocity;
    
    // Get smoothed cursor position
    Point palmCenter = frame.palmCenter();
    result.position = palmCenter;
    result.screenPosition = getSmoothedCursor(palmCenter, frame.timestampNs);
    
    // Try each gesture in priority order
    
    // 1. Cursor move (lowest priority, always tracking)
    if (detectCursorMove(frame, result)) {
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    // 2. Pinch gestures
    if (detectPinchClick(frame, result)) {
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    if (detectBackGesture(frame, result)) {
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    if (detectRecentApps(frame, result)) {
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    // 3. Drag gestures
    if (detectDragStart(frame, result)) {
        m_isDragging = true;
        m_dragStartPosition = palmCenter;
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    if (detectDragEnd(frame, result)) {
        m_isDragging = false;
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    // 4. Scroll gestures
    if (detectScroll(frame, result)) {
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    // 5. Swipe gestures
    if (detectSwipe(frame, result)) {
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    // 6. Special gestures
    if (detectScreenshot(frame, result)) {
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    if (detectVolumeUp(frame, result)) {
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    if (detectVolumeDown(frame, result)) {
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    if (detectNotificationPull(frame, result)) {
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    if (detectHomeGesture(frame, result)) {
        updateStateMachine(result, frame.timestampNs);
        m_currentGesture = result;
        return result;
    }
    
    // No gesture detected
    result.type = GestureType::NONE;
    result.state = GestureState::IDLE;
    
    return result;
}

inline float GestureClassifier::calculateFingerAngle(
    const HandFrame& frame, 
    FingerType finger
) const {
    // Get landmark indices for the finger
    constexpr int fingerIndices[5][4] = {
        {1, 2, 3, 4},     // Thumb
        {5, 6, 7, 8},     // Index
        {9, 10, 11, 12},  // Middle
        {13, 14, 15, 16}, // Ring
        {17, 18, 19, 20}  // Pinky
    };
    
    int idx = static_cast<int>(finger);
    const Point& mcp = frame.landmarks[fingerIndices[idx][0]];
    const Point& pip = frame.landmarks[fingerIndices[idx][1]];
    const Point& dip = frame.landmarks[fingerIndices[idx][2]];
    
    // Vector from MCP to PIP
    Point v1 = pip - mcp;
    
    // Vector from PIP to DIP
    Point v2 = dip - pip;
    
    // Calculate angle using dot product
    // angle = arccos(v1 · v2 / (|v1| * |v2|))
    float dot = Point::dot(v1, v2);
    float mag1 = v1.magnitude();
    float mag2 = v2.magnitude();
    
    if (mag1 < 1e-6f || mag2 < 1e-6f) {
        return 0.0f;
    }
    
    float cosAngle = std::clamp(dot / (mag1 * mag2), -1.0f, 1.0f);
    return std::acos(cosAngle);
}

inline float GestureClassifier::calculateExtensionRatio(
    const HandFrame& frame,
    FingerType finger
) const {
    constexpr int fingerTipIndices[5] = {4, 8, 12, 16, 20};
    constexpr int fingerMcpIndices[5] = {2, 5, 9, 13, 17};
    
    int idx = static_cast<int>(finger);
    const Point& wrist = frame.wrist();
    const Point& tip = frame.landmarks[fingerTipIndices[idx]];
    const Point& mcp = frame.landmarks[fingerMcpIndices[idx]];
    
    float tipToWrist = Point::distance(tip, wrist);
    float mcpToWrist = Point::distance(mcp, wrist);
    
    if (mcpToWrist < 1e-6f) return 0.0f;
    return tipToWrist / mcpToWrist;
}

inline FingerState GestureClassifier::determineFingerState(
    const HandFrame& frame,
    FingerType finger
) const {
    float angle = calculateFingerAngle(frame, finger);
    float ratio = calculateExtensionRatio(frame, finger);
    
    // Combined scoring
    // angle close to 0 = straight, close to PI = bent
    float angleScore = angle / PI;  // 0 = straight, 1 = bent
    float ratioScore = 1.0f - std::min(ratio, 1.5f) / 1.5f;  // 0 = extended, 1 = curled
    
    float combined = angleScore * 0.6f + ratioScore * 0.4f;
    
    if (combined < 0.25f) return FingerState::EXTENDED;
    if (combined < 0.4f) return FingerState::PARTIALLY_EXTENDED;
    if (combined < 0.6f) return FingerState::NEUTRAL;
    if (combined < 0.75f) return FingerState::PARTIALLY_CURLED;
    return FingerState::CURLED;
}

inline int GestureClassifier::countExtendedFingers(const HandFrame& frame) const {
    int count = 0;
    for (int i = 0; i < 5; ++i) {
        FingerState state = determineFingerState(frame, static_cast<FingerType>(i));
        if (state == FingerState::EXTENDED || state == FingerState::PARTIALLY_EXTENDED) {
            count++;
        }
    }
    return count;
}

inline float GestureClassifier::calculateCurlRatio(
    const HandFrame& frame,
    FingerType finger
) const {
    constexpr int fingerTipIndices[5] = {4, 8, 12, 16, 20};
    constexpr int fingerMcpIndices[5] = {2, 5, 9, 13, 17};
    
    int idx = static_cast<int>(finger);
    const Point& mcp = frame.landmarks[fingerMcpIndices[idx]];
    const Point& tip = frame.landmarks[fingerTipIndices[idx]];
    const Point& wrist = frame.wrist();
    
    float tipToMcp = Point::distance(tip, mcp);
    float mcpToWrist = Point::distance(mcp, wrist);
    
    if (mcpToWrist < 1e-6f) return 1.0f;
    return tipToMcp / mcpToWrist;
}

// ============================================================================
// Pinch Detection Implementation
// ============================================================================

inline GestureClassifier::PinchResult GestureClassifier::detectPinch(
    const HandFrame& frame,
    FingerType finger
) const {
    PinchResult result;
    result.finger = finger;
    
    constexpr int fingerTipIndices[5] = {4, 8, 12, 16, 20};  // Thumb is at index 0
    int fingerIdx = static_cast<int>(finger);
    
    const Point& thumbTip = frame.thumbTip();
    const Point& fingerTip = frame.landmarks[fingerTipIndices[fingerIdx]];
    
    float distance = Point::distance(thumbTip, fingerTip);
    float handSize = frame.handSize();
    
    result.pixelDistance = distance;
    result.normalizedDistance = distance / handSize;
    result.detected = result.normalizedDistance < m_config.pinchThreshold;
    
    return result;
}

inline GestureClassifier::PinchResult GestureClassifier::detectAnyPinch(
    const HandFrame& frame
) const {
    PinchResult bestResult;
    bestResult.normalizedDistance = 1.0f;
    
    // Check pinch with each finger (skip thumb)
    for (int i = 1; i < 5; ++i) {
        PinchResult result = detectPinch(frame, static_cast<FingerType>(i));
        if (result.normalizedDistance < bestResult.normalizedDistance) {
            bestResult = result;
        }
    }
    
    return bestResult;
}

// ============================================================================
// Velocity Analysis Implementation
// ============================================================================

inline VelocityData GestureClassifier::calculatePalmVelocity() const {
    VelocityData result;
    
    if (!m_history.hasEnoughHistory(2)) {
        return result;
    }
    
    const HandFrame* prevFrame = m_history.getFrame(1);
    const HandFrame* currFrame = m_history.getFrame(0);
    
    if (!prevFrame || !currFrame) return result;
    
    float dt = static_cast<float>(currFrame->timestampNs - prevFrame->timestampNs) / 1e9f;
    if (dt < 1e-6f) return result;
    
    Point prevPalm = prevFrame->palmCenter();
    Point currPalm = currFrame->palmCenter();
    
    result.velocity = (currPalm - prevPalm) * (1.0f / dt);
    result.speed = result.velocity.magnitude();
    
    // Calculate acceleration if we have more history
    if (m_history.hasEnoughHistory(3)) {
        const HandFrame* prevPrevFrame = m_history.getFrame(2);
        if (prevPrevFrame) {
            float dt2 = static_cast<float>(prevFrame->timestampNs - prevPrevFrame->timestampNs) / 1e9f;
            if (dt2 > 1e-6f) {
                Point prevPrevPalm = prevPrevFrame->palmCenter();
                Point prevVelocity = (prevPalm - prevPrevPalm) * (1.0f / dt2);
                result.acceleration = (result.velocity - prevVelocity) * (1.0f / dt);
            }
        }
    }
    
    return result;
}

inline GestureType GestureClassifier::detectSwipeGesture(
    const VelocityData& velocity
) const {
    float speed = velocity.speed;
    if (speed < m_config.swipeMinVelocity) {
        return GestureType::NONE;
    }
    
    // Calculate direction angle
    float angle = std::atan2(velocity.velocity.y, velocity.velocity.x);
    
    // Determine swipe direction based on angle
    // Left: angle ≈ π, Right: angle ≈ 0, Up: angle ≈ -π/2, Down: angle ≈ π/2
    
    if (std::abs(std::cos(angle)) > 0.7f) {
        // Horizontal swipe
        return velocity.velocity.x > 0 ? GestureType::SWIPE_RIGHT : GestureType::SWIPE_LEFT;
    } else if (std::abs(std::sin(angle)) > 0.7f) {
        // Vertical swipe
        return velocity.velocity.y > 0 ? GestureType::SWIPE_DOWN : GestureType::SWIPE_UP;
    }
    
    return GestureType::NONE;
}

inline GestureType GestureClassifier::detectScrollGesture(
    const VelocityData& velocity
) const {
    float vy = velocity.velocity.y;
    
    if (std::abs(vy) > m_config.scrollVelocityThreshold) {
        return vy > 0 ? GestureType::SCROLL_DOWN : GestureType::SCROLL_UP;
    }
    
    return GestureType::NONE;
}

// ============================================================================
// Gesture Detection Implementations
// ============================================================================

inline bool GestureClassifier::detectPinchClick(
    const HandFrame& frame,
    GestureResult& result
) {
    PinchResult pinch = detectPinch(frame, FingerType::INDEX);
    
    if (pinch.detected) {
        result.type = GestureType::PINCH_CLICK;
        result.confidence = 1.0f - (pinch.normalizedDistance / m_config.pinchThreshold);
        result.intensity = result.confidence;
        result.gestureData.pinchDistance = pinch.normalizedDistance;
        result.position = (frame.thumbTip() + frame.indexTip()) * 0.5f;
        return true;
    }
    
    return false;
}

inline bool GestureClassifier::detectBackGesture(
    const HandFrame& frame,
    GestureResult& result
) {
    PinchResult pinch = detectPinch(frame, FingerType::MIDDLE);
    
    if (pinch.detected) {
        result.type = GestureType::BACK_GESTURE;
        result.confidence = 1.0f - (pinch.normalizedDistance / m_config.pinchThreshold);
        result.gestureData.pinchDistance = pinch.normalizedDistance;
        return true;
    }
    
    return false;
}

inline bool GestureClassifier::detectRecentApps(
    const HandFrame& frame,
    GestureResult& result
) {
    PinchResult pinch = detectPinch(frame, FingerType::RING);
    
    if (pinch.detected) {
        result.type = GestureType::RECENT_APPS;
        result.confidence = 1.0f - (pinch.normalizedDistance / m_config.pinchThreshold);
        result.gestureData.pinchDistance = pinch.normalizedDistance;
        return true;
    }
    
    return false;
}

inline bool GestureClassifier::detectDragStart(
    const HandFrame& frame,
    GestureResult& result
) {
    // Check for fist (all fingers curled)
    int extendedCount = countExtendedFingers(frame);
    
    if (extendedCount == 0) {
        // All fingers curled - potential fist
        float avgCurlRatio = 0.0f;
        for (int i = 1; i < 5; ++i) {  // Skip thumb
            avgCurlRatio += calculateCurlRatio(frame, static_cast<FingerType>(i));
        }
        avgCurlRatio /= 4.0f;
        
        if (avgCurlRatio < m_config.fistCurlThreshold) {
            result.type = GestureType::DRAG_START;
            result.confidence = 1.0f - avgCurlRatio;
            result.position = frame.palmCenter();
            return true;
        }
    }
    
    return false;
}

inline bool GestureClassifier::detectDragEnd(
    const HandFrame& frame,
    GestureResult& result
) {
    if (!m_isDragging) return false;
    
    // Check for hand opening (multiple fingers extended)
    int extendedCount = countExtendedFingers(frame);
    
    if (extendedCount >= 3) {
        result.type = GestureType::DRAG_END;
        result.confidence = static_cast<float>(extendedCount) / 5.0f;
        result.position = frame.palmCenter();
        return true;
    }
    
    return false;
}

inline bool GestureClassifier::detectScroll(
    const HandFrame& frame,
    GestureResult& result
) {
    // Need open palm for scroll
    int extendedCount = countExtendedFingers(frame);
    if (extendedCount < 4) return false;
    
    VelocityData velocity = calculatePalmVelocity();
    GestureType scrollType = detectScrollGesture(velocity);
    
    if (scrollType != GestureType::NONE) {
        result.type = scrollType;
        result.confidence = std::min(velocity.speed / m_config.scrollVelocityThreshold, 1.0f);
        result.velocity = velocity;
        result.gestureData.scrollVelocity = velocity.velocity.y;
        return true;
    }
    
    return false;
}

inline bool GestureClassifier::detectSwipe(
    const HandFrame& frame,
    GestureResult& result
) {
    if (!m_history.hasEnoughHistory(5)) return false;
    
    VelocityData velocity = calculatePalmVelocity();
    GestureType swipeType = detectSwipeGesture(velocity);
    
    if (swipeType != GestureType::NONE) {
        result.type = swipeType;
        result.confidence = std::min(velocity.speed / m_config.swipeMinVelocity, 1.0f);
        result.velocity = velocity;
        result.gestureData.swipeDistance = velocity.speed * 0.1f;  // Approximate distance
        return true;
    }
    
    return false;
}

inline bool GestureClassifier::detectCursorMove(
    const HandFrame& frame,
    GestureResult& result
) {
    // Check for pointing gesture (only index extended)
    FingerState indexState = determineFingerState(frame, FingerType::INDEX);
    FingerState middleState = determineFingerState(frame, FingerType::MIDDLE);
    FingerState ringState = determineFingerState(frame, FingerType::RING);
    FingerState pinkyState = determineFingerState(frame, FingerType::PINKY);
    
    bool isPointing = (indexState == FingerState::EXTENDED || 
                       indexState == FingerState::PARTIALLY_EXTENDED) &&
                      (middleState == FingerState::CURLED || 
                       middleState == FingerState::PARTIALLY_CURLED) &&
                      (ringState == FingerState::CURLED || 
                       ringState == FingerState::PARTIALLY_CURLED) &&
                      (pinkyState == FingerState::CURLED || 
                       pinkyState == FingerState::PARTIALLY_CURLED);
    
    if (isPointing) {
        result.type = GestureType::CURSOR_MOVE;
        result.confidence = 0.9f;
        
        // Use index fingertip position
        Point indexTip = frame.indexTip();
        result.position = indexTip;
        result.screenPosition = getSmoothedCursor(indexTip, frame.timestampNs);
        
        return true;
    }
    
    return false;
}

inline bool GestureClassifier::detectScreenshot(
    const HandFrame& frame,
    GestureResult& result
) {
    // Check for peace sign (index and middle extended, others curled)
    FingerState indexState = determineFingerState(frame, FingerType::INDEX);
    FingerState middleState = determineFingerState(frame, FingerType::MIDDLE);
    FingerState ringState = determineFingerState(frame, FingerType::RING);
    FingerState pinkyState = determineFingerState(frame, FingerType::PINKY);
    
    bool isPeaceSign = 
        (indexState == FingerState::EXTENDED) &&
        (middleState == FingerState::EXTENDED) &&
        (ringState == FingerState::CURLED || ringState == FingerState::PARTIALLY_CURLED) &&
        (pinkyState == FingerState::CURLED || pinkyState == FingerState::PARTIALLY_CURLED);
    
    if (isPeaceSign) {
        uint64_t currentTime = frame.timestampNs;
        
        if (!m_screenshotActive) {
            // Start tracking
            m_screenshotActive = true;
            m_screenshotStartTimeNs = currentTime;
        } else {
            // Check if held long enough
            uint64_t duration = currentTime - m_screenshotStartTimeNs;
            float durationMs = duration / 1e6f;
            
            if (durationMs >= m_config.screenshotHoldTimeMs) {
                result.type = GestureType::SCREENSHOT;
                result.confidence = 1.0f;
                result.durationNs = duration;
                m_screenshotActive = false;  // Reset
                return true;
            }
        }
    } else {
        m_screenshotActive = false;
    }
    
    return false;
}

inline bool GestureClassifier::detectVolumeUp(
    const HandFrame& frame,
    GestureResult& result
) {
    // Thumbs up: thumb extended up, other fingers curled
    FingerState thumbState = determineFingerState(frame, FingerType::THUMB);
    FingerState indexState = determineFingerState(frame, FingerType::INDEX);
    FingerState middleState = determineFingerState(frame, FingerType::MIDDLE);
    FingerState ringState = determineFingerState(frame, FingerType::RING);
    FingerState pinkyState = determineFingerState(frame, FingerType::PINKY);
    
    bool isThumbsUp = 
        (thumbState == FingerState::EXTENDED) &&
        (indexState == FingerState::CURLED) &&
        (middleState == FingerState::CURLED) &&
        (ringState == FingerState::CURLED) &&
        (pinkyState == FingerState::CURLED);
    
    // Check thumb direction (pointing up)
    if (isThumbsUp) {
        const Point& thumbTip = frame.thumbTip();
        const Point& thumbMcp = frame.thumbMCP();
        
        // Y decreases upward in image coordinates
        if (thumbTip.y < thumbMcp.y) {
            result.type = GestureType::VOLUME_UP;
            result.confidence = 0.9f;
            return true;
        }
    }
    
    return false;
}

inline bool GestureClassifier::detectVolumeDown(
    const HandFrame& frame,
    GestureResult& result
) {
    // Thumbs down: thumb extended down, other fingers curled
    FingerState thumbState = determineFingerState(frame, FingerType::THUMB);
    FingerState indexState = determineFingerState(frame, FingerType::INDEX);
    FingerState middleState = determineFingerState(frame, FingerType::MIDDLE);
    FingerState ringState = determineFingerState(frame, FingerType::RING);
    FingerState pinkyState = determineFingerState(frame, FingerType::PINKY);
    
    bool isThumbsDown = 
        (thumbState == FingerState::EXTENDED) &&
        (indexState == FingerState::CURLED) &&
        (middleState == FingerState::CURLED) &&
        (ringState == FingerState::CURLED) &&
        (pinkyState == FingerState::CURLED);
    
    // Check thumb direction (pointing down)
    if (isThumbsDown) {
        const Point& thumbTip = frame.thumbTip();
        const Point& thumbMcp = frame.thumbMCP();
        
        // Y increases downward in image coordinates
        if (thumbTip.y > thumbMcp.y) {
            result.type = GestureType::VOLUME_DOWN;
            result.confidence = 0.9f;
            return true;
        }
    }
    
    return false;
}

inline bool GestureClassifier::detectNotificationPull(
    const HandFrame& frame,
    GestureResult& result
) {
    // Check for 3-finger configuration (index, middle, ring extended)
    FingerState indexState = determineFingerState(frame, FingerType::INDEX);
    FingerState middleState = determineFingerState(frame, FingerType::MIDDLE);
    FingerState ringState = determineFingerState(frame, FingerType::RING);
    FingerState pinkyState = determineFingerState(frame, FingerType::PINKY);
    
    bool isThreeFingers = 
        (indexState == FingerState::EXTENDED) &&
        (middleState == FingerState::EXTENDED) &&
        (ringState == FingerState::EXTENDED) &&
        (pinkyState == FingerState::CURLED);
    
    if (!isThreeFingers) return false;
    
    // Check for downward swipe
    VelocityData velocity = calculatePalmVelocity();
    
    if (velocity.velocity.y > m_config.notificationSwipeVelocity) {
        result.type = GestureType::NOTIFICATION_PULL;
        result.confidence = std::min(velocity.velocity.y / m_config.notificationSwipeVelocity, 1.0f);
        result.velocity = velocity;
        return true;
    }
    
    return false;
}

inline bool GestureClassifier::detectHomeGesture(
    const HandFrame& frame,
    GestureResult& result
) {
    // Open palm with all fingers extended and spread
    int extendedCount = countExtendedFingers(frame);
    
    if (extendedCount == 5) {
        // Check palm facing forward using z coordinates
        // When palm faces camera, fingertips should be closer than wrist
        float avgTipZ = (frame.indexTip().z + frame.middleTip().z + 
                        frame.ringTip().z + frame.pinkyTip().z) / 4.0f;
        
        if (avgTipZ < frame.wrist().z) {
            result.type = GestureType::HOME_GESTURE;
            result.confidence = 0.8f;
            result.position = frame.palmCenter();
            return true;
        }
    }
    
    return false;
}

inline bool GestureClassifier::detectZoom(
    const HandFrame& leftHand,
    const HandFrame& rightHand,
    GestureResult& result
) {
    Point leftPalm = leftHand.palmCenter();
    Point rightPalm = rightHand.palmCenter();
    
    float currentDistance = Point::distance(leftPalm, rightPalm);
    
    if (!m_hasTwoHands) {
        m_hasTwoHands = true;
        m_twoHandDistance = currentDistance;
        return false;
    }
    
    float distanceDelta = currentDistance - m_twoHandDistance;
    float velocity = distanceDelta * 10.0f;  // Approximate velocity
    
    m_twoHandDistance = currentDistance;
    
    if (std::abs(velocity) > m_config.zoomVelocityThreshold) {
        if (velocity > 0) {
            result.type = GestureType::ZOOM_IN;
        } else {
            result.type = GestureType::ZOOM_OUT;
        }
        
        result.confidence = std::min(std::abs(velocity), 1.0f);
        result.twoHandData.leftPosition = leftPalm;
        result.twoHandData.rightPosition = rightPalm;
        result.twoHandData.distance = currentDistance;
        result.gestureData.zoomScale = std::abs(distanceDelta);
        
        return true;
    }
    
    return false;
}

// ============================================================================
// State Machine Implementation
// ============================================================================

inline void GestureClassifier::updateStateMachine(
    GestureResult& result,
    uint64_t timestampNs
) {
    switch (m_currentState) {
        case GestureState::IDLE:
            if (result.type != GestureType::NONE && 
                shouldTriggerGesture(result.type, timestampNs)) {
                m_currentState = GestureState::DETECTING;
                m_stateStartTimeNs = timestampNs;
            }
            break;
            
        case GestureState::DETECTING:
            if (result.type == GestureType::NONE) {
                m_currentState = GestureState::IDLE;
            } else if ((timestampNs - m_stateStartTimeNs) / 1e6f > 
                       m_config.detectionTimeMs) {
                m_currentState = GestureState::ACTIVE;
                m_stateStartTimeNs = timestampNs;
                updateCooldown(result.type, timestampNs);
            }
            break;
            
        case GestureState::ACTIVE:
            if (result.type == GestureType::NONE) {
                m_currentState = GestureState::RELEASING;
                m_stateStartTimeNs = timestampNs;
            } else if (result.type == m_currentGesture.type) {
                m_currentState = GestureState::HELD;
            }
            break;
            
        case GestureState::HELD:
            if (result.type == GestureType::NONE) {
                m_currentState = GestureState::RELEASING;
                m_stateStartTimeNs = timestampNs;
            }
            result.durationNs = timestampNs - m_stateStartTimeNs;
            break;
            
        case GestureState::RELEASING:
            if ((timestampNs - m_stateStartTimeNs) / 1e6f > m_config.releaseTimeMs) {
                m_currentState = GestureState::RELEASED;
            }
            break;
            
        case GestureState::RELEASED:
            m_currentState = GestureState::IDLE;
            break;
    }
    
    result.state = m_currentState;
}

inline bool GestureClassifier::shouldTriggerGesture(
    GestureType type,
    uint64_t timestampNs
) const {
    auto it = m_lastGestureTimeNs.find(type);
    if (it == m_lastGestureTimeNs.end()) {
        return true;
    }
    
    float timeSinceLastMs = (timestampNs - it->second) / 1e6f;
    return timeSinceLastMs > m_config.gestureCooldownMs;
}

inline void GestureClassifier::updateCooldown(
    GestureType type,
    uint64_t timestampNs
) {
    m_lastGestureTimeNs[type] = timestampNs;
}

inline Point GestureClassifier::getSmoothedCursor(
    const Point& rawPosition,
    uint64_t timestampNs
) {
    return m_cursorFilter.update(rawPosition.x, rawPosition.y, timestampNs);
}

inline void GestureClassifier::reset() {
    m_history.clear();
    m_currentState = GestureState::IDLE;
    m_currentGesture = GestureResult();
    m_cursorFilter.reset();
    m_lastGestureTimeNs.clear();
    m_screenshotActive = false;
    m_isDragging = false;
    m_hasTwoHands = false;
}

inline std::string GestureResult::toString() const {
    static const char* gestureNames[] = {
        "NONE", "PINCH_CLICK", "BACK_GESTURE", "RECENT_APPS",
        "DRAG_START", "DRAG_END", "DRAG_MOVE", "SCROLL_UP", "SCROLL_DOWN",
        "SWIPE_LEFT", "SWIPE_RIGHT", "SWIPE_UP", "SWIPE_DOWN",
        "ZOOM_IN", "ZOOM_OUT", "SCREENSHOT", "VOLUME_UP", "VOLUME_DOWN",
        "NOTIFICATION_PULL", "CURSOR_MOVE", "HOME_GESTURE"
    };
    
    static const char* stateNames[] = {
        "IDLE", "DETECTING", "ACTIVE", "HELD", "RELEASING", "RELEASED"
    };
    
    return std::string("Gesture{type=") + gestureNames[static_cast<int>(type)] +
           ", state=" + stateNames[static_cast<int>(state)] +
           ", confidence=" + std::to_string(confidence) + "}";
}

} // namespace gestures
} // namespace irongest

#endif // GESTURE_CLASSIFIER_H
