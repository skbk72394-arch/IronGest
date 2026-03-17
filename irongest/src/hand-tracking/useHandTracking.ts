/**
 * IronGest - Hand Tracking Hook
 * Production-grade React hook for hand tracking with 30fps landmark updates
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { NativeEventEmitter, NativeModules, Platform } from 'react-native';
import type { EmitterSubscription } from 'react-native';

import {
  HandTrackingConfig,
  DefaultHandTrackingConfig,
  HandLandmarks,
  TrackingEvent,
  PerformanceEvent,
  TrackingErrorEvent,
  trackingEventToLandmarks,
  HandTrackingEvents,
  Point3D,
  HandSide,
} from './index';

// Native module reference
const { HandTracking } = NativeModules;

// Event emitter for native events
const eventEmitter = Platform.OS === 'android' 
  ? new NativeEventEmitter(HandTracking)
  : null;

// ============================================================================
// Types
// ============================================================================

interface UseHandTrackingOptions {
  /** Hand tracking configuration */
  config?: Partial<HandTrackingConfig>;
  /** Auto-start tracking on mount */
  autoStart?: boolean;
  /** Callback when landmarks are detected */
  onLandmarksDetected?: (landmarks: HandLandmarks) => void;
  /** Callback when tracking performance updates */
  onPerformanceUpdate?: (stats: PerformanceEvent) => void;
  /** Callback when an error occurs */
  onError?: (error: TrackingErrorEvent) => void;
  /** Smoothing factor for landmark positions (0-1) */
  smoothingFactor?: number;
  /** Minimum confidence threshold to emit events */
  minConfidence?: number;
}

interface UseHandTrackingReturn {
  /** Current hand landmarks */
  landmarks: HandLandmarks | null;
  /** Is the module initialized */
  isInitialized: boolean;
  /** Is tracking active */
  isRunning: boolean;
  /** Is tracking paused */
  isPaused: boolean;
  /** Current performance stats */
  performance: PerformanceEvent | null;
  /** Last error message */
  error: string | null;
  /** Current FPS */
  fps: number;
  /** Initialize the hand tracking module */
  initialize: () => Promise<boolean>;
  /** Start tracking */
  start: () => Promise<boolean>;
  /** Stop tracking */
  stop: () => void;
  /** Pause tracking */
  pause: () => void;
  /** Resume tracking */
  resume: () => void;
  /** Update configuration */
  updateConfig: (config: Partial<HandTrackingConfig>) => void;
  /** Release resources */
  release: () => void;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useHandTracking(
  options: UseHandTrackingOptions = {}
): UseHandTrackingReturn {
  const {
    config: userConfig,
    autoStart = true,
    onLandmarksDetected,
    onPerformanceUpdate,
    onError,
    smoothingFactor = 0.3,
    minConfidence = 0.5,
  } = options;

  // State
  const [landmarks, setLandmarks] = useState<HandLandmarks | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [performance, setPerformance] = useState<PerformanceEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);

  // Refs
  const subscriptionsRef = useRef<EmitterSubscription[]>([]);
  const configRef = useRef<HandTrackingConfig>({
    ...DefaultHandTrackingConfig,
    ...userConfig,
  });
  const smoothedLandmarksRef = useRef<Point3D[]>([]);
  const lastLandmarksRef = useRef<HandLandmarks | null>(null);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());

  // ========================================================================
  // Smooth landmark positions
  // ========================================================================

  const smoothLandmarks = useCallback(
    (newLandmarks: Point3D[]): Point3D[] => {
      if (smoothedLandmarksRef.current.length === 0) {
        smoothedLandmarksRef.current = [...newLandmarks];
        return newLandmarks;
      }

      const smoothed = newLandmarks.map((lm, i) => {
        const prev = smoothedLandmarksRef.current[i];
        if (!prev) return lm;

        return {
          x: prev.x + (lm.x - prev.x) * smoothingFactor,
          y: prev.y + (lm.y - prev.y) * smoothingFactor,
          z: prev.z + (lm.z - prev.z) * smoothingFactor,
        };
      });

      smoothedLandmarksRef.current = smoothed;
      return smoothed;
    },
    [smoothingFactor]
  );

  // ========================================================================
  // Event Handlers
  // ========================================================================

  const handleLandmarksDetected = useCallback(
    (event: TrackingEvent) => {
      // Filter by confidence
      if (event.confidence < minConfidence) return;

      // Convert to HandLandmarks
      const rawLandmarks = trackingEventToLandmarks(event);
      
      // Apply smoothing
      const smoothed = smoothLandmarks(rawLandmarks.landmarks);
      
      const handLandmarks: HandLandmarks = {
        ...rawLandmarks,
        landmarks: smoothed,
      };

      // Update state
      lastLandmarksRef.current = handLandmarks;
      setLandmarks(handLandmarks);

      // Update FPS
      frameCountRef.current++;
      const now = Date.now();
      const elapsed = now - lastFpsTimeRef.current;
      if (elapsed >= 1000) {
        const currentFps = (frameCountRef.current * 1000) / elapsed;
        setFps(Math.round(currentFps * 10) / 10);
        frameCountRef.current = 0;
        lastFpsTimeRef.current = now;
      }

      // Callback
      onLandmarksDetected?.(handLandmarks);
    },
    [minConfidence, smoothLandmarks, onLandmarksDetected]
  );

  const handlePerformanceUpdate = useCallback(
    (event: PerformanceEvent) => {
      setPerformance(event);
      onPerformanceUpdate?.(event);
    },
    [onPerformanceUpdate]
  );

  const handleError = useCallback(
    (event: TrackingErrorEvent) => {
      setError(event.message);
      onError?.(event);
    },
    [onError]
  );

  // ========================================================================
  // Setup Event Listeners
  // ========================================================================

  useEffect(() => {
    if (Platform.OS !== 'android' || !eventEmitter) return;

    // Subscribe to events
    const landmarksSub = eventEmitter.addListener(
      HandTrackingEvents.LANDMARKS_DETECTED,
      handleLandmarksDetected
    );

    const performanceSub = eventEmitter.addListener(
      HandTrackingEvents.PERFORMANCE_UPDATE,
      handlePerformanceUpdate
    );

    const errorSub = eventEmitter.addListener(
      HandTrackingEvents.ERROR,
      handleError
    );

    subscriptionsRef.current = [landmarksSub, performanceSub, errorSub];

    return () => {
      subscriptionsRef.current.forEach((sub) => sub.remove());
      subscriptionsRef.current = [];
    };
  }, [handleLandmarksDetected, handlePerformanceUpdate, handleError]);

  // ========================================================================
  // Actions
  // ========================================================================

  const initialize = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      console.warn('Hand tracking is only available on Android');
      return false;
    }

    try {
      const result = await HandTracking.initialize();
      setIsInitialized(result);

      if (result) {
        // Apply configuration
        HandTracking.setConfig(configRef.current);
      }

      return result;
    } catch (err) {
      setError(`Failed to initialize: ${err}`);
      return false;
    }
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!isInitialized) {
      const initResult = await initialize();
      if (!initResult) return false;
    }

    try {
      const result = await HandTracking.start();
      setIsRunning(result);
      return result;
    } catch (err) {
      setError(`Failed to start: ${err}`);
      return false;
    }
  }, [isInitialized, initialize]);

  const stop = useCallback(() => {
    if (!isRunning) return;

    try {
      HandTracking.stop();
      setIsRunning(false);
      setIsPaused(false);
      setLandmarks(null);
      smoothedLandmarksRef.current = [];
    } catch (err) {
      setError(`Failed to stop: ${err}`);
    }
  }, [isRunning]);

  const pause = useCallback(() => {
    if (!isRunning || isPaused) return;

    try {
      HandTracking.pause();
      setIsPaused(true);
    } catch (err) {
      setError(`Failed to pause: ${err}`);
    }
  }, [isRunning, isPaused]);

  const resume = useCallback(() => {
    if (!isRunning || !isPaused) return;

    try {
      HandTracking.resume();
      setIsPaused(false);
    } catch (err) {
      setError(`Failed to resume: ${err}`);
    }
  }, [isRunning, isPaused]);

  const updateConfig = useCallback(
    (newConfig: Partial<HandTrackingConfig>) => {
      configRef.current = {
        ...configRef.current,
        ...newConfig,
      };

      if (isInitialized) {
        HandTracking.setConfig(configRef.current);
      }
    },
    [isInitialized]
  );

  const release = useCallback(() => {
    try {
      stop();
      HandTracking.release();
      setIsInitialized(false);
      setLandmarks(null);
      setPerformance(null);
      setError(null);
    } catch (err) {
      setError(`Failed to release: ${err}`);
    }
  }, [stop]);

  // ========================================================================
  // Auto-start
  // ========================================================================

  useEffect(() => {
    if (autoStart) {
      initialize().then((success) => {
        if (success) {
          start();
        }
      });
    }

    return () => {
      release();
    };
  }, [autoStart]);

  // ========================================================================
  // Return
  // ========================================================================

  return {
    landmarks,
    isInitialized,
    isRunning,
    isPaused,
    performance,
    error,
    fps,
    initialize,
    start,
    stop,
    pause,
    resume,
    updateConfig,
    release,
  };
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for tracking a single hand with dominant hand detection
 */
export function useDominantHand(
  options: UseHandTrackingOptions = {}
): UseHandTrackingReturn & { dominantHand: HandSide | null } {
  const tracking = useHandTracking(options);
  
  const dominantHand = tracking.landmarks?.handSide ?? null;

  return {
    ...tracking,
    dominantHand,
  };
}

/**
 * Hook for tracking both hands simultaneously
 */
export function useBothHands(
  options: UseHandTrackingOptions = {}
): UseHandTrackingReturn & {
  leftHand: HandLandmarks | null;
  rightHand: HandLandmarks | null;
} {
  const [leftHand, setLeftHand] = useState<HandLandmarks | null>(null);
  const [rightHand, setRightHand] = useState<HandLandmarks | null>(null);

  const handleLandmarksDetected = useCallback(
    (landmarks: HandLandmarks) => {
      if (landmarks.handSide === HandSide.LEFT) {
        setLeftHand(landmarks);
      } else {
        setRightHand(landmarks);
      }
      options.onLandmarksDetected?.(landmarks);
    },
    [options]
  );

  const tracking = useHandTracking({
    ...options,
    config: {
      ...options.config,
      numHands: 2,
    },
    onLandmarksDetected: handleLandmarksDetected,
  });

  return {
    ...tracking,
    leftHand,
    rightHand,
  };
}

export default useHandTracking;
