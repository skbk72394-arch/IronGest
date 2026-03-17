/**
 * IronGest - Cursor TypeScript Interface
 * Production-grade TypeScript definitions for cursor control
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import { NativeModules, NativeEventEmitter, EmitterSubscription } from 'react-native';

// ============================================================================
// Types
// ============================================================================

/**
 * Cursor state enum - matches Kotlin CursorState
 */
export enum CursorState {
  IDLE = 'IDLE',
  HOVERING = 'HOVERING',
  DWELLING = 'DWELLING',
  CLICKING = 'CLICKING',
  DRAGGING = 'DRAGGING',
  SCROLLING = 'SCROLLING',
  DISABLED = 'DISABLED',
}

/**
 * Swipe direction enum
 */
export enum SwipeDirection {
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

/**
 * Screen dimensions
 */
export interface ScreenDimensions {
  width: number;
  height: number;
}

/**
 * Cursor position
 */
export interface CursorPosition {
  x: number;
  y: number;
  timestamp?: number;
}

/**
 * Cursor state change event
 */
export interface CursorStateEvent {
  state: CursorState;
  timestamp: number;
}

/**
 * Dwell progress event
 */
export interface DwellProgressEvent {
  progress: number;  // 0-1
  timestamp: number;
}

/**
 * Cursor configuration options
 */
export interface CursorConfig {
  /** Smoothing factor (0-1, higher = faster response) */
  smoothingFactor?: number;
  /** Cursor color in hex format */
  color?: string;
  /** Cursor size in dp */
  sizeDp?: number;
  /** Enable dwell-to-click */
  dwellClickEnabled?: boolean;
}

// ============================================================================
// Native Module Interface
// ============================================================================

interface CursorModuleInterface {
  // Overlay Management
  showOverlay(): Promise<boolean>;
  hideOverlay(): Promise<boolean>;
  isOverlayShowing(): Promise<boolean>;
  setCursorVisible(visible: boolean): Promise<boolean>;

  // Position Control
  updatePosition(normalizedX: number, normalizedY: number, confidence?: number): Promise<boolean>;
  updateScreenPosition(x: number, y: number): Promise<boolean>;
  getCurrentPosition(): Promise<CursorPosition>;
  setSmoothingFactor(factor: number): Promise<boolean>;

  // Cursor Appearance
  setCursorColor(color: string): Promise<boolean>;
  setCursorSize(sizeDp: number): Promise<boolean>;

  // Click Actions
  performClick(): Promise<boolean>;
  performDoubleClick(): Promise<boolean>;
  performLongPress(durationMs?: number): Promise<boolean>;

  // Drag Actions
  startDrag(): Promise<boolean>;
  endDrag(): Promise<boolean>;

  // Scroll Actions
  performScroll(deltaY: number): Promise<boolean>;

  // Swipe Actions
  performSwipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs?: number
  ): Promise<boolean>;
  performDirectionalSwipe(direction: SwipeDirection, distance?: number): Promise<boolean>;

  // Zoom Actions
  performZoomIn(centerX?: number, centerY?: number): Promise<boolean>;
  performZoomOut(centerX?: number, centerY?: number): Promise<boolean>;

  // Global Actions
  performBack(): Promise<boolean>;
  performHome(): Promise<boolean>;
  performRecents(): Promise<boolean>;
  openNotifications(): Promise<boolean>;
  takeScreenshot(): Promise<boolean>;

  // State
  getCurrentState(): Promise<{ state: CursorState }>;
  getScreenDimensions(): Promise<ScreenDimensions>;
  setDwellClickEnabled(enabled: boolean): Promise<boolean>;

  // Event Listeners
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

// ============================================================================
// Event Names
// ============================================================================

export const CursorEvents = {
  CURSOR_MOVED: 'onCursorMoved',
  STATE_CHANGED: 'onCursorStateChanged',
  DWELL_PROGRESS: 'onDwellProgress',
} as const;

// ============================================================================
// Native Module
// ============================================================================

const { CursorModule } = NativeModules;

if (!CursorModule) {
  console.error('CursorModule is not available. Make sure the native module is properly linked.');
}

const nativeModule = CursorModule as CursorModuleInterface;

// ============================================================================
// Event Emitter
// ============================================================================

const eventEmitter = new NativeEventEmitter(CursorModule);

// ============================================================================
// Cursor API
// ============================================================================

/**
 * Cursor API - provides a clean interface for cursor operations
 */
export const Cursor = {
  // ==========================================================================
  // Overlay Management
  // ==========================================================================

  /**
   * Show the cursor overlay
   */
  async showOverlay(): Promise<boolean> {
    return nativeModule.showOverlay();
  },

  /**
   * Hide the cursor overlay
   */
  async hideOverlay(): Promise<boolean> {
    return nativeModule.hideOverlay();
  },

  /**
   * Check if overlay is currently showing
   */
  async isShowing(): Promise<boolean> {
    return nativeModule.isOverlayShowing();
  },

  /**
   * Set cursor visibility
   */
  async setVisible(visible: boolean): Promise<boolean> {
    return nativeModule.setCursorVisible(visible);
  },

  // ==========================================================================
  // Position Control
  // ==========================================================================

  /**
   * Update cursor position from normalized coordinates (0-1)
   * @param normalizedX X position (0 = left, 1 = right)
   * @param normalizedY Y position (0 = top, 1 = bottom)
   * @param confidence Detection confidence (0-1, default: 1)
   */
  async updatePosition(
    normalizedX: number,
    normalizedY: number,
    confidence: number = 1.0
  ): Promise<boolean> {
    return nativeModule.updatePosition(normalizedX, normalizedY, confidence);
  },

  /**
   * Update cursor position from screen coordinates
   */
  async updateScreenPosition(x: number, y: number): Promise<boolean> {
    return nativeModule.updateScreenPosition(x, y);
  },

  /**
   * Get current cursor position in screen coordinates
   */
  async getPosition(): Promise<CursorPosition> {
    return nativeModule.getCurrentPosition();
  },

  /**
   * Set cursor smoothing factor
   * @param factor 0-1, higher = faster response
   */
  async setSmoothing(factor: number): Promise<boolean> {
    return nativeModule.setSmoothingFactor(factor);
  },

  // ==========================================================================
  // Cursor Appearance
  // ==========================================================================

  /**
   * Set cursor color
   * @param color Hex color string (e.g., '#00D4FF')
   */
  async setColor(color: string): Promise<boolean> {
    return nativeModule.setCursorColor(color);
  },

  /**
   * Set cursor size
   * @param sizeDp Size in density-independent pixels
   */
  async setSize(sizeDp: number): Promise<boolean> {
    return nativeModule.setCursorSize(sizeDp);
  },

  // ==========================================================================
  // Click Actions
  // ==========================================================================

  /**
   * Perform a click at the current cursor position
   */
  async click(): Promise<boolean> {
    return nativeModule.performClick();
  },

  /**
   * Perform a double click at the current cursor position
   */
  async doubleClick(): Promise<boolean> {
    return nativeModule.performDoubleClick();
  },

  /**
   * Perform a long press at the current cursor position
   * @param durationMs Duration in milliseconds (default: 500)
   */
  async longPress(durationMs: number = 500): Promise<boolean> {
    return nativeModule.performLongPress(durationMs);
  },

  // ==========================================================================
  // Drag Actions
  // ==========================================================================

  /**
   * Start a drag operation
   */
  async startDrag(): Promise<boolean> {
    return nativeModule.startDrag();
  },

  /**
   * End a drag operation
   */
  async endDrag(): Promise<boolean> {
    return nativeModule.endDrag();
  },

  // ==========================================================================
  // Scroll Actions
  // ==========================================================================

  /**
   * Perform a scroll
   * @param deltaY Scroll amount (positive = down, negative = up)
   */
  async scroll(deltaY: number): Promise<boolean> {
    return nativeModule.performScroll(deltaY);
  },

  // ==========================================================================
  // Swipe Actions
  // ==========================================================================

  /**
   * Perform a custom swipe gesture
   */
  async swipe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    durationMs: number = 300
  ): Promise<boolean> {
    return nativeModule.performSwipe(startX, startY, endX, endY, durationMs);
  },

  /**
   * Perform a directional swipe
   * @param direction Swipe direction
   * @param distance Distance in pixels (default: 300)
   */
  async swipeDirection(direction: SwipeDirection, distance: number = 300): Promise<boolean> {
    return nativeModule.performDirectionalSwipe(direction, distance);
  },

  // ==========================================================================
  // Zoom Actions
  // ==========================================================================

  /**
   * Perform a zoom in gesture
   */
  async zoomIn(centerX?: number, centerY?: number): Promise<boolean> {
    return nativeModule.performZoomIn(centerX, centerY);
  },

  /**
   * Perform a zoom out gesture
   */
  async zoomOut(centerX?: number, centerY?: number): Promise<boolean> {
    return nativeModule.performZoomOut(centerX, centerY);
  },

  // ==========================================================================
  // Global Actions
  // ==========================================================================

  /**
   * Perform system back action
   */
  async back(): Promise<boolean> {
    return nativeModule.performBack();
  },

  /**
   * Go to home screen
   */
  async home(): Promise<boolean> {
    return nativeModule.performHome();
  },

  /**
   * Show recent apps
   */
  async recents(): Promise<boolean> {
    return nativeModule.performRecents();
  },

  /**
   * Open notification panel
   */
  async openNotifications(): Promise<boolean> {
    return nativeModule.openNotifications();
  },

  /**
   * Take a screenshot
   */
  async screenshot(): Promise<boolean> {
    return nativeModule.takeScreenshot();
  },

  // ==========================================================================
  // State & Configuration
  // ==========================================================================

  /**
   * Get current cursor state
   */
  async getState(): Promise<CursorState> {
    const result = await nativeModule.getCurrentState();
    return result.state as CursorState;
  },

  /**
   * Get screen dimensions
   */
  async getScreenDimensions(): Promise<ScreenDimensions> {
    return nativeModule.getScreenDimensions();
  },

  /**
   * Enable or disable dwell-to-click
   */
  async setDwellEnabled(enabled: boolean): Promise<boolean> {
    return nativeModule.setDwellClickEnabled(enabled);
  },

  /**
   * Apply cursor configuration
   */
  async configure(config: CursorConfig): Promise<boolean[]> {
    const promises: Promise<boolean>[] = [];

    if (config.smoothingFactor !== undefined) {
      promises.push(this.setSmoothing(config.smoothingFactor));
    }

    if (config.color !== undefined) {
      promises.push(this.setColor(config.color));
    }

    if (config.sizeDp !== undefined) {
      promises.push(this.setSize(config.sizeDp));
    }

    if (config.dwellClickEnabled !== undefined) {
      promises.push(this.setDwellEnabled(config.dwellClickEnabled));
    }

    return Promise.all(promises);
  },

  // ==========================================================================
  // Event Listeners
  // ==========================================================================

  /**
   * Add listener for cursor position changes
   */
  onCursorMoved(callback: (event: CursorPosition) => void): EmitterSubscription {
    return eventEmitter.addListener(CursorEvents.CURSOR_MOVED, callback);
  },

  /**
   * Add listener for cursor state changes
   */
  onStateChanged(callback: (event: CursorStateEvent) => void): EmitterSubscription {
    return eventEmitter.addListener(CursorEvents.STATE_CHANGED, callback);
  },

  /**
   * Add listener for dwell progress updates
   */
  onDwellProgress(callback: (event: DwellProgressEvent) => void): EmitterSubscription {
    return eventEmitter.addListener(CursorEvents.DWELL_PROGRESS, callback);
  },
};

// ============================================================================
// React Hook
// ============================================================================

/**
 * React hook for cursor control
 */
export function useCursor() {
  const updatePosition = Cursor.updatePosition;
  const click = Cursor.click;
  const getState = Cursor.getState;
  const getPosition = Cursor.getPosition;

  return {
    // Position
    updatePosition,
    getPosition,

    // State
    getState,

    // Actions
    click,
    doubleClick: Cursor.doubleClick,
    longPress: Cursor.longPress,
    scroll: Cursor.scroll,
    swipe: Cursor.swipe,
    swipeDirection: Cursor.swipeDirection,
    zoomIn: Cursor.zoomIn,
    zoomOut: Cursor.zoomOut,

    // Global actions
    back: Cursor.back,
    home: Cursor.home,
    recents: Cursor.recents,

    // Drag
    startDrag: Cursor.startDrag,
    endDrag: Cursor.endDrag,

    // Overlay
    showOverlay: Cursor.showOverlay,
    hideOverlay: Cursor.hideOverlay,
    isShowing: Cursor.isShowing,

    // Configuration
    configure: Cursor.configure,
    setColor: Cursor.setColor,
    setSmoothing: Cursor.setSmoothing,

    // Events
    onCursorMoved: Cursor.onCursorMoved,
    onStateChanged: Cursor.onStateChanged,
    onDwellProgress: Cursor.onDwellProgress,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default Cursor;
