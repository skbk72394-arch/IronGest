/**
 * IronGest - Gesture Types Header
 * Production-grade gesture type definitions with mathematical thresholds
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

#ifndef GESTURE_TYPES_H
#define GESTURE_TYPES_H

#include <cstdint>
#include <array>
#include <string>

namespace irongest {
namespace gestures {

// ============================================================================
// Constants
// ============================================================================

constexpr size_t NUM_LANDMARKS = 21;
constexpr size_t HISTORY_SIZE = 10;
constexpr float PI = 3.14159265358979323846f;

// ============================================================================
// Gesture Types
// ============================================================================

enum class GestureType : uint8_t {
    NONE = 0,
    
    // Click gestures
    PINCH_CLICK,            // Index + thumb pinch (tap)
    BACK_GESTURE,           // Thumb + middle pinch (back)
    RECENT_APPS,            // Thumb + ring pinch (recent apps)
    
    // Drag gestures
    DRAG_START,             // Fist close
    DRAG_END,               // Fist open
    DRAG_MOVE,              // Moving while dragging
    
    // Scroll gestures
    SCROLL_UP,              // Open palm, Y velocity negative
    SCROLL_DOWN,            // Open palm, Y velocity positive
    
    // Swipe gestures
    SWIPE_LEFT,             // Palm X velocity negative
    SWIPE_RIGHT,            // Palm X velocity positive
    SWIPE_UP,               // Palm Y velocity negative
    SWIPE_DOWN,             // Palm Y velocity positive
    
    // Two-hand gestures
    ZOOM_IN,                // Two hands moving apart
    ZOOM_OUT,               // Two hands moving together
    
    // Special gestures
    SCREENSHOT,             // Peace sign held 1 second
    VOLUME_UP,              // Thumbs up
    VOLUME_DOWN,            // Thumbs down
    NOTIFICATION_PULL,      // 3-finger swipe down
    CURSOR_MOVE,            // Index finger point tracking
    HOME_GESTURE,           // Open palm facing forward
    
    // Gesture count
    GESTURE_COUNT
};

// ============================================================================
// Gesture State Machine
// ============================================================================

enum class GestureState : uint8_t {
    IDLE,           // No gesture detected
    DETECTING,      // Potential gesture, waiting for confirmation
    ACTIVE,         // Gesture is active
    HELD,           // Gesture is being held
    RELEASING,      // Gesture is ending
    RELEASED        // Gesture has been released (trigger event)
};

// ============================================================================
// Finger Types
// ============================================================================

enum class FingerType : uint8_t {
    THUMB = 0,
    INDEX = 1,
    MIDDLE = 2,
    RING = 3,
    PINKY = 4,
    FINGER_COUNT = 5
};

enum class FingerState : uint8_t {
    EXTENDED,           // Finger is fully extended
    PARTIALLY_EXTENDED, // Finger is partially extended
    NEUTRAL,            // Finger is in neutral position
    PARTIALLY_CURLED,   // Finger is partially curled
    CURLED              // Finger is fully curled (fist)
};

// ============================================================================
// Data Structures
// ============================================================================

/**
 * 2D/3D Point
 */
struct Point {
    float x = 0.0f;
    float y = 0.0f;
    float z = 0.0f;
    
    Point() = default;
    Point(float _x, float _y, float _z = 0.0f) : x(_x), y(_y), z(_z) {}
    
    // Vector operations
    Point operator+(const Point& other) const {
        return Point(x + other.x, y + other.y, z + other.z);
    }
    
    Point operator-(const Point& other) const {
        return Point(x - other.x, y - other.y, z - other.z);
    }
    
    Point operator*(float scalar) const {
        return Point(x * scalar, y * scalar, z * scalar);
    }
    
    float magnitude() const {
        return std::sqrt(x * x + y * y + z * z);
    }
    
    float magnitude2D() const {
        return std::sqrt(x * x + y * y);
    }
    
    static float distance(const Point& a, const Point& b) {
        return (b - a).magnitude();
    }
    
    static float distance2D(const Point& a, const Point& b) {
        return (b - a).magnitude2D();
    }
    
    static float dot(const Point& a, const Point& b) {
        return a.x * b.x + a.y * b.y + a.z * b.z;
    }
    
    Point normalized() const {
        float mag = magnitude();
        if (mag > 1e-6f) {
            return *this * (1.0f / mag);
        }
        return Point();
    }
    
    // Angle between two vectors
    static float angleBetween(const Point& a, const Point& b) {
        float dotProd = dot(a.normalized(), b.normalized());
        dotProd = std::clamp(dotProd, -1.0f, 1.0f);
        return std::acos(dotProd);
    }
};

/**
 * Single hand frame data
 */
struct HandFrame {
    std::array<Point, NUM_LANDMARKS> landmarks;
    float confidence = 0.0f;
    uint64_t timestampNs = 0;
    bool isRightHand = true;
    
    // Convenience accessors for landmark indices
    // Wrist
    const Point& wrist() const { return landmarks[0]; }
    
    // Thumb
    const Point& thumbCMC() const { return landmarks[1]; }
    const Point& thumbMCP() const { return landmarks[2]; }
    const Point& thumbIP() const { return landmarks[3]; }
    const Point& thumbTip() const { return landmarks[4]; }
    
    // Index
    const Point& indexMCP() const { return landmarks[5]; }
    const Point& indexPIP() const { return landmarks[6]; }
    const Point& indexDIP() const { return landmarks[7]; }
    const Point& indexTip() const { return landmarks[8]; }
    
    // Middle
    const Point& middleMCP() const { return landmarks[9]; }
    const Point& middlePIP() const { return landmarks[10]; }
    const Point& middleDIP() const { return landmarks[11]; }
    const Point& middleTip() const { return landmarks[12]; }
    
    // Ring
    const Point& ringMCP() const { return landmarks[13]; }
    const Point& ringPIP() const { return landmarks[14]; }
    const Point& ringDIP() const { return landmarks[15]; }
    const Point& ringTip() const { return landmarks[16]; }
    
    // Pinky
    const Point& pinkyMCP() const { return landmarks[17]; }
    const Point& pinkyPIP() const { return landmarks[18]; }
    const Point& pinkyDIP() const { return landmarks[19]; }
    const Point& pinkyTip() const { return landmarks[20]; }
    
    // Get palm center (average of wrist and MCPs)
    Point palmCenter() const {
        Point center;
        center.x = (wrist().x + indexMCP().x + middleMCP().x + ringMCP().x + pinkyMCP().x) / 5.0f;
        center.y = (wrist().y + indexMCP().y + middleMCP().y + ringMCP().y + pinkyMCP().y) / 5.0f;
        center.z = (wrist().z + indexMCP().z + middleMCP().z + ringMCP().z + pinkyMCP().z) / 5.0f;
        return center;
    }
    
    // Get hand size (wrist to middle fingertip distance)
    float handSize() const {
        return Point::distance(wrist(), middleTip());
    }
    
    // Get normalized distance (distance / hand size)
    float normalizedDistance(const Point& a, const Point& b) const {
        float size = handSize();
        if (size < 0.01f) return 0.0f;
        return Point::distance(a, b) / size;
    }
};

/**
 * Hand history for temporal analysis
 */
struct HandHistory {
    std::array<HandFrame, HISTORY_SIZE> frames;
    size_t currentFrame = 0;
    size_t frameCount = 0;
    
    void addFrame(const HandFrame& frame) {
        frames[currentFrame] = frame;
        currentFrame = (currentFrame + 1) % HISTORY_SIZE;
        frameCount = std::min(frameCount + 1, HISTORY_SIZE);
    }
    
    const HandFrame* getFrame(size_t framesAgo) const {
        if (framesAgo >= frameCount) return nullptr;
        size_t idx = (currentFrame + HISTORY_SIZE - framesAgo - 1) % HISTORY_SIZE;
        return &frames[idx];
    }
    
    void clear() {
        currentFrame = 0;
        frameCount = 0;
    }
    
    bool hasEnoughHistory(size_t minFrames) const {
        return frameCount >= minFrames;
    }
};

/**
 * Velocity data for a point
 */
struct VelocityData {
    Point velocity;         // Units per second
    Point acceleration;     // Units per second^2
    float speed = 0.0f;     // Magnitude of velocity
    
    void update(const Point& currentPos, const Point& prevPos, float dt) {
        if (dt > 0.0001f) {
            Point newVelocity = (currentPos - prevPos) * (1.0f / dt);
            acceleration = (newVelocity - velocity) * (1.0f / dt);
            velocity = newVelocity;
            speed = velocity.magnitude();
        }
    }
};

/**
 * Gesture detection result
 */
struct GestureResult {
    GestureType type = GestureType::NONE;
    GestureState state = GestureState::IDLE;
    float confidence = 0.0f;
    float intensity = 0.0f;         // 0-1, how strongly gesture is performed
    
    uint64_t startTimeNs = 0;       // When gesture started
    uint64_t durationNs = 0;        // How long gesture has been active
    
    Point position;                 // Gesture position (normalized)
    Point screenPosition;           // Mapped to screen coordinates
    VelocityData velocity;          // Velocity data
    
    // Finger states
    std::array<FingerState, 5> fingerStates;
    
    // Gesture-specific data
    union {
        float pinchDistance;        // For pinch gestures
        float swipeDistance;        // For swipe gestures
        float zoomScale;            // For zoom gestures
        float scrollVelocity;       // For scroll gestures
    } gestureData;
    
    // Two-hand gesture data
    struct TwoHandData {
        Point leftPosition;
        Point rightPosition;
        float distance;
    } twoHandData;
    
    GestureResult() {
        fingerStates.fill(FingerState::NEUTRAL);
        gestureData.pinchDistance = 0.0f;
    }
    
    std::string toString() const;
};

/**
 * Gesture configuration parameters
 */
struct GestureConfig {
    // Pinch detection
    float pinchThreshold = 0.08f;           // Normalized distance for pinch
    float pinchReleaseThreshold = 0.15f;    // Distance to release pinch
    float pinchClickTimeMs = 200.0f;        // Max time for click vs hold
    
    // Swipe detection
    float swipeMinVelocity = 0.8f;          // Minimum velocity (units/sec)
    float swipeMinDistance = 0.15f;         // Minimum distance
    float swipeMaxTimeMs = 500.0f;          // Max swipe duration
    
    // Scroll detection
    float scrollVelocityThreshold = 0.3f;   // Min velocity for scroll
    float scrollSmoothing = 0.3f;           // Scroll smoothing factor
    
    // Fist detection
    float fistCurlThreshold = 0.4f;         // MCP-tip distance ratio for curl
    float fistConfidenceThreshold = 0.8f;   // Min confidence for fist
    
    // Finger extension
    float extendedAngleMax = 0.4f;          // ~23 degrees - max angle for extended
    float curledAngleMin = 1.2f;            // ~69 degrees - min angle for curled
    float extendedRatioMin = 0.85f;         // Min ratio for extended finger
    
    // Special gestures
    float screenshotHoldTimeMs = 1000.0f;   // Time to hold peace sign
    float volumeGestureHoldMs = 500.0f;     // Time to hold volume gesture
    
    // Cursor movement
    float cursorSmoothing = 0.15f;          // Kalman filter process noise
    float cursorResponsiveness = 0.3f;      // Movement sensitivity
    
    // Gesture cooldown
    float gestureCooldownMs = 300.0f;       // Min time between same gesture
    
    // State machine
    float detectionTimeMs = 100.0f;         // Time to confirm detection
    float releaseTimeMs = 150.0f;           // Time to release gesture
    
    // Zoom gesture
    float zoomMinScale = 0.1f;              // Min scale change for zoom
    float zoomVelocityThreshold = 0.2f;     // Min velocity for zoom
    
    // Notification pull
    int notificationFingerCount = 3;        // Fingers needed for notification
    float notificationSwipeVelocity = 0.5f; // Min velocity for notification pull
};

} // namespace gestures
} // namespace irongest

#endif // GESTURE_TYPES_H
