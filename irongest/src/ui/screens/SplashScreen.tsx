/**
 * IronGest - Splash Screen
 * Animated Iron Man arc reactor startup screen
 *
 * Features:
 * - Animated arc reactor with pulsing glow
 * - Scanline effects
 * - Boot sequence text
 * - Progress indicators
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  interpolate,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, Spacing, Durations } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// Arc Reactor Component
// ============================================================================

interface ArcReactorProps {
  size: number;
  onAnimationComplete?: () => void;
}

const ArcReactor: React.FC<ArcReactorProps> = ({ size, onAnimationComplete }) => {
  // Animation values
  const outerRing = useSharedValue(0);
  const innerRing = useSharedValue(0);
  const corePulse = useSharedValue(0);
  const glowIntensity = useSharedValue(0);
  const rotation = useSharedValue(0);
  const segments = useSharedValue(0);

  useEffect(() => {
    // Boot sequence animations
    const startAnimations = () => {
      // Outer ring expands
      outerRing.value = withSpring(1, { damping: 15, stiffness: 100 });

      // Inner ring follows
      innerRing.value = withDelay(
        300,
        withSpring(1, { damping: 15, stiffness: 100 })
      );

      // Core starts pulsing
      corePulse.value = withDelay(
        600,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.7, { duration: 1000, easing: Easing.inOut(Easing.ease) })
          ),
          -1,
          true
        )
      );

      // Glow builds up
      glowIntensity.value = withDelay(
        400,
        withTiming(1, { duration: 800 }, () => {
          // Segments appear
          segments.value = withTiming(1, { duration: 600 }, () => {
            runOnJS(onAnimationComplete)?.();
          });
        })
      );

      // Continuous rotation
      rotation.value = withRepeat(
        withTiming(360, { duration: 10000, easing: Easing.linear }),
        -1,
        false
      );
    };

    startAnimations();
  }, []);

  // Outer ring style
  const outerRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: outerRing.value }],
    opacity: outerRing.value,
  }));

  // Inner ring style
  const innerRingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: innerRing.value }, { rotate: `${rotation.value}deg` }],
    opacity: innerRing.value,
  }));

  // Core style
  const coreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: corePulse.value }],
  }));

  // Glow style
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowIntensity.value * 0.8,
    transform: [{ scale: 1 + glowIntensity.value * 0.2 }],
  }));

  // Segments style
  const segmentsStyle = useAnimatedStyle(() => ({
    opacity: segments.value,
    transform: [{ rotate: `${rotation.value * -0.5}deg` }],
  }));

  const center = size / 2;
  const strokeWidth = size * 0.03;

  return (
    <View style={[styles.arcReactorContainer, { width: size, height: size }]}>
      {/* Outer glow */}
      <Animated.View style={[styles.arcReactorGlow, glowStyle, { width: size * 1.5, height: size * 1.5 }]} />

      {/* Outer ring */}
      <Animated.View style={[styles.arcReactorOuter, outerRingStyle, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={[styles.arcReactorRing, { borderWidth: strokeWidth }]} />
      </Animated.View>

      {/* Middle ring with segments */}
      <Animated.View style={[styles.arcReactorMiddle, innerRingStyle, { width: size * 0.7, height: size * 0.7 }]}>
        <View style={[styles.arcReactorRing, { borderWidth: strokeWidth * 0.7 }]} />
        {/* Segments */}
        {[...Array(10)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.arcSegment,
              {
                top: size * 0.35 - strokeWidth * 0.35,
                left: size * 0.35,
                width: size * 0.15,
                height: strokeWidth * 0.7,
                transform: [{ rotate: `${i * 36}deg` }],
                transformOrigin: `${size * 0.15}px ${strokeWidth * 0.35}px`,
              },
            ]}
          />
        ))}
      </Animated.View>

      {/* Inner ring */}
      <Animated.View style={[styles.arcReactorInner, coreStyle, { width: size * 0.4, height: size * 0.4 }]}>
        <View style={[styles.arcReactorRing, { borderWidth: strokeWidth * 0.5 }]} />
      </Animated.View>

      {/* Core */}
      <Animated.View style={[styles.arcReactorCore, coreStyle]}>
        <LinearGradient
          colors={[Colors.primary, Colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </View>
  );
};

// ============================================================================
// Boot Text Component
// ============================================================================

interface BootTextProps {
  lines: string[];
  currentLine: number;
}

const BootText: React.FC<BootTextProps> = ({ lines, currentLine }) => {
  return (
    <View style={styles.bootTextContainer}>
      {lines.slice(0, currentLine + 1).map((line, index) => (
        <Animated.View
          key={index}
          entering={Animated.FadeIn.delay(index * 100)}
          style={styles.bootTextLine}
        >
          <Text style={styles.bootTextPrefix}>[</Text>
          <Text style={[styles.bootTextStatus, { color: index === currentLine ? Colors.warning : Colors.success }]}>
            {index < currentLine ? 'OK' : '..'}
          </Text>
          <Text style={styles.bootTextPrefix}>]</Text>
          <Text style={styles.bootTextContent}>{line}</Text>
        </Animated.View>
      ))}
    </View>
  );
};

// ============================================================================
// Progress Bar Component
// ============================================================================

interface ProgressBarProps {
  progress: number;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    progressAnim.value = withTiming(progress, { duration: 300 });
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  return (
    <View style={styles.progressContainer}>
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>
      <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
    </View>
  );
};

// ============================================================================
// Main Splash Screen
// ============================================================================

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [bootLine, setBootLine] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showReactor, setShowReactor] = useState(false);

  const bootLines = [
    'Initializing gesture recognition engine',
    'Loading MediaPipe hand tracking models',
    'Configuring accessibility services',
    'Calibrating sensor fusion algorithms',
    'Establishing neural network connections',
    'IronGest system ready',
  ];

  useEffect(() => {
    // Start boot sequence
    setShowReactor(true);

    const bootSequence = async () => {
      for (let i = 0; i < bootLines.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 400));
        setBootLine(i);
        setProgress((i + 1) / bootLines.length);
      }

      // Wait a moment before finishing
      await new Promise(resolve => setTimeout(resolve, 500));
      onFinish();
    };

    // Start boot sequence after reactor animation
    const timer = setTimeout(bootSequence, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[Colors.background, Colors.backgroundLight, Colors.background]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Grid pattern */}
      <View style={styles.gridPattern}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 5}%` }]} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 8}%` }]} />
        ))}
      </View>

      {/* Scanline effect */}
      <Animated.View
        style={styles.scanlineContainer}
        entering={Animated.FadeIn.delay(500)}
      >
        <Animated.View
          style={styles.scanline}
          entering={Animated.FadeIn}
        />
      </Animated.View>

      {/* Arc Reactor */}
      <View style={styles.arcReactorWrapper}>
        {showReactor && (
          <ArcReactor
            size={200}
            onAnimationComplete={() => {}}
          />
        )}
      </View>

      {/* Title */}
      <Animated.View
        style={styles.titleContainer}
        entering={Animated.FadeIn.delay(800)}
      >
        <Text style={styles.title}>IronGest</Text>
        <Text style={styles.subtitle}>Air Gesture Control System</Text>
      </Animated.View>

      {/* Boot text */}
      <View style={styles.bootContainer}>
        <BootText lines={bootLines} currentLine={bootLine} />
      </View>

      {/* Progress */}
      <View style={styles.progressWrapper}>
        <ProgressBar progress={progress} />
      </View>

      {/* Version */}
      <Text style={styles.version}>v1.0.0 • Stark Industries</Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Grid Pattern
  gridPattern: {
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

  // Scanline
  scanlineContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    pointerEvents: 'none',
  },

  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: Colors.scanline,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },

  // Arc Reactor
  arcReactorWrapper: {
    marginBottom: Spacing.xxl,
  },

  arcReactorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  arcReactorGlow: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: Colors.primaryGlow,
  },

  arcReactorOuter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  arcReactorMiddle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  arcReactorInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  arcReactorRing: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    borderColor: Colors.primary,
  },

  arcSegment: {
    position: 'absolute',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },

  arcReactorCore: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
  },

  // Title
  titleContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },

  title: {
    fontSize: FontSizes.hero,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 8,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  subtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    letterSpacing: 4,
    marginTop: Spacing.sm,
    textTransform: 'uppercase',
  },

  // Boot Text
  bootContainer: {
    width: SCREEN_WIDTH * 0.85,
    marginBottom: Spacing.xl,
  },

  bootTextContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  bootTextLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  bootTextPrefix: {
    fontFamily: 'monospace',
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },

  bootTextStatus: {
    fontFamily: 'monospace',
    fontSize: FontSizes.caption,
    fontWeight: '700',
    marginHorizontal: 4,
  },

  bootTextContent: {
    fontFamily: 'monospace',
    fontSize: FontSizes.caption,
    color: Colors.text,
    marginLeft: Spacing.sm,
  },

  // Progress
  progressWrapper: {
    width: SCREEN_WIDTH * 0.6,
    marginBottom: Spacing.lg,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },

  progressText: {
    fontSize: FontSizes.caption,
    color: Colors.primary,
    fontFamily: 'monospace',
    marginLeft: Spacing.sm,
    width: 40,
  },

  // Version
  version: {
    position: 'absolute',
    bottom: Spacing.lg,
    fontSize: FontSizes.micro,
    color: Colors.textMuted,
    letterSpacing: 2,
  },
});

export default SplashScreen;
