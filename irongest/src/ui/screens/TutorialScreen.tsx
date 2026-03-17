/**
 * IronGest - Tutorial Screen
 * Interactive gesture tutorial with real-time feedback
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
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  interpolate,
  Easing,
  FadeIn,
  SlideInUp,
} from 'react-native-reanimated';
import { Colors, FontSizes, Spacing, BorderRadius, Durations } from '../theme';
import { HUDPanel, HUDButton } from '../components/HUDComponents';
import { GestureType, getGestureName } from '../../gestures/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================================================
// Types
// ============================================================================

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  gesture: GestureType;
  instruction: string;
  targetValue?: number;
}

// ============================================================================
// Tutorial Steps Data
// ============================================================================

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'intro',
    title: 'Welcome to IronGest',
    description: 'Learn to control your device with air gestures, just like Tony Stark.',
    gesture: GestureType.NONE,
    instruction: 'Raise your hand to begin',
  },
  {
    id: 'cursor',
    title: 'Cursor Control',
    description: 'Point your index finger to move the cursor around the screen.',
    gesture: GestureType.CURSOR_MOVE,
    instruction: 'Move your index finger to control the cursor',
  },
  {
    id: 'click',
    title: 'Click Gesture',
    description: 'Pinch your thumb and index finger together to click.',
    gesture: GestureType.PINCH_CLICK,
    instruction: 'Pinch to perform a click',
  },
  {
    id: 'back',
    title: 'Back Gesture',
    description: 'Pinch thumb and middle finger to go back.',
    gesture: GestureType.BACK_GESTURE,
    instruction: 'Pinch thumb and middle to go back',
  },
  {
    id: 'drag',
    title: 'Drag Gesture',
    description: 'Make a fist and move to drag objects.',
    gesture: GestureType.DRAG_START,
    instruction: 'Close your fist to start dragging',
  },
  {
    id: 'scroll',
    title: 'Scroll Gesture',
    description: 'Open palm and move up/down to scroll.',
    gesture: GestureType.SCROLL_UP,
    instruction: 'Move open palm up to scroll',
  },
  {
    id: 'complete',
    title: 'Tutorial Complete!',
    description: "You're ready to use IronGest. Practice makes perfect!",
    gesture: GestureType.NONE,
    instruction: 'Tap Continue to start using IronGest',
  },
];

// ============================================================================
// Gesture Demo Component
// ============================================================================

interface GestureDemoProps {
  gesture: GestureType;
  detected: boolean;
}

const GestureDemo: React.FC<GestureDemoProps> = ({ gesture, detected }) => {
  const animValue = useSharedValue(0);
  const successAnim = useSharedValue(0);

  useEffect(() => {
    animValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 1000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    if (detected) {
      successAnim.value = withSpring(1, { damping: 10, stiffness: 200 });
    }
  }, [detected]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + animValue.value * 0.1 }],
    opacity: 0.5 + animValue.value * 0.5,
  }));

  const successStyle = useAnimatedStyle(() => ({
    opacity: successAnim.value,
    transform: [{ scale: successAnim.value }],
  }));

  return (
    <View style={styles.demoContainer}>
      {/* Animated circle */}
      <Animated.View style={[styles.demoCircle, pulseStyle]}>
        <Text style={styles.demoIcon}>
          {getGestureIcon(gesture)}
        </Text>
      </Animated.View>

      {/* Success indicator */}
      {detected && (
        <Animated.View style={[styles.successBadge, successStyle]}>
          <Text style={styles.successText}>✓</Text>
        </Animated.View>
      )}
    </View>
  );
};

// Helper to get gesture icon
const getGestureIcon = (gesture: GestureType): string => {
  const icons: Partial<Record<GestureType, string>> = {
    [GestureType.CURSOR_MOVE]: '👆',
    [GestureType.PINCH_CLICK]: '🤏',
    [GestureType.BACK_GESTURE]: '✌️',
    [GestureType.DRAG_START]: '✊',
    [GestureType.SCROLL_UP]: '🖐️',
    [GestureType.SCROLL_DOWN]: '🖐️',
  };
  return icons[gesture] || '👋';
};

// ============================================================================
// Progress Indicator Component
// ============================================================================

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  currentStep,
  totalSteps,
}) => {
  return (
    <View style={styles.progressContainer}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.progressDot,
            index === currentStep && styles.progressDotActive,
            index < currentStep && styles.progressDotComplete,
          ]}
        />
      ))}
    </View>
  );
};

// ============================================================================
// Main Tutorial Screen
// ============================================================================

interface TutorialScreenProps {
  onComplete: () => void;
}

export const TutorialScreen: React.FC<TutorialScreenProps> = ({ onComplete }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [gestureDetected, setGestureDetected] = useState(false);
  const [handDetected, setHandDetected] = useState(false);

  const currentStep = TUTORIAL_STEPS[currentStepIndex];
  const isComplete = currentStepIndex === TUTORIAL_STEPS.length - 1;

  // Simulate gesture detection
  useEffect(() => {
    if (currentStep.gesture === GestureType.NONE) return;

    const timer = setTimeout(() => {
      setGestureDetected(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentStepIndex]);

  // Auto-advance after detection
  useEffect(() => {
    if (gestureDetected && !isComplete) {
      const timer = setTimeout(() => {
        nextStep();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gestureDetected]);

  const nextStep = () => {
    setGestureDetected(false);
    setCurrentStepIndex((prev) => Math.min(prev + 1, TUTORIAL_STEPS.length - 1));
  };

  const prevStep = () => {
    setGestureDetected(false);
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  };

  const skipTutorial = () => {
    onComplete();
  };

  return (
    <View style={styles.container}>
      {/* Progress */}
      <View style={styles.header}>
        <ProgressIndicator
          currentStep={currentStepIndex}
          totalSteps={TUTORIAL_STEPS.length}
        />
        <Text style={styles.stepCounter}>
          {currentStepIndex + 1} / {TUTORIAL_STEPS.length}
        </Text>
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* Gesture Demo */}
        <Animated.View
          entering={FadeIn.duration(Durations.normal)}
          key={currentStep.id}
        >
          <GestureDemo gesture={currentStep.gesture} detected={gestureDetected} />
        </Animated.View>

        {/* Instructions */}
        <Animated.View
          entering={SlideInUp.delay(200)}
          style={styles.instructionsContainer}
        >
          <Text style={styles.stepTitle}>{currentStep.title}</Text>
          <Text style={styles.stepDescription}>{currentStep.description}</Text>

          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>{currentStep.instruction}</Text>
          </View>
        </Animated.View>

        {/* Detection Status */}
        {currentStep.gesture !== GestureType.NONE && (
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                gestureDetected && styles.statusBadgeSuccess,
              ]}
            >
              <Text style={styles.statusText}>
                {gestureDetected ? '✓ Gesture Detected!' : 'Waiting for gesture...'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.buttonRow}>
          {currentStepIndex > 0 && (
            <HUDButton
              title="Previous"
              onPress={prevStep}
              variant="ghost"
              size="md"
            />
          )}

          {isComplete ? (
            <HUDButton
              title="Start Using IronGest"
              onPress={onComplete}
              variant="primary"
              size="lg"
            />
          ) : (
            <HUDButton
              title="Skip Tutorial"
              onPress={skipTutorial}
              variant="ghost"
              size="md"
            />
          )}
        </View>
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
    alignItems: 'center',
  },

  progressContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surfaceLight,
  },

  progressDotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },

  progressDotComplete: {
    backgroundColor: Colors.success,
  },

  stepCounter: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },

  demoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },

  demoCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: Colors.surface,
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  demoIcon: {
    fontSize: 64,
  },

  successBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  successText: {
    fontSize: 24,
    color: Colors.background,
  },

  instructionsContainer: {
    alignItems: 'center',
  },

  stepTitle: {
    fontSize: FontSizes.heading,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  stepDescription: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    maxWidth: SCREEN_WIDTH * 0.8,
  },

  instructionBox: {
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },

  instructionText: {
    fontSize: FontSizes.body,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },

  statusContainer: {
    marginTop: Spacing.xl,
  },

  statusBadge: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  statusBadgeSuccess: {
    backgroundColor: Colors.success + '20',
    borderColor: Colors.success,
  },

  statusText: {
    fontSize: FontSizes.bodySmall,
    color: Colors.textSecondary,
  },

  footer: {
    padding: Spacing.lg,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export default TutorialScreen;
