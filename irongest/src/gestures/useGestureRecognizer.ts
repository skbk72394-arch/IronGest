/**
 * IronGest - useGestureRecognizer Hook
 * Production-grade React hook for gesture recognition with conflict resolution
 * 
 * Features:
 * - Subscribes to gesture events from native module
 * - Provides gesture callbacks with filtering
 * - Handles gesture conflict resolution
 * - Debouncing and cooldown support
 * - Cursor position tracking with Kalman smoothing
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { NativeEventEmitter, NativeModules, Platform, Dimensions } from 'react-native';
import type { EmitterSubscription } from 'react-native';

import {
  GestureType,
  GestureState,
  GestureEvent,
  CursorMoveEvent,
  GestureCallback,
  CursorCallback,
  GestureConfig,
  DefaultGestureConfig,
  GestureFilterOptions,
  GestureEvents,
  getGestureName,
} from './types';

// ============================================================================
// Native Module
// ============================================================================

const { GestureRecognizer } = NativeModules;

// Event emitter
const eventEmitter = Platform.OS === 'android'
  ? new NativeEventEmitter(GestureRecognizer)
  : null;

// ============================================================================
// Hook Options
// ============================================================================

interface UseGestureRecognizerOptions {
  /** Gesture recognizer configuration */
  config?: GestureConfig;
  /** Auto-start on mount */
  autoStart?: boolean;
  /** Gesture detection callback */
  onGesture?: GestureCallback;
  /** Cursor movement callback */
  onCursorMove?: CursorCallback;
  /** Error callback */
  onError?: (error: string) => void;
  /** Gesture filter options */
  filter?: GestureFilterOptions;
  /** Enable cursor tracking */
  enableCursorTracking?: boolean;
  /** Cursor smoothing factor (0-1) */
  cursorSmoothing?: number;
}

// ============================================================================
// Hook Return Type
// ============================================================================

interface UseGestureRecognizerReturn {
  /** Current gesture */
  currentGesture: GestureEvent | null;
  /** Current cursor position */
  cursorPosition: CursorMoveEvent | null;
  /** Is module initialized */
  isInitialized: boolean;
  /** Is currently tracking */
  isTracking: boolean;
  /** Last error */
  error: string | null;
  /** Initialize the recognizer */
  initialize: () => Promise<boolean>;
  /** Process landmarks (for integration with hand tracking) */
  processLandmarks: (
    landmarksX: number[],
    landmarksY: number[],
    landmarksZ: number[],
    confidence: number,
    isRightHand: boolean,
    timestamp: number
  ) => Promise<number>;
  /** Set screen dimensions */
  setScreenSize: (width: number, height: number) => void;
  /** Update configuration */
  updateConfig: (config: Partial<GestureConfig>) => void;
  /** Reset gesture state */
  reset: () => void;
  /** Add gesture callback */
  onGesture: (callback: GestureCallback) => () => void;
  /** Add cursor callback */
  onCursorMove: (callback: CursorCallback) => () => void;
}

// ============================================================================
// Gesture Conflict Resolver
// ============================================================================

class GestureConflictResolver {
  private lastGestures: Map<GestureType, GestureEvent> = new Map();
  private activeGestures: Set<GestureType> = new Set();
  private resolutionMode = 'HIGHEST_CONFIDENCE';
  
  addGesture(event: GestureEvent): void {
    this.lastGestures.set(event.type, event);
  }
  
  resolve(events: GestureEvent[]): GestureEvent | null {
    if (events.length === 0) return null;
    if (events.length === 1) return events[0];
    
    // Sort by confidence
    const sorted = [...events].sort((a, b) => b.confidence - a.confidence);
    return sorted[0];
  }
  
  isActive(type: GestureType): boolean {
    return this.activeGestures.has(type);
  }
  
  setActive(type: GestureType, active: boolean): void {
    if (active) {
      this.activeGestures.add(type);
    } else {
      this.activeGestures.delete(type);
    }
  }
  
  clear(): void {
    this.lastGestures.clear();
    this.activeGestures.clear();
  }
}

// ============================================================================
// Gesture Debouncer
// ============================================================================

class GestureDebouncer {
  private lastEmitTime: Map<GestureType, number> = new Map();
  private pendingGestures: Map<GestureType, NodeJS.Timeout> = new Map();
  private defaultDebounceMs = 300;
  
  shouldEmit(type: GestureType, debounceMs?: number): boolean {
    const last = this.lastEmitTime.get(type) ?? 0;
    const now = Date.now();
    const ms = debounceMs ?? this.defaultDebounceMs;
    return (now - last) >= ms;
  }
  
  emit(
    event: GestureEvent,
    callback: GestureCallback,
    debounceMs?: number
  ): void {
    const ms = debounceMs ?? this.defaultDebounceMs;
    
    // Cancel pending gesture of same type
    const pending = this.pendingGestures.get(event.type);
    if (pending) {
      clearTimeout(pending);
    }
    
    // For discrete gestures, emit immediately
    if (!event.isContinuous) {
      if (this.shouldEmit(event.type, ms)) {
        this.lastEmitTime.set(event.type, Date.now());
        callback(event);
      }
      return;
    }
    
    // For continuous gestures, debounce
    const timeout = setTimeout(() => {
      if (this.shouldEmit(event.type, ms)) {
        this.lastEmitTime.set(event.type, Date.now());
        callback(event);
      }
      this.pendingGestures.delete(event.type);
    }, Math.min(ms, 50));  // Use shorter delay for continuous
    
    this.pendingGestures.set(event.type, timeout);
  }
  
  clear(): void {
    this.pendingGestures.forEach(clearTimeout);
    this.pendingGestures.clear();
    this.lastEmitTime.clear();
  }
}

// ============================================================================
// Cursor Smoother (Additional smoothing layer in JS)
// ============================================================================

class CursorSmoother {
  private alpha: number;
  private smoothedX = 0;
  private smoothedY = 0;
  private initialized = false;
  
  constructor(alpha: number = 0.3) {
    this.alpha = alpha;
  }
  
  smooth(x: number, y: number): { x: number; y: number } {
    if (!this.initialized) {
      this.smoothedX = x;
      this.smoothedY = y;
      this.initialized = true;
      return { x, y };
    }
    
    this.smoothedX += this.alpha * (x - this.smoothedX);
    this.smoothedY += this.alpha * (y - this.smoothedY);
    
    return {
      x: this.smoothedX,
      y: this.smoothedY,
    };
  }
  
  setAlpha(alpha: number): void {
    this.alpha = Math.max(0.01, Math.min(1, alpha));
  }
  
  reset(): void {
    this.initialized = false;
  }
}

// ============================================================================
// Main Hook
// ============================================================================

export function useGestureRecognizer(
  options: UseGestureRecognizerOptions = {}
): UseGestureRecognizerReturn {
  const {
    config = {},
    autoStart = true,
    onGesture,
    onCursorMove,
    onError,
    filter = {},
    enableCursorTracking = true,
    cursorSmoothing = 0.3,
  } = options;

  // State
  const [currentGesture, setCurrentGesture] = useState<GestureEvent | null>(null);
  const [cursorPosition, setCursorPosition] = useState<CursorMoveEvent | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const subscriptionsRef = useRef<EmitterSubscription[]>([]);
  const configRef = useRef<GestureConfig>({ ...DefaultGestureConfig, ...config });
  const conflictResolverRef = useRef(new GestureConflictResolver());
  const debouncerRef = useRef(new GestureDebouncer());
  const cursorSmootherRef = useRef(new CursorSmoother(cursorSmoothing));
  const gestureCallbacksRef = useRef<Set<GestureCallback>>(new Set());
  const cursorCallbacksRef = useRef<Set<CursorCallback>>(new Set());
  
  // Add main callback to refs
  useEffect(() => {
    if (onGesture) {
      gestureCallbacksRef.current.add(onGesture);
      return () => {
        gestureCallbacksRef.current.delete(onGesture);
      };
    }
  }, [onGesture]);
  
  useEffect(() => {
    if (onCursorMove) {
      cursorCallbacksRef.current.add(onCursorMove);
      return () => {
        cursorCallbacksRef.current.delete(onCursorMove);
      };
    }
  }, [onCursorMove]);

  // ========================================================================
  // Event Handlers
  // ========================================================================

  const handleGestureEvent = useCallback(
    (event: GestureEvent) => {
      // Apply filter
      if (filter.minConfidence && event.confidence < filter.minConfidence) {
        return;
      }
      
      if (filter.gestureTypes && !filter.gestureTypes.includes(event.type)) {
        return;
      }
      
      if (filter.minDuration && event.duration < filter.minDuration) {
        return;
      }
      
      // Update state
      setCurrentGesture(event);
      
      // Check if gesture is active
      if (event.state === GestureState.ACTIVE || event.state === GestureState.HELD) {
        conflictResolverRef.current.setActive(event.type, true);
        setIsTracking(true);
      } else if (event.state === GestureState.RELEASED) {
        conflictResolverRef.current.setActive(event.type, false);
      }
      
      // Emit to all callbacks with debouncing
      gestureCallbacksRef.current.forEach((callback) => {
        debouncerRef.current.emit(event, callback, filter.debounceMs);
      });
    },
    [filter]
  );

  const handleCursorEvent = useCallback(
    (event: CursorMoveEvent) => {
      // Apply additional smoothing
      const smoothed = cursorSmootherRef.current.smooth(event.x, event.y);
      
      const smoothedEvent: CursorMoveEvent = {
        ...event,
        x: smoothed.x,
        y: smoothed.y,
      };
      
      setCursorPosition(smoothedEvent);
      
      // Emit to all callbacks
      cursorCallbacksRef.current.forEach((callback) => {
        callback(smoothedEvent);
      });
    },
    []
  );

  // ========================================================================
  // Setup Event Listeners
  // ========================================================================

  useEffect(() => {
    if (Platform.OS !== 'android' || !eventEmitter) return;

    const gestureSub = eventEmitter.addListener(
      GestureEvents.GESTURE_DETECTED,
      handleGestureEvent
    );

    const cursorSub = eventEmitter.addListener(
      GestureEvents.CURSOR_MOVED,
      handleCursorEvent
    );

    subscriptionsRef.current = [gestureSub, cursorSub];

    // Add listeners to native module
    GestureRecognizer.addListener(GestureEvents.GESTURE_DETECTED);
    if (enableCursorTracking) {
      GestureRecognizer.addListener(GestureEvents.CURSOR_MOVED);
    }

    return () => {
      subscriptionsRef.current.forEach((sub) => sub.remove());
      subscriptionsRef.current = [];
      GestureRecognizer.removeListeners(subscriptionsRef.current.length);
    };
  }, [handleGestureEvent, handleCursorEvent, enableCursorTracking]);

  // ========================================================================
  // Auto-start
  // ========================================================================

  useEffect(() => {
    if (autoStart && Platform.OS === 'android') {
      initialize();
    }
    
    return () => {
      if (isInitialized) {
        GestureRecognizer.release();
      }
    };
  }, []);

  // ========================================================================
  // Actions
  // ========================================================================

  const initialize = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      setError('GestureRecognizer is only available on Android');
      return false;
    }

    try {
      const result = await GestureRecognizer.initialize();
      setIsInitialized(result);
      
      if (result) {
        // Set screen dimensions
        const { width, height } = Dimensions.get('window');
        GestureRecognizer.setScreenSize(width, height);
        
        // Apply config
        GestureRecognizer.setConfig(configRef.current);
      }
      
      return result;
    } catch (err) {
      const errorMsg = `Failed to initialize: ${err}`;
      setError(errorMsg);
      onError?.(errorMsg);
      return false;
    }
  }, [onError]);

  const processLandmarks = useCallback(
    async (
      landmarksX: number[],
      landmarksY: number[],
      landmarksZ: number[],
      confidence: number,
      isRightHand: boolean,
      timestamp: number
    ): Promise<number> => {
      if (!isInitialized) {
        throw new Error('GestureRecognizer not initialized');
      }
      
      try {
        const gesture = await GestureRecognizer.processLandmarks(
          landmarksX,
          landmarksY,
          landmarksZ,
          confidence,
          isRightHand,
          timestamp
        );
        return gesture;
      } catch (err) {
        const errorMsg = `Failed to process landmarks: ${err}`;
        setError(errorMsg);
        onError?.(errorMsg);
        return GestureType.NONE;
      }
    },
    [isInitialized, onError]
  );

  const setScreenSize = useCallback((width: number, height: number) => {
    GestureRecognizer.setScreenSize(width, height);
  }, []);

  const updateConfig = useCallback((newConfig: Partial<GestureConfig>) => {
    configRef.current = { ...configRef.current, ...newConfig };
    
    if (isInitialized) {
      GestureRecognizer.setConfig(configRef.current);
    }
    
    // Update cursor smoothing
    if (newConfig.cursorSmoothing !== undefined) {
      cursorSmootherRef.current.setAlpha(newConfig.cursorSmoothing);
    }
  }, [isInitialized]);

  const reset = useCallback(() => {
    setCurrentGesture(null);
    setCursorPosition(null);
    setIsTracking(false);
    setError(null);
    conflictResolverRef.current.clear();
    debouncerRef.current.clear();
    cursorSmootherRef.current.reset();
  }, []);

  // ========================================================================
  // Callback Registration
  // ========================================================================

  const onGestureCallback = useCallback((callback: GestureCallback): (() => void) => {
    gestureCallbacksRef.current.add(callback);
    return () => {
      gestureCallbacksRef.current.delete(callback);
    };
  }, []);

  const onCursorMoveCallback = useCallback((callback: CursorCallback): (() => void) => {
    cursorCallbacksRef.current.add(callback);
    return () => {
      cursorCallbacksRef.current.delete(callback);
    };
  }, []);

  // ========================================================================
  // Return
  // ========================================================================

  return {
    currentGesture,
    cursorPosition,
    isInitialized,
    isTracking,
    error,
    initialize,
    processLandmarks,
    setScreenSize,
    updateConfig,
    reset,
    onGesture: onGestureCallback,
    onCursorMove: onCursorMoveCallback,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for specific gesture types
 */
export function useGestureDetection(
  gestureTypes: GestureType[],
  callback: GestureCallback,
  options: Omit<UseGestureRecognizerOptions, 'onGesture'> = {}
) {
  const filter = useMemo(() => ({
    ...options.filter,
    gestureTypes,
  }), [gestureTypes, options.filter]);

  return useGestureRecognizer({
    ...options,
    filter,
    onGesture: callback,
  });
}

/**
 * Hook for cursor control only
 */
export function useGestureCursor(
  callback: CursorCallback,
  smoothing: number = 0.3
) {
  return useGestureRecognizer({
    enableCursorTracking: true,
    cursorSmoothing: smoothing,
    onCursorMove: callback,
  });
}

/**
 * Hook for gesture-triggered actions
 */
export function useGestureAction(
  actionMap: Partial<Record<GestureType, () => void>>,
  options: UseGestureRecognizerOptions = {}
) {
  const handleGesture = useCallback(
    (event: GestureEvent) => {
      const action = actionMap[event.type];
      if (action && event.state === GestureState.ACTIVE) {
        action();
      }
    },
    [actionMap]
  );

  return useGestureRecognizer({
    ...options,
    onGesture: handleGesture,
  });
}

export default useGestureRecognizer;
