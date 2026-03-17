/**
 * IronGest - Air Keyboard TypeScript Interface
 * Production-grade TypeScript definitions for air keyboard
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';

// ============================================================================
// Types
// ============================================================================

/**
 * Keyboard operating mode
 */
export enum AirKeyboardMode {
  INDEX_FINGER = 'INDEX_FINGER',
  TEN_FINGER = 'TEN_FINGER',
  AUTO = 'AUTO',
}

/**
 * Keyboard state
 */
export enum KeyboardState {
  HIDDEN = 'HIDDEN',
  VISIBLE = 'VISIBLE',
  TYPING = 'TYPING',
  ERROR = 'ERROR',
}

/**
 * One-handed keyboard mode
 */
export enum OneHandedMode {
  LEFT_HAND = 'LEFT_HAND',
  RIGHT_HAND = 'RIGHT_HAND',
  CENTER = 'CENTER',
}

/**
 * Key press detection method
 */
export enum KeyPressMethod {
  PINCH = 'PINCH',
  DWELL = 'DWELL',
  BOTH = 'BOTH',
}

/**
 * Finger indices for 10-finger tracking
 */
export enum FingerIndex {
  LEFT_THUMB = 0,
  LEFT_INDEX = 1,
  LEFT_MIDDLE = 2,
  LEFT_RING = 3,
  LEFT_PINKY = 4,
  RIGHT_THUMB = 5,
  RIGHT_INDEX = 6,
  RIGHT_MIDDLE = 7,
  RIGHT_RING = 8,
  RIGHT_PINKY = 9,
}

/**
 * Keyboard statistics
 */
export interface KeyboardStatistics {
  totalKeyPresses: number;
  errorCount: number;
  wpm: number;
  errorRate: number;
  mode: AirKeyboardMode;
  state: KeyboardState;
}

/**
 * Key press event
 */
export interface KeyPressEvent {
  character: string;
  timestamp: number;
}

/**
 * Mode change event
 */
export interface ModeChangeEvent {
  mode: AirKeyboardMode;
}

/**
 * State change event
 */
export interface StateChangeEvent {
  state: KeyboardState;
}

/**
 * WPM update event
 */
export interface WPMUpdateEvent {
  wpm: number;
}

/**
 * Finger position data
 */
export interface FingerPosition {
  fingerIndex: FingerIndex;
  x: number;  // Normalized 0-1
  y: number;  // Normalized 0-1
  z: number;  // Depth
  confidence: number;
}

/**
 * All finger positions
 */
export interface AllFingerPositions {
  positions: number[];      // 30 floats: x, y, z for 10 fingers
  confidences: number[];    // 10 confidence values
}

/**
 * Keyboard configuration
 */
export interface KeyboardConfig {
  mode?: AirKeyboardMode;
  oneHandedMode?: OneHandedMode;
  pressMethod?: KeyPressMethod;
  dwellTimeMs?: number;
  hapticFeedback?: boolean;
}

// ============================================================================
// Event Names
// ============================================================================

export const KeyboardEvents = {
  KEY_PRESSED: 'onKeyPressed',
  MODE_CHANGED: 'onModeChanged',
  STATE_CHANGED: 'onStateChanged',
  WPM_UPDATED: 'onWPMUpdated',
} as const;

// ============================================================================
// Native Module Interface
// ============================================================================

interface KeyboardModuleInterface {
  // Keyboard Management
  showKeyboard(): Promise<boolean>;
  hideKeyboard(): Promise<boolean>;
  isKeyboardVisible(): Promise<boolean>;
  setMode(mode: string): Promise<boolean>;
  getMode(): Promise<{ mode: string }>;

  // Index Finger Mode
  updateIndexFingerPosition(
    normalizedX: number,
    normalizedY: number,
    confidence: number
  ): Promise<boolean>;
  handlePinchGesture(pinchDistance: number): Promise<boolean>;
  setOneHandedMode(mode: string): Promise<boolean>;
  setKeyPressMethod(method: string): Promise<boolean>;

  // Ten Finger Mode
  updateAllFingerPositions(
    positions: number[],
    confidences: number[]
  ): Promise<boolean>;
  updateFingerPosition(
    fingerIndex: number,
    x: number,
    y: number,
    z: number
  ): Promise<boolean>;

  // Input
  injectKeystroke(character: string): Promise<boolean>;
  injectSpecialKey(keyCode: number): Promise<boolean>;
  setSuggestions(suggestions: string[]): Promise<boolean>;

  // Statistics
  getStatistics(): Promise<KeyboardStatistics>;
  resetStatistics(): Promise<boolean>;

  // Event Listeners
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

// ============================================================================
// Native Module
// ============================================================================

const { KeyboardModule } = NativeModules;

if (!KeyboardModule) {
  console.error('KeyboardModule is not available. Make sure the native module is properly linked.');
}

const nativeModule = KeyboardModule as KeyboardModuleInterface;
const eventEmitter = new NativeEventEmitter(KeyboardModule);

// ============================================================================
// Keyboard API
// ============================================================================

/**
 * Air Keyboard API - provides a clean interface for keyboard operations
 */
export const AirKeyboard = {
  // ==========================================================================
  // Keyboard Management
  // ==========================================================================

  /**
   * Show the keyboard
   */
  async show(): Promise<boolean> {
    return nativeModule.showKeyboard();
  },

  /**
   * Hide the keyboard
   */
  async hide(): Promise<boolean> {
    return nativeModule.hideKeyboard();
  },

  /**
   * Check if keyboard is visible
   */
  async isVisible(): Promise<boolean> {
    return nativeModule.isKeyboardVisible();
  },

  /**
   * Set keyboard mode
   */
  async setMode(mode: AirKeyboardMode): Promise<boolean> {
    return nativeModule.setMode(mode);
  },

  /**
   * Get current mode
   */
  async getMode(): Promise<AirKeyboardMode> {
    const result = await nativeModule.getMode();
    return result.mode as AirKeyboardMode;
  },

  // ==========================================================================
  // Index Finger Mode
  // ==========================================================================

  /**
   * Update index finger position (normalized 0-1)
   */
  async updateIndexFinger(
    x: number,
    y: number,
    confidence: number = 1.0
  ): Promise<boolean> {
    return nativeModule.updateIndexFingerPosition(x, y, confidence);
  },

  /**
   * Handle pinch gesture for keypress
   */
  async handlePinch(pinchDistance: number): Promise<boolean> {
    return nativeModule.handlePinchGesture(pinchDistance);
  },

  /**
   * Set one-handed keyboard mode
   */
  async setOneHandedMode(mode: OneHandedMode): Promise<boolean> {
    return nativeModule.setOneHandedMode(mode);
  },

  /**
   * Set key press method
   */
  async setPressMethod(method: KeyPressMethod): Promise<boolean> {
    return nativeModule.setKeyPressMethod(method);
  },

  // ==========================================================================
  // Ten Finger Mode
  // ==========================================================================

  /**
   * Update all finger positions at once
   */
  async updateAllFingers(positions: AllFingerPositions): Promise<boolean> {
    return nativeModule.updateAllFingerPositions(
      positions.positions,
      positions.confidences
    );
  },

  /**
   * Update single finger position
   */
  async updateFinger(finger: FingerPosition): Promise<boolean> {
    return nativeModule.updateFingerPosition(
      finger.fingerIndex,
      finger.x,
      finger.y,
      finger.z
    );
  },

  // ==========================================================================
  // Input
  // ==========================================================================

  /**
   * Inject a keystroke
   */
  async injectKey(character: string): Promise<boolean> {
    return nativeModule.injectKeystroke(character);
  },

  /**
   * Inject special key (backspace, enter, etc.)
   */
  async injectSpecialKey(keyCode: number): Promise<boolean> {
    return nativeModule.injectSpecialKey(keyCode);
  },

  /**
   * Set word suggestions
   */
  async setSuggestions(suggestions: string[]): Promise<boolean> {
    return nativeModule.setSuggestions(suggestions);
  },

  // ==========================================================================
  // Statistics
  // ==========================================================================

  /**
   * Get keyboard statistics
   */
  async getStatistics(): Promise<KeyboardStatistics> {
    return nativeModule.getStatistics();
  },

  /**
   * Reset statistics
   */
  async resetStatistics(): Promise<boolean> {
    return nativeModule.resetStatistics();
  },

  // ==========================================================================
  // Configuration
  // ==========================================================================

  /**
   * Apply keyboard configuration
   */
  async configure(config: KeyboardConfig): Promise<boolean[]> {
    const promises: Promise<boolean>[] = [];

    if (config.mode !== undefined) {
      promises.push(this.setMode(config.mode));
    }

    if (config.oneHandedMode !== undefined) {
      promises.push(this.setOneHandedMode(config.oneHandedMode));
    }

    if (config.pressMethod !== undefined) {
      promises.push(this.setPressMethod(config.pressMethod));
    }

    return Promise.all(promises);
  },

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  /**
   * Listen for key press events
   */
  onKeyPressed(callback: (event: KeyPressEvent) => void): EmitterSubscription {
    return eventEmitter.addListener(KeyboardEvents.KEY_PRESSED, callback);
  },

  /**
   * Listen for mode change events
   */
  onModeChanged(callback: (event: ModeChangeEvent) => void): EmitterSubscription {
    return eventEmitter.addListener(KeyboardEvents.MODE_CHANGED, callback);
  },

  /**
   * Listen for state change events
   */
  onStateChanged(callback: (event: StateChangeEvent) => void): EmitterSubscription {
    return eventEmitter.addListener(KeyboardEvents.STATE_CHANGED, callback);
  },

  /**
   * Listen for WPM updates
   */
  onWPMUpdated(callback: (event: WPMUpdateEvent) => void): EmitterSubscription {
    return eventEmitter.addListener(KeyboardEvents.WPM_UPDATED, callback);
  },
};

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for air keyboard
 */
export function useAirKeyboard() {
  return {
    // Management
    show: AirKeyboard.show,
    hide: AirKeyboard.hide,
    isVisible: AirKeyboard.isVisible,
    setMode: AirKeyboard.setMode,
    getMode: AirKeyboard.getMode,

    // Index Finger Mode
    updateIndexFinger: AirKeyboard.updateIndexFinger,
    handlePinch: AirKeyboard.handlePinch,
    setOneHandedMode: AirKeyboard.setOneHandedMode,
    setPressMethod: AirKeyboard.setPressMethod,

    // Ten Finger Mode
    updateAllFingers: AirKeyboard.updateAllFingers,
    updateFinger: AirKeyboard.updateFinger,

    // Input
    injectKey: AirKeyboard.injectKey,
    injectSpecialKey: AirKeyboard.injectSpecialKey,
    setSuggestions: AirKeyboard.setSuggestions,

    // Statistics
    getStatistics: AirKeyboard.getStatistics,
    resetStatistics: AirKeyboard.resetStatistics,

    // Configuration
    configure: AirKeyboard.configure,

    // Events
    onKeyPressed: AirKeyboard.onKeyPressed,
    onModeChanged: AirKeyboard.onModeChanged,
    onStateChanged: AirKeyboard.onStateChanged,
    onWPMUpdated: AirKeyboard.onWPMUpdated,
  };
}

// ============================================================================
// Special Key Codes
// ============================================================================

export const SpecialKeyCode = {
  BACKSPACE: 67,
  ENTER: 66,
  TAB: 61,
  SPACE: 62,
  SHIFT_LEFT: 59,
  SHIFT_RIGHT: 60,
  CTRL_LEFT: 113,
  CTRL_RIGHT: 114,
  ALT_LEFT: 57,
  ALT_RIGHT: 58,
  DEL: 112,  // Forward delete
} as const;

// ============================================================================
// Keyboard Layout Constants
// ============================================================================

/**
 * Standard QWERTY keyboard rows
 */
export const QWERTY_ROWS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '='],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'"],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/'],
] as const;

/**
 * Finger to key mapping for touch typing
 */
export const FINGER_KEY_MAP: Record<FingerIndex, string[]> = {
  [FingerIndex.LEFT_PINKY]: ['1', 'Q', 'A', 'Z', '`'],
  [FingerIndex.LEFT_RING]: ['2', 'W', 'S', 'X'],
  [FingerIndex.LEFT_MIDDLE]: ['3', 'E', 'D', 'C'],
  [FingerIndex.LEFT_INDEX]: ['4', '5', 'R', 'T', 'F', 'G', 'V', 'B'],
  [FingerIndex.LEFT_THUMB]: [' '],
  [FingerIndex.RIGHT_THUMB]: [' '],
  [FingerIndex.RIGHT_INDEX]: ['6', '7', 'Y', 'U', 'H', 'J', 'N', 'M'],
  [FingerIndex.RIGHT_MIDDLE]: ['8', 'I', 'K', ','],
  [FingerIndex.RIGHT_RING]: ['9', 'O', 'L', '.'],
  [FingerIndex.RIGHT_PINKY]: ['0', '-', '=', 'P', '[', ']', ';', "'", '/', '\\'],
};

export default AirKeyboard;
