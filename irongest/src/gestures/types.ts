/**
 * IronGest - Gesture Types
 * Production-grade TypeScript definitions for gesture recognition
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

// ============================================================================
// Gesture Types
// ============================================================================

/**
 * All supported gesture types
 */
export enum GestureType {
  NONE = 0,
  
  // Click gestures
  PINCH_CLICK = 1,      // Index + thumb pinch (tap)
  BACK_GESTURE = 2,     // Thumb + middle pinch (back)
  RECENT_APPS = 3,      // Thumb + ring pinch (recent apps)
  
  // Drag gestures
  DRAG_START = 4,       // Fist close
  DRAG_END = 5,         // Fist open
  DRAG_MOVE = 6,        // Moving while dragging
  
  // Scroll gestures
  SCROLL_UP = 7,        // Open palm, Y velocity negative
  SCROLL_DOWN = 8,      // Open palm, Y velocity positive
  
  // Swipe gestures
  SWIPE_LEFT = 9,       // Palm X velocity negative
  SWIPE_RIGHT = 10,     // Palm X velocity positive
  SWIPE_UP = 11,        // Palm Y velocity negative
  SWIPE_DOWN = 12,      // Palm Y velocity positive
  
  // Two-hand gestures
  ZOOM_IN = 13,         // Two hands moving apart
  ZOOM_OUT = 14,        // Two hands moving together
  
  // Special gestures
  SCREENSHOT = 15,      // Peace sign held 1 second
  VOLUME_UP = 16,       // Thumbs up
  VOLUME_DOWN = 17,     // Thumbs down
  NOTIFICATION_PULL = 18, // 3-finger swipe down
  CURSOR_MOVE = 19,     // Index finger point tracking
  HOME_GESTURE = 20,    // Open palm facing forward
}

/**
 * Gesture state machine states
 */
export enum GestureState {
  IDLE = 'IDLE',
  DETECTING = 'DETECTING',
  ACTIVE = 'ACTIVE',
  HELD = 'HELD',
  RELEASING = 'RELEASING',
  RELEASED = 'RELEASED',
}

/**
 * Get gesture name from type
 */
export function getGestureName(type: GestureType): string {
  const names: Record<GestureType, string> = {
    [GestureType.NONE]: 'NONE',
    [GestureType.PINCH_CLICK]: 'PINCH_CLICK',
    [GestureType.BACK_GESTURE]: 'BACK_GESTURE',
    [GestureType.RECENT_APPS]: 'RECENT_APPS',
    [GestureType.DRAG_START]: 'DRAG_START',
    [GestureType.DRAG_END]: 'DRAG_END',
    [GestureType.DRAG_MOVE]: 'DRAG_MOVE',
    [GestureType.SCROLL_UP]: 'SCROLL_UP',
    [GestureType.SCROLL_DOWN]: 'SCROLL_DOWN',
    [GestureType.SWIPE_LEFT]: 'SWIPE_LEFT',
    [GestureType.SWIPE_RIGHT]: 'SWIPE_RIGHT',
    [GestureType.SWIPE_UP]: 'SWIPE_UP',
    [GestureType.SWIPE_DOWN]: 'SWIPE_DOWN',
    [GestureType.ZOOM_IN]: 'ZOOM_IN',
    [GestureType.ZOOM_OUT]: 'ZOOM_OUT',
    [GestureType.SCREENSHOT]: 'SCREENSHOT',
    [GestureType.VOLUME_UP]: 'VOLUME_UP',
    [GestureType.VOLUME_DOWN]: 'VOLUME_DOWN',
    [GestureType.NOTIFICATION_PULL]: 'NOTIFICATION_PULL',
    [GestureType.CURSOR_MOVE]: 'CURSOR_MOVE',
    [GestureType.HOME_GESTURE]: 'HOME_GESTURE',
  };
  return names[type] || 'UNKNOWN';
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Gesture detection event
 */
export interface GestureEvent {
  /** Gesture type ID */
  type: GestureType;
  /** Human-readable gesture name */
  typeName: string;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Gesture intensity/strength (0-1) */
  intensity: number;
  /** Current gesture state */
  state: GestureState;
  /** Normalized position (0-1) */
  positionX: number;
  positionY: number;
  /** Screen coordinates */
  screenX: number;
  screenY: number;
  /** Velocity in normalized units/sec */
  velocityX: number;
  velocityY: number;
  /** Event timestamp in milliseconds */
  timestamp: number;
  /** Duration for continuous gestures (ms) */
  duration: number;
  /** Is this a continuous gesture */
  isContinuous: boolean;
}

/**
 * Cursor movement event
 */
export interface CursorMoveEvent {
  /** X position on screen (pixels) */
  x: number;
  /** Y position on screen (pixels) */
  y: number;
  /** X velocity (pixels/sec) */
  velocityX: number;
  /** Y velocity (pixels/sec) */
  velocityY: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Gesture recognizer configuration
 */
export interface GestureConfig {
  /** Pinch distance threshold (normalized, default: 0.08) */
  pinchThreshold?: number;
  /** Swipe velocity threshold (default: 0.8) */
  swipeVelocityThreshold?: number;
  /** Scroll velocity threshold (default: 0.3) */
  scrollVelocityThreshold?: number;
  /** Gesture cooldown in milliseconds (default: 300) */
  gestureCooldownMs?: number;
  /** Screenshot hold time in milliseconds (default: 1000) */
  screenshotHoldTimeMs?: number;
  /** Kalman filter process noise (default: 0.015) */
  kalmanProcessNoise?: number;
  /** Kalman filter measurement noise (default: 0.05) */
  kalmanMeasurementNoise?: number;
}

/**
 * Default gesture configuration
 */
export const DefaultGestureConfig: Required<GestureConfig> = {
  pinchThreshold: 0.08,
  swipeVelocityThreshold: 0.8,
  scrollVelocityThreshold: 0.3,
  gestureCooldownMs: 300,
  screenshotHoldTimeMs: 1000,
  kalmanProcessNoise: 0.015,
  kalmanMeasurementNoise: 0.05,
};

// ============================================================================
// Hook Types
// ============================================================================

/**
 * Gesture callback type
 */
export type GestureCallback = (event: GestureEvent) => void;

/**
 * Cursor callback type
 */
export type CursorCallback = (event: CursorMoveEvent) => void;

/**
 * Gesture conflict resolution mode
 */
export enum ConflictResolution {
  /** First gesture wins */
  FIRST_WINS = 'FIRST_WINS',
  /** Highest confidence wins */
  HIGHEST_CONFIDENCE = 'HIGHEST_CONFIDENCE',
  /** Most recent gesture wins */
  MOST_RECENT = 'MOST_RECENT',
}

/**
 * Gesture filter options
 */
export interface GestureFilterOptions {
  /** Minimum confidence threshold (default: 0.5) */
  minConfidence?: number;
  /** Gesture types to listen for (all if not specified) */
  gestureTypes?: GestureType[];
  /** Minimum duration before triggering (ms) */
  minDuration?: number;
  /** Debounce time (ms) */
  debounceMs?: number;
  /** Conflict resolution mode */
  conflictResolution?: ConflictResolution;
}

// ============================================================================
// Event Names
// ============================================================================

export const GestureEvents = {
  GESTURE_DETECTED: 'onGestureDetected',
  CURSOR_MOVED: 'onCursorMoved',
} as const;

// ============================================================================
// Action Mapping
// ============================================================================

/**
 * System action types for gesture mapping
 */
export enum SystemAction {
  TAP = 'TAP',
  BACK = 'BACK',
  HOME = 'HOME',
  RECENTS = 'RECENTS',
  NOTIFICATIONS = 'NOTIFICATIONS',
  QUICK_SETTINGS = 'QUICK_SETTINGS',
  VOLUME_UP = 'VOLUME_UP',
  VOLUME_DOWN = 'VOLUME_DOWN',
  SCROLL_UP = 'SCROLL_UP',
  SCROLL_DOWN = 'SCROLL_DOWN',
  SWIPE_LEFT = 'SWIPE_LEFT',
  SWIPE_RIGHT = 'SWIPE_RIGHT',
  ZOOM_IN = 'ZOOM_IN',
  ZOOM_OUT = 'ZOOM_OUT',
  SCREENSHOT = 'SCREENSHOT',
  DRAG = 'DRAG',
  CURSOR = 'CURSOR',
}

/**
 * Default gesture to action mapping
 */
export const DefaultGestureActionMap: Partial<Record<GestureType, SystemAction>> = {
  [GestureType.PINCH_CLICK]: SystemAction.TAP,
  [GestureType.BACK_GESTURE]: SystemAction.BACK,
  [GestureType.RECENT_APPS]: SystemAction.RECENTS,
  [GestureType.HOME_GESTURE]: SystemAction.HOME,
  [GestureType.SCROLL_UP]: SystemAction.SCROLL_UP,
  [GestureType.SCROLL_DOWN]: SystemAction.SCROLL_DOWN,
  [GestureType.SWIPE_LEFT]: SystemAction.SWIPE_LEFT,
  [GestureType.SWIPE_RIGHT]: SystemAction.SWIPE_RIGHT,
  [GestureType.ZOOM_IN]: SystemAction.ZOOM_IN,
  [GestureType.ZOOM_OUT]: SystemAction.ZOOM_OUT,
  [GestureType.SCREENSHOT]: SystemAction.SCREENSHOT,
  [GestureType.VOLUME_UP]: SystemAction.VOLUME_UP,
  [GestureType.VOLUME_DOWN]: SystemAction.VOLUME_DOWN,
  [GestureType.NOTIFICATION_PULL]: SystemAction.NOTIFICATIONS,
};
