/**
 * IronGest - Hand Skeleton Overlay Component
 * Production-grade React Native component for hand skeleton visualization
 * 
 * Features:
 * - SVG-based skeleton rendering
 * - Color-coded fingers
 * - Confidence visualization
 * - 60fps smooth updates using Reanimated worklets
 * - Animated transitions
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, StyleSheet as RNStyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  runOnJS,
  cancelAnimation,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Circle,
  Line,
  Path,
  G,
  Defs,
  LinearGradient,
  Stop,
  Filter,
  FeGaussianBlur,
  FeComposite,
} from 'react-native-svg';

import {
  NUM_HAND_LANDMARKS,
  HAND_CONNECTIONS,
  FingerType,
  FingerColors,
  HandSide,
  Point3D,
  HandLandmarks,
  getFingerForLandmark,
} from './index';

// ============================================================================
// Types
// ============================================================================

interface HandSkeletonOverlayProps {
  /** Array of 21 3D landmark points */
  landmarks: Point3D[];
  /** Which hand is being tracked */
  handSide?: HandSide;
  /** Detection confidence (0-1) */
  confidence?: number;
  /** Width of the view area */
  width?: number;
  /** Height of the view area */
  height?: number;
  /** Show confidence indicator */
  showConfidence?: boolean;
  /** Show landmark points */
  showLandmarks?: boolean;
  /** Show skeleton connections */
  showSkeleton?: boolean;
  /** Show finger labels */
  showLabels?: boolean;
  /** Smoothing factor for animations (0-1) */
  smoothingFactor?: number;
  /** Point radius multiplier */
  pointScale?: number;
  /** Line width multiplier */
  lineWidthScale?: number;
  /** Enable glow effect */
  enableGlow?: boolean;
  /** Custom colors override */
  customColors?: Partial<Record<FingerType, string>>;
  /** Callback when hand is detected */
  onHandDetected?: (landmarks: Point3D[]) => void;
  /** Callback when tracking is lost */
  onTrackingLost?: () => void;
}

interface AnimatedPoint {
  x: SharedValue<number>;
  y: SharedValue<number>;
  z: SharedValue<number>;
}

// ============================================================================
// Constants
// ============================================================================

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Spring configuration for smooth animations
const SPRING_CONFIG = {
  damping: 20,
  stiffness: 300,
  mass: 0.5,
};

const TIMING_CONFIG = {
  duration: 16, // ~60fps
  easing: Easing.out(Easing.cubic),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get color for a finger with optional custom colors
 */
function getFingerColor(
  finger: FingerType,
  customColors?: Partial<Record<FingerType, string>>
): string {
  return customColors?.[finger] ?? FingerColors[finger];
}

/**
 * Interpolate between two points smoothly
 */
function interpolatePoint(
  current: { x: number; y: number },
  target: { x: number; y: number },
  factor: number
): { x: number; y: number } {
  return {
    x: current.x + (target.x - current.x) * factor,
    y: current.y + (target.y - current.y) * factor,
  };
}

// ============================================================================
// Landmark Point Component
// ============================================================================

interface LandmarkPointProps {
  x: SharedValue<number>;
  y: SharedValue<number>;
  z: SharedValue<number>;
  radius: number;
  color: string;
  confidence: SharedValue<number>;
  enableGlow: boolean;
}

const LandmarkPoint: React.FC<LandmarkPointProps> = ({
  x,
  y,
  z,
  radius,
  color,
  confidence,
  enableGlow,
}) => {
  const animatedProps = useAnimatedProps(() => {
    const scale = interpolate(
      z.value,
      [-0.2, 0, 0.2],
      [1.3, 1, 0.7],
      Extrapolate.CLAMP
    );
    
    const opacity = interpolate(
      confidence.value,
      [0.3, 0.7, 1],
      [0.3, 0.8, 1],
      Extrapolate.CLAMP
    );
    
    return {
      cx: x.value,
      cy: y.value,
      r: radius * scale,
      opacity,
    };
  });
  
  return (
    <AnimatedCircle
      animatedProps={animatedProps}
      fill={color}
      stroke={enableGlow ? color : undefined}
      strokeWidth={enableGlow ? 2 : 0}
    />
  );
};

// ============================================================================
// Skeleton Connection Component
// ============================================================================

interface SkeletonConnectionProps {
  startX: SharedValue<number>;
  startY: SharedValue<number>;
  endX: SharedValue<number>;
  endY: SharedValue<number>;
  color: string;
  lineWidth: number;
  confidence: SharedValue<number>;
}

const SkeletonConnection: React.FC<SkeletonConnectionProps> = ({
  startX,
  startY,
  endX,
  endY,
  color,
  lineWidth,
  confidence,
}) => {
  const animatedProps = useAnimatedProps(() => {
    const opacity = interpolate(
      confidence.value,
      [0.3, 0.7, 1],
      [0.3, 0.7, 1],
      Extrapolate.CLAMP
    );
    
    return {
      x1: startX.value,
      y1: startY.value,
      x2: endX.value,
      y2: endY.value,
      opacity,
    };
  });
  
  return (
    <AnimatedLine
      animatedProps={animatedProps}
      stroke={color}
      strokeWidth={lineWidth}
      strokeLinecap="round"
    />
  );
};

// ============================================================================
// Finger Group Component
// ============================================================================

interface FingerGroupProps {
  finger: FingerType;
  landmarkIndices: number[];
  pointSharedValues: AnimatedPoint[];
  confidence: SharedValue<number>;
  pointRadius: number;
  lineWidth: number;
  customColors?: Partial<Record<FingerType, string>>;
  enableGlow: boolean;
}

const FingerGroup: React.FC<FingerGroupProps> = ({
  finger,
  landmarkIndices,
  pointSharedValues,
  confidence,
  pointRadius,
  lineWidth,
  customColors,
  enableGlow,
}) => {
  const color = getFingerColor(finger, customColors);
  
  const connections: JSX.Element[] = [];
  
  // Draw connections between consecutive landmarks
  for (let i = 0; i < landmarkIndices.length - 1; i++) {
    const startIdx = landmarkIndices[i];
    const endIdx = landmarkIndices[i + 1];
    
    connections.push(
      <SkeletonConnection
        key={`conn-${startIdx}-${endIdx}`}
        startX={pointSharedValues[startIdx].x}
        startY={pointSharedValues[startIdx].y}
        endX={pointSharedValues[endIdx].x}
        endY={pointSharedValues[endIdx].y}
        color={color}
        lineWidth={lineWidth}
        confidence={confidence}
      />
    );
  }
  
  return (
    <G key={finger}>
      {connections}
      {landmarkIndices.map((idx) => (
        <LandmarkPoint
          key={`point-${idx}`}
          x={pointSharedValues[idx].x}
          y={pointSharedValues[idx].y}
          z={pointSharedValues[idx].z}
          radius={pointRadius}
          color={color}
          confidence={confidence}
          enableGlow={enableGlow}
        />
      ))}
    </G>
  );
};

// ============================================================================
// Palm Component
// ============================================================================

interface PalmProps {
  pointSharedValues: AnimatedPoint[];
  confidence: SharedValue<number>;
  lineWidth: number;
  customColors?: Partial<Record<FingerType, string>>;
}

const Palm: React.FC<PalmProps> = ({
  pointSharedValues,
  confidence,
  lineWidth,
  customColors,
}) => {
  // Palm connections: 0-5, 5-9, 9-13, 13-17, 17-0
  const palmConnections = [
    [0, 5],
    [5, 9],
    [9, 13],
    [13, 17],
    [17, 0],
  ];
  
  return (
    <G>
      {palmConnections.map(([start, end]) => (
        <SkeletonConnection
          key={`palm-${start}-${end}`}
          startX={pointSharedValues[start].x}
          startY={pointSharedValues[start].y}
          endX={pointSharedValues[end].x}
          endY={pointSharedValues[end].y}
          color={customColors?.INDEX ?? '#FFFFFF'}
          lineWidth={lineWidth * 0.7}
          confidence={confidence}
        />
      ))}
    </G>
  );
};

// ============================================================================
// Confidence Indicator Component
// ============================================================================

interface ConfidenceIndicatorProps {
  confidence: SharedValue<number>;
  x: SharedValue<number>;
  y: SharedValue<number>;
  width: number;
  height: number;
}

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  x,
  y,
  width,
  height,
}) => {
  const animatedProps = useAnimatedProps(() => {
    const barWidth = confidence.value * width;
    const hue = interpolate(
      confidence.value,
      [0, 0.5, 1],
      [0, 60, 120],
      Extrapolate.CLAMP
    );
    
    return {
      width: barWidth,
      fill: `hsl(${hue}, 70%, 50%)`,
    };
  });
  
  const containerProps = useAnimatedProps(() => ({
    x: x.value - width / 2,
    y: y.value - 50,
    opacity: confidence.value > 0.5 ? 1 : 0.5,
  }));
  
  return (
    <AnimatedG animatedProps={containerProps}>
      {/* Background bar */}
      <Rect
        x={0}
        y={0}
        width={width}
        height={6}
        fill="rgba(0, 0, 0, 0.3)"
        rx={3}
      />
      {/* Confidence bar */}
      <AnimatedRect
        animatedProps={animatedProps}
        x={0}
        y={0}
        height={6}
        rx={3}
      />
    </AnimatedG>
  );
};

// ============================================================================
// Main Hand Skeleton Overlay Component
// ============================================================================

const AnimatedRect = Animated.createAnimatedComponent(
  require('react-native-svg').Rect
);

export const HandSkeletonOverlay: React.FC<HandSkeletonOverlayProps> = ({
  landmarks,
  handSide = HandSide.RIGHT,
  confidence = 1,
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  showConfidence = true,
  showLandmarks = true,
  showSkeleton = true,
  smoothingFactor = 0.3,
  pointScale = 1,
  lineWidthScale = 1,
  enableGlow = true,
  customColors,
  onHandDetected,
  onTrackingLost,
}) => {
  // ========================================================================
  // Shared Values for Each Landmark
  // ========================================================================
  
  const pointSharedValues = useRef<AnimatedPoint[]>([]);
  const confidenceShared = useSharedValue(confidence);
  
  // Initialize shared values on first render
  if (pointSharedValues.current.length === 0) {
    for (let i = 0; i < NUM_HAND_LANDMARKS; i++) {
      pointSharedValues.current.push({
        x: useSharedValue(width / 2),
        y: useSharedValue(height / 2),
        z: useSharedValue(0),
      });
    }
  }
  
  // ========================================================================
  // Update Shared Values when landmarks change
  // ========================================================================
  
  useEffect(() => {
    if (!landmarks || landmarks.length !== NUM_HAND_LANDMARKS) {
      if (onTrackingLost) {
        onTrackingLost();
      }
      return;
    }
    
    // Update each landmark position with smooth interpolation
    landmarks.forEach((landmark, index) => {
      const shared = pointSharedValues.current[index];
      if (shared) {
        // Map normalized coordinates to screen coordinates
        const targetX = landmark.x * width;
        const targetY = landmark.y * height;
        const targetZ = landmark.z;
        
        // Apply smooth animation
        shared.x.value = withSpring(targetX, SPRING_CONFIG);
        shared.y.value = withSpring(targetY, SPRING_CONFIG);
        shared.z.value = withTiming(targetZ, TIMING_CONFIG);
      }
    });
    
    // Update confidence
    confidenceShared.value = withTiming(confidence, TIMING_CONFIG);
    
    // Callback
    if (onHandDetected) {
      onHandDetected(landmarks);
    }
  }, [landmarks, confidence, width, height, smoothingFactor]);
  
  // ========================================================================
  // Calculate dimensions
  // ========================================================================
  
  const pointRadius = useMemo(() => {
    const baseRadius = Math.min(width, height) * 0.012;
    return baseRadius * pointScale;
  }, [width, height, pointScale]);
  
  const lineWidth = useMemo(() => {
    const baseWidth = Math.min(width, height) * 0.008;
    return baseWidth * lineWidthScale;
  }, [width, height, lineWidthScale]);
  
  // ========================================================================
  // Finger groups for rendering
  // ========================================================================
  
  const fingerGroups = useMemo(() => [
    { finger: FingerType.THUMB, indices: [1, 2, 3, 4] },
    { finger: FingerType.INDEX, indices: [5, 6, 7, 8] },
    { finger: FingerType.MIDDLE, indices: [9, 10, 11, 12] },
    { finger: FingerType.RING, indices: [13, 14, 15, 16] },
    { finger: FingerType.PINKY, indices: [17, 18, 19, 20] },
  ], []);
  
  // ========================================================================
  // Render
  // ========================================================================
  
  if (!landmarks || landmarks.length !== NUM_HAND_LANDMARKS) {
    return null;
  }
  
  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height} style={styles.svg}>
        {/* Glow filter definition */}
        {enableGlow && (
          <Defs>
            <Filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <FeGaussianBlur stdDeviation="3" result="blur" />
              <FeComposite in="SourceGraphic" in2="blur" operator="over" />
            </Filter>
          </Defs>
        )}
        
        {/* Palm connections */}
        {showSkeleton && (
          <Palm
            pointSharedValues={pointSharedValues.current}
            confidence={confidenceShared}
            lineWidth={lineWidth}
            customColors={customColors}
          />
        )}
        
        {/* Finger groups */}
        {showSkeleton && showLandmarks && fingerGroups.map(({ finger, indices }) => (
          <FingerGroup
            key={finger}
            finger={finger}
            landmarkIndices={indices}
            pointSharedValues={pointSharedValues.current}
            confidence={confidenceShared}
            pointRadius={pointRadius}
            lineWidth={lineWidth}
            customColors={customColors}
            enableGlow={enableGlow}
          />
        ))}
        
        {/* Wrist point */}
        {showLandmarks && (
          <LandmarkPoint
            x={pointSharedValues.current[0].x}
            y={pointSharedValues.current[0].y}
            z={pointSharedValues.current[0].z}
            radius={pointRadius * 1.5}
            color="#FFFFFF"
            confidence={confidenceShared}
            enableGlow={enableGlow}
          />
        )}
        
        {/* Confidence indicator */}
        {showConfidence && (
          <ConfidenceIndicator
            confidence={confidenceShared}
            x={pointSharedValues.current[0].x}
            y={pointSharedValues.current[0].y}
            width={60}
            height={6}
          />
        )}
      </Svg>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = RNStyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
  },
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

// ============================================================================
// Multi-Hand Overlay Component
// ============================================================================

interface MultiHandOverlayProps {
  hands: HandLandmarks[];
  width?: number;
  height?: number;
  config?: Partial<HandSkeletonOverlayProps>;
}

export const MultiHandOverlay: React.FC<MultiHandOverlayProps> = ({
  hands,
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
  config = {},
}) => {
  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      {hands.map((hand, index) => (
        <HandSkeletonOverlay
          key={`${hand.handSide}-${index}`}
          landmarks={hand.landmarks}
          handSide={hand.handSide}
          confidence={hand.confidence}
          width={width}
          height={height}
          {...config}
        />
      ))}
    </View>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default HandSkeletonOverlay;
