/**
 * IronGest - Calibration Screen
 * Hand size calibration with animated guide
 *
 * Features:
 * - Interactive hand positioning guide
 * - Animated hand outline
 * - Real-time calibration feedback
 * - Sensitivity adjustment
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  withDelay,
  interpolate,
  Easing,
  runOnJS,
  cancelAnimation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Colors, FontSizes, Spacing, BorderRadius, Durations } from '../theme';
import { HUDPanel, HUDButton, HUDSlider } from '../components/HUDComponents';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// Types
// ============================================================================

interface CalibrationState {
  stage: 'position' | 'measure' | 'verify' | 'complete';
  handDetected: boolean;
  handSize: number;
  sensitivity: number;
  accuracy: number;
}

// ============================================================================
// Animated Hand Guide Component
// ============================================================================

interface HandGuideProps {
  visible: boolean;
  onPositioned?: () => void;
}

const HandGuide: React.FC<HandGuideProps> = ({ visible, onPositioned }) => {
  const pulseAnim = useSharedValue(1);
  const outlineAnim = useSharedValue(0);
  const dotAnims = Array.from({ length: 21 }, () => useSharedValue(0));

  useEffect(() => {
    if (visible) {
      // Pulse animation
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      // Outline drawing animation
      outlineAnim.value = withTiming(1, { duration: 2000 }, () => {
        runOnJS(onPositioned)?.();
      });

      // Landmark dot animations
      dotAnims.forEach((anim, index) => {
        anim.value = withDelay(
          index * 50,
          withSpring(1, { damping: 15, stiffness: 200 })
        );
      });
    }
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    opacity: interpolate(outlineAnim.value, [0, 0.3, 1], [0, 0.5, 1]),
  }));

  // Hand outline path (simplified)
  const handPath = `
    M 100 180
    L 100 130
    Q 100 120 95 110
    L 95 70
    Q 95 55 85 55
    Q 75 55 75 70
    L 75 110
    L 75 55
    Q 75 40 65 40
    Q 55 40 55 55
    L 55 115
    L 55 50
    Q 55 35 45 35
    Q 35 35 35 50
    L 35 120
    L 35 70
    Q 35 55 25 55
    Q 15 55 15 70
    L 15 130
    Q 15 160 40 180
    L 100 180
    Z
  `;

  // Landmark positions (21 points)
  const landmarks = [
    { x: 100, y: 170 }, // Wrist
    { x: 85, y: 150 },  // Thumb CMC
    { x: 80, y: 130 },  // Thumb MCP
    { x: 78, y: 115 },  // Thumb IP
    { x: 75, y: 100 },  // Thumb tip
    { x: 55, y: 140 },  // Index MCP
    { x: 50, y: 120 },  // Index PIP
    { x: 48, y: 100 },  // Index DIP
    { x: 45, y: 85 },   // Index tip
    { x: 40, y: 145 },  // Middle MCP
    { x: 38, y: 125 },  // Middle PIP
    { x: 36, y: 105 },  // Middle DIP
    { x: 35, y: 90 },   // Middle tip
    { x: 25, y: 150 },  // Ring MCP
    { x: 22, y: 130 },  // Ring PIP
    { x: 20, y: 115 },  // Ring DIP
    { x: 18, y: 100 },  // Ring tip
    { x: 10, y: 160 },  // Pinky MCP
    { x: 8, y: 145 },   // Pinky PIP
    { x: 6, y: 130 },   // Pinky DIP
    { x: 5, y: 115 },   // Pinky tip
  ];

  return (
    <Animated.View style={[styles.handGuideContainer, containerStyle]}>
      <Svg width={200} height={200} viewBox="0 0 200 200">
        <Defs>
          <RadialGradient id="handGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={Colors.primary} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={Colors.primary} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Hand glow */}
        <Circle cx="60" cy="120" r="80" fill="url(#handGlow)" />

        {/* Hand outline */}
        <Path
          d={handPath}
          fill="none"
          stroke={Colors.primary}
          strokeWidth={2}
          strokeDasharray="1000"
          strokeDashoffset={1000 * (1 - 1)} // Animated via outlineAnim
        />

        {/* Landmark dots */}
        {landmarks.map((point, index) => (
          <AnimatedCircle
            key={index}
            cx={point.x}
            cy={point.y}
            r={4}
            fill={Colors.primary}
            opacity={dotAnims[index]}
          />
        ))}
      </Svg>

      {/* Instruction text */}
      <Text style={styles.handGuideText}>
        Position your hand inside the outline
      </Text>
    </Animated.View>
  );
};

// Animated Circle component for SVG
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ============================================================================
// Calibration Progress Component
// ============================================================================

interface CalibrationProgressProps {
  stage: CalibrationState['stage'];
  accuracy: number;
}

const CalibrationProgress: React.FC<CalibrationProgressProps> = ({ stage, accuracy }) => {
  const stages = ['position', 'measure', 'verify', 'complete'];
  const currentIndex = stages.indexOf(stage);

  return (
    <View style={styles.progressContainer}>
      {stages.map((s, index) => {
        const isActive = index === currentIndex;
        const isPast = index < currentIndex;

        return (
          <View key={s} style={styles.progressStep}>
            <View
              style={[
                styles.progressDot,
                isActive && styles.progressDotActive,
                isPast && styles.progressDotComplete,
              ]}
            >
              {isPast && <Text style={styles.progressCheck}>✓</Text>}
              {isActive && <View style={styles.progressDotInner} />}
            </View>
            <Text
              style={[
                styles.progressLabel,
                isActive && styles.progressLabelActive,
              ]}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </Text>
            {index < stages.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  isPast && styles.progressLineComplete,
                ]}
              />
            )}
          </View>
        );
      })}
    </View>
  );
};

// ============================================================================
// Main Calibration Screen
// ============================================================================

interface CalibrationScreenProps {
  onComplete: (config: { sensitivity: number; handSize: number }) => void;
  onSkip?: () => void;
}

export const CalibrationScreen: React.FC<CalibrationScreenProps> = ({
  onComplete,
  onSkip,
}) => {
  const [state, setState] = useState<CalibrationState>({
    stage: 'position',
    handDetected: false,
    handSize: 0,
    sensitivity: 50,
    accuracy: 0,
  });

  const [calibrationArea, setCalibrationArea] = useState({ width: 0, height: 0 });
  const scanAnim = useSharedValue(0);

  // Scan animation
  useEffect(() => {
    if (state.stage === 'measure') {
      scanAnim.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      );
    } else {
      cancelAnimation(scanAnim);
    }
  }, [state.stage]);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanAnim.value * calibrationArea.height }],
  }));

  // Handle layout
  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCalibrationArea({ width, height });
  };

  // Simulate calibration process
  useEffect(() => {
    if (state.stage === 'position' && state.handDetected) {
      // Move to measure stage after hand is positioned
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, stage: 'measure' }));
      }, 1500);
      return () => clearTimeout(timer);
    }

    if (state.stage === 'measure') {
      // Simulate measurement
      const timer = setTimeout(() => {
        setState(prev => ({
          ...prev,
          stage: 'verify',
          handSize: 180, // Simulated hand size in mm
          accuracy: 95,
        }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [state.stage, state.handDetected]);

  // Handle hand positioned
  const handleHandPositioned = () => {
    setState(prev => ({ ...prev, handDetected: true }));
  };

  // Handle sensitivity change
  const handleSensitivityChange = (value: number) => {
    setState(prev => ({ ...prev, sensitivity: value }));
  };

  // Handle complete
  const handleComplete = () => {
    onComplete({
      sensitivity: state.sensitivity,
      handSize: state.handSize,
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CALIBRATION</Text>
        <Text style={styles.subtitle}>
          Let's calibrate IronGest for your hands
        </Text>
      </View>

      {/* Progress */}
      <CalibrationProgress stage={state.stage} accuracy={state.accuracy} />

      {/* Calibration area */}
      <View style={styles.calibrationArea} onLayout={handleLayout}>
        {/* Background grid */}
        <View style={styles.gridBackground}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 10}%` }]} />
          ))}
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 15}%` }]} />
          ))}
        </View>

        {/* Scan line */}
        {state.stage === 'measure' && (
          <Animated.View style={[styles.scanLine, scanStyle]}>
            <LinearGradient
              colors={['transparent', Colors.primary, 'transparent']}
              locations={[0, 0.5, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}

        {/* Hand guide */}
        <HandGuide
          visible={state.stage === 'position' || state.stage === 'measure'}
          onPositioned={handleHandPositioned}
        />

        {/* Status messages */}
        <View style={styles.statusContainer}>
          {state.stage === 'position' && (
            <Text style={styles.statusText}>
              {state.handDetected ? '✓ Hand detected' : 'Waiting for hand...'}
            </Text>
          )}
          {state.stage === 'measure' && (
            <Text style={styles.statusText}>
              Measuring hand size...
            </Text>
          )}
          {state.stage === 'verify' && (
            <View style={styles.verifyContainer}>
              <Text style={styles.verifyTitle}>Calibration Complete!</Text>
              <Text style={styles.verifyText}>
                Hand size: {state.handSize}mm
              </Text>
              <Text style={styles.verifyText}>
                Accuracy: {state.accuracy}%
              </Text>
            </View>
          )}
        </View>

        {/* Corner markers */}
        <View style={[styles.cornerMarker, styles.cornerTopLeft]} />
        <View style={[styles.cornerMarker, styles.cornerTopRight]} />
        <View style={[styles.cornerMarker, styles.cornerBottomLeft]} />
        <View style={[styles.cornerMarker, styles.cornerBottomRight]} />
      </View>

      {/* Sensitivity adjustment */}
      {(state.stage === 'verify' || state.stage === 'complete') && (
        <HUDPanel title="Sensitivity" style={styles.sensitivityPanel}>
          <HUDSlider
            value={state.sensitivity}
            onValueChange={handleSensitivityChange}
            min={10}
            max={100}
            label="Gesture Sensitivity"
          />
          <Text style={styles.sensitivityHint}>
            Lower values = more precise, higher values = more responsive
          </Text>
        </HUDPanel>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        {state.stage === 'verify' || state.stage === 'complete' ? (
          <HUDButton
            title="Complete Setup"
            onPress={handleComplete}
            variant="primary"
            size="lg"
          />
        ) : (
          <View style={styles.footerRow}>
            <HUDButton
              title="Recalibrate"
              onPress={() => setState(prev => ({ ...prev, stage: 'position', handDetected: false }))}
              variant="default"
              size="md"
            />
            {onSkip && (
              <HUDButton
                title="Skip"
                onPress={onSkip}
                variant="ghost"
                size="md"
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  header: {
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  title: {
    fontSize: FontSizes.heading,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 4,
  },

  subtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  // Progress
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },

  progressStep: {
    alignItems: 'center',
  },

  progressDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },

  progressDotActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
  },

  progressDotComplete: {
    backgroundColor: Colors.success,
    borderColor: Colors.success,
  },

  progressDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },

  progressCheck: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '700',
  },

  progressLabel: {
    fontSize: FontSizes.micro,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
    textTransform: 'uppercase',
  },

  progressLabelActive: {
    color: Colors.primary,
  },

  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.surfaceBorder,
    marginHorizontal: Spacing.xs,
  },

  progressLineComplete: {
    backgroundColor: Colors.success,
  },

  // Calibration Area
  calibrationArea: {
    flex: 1,
    marginHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  gridBackground: {
    ...StyleSheet.absoluteFillObject,
  },

  gridLineH: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.gridLine,
  },

  gridLineV: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: Colors.gridLine,
  },

  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
  },

  // Hand Guide
  handGuideContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  handGuideText: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },

  // Status
  statusContainer: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  statusText: {
    fontSize: FontSizes.bodySmall,
    color: Colors.primary,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },

  verifyContainer: {
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },

  verifyTitle: {
    fontSize: FontSizes.subheading,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: Spacing.sm,
  },

  verifyText: {
    fontSize: FontSizes.body,
    color: Colors.text,
    marginVertical: 2,
  },

  // Corner markers
  cornerMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: Colors.primary,
    borderWidth: 2,
  },

  cornerTopLeft: {
    top: 10,
    left: 10,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },

  cornerTopRight: {
    top: 10,
    right: 10,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },

  cornerBottomLeft: {
    bottom: 10,
    left: 10,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },

  cornerBottomRight: {
    bottom: 10,
    right: 10,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },

  // Sensitivity Panel
  sensitivityPanel: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },

  sensitivityHint: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },

  // Footer
  footer: {
    padding: Spacing.lg,
  },

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
});

export default CalibrationScreen;
