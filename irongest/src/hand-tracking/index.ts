/**
 * IronGest - Hand Tracking TypeScript Types
 * Production-grade type definitions for hand tracking module
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

// ============================================================================
// Constants
// ============================================================================

/** Number of landmarks per hand (MediaPipe standard) */
export const NUM_HAND_LANDMARKS = 21 as const;

/** Landmark indices as defined by MediaPipe Hands */
export const LandmarkIndex = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_FINGER_MCP: 5,
  INDEX_FINGER_PIP: 6,
  INDEX_FINGER_DIP: 7,
  INDEX_FINGER_TIP: 8,
  MIDDLE_FINGER_MCP: 9,
  MIDDLE_FINGER_PIP: 10,
  MIDDLE_FINGER_DIP: 11,
  MIDDLE_FINGER_TIP: 12,
  RING_FINGER_MCP: 13,
  RING_FINGER_PIP: 14,
  RING_FINGER_DIP: 15,
  RING_FINGER_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

/** Finger type enumeration */
export enum FingerType {
  THUMB = 'THUMB',
  INDEX = 'INDEX',
  MIDDLE = 'MIDDLE',
  RING = 'RING',
  PINKY = 'PINKY',
}

/** Hand side enumeration */
export enum HandSide {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
}

/** Finger color mapping for visualization */
export const FingerColors: Record<FingerType, string> = {
  [FingerType.THUMB]: '#FF6B6B',   // Red
  [FingerType.INDEX]: '#4ECDC4',   // Teal
  [FingerType.MIDDLE]: '#FFE66D',  // Yellow
  [FingerType.RING]: '#95E1D3',    // Mint
  [FingerType.PINKY]: '#DDA0DD',   // Plum
};

// ============================================================================
// Data Types
// ============================================================================

/**
 * 3D Point with normalized coordinates
 */
export interface Point3D {
  /** X coordinate (normalized 0-1, left to right) */
  x: number;
  /** Y coordinate (normalized 0-1, top to bottom) */
  y: number;
  /** Z coordinate (depth relative to wrist) */
  z: number;
}

/**
 * Complete hand landmarks for one hand
 */
export interface HandLandmarks {
  /** Array of 21 3D landmark points */
  landmarks: Point3D[];
  /** Which hand this is */
  handSide: HandSide;
  /** Detection confidence (0-1) */
  confidence: number;
  /** Frame timestamp in milliseconds */
  timestamp: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
  /** Frame ID for tracking */
  frameId: number;
}

/**
 * Tracking event emitted from native module
 */
export interface TrackingEvent {
  /** Frame identifier */
  frameId: number;
  /** X coordinates of all 21 landmarks */
  landmarksX: number[];
  /** Y coordinates of all 21 landmarks */
  landmarksY: number[];
  /** Z coordinates of all 21 landmarks */
  landmarksZ: number[];
  /** Which hand was detected */
  handSide: HandSide;
  /** Detection confidence */
  confidence: number;
  /** Timestamp in milliseconds */
  timestamp: number;
  /** Processing time in milliseconds */
  processingTimeMs: number;
}

/**
 * Performance statistics event
 */
export interface PerformanceEvent {
  /** Average FPS over last 30 frames */
  avgFps: number;
  /** Minimum FPS observed */
  minFps: number;
  /** Maximum FPS observed */
  maxFps: number;
  /** Average processing time in milliseconds */
  avgProcessingTimeMs: number;
  /** Current frame queue depth */
  queueDepth: number;
  /** Total frames processed since start */
  totalFramesProcessed: number;
  /** Total frames skipped due to overload */
  totalFramesSkipped: number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Hand tracking configuration
 */
export interface HandTrackingConfig {
  /** Maximum number of hands to detect (1-2) */
  numHands?: number;
  /** Minimum confidence for initial hand detection (0-1) */
  minDetectionConfidence?: number;
  /** Minimum confidence for hand tracking (0-1) */
  minTrackingConfidence?: number;
  /** Use GPU acceleration */
  useGpu?: boolean;
  /** Target frame rate (15-60) */
  targetFps?: number;
  /** Enable frame skipping under CPU load */
  enableFrameSkipping?: boolean;
}

/**
 * Default hand tracking configuration
 */
export const DefaultHandTrackingConfig: Required<HandTrackingConfig> = {
  numHands: 2,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
  useGpu: true,
  targetFps: 30,
  enableFrameSkipping: true,
};

// ============================================================================
// Hand Skeleton Types
// ============================================================================

/** Connection between two landmarks */
export interface LandmarkConnection {
  /** Start landmark index */
  start: number;
  /** End landmark index */
  end: number;
  /** Finger this connection belongs to */
  finger: FingerType;
}

/**
 * All hand connections for skeleton drawing
 */
export const HAND_CONNECTIONS: LandmarkConnection[] = [
  // Thumb
  { start: 0, end: 1, finger: FingerType.THUMB },
  { start: 1, end: 2, finger: FingerType.THUMB },
  { start: 2, end: 3, finger: FingerType.THUMB },
  { start: 3, end: 4, finger: FingerType.THUMB },
  
  // Index finger
  { start: 0, end: 5, finger: FingerType.INDEX },
  { start: 5, end: 6, finger: FingerType.INDEX },
  { start: 6, end: 7, finger: FingerType.INDEX },
  { start: 7, end: 8, finger: FingerType.INDEX },
  
  // Middle finger
  { start: 0, end: 9, finger: FingerType.MIDDLE },
  { start: 9, end: 10, finger: FingerType.MIDDLE },
  { start: 10, end: 11, finger: FingerType.MIDDLE },
  { start: 11, end: 12, finger: FingerType.MIDDLE },
  
  // Ring finger
  { start: 0, end: 13, finger: FingerType.RING },
  { start: 13, end: 14, finger: FingerType.RING },
  { start: 14, end: 15, finger: FingerType.RING },
  { start: 15, end: 16, finger: FingerType.RING },
  
  // Pinky finger
  { start: 0, end: 17, finger: FingerType.PINKY },
  { start: 17, end: 18, finger: FingerType.PINKY },
  { start: 18, end: 19, finger: FingerType.PINKY },
  { start: 19, end: 20, finger: FingerType.PINKY },
  
  // Palm connections
  { start: 5, end: 9, finger: FingerType.INDEX },
  { start: 9, end: 13, finger: FingerType.MIDDLE },
  { start: 13, end: 17, finger: FingerType.RING },
];

/**
 * Get finger type for a landmark index
 */
export function getFingerForLandmark(index: number): FingerType {
  if (index >= 1 && index <= 4) return FingerType.THUMB;
  if (index >= 5 && index <= 8) return FingerType.INDEX;
  if (index >= 9 && index <= 12) return FingerType.MIDDLE;
  if (index >= 13 && index <= 16) return FingerType.RING;
  if (index >= 17 && index <= 20) return FingerType.PINKY;
  return FingerType.THUMB;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert tracking event to hand landmarks
 */
export function trackingEventToLandmarks(event: TrackingEvent): HandLandmarks {
  const landmarks: Point3D[] = event.landmarksX.map((x, i) => ({
    x,
    y: event.landmarksY[i],
    z: event.landmarksZ[i],
  }));
  
  return {
    landmarks,
    handSide: event.handSide,
    confidence: event.confidence,
    timestamp: event.timestamp,
    processingTimeMs: event.processingTimeMs,
    frameId: event.frameId,
  };
}

/**
 * Calculate distance between two landmarks
 */
export function landmarkDistance(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate 2D distance (ignoring Z)
 */
export function landmarkDistance2D(a: Point3D, b: Point3D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Get palm center from landmarks
 */
export function getPalmCenter(landmarks: Point3D[]): Point3D {
  const indices = [0, 5, 9, 13, 17];
  let sumX = 0, sumY = 0, sumZ = 0;
  
  for (const i of indices) {
    sumX += landmarks[i].x;
    sumY += landmarks[i].y;
    sumZ += landmarks[i].z;
  }
  
  return {
    x: sumX / indices.length,
    y: sumY / indices.length,
    z: sumZ / indices.length,
  };
}

// ============================================================================
// Event Names
// ============================================================================

export const HandTrackingEvents = {
  LANDMARKS_DETECTED: 'onLandmarksDetected',
  PERFORMANCE_UPDATE: 'onPerformanceUpdate',
  ERROR: 'onTrackingError',
} as const;
