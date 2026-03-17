/**
 * IronGest - Permissions Screen
 * Step-by-step permission grant flow
 *
 * Features:
 * - Camera permission
 * - Accessibility service permission
 * - Overlay permission
 * - Animated progress through steps
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import { Colors, FontSizes, Spacing, BorderRadius, Durations } from '../theme';
import { HUDPanel, HUDButton } from '../components/HUDComponents';

// ============================================================================
// Types
// ============================================================================

interface PermissionStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  required: boolean;
  check: () => Promise<boolean>;
  request: () => Promise<boolean>;
  openSettings?: () => void;
}

// ============================================================================
// Permission Step Component
// ============================================================================

interface PermissionStepItemProps {
  step: PermissionStep;
  index: number;
  isActive: boolean;
  isGranted: boolean;
  onGrant: () => void;
}

const PermissionStepItem: React.FC<PermissionStepItemProps> = ({
  step,
  index,
  isActive,
  isGranted,
  onGrant,
}) => {
  const pulseAnim = useSharedValue(1);
  const checkAnim = useSharedValue(0);

  useEffect(() => {
    if (isGranted) {
      checkAnim.value = withSpring(1, { damping: 15, stiffness: 200 });
    }
    if (isActive && !isGranted) {
      pulseAnim.value = withSequence(
        withTiming(1.05, { duration: 500 }),
        withTiming(1, { duration: 500 })
      );
    }
  }, [isActive, isGranted]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
    borderColor: interpolate(
      checkAnim.value,
      [0, 1],
      [isActive ? Colors.warning : Colors.surfaceBorder, Colors.success]
    ),
  }));

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkAnim.value,
    transform: [{ scale: checkAnim.value }],
  }));

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 100).duration(Durations.normal)}
      style={[styles.stepContainer, isActive && styles.stepContainerActive]}
    >
      <Animated.View style={[styles.stepCard, pulseStyle]}>
        {/* Step number/icon */}
        <View style={styles.stepHeader}>
          <View style={[styles.stepIcon, isGranted && styles.stepIconGranted]}>
            {isGranted ? (
              <Animated.Text style={[styles.stepIconText, checkStyle]}>✓</Animated.Text>
            ) : (
              <Text style={styles.stepIconText}>{step.icon}</Text>
            )}
          </View>
          <View style={styles.stepHeaderText}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            <Text style={styles.stepRequired}>
              {step.required ? 'Required' : 'Optional'}
            </Text>
          </View>
          <Animated.View style={[styles.stepStatus, checkStyle]}>
            <Text style={styles.stepStatusText}>GRANTED</Text>
          </Animated.View>
        </View>

        {/* Description */}
        <Text style={styles.stepDescription}>{step.description}</Text>

        {/* Action button */}
        {!isGranted && isActive && (
          <View style={styles.stepAction}>
            <HUDButton
              title={`Grant ${step.title}`}
              onPress={onGrant}
              variant="primary"
              size="md"
            />
            {step.openSettings && (
              <HUDButton
                title="Open Settings"
                onPress={step.openSettings}
                variant="default"
                size="sm"
              />
            )}
          </View>
        )}
      </Animated.View>
    </Animated.View>
  );
};

// ============================================================================
// Main Permissions Screen
// ============================================================================

interface PermissionsScreenProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export const PermissionsScreen: React.FC<PermissionsScreenProps> = ({
  onComplete,
  onSkip,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [grantedPermissions, setGrantedPermissions] = useState<Set<string>>(new Set());

  // Define permission steps
  const permissionSteps: PermissionStep[] = [
    {
      id: 'camera',
      title: 'Camera Access',
      description: 'Required for hand tracking and gesture recognition. IronGest uses the camera to detect your hand movements in real-time.',
      icon: '📷',
      required: true,
      check: async () => {
        // Check camera permission status
        try {
          const { status } = await Camera.getCameraPermissionsAsync?.() || { status: 'undetermined' };
          return status === 'granted';
        } catch {
          return false;
        }
      },
      request: async () => {
        try {
          const { status } = await Camera.requestCameraPermissionsAsync?.() || { status: 'denied' };
          return status === 'granted';
        } catch {
          Alert.alert(
            'Camera Permission',
            'Please grant camera permission in Settings',
            [{ text: 'OK' }]
          );
          return false;
        }
      },
    },
    {
      id: 'accessibility',
      title: 'Accessibility Service',
      description: 'Required for system-wide gesture control. This allows IronGest to perform actions like back, home, and touch gestures.',
      icon: '♿',
      required: true,
      check: async () => {
        // Check if accessibility service is enabled
        // This would check native accessibility service status
        return false; // Placeholder - actual check via native module
      },
      request: async () => {
        Alert.alert(
          'Enable Accessibility',
          'IronGest needs accessibility permission to control your device with gestures.\n\n1. Open Settings\n2. Find IronGest in Accessibility\n3. Enable the service',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      },
      openSettings: () => Linking.openSettings(),
    },
    {
      id: 'overlay',
      title: 'Display Over Apps',
      description: 'Required for showing the cursor overlay on top of other applications. This enables the Iron Man HUD cursor.',
      icon: '🖥️',
      required: true,
      check: async () => {
        // Check overlay permission
        if (Platform.OS === 'android') {
          // Would check via native module: Settings.canDrawOverlays()
          return false; // Placeholder
        }
        return true;
      },
      request: async () => {
        Alert.alert(
          'Overlay Permission',
          'IronGest needs permission to display over other apps for the cursor overlay.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      },
      openSettings: () => Linking.openSettings(),
    },
    {
      id: 'notification',
      title: 'Notifications',
      description: 'Optional: Receive tips and updates about new features.',
      icon: '🔔',
      required: false,
      check: async () => {
        return false; // Placeholder
      },
      request: async () => {
        return false;
      },
    },
  ];

  const handleGrant = async () => {
    const step = permissionSteps[currentStep];
    if (!step) return;

    const granted = await step.request();
    if (granted) {
      setGrantedPermissions(prev => new Set([...prev, step.id]));
      moveToNextStep();
    }
  };

  const moveToNextStep = () => {
    const nextStep = currentStep + 1;
    if (nextStep < permissionSteps.length) {
      setCurrentStep(nextStep);
    } else {
      // All permissions processed
      checkAllRequiredGranted();
    }
  };

  const checkAllRequiredGranted = () => {
    const allRequiredGranted = permissionSteps
      .filter(step => step.required)
      .every(step => grantedPermissions.has(step.id));

    if (allRequiredGranted) {
      onComplete();
    }
  };

  // Calculate progress
  const progress = grantedPermissions.size / permissionSteps.length;
  const progressAnim = useSharedValue(0);

  useEffect(() => {
    progressAnim.value = withSpring(progress, { damping: 20, stiffness: 100 });
  }, [progress]);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  // Skip button animation
  const skipAnim = useSharedValue(1);

  const skipStyle = useAnimatedStyle(() => ({
    opacity: skipAnim.value,
  }));

  const handleSkip = () => {
    const requiredNotGranted = permissionSteps
      .filter(step => step.required)
      .some(step => !grantedPermissions.has(step.id));

    if (requiredNotGranted) {
      Alert.alert(
        'Required Permissions',
        'Some required permissions are not granted. The app may not work correctly.',
        [
          { text: 'Continue Anyway', onPress: onSkip, style: 'destructive' },
          { text: 'Go Back', style: 'cancel' },
        ]
      );
    } else {
      onSkip?.();
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>SETUP</Text>
        <Text style={styles.headerSubtitle}>Grant required permissions</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
        <Text style={styles.progressText}>
          {grantedPermissions.size} / {permissionSteps.length}
        </Text>
      </View>

      {/* Permission steps */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {permissionSteps.map((step, index) => (
          <PermissionStepItem
            key={step.id}
            step={step}
            index={index}
            isActive={index === currentStep}
            isGranted={grantedPermissions.has(step.id)}
            onGrant={handleGrant}
          />
        ))}
      </ScrollView>

      {/* Info panel */}
      <HUDPanel variant="primary" style={styles.infoPanel}>
        <Text style={styles.infoTitle}>Why These Permissions?</Text>
        <Text style={styles.infoText}>
          IronGest needs these permissions to provide air gesture control:
        </Text>
        <Text style={styles.infoItem}>• Camera: Track your hand movements</Text>
        <Text style={styles.infoItem}>• Accessibility: Perform system actions</Text>
        <Text style={styles.infoItem}>• Overlay: Show the HUD cursor</Text>
      </HUDPanel>

      {/* Footer */}
      <View style={styles.footer}>
        <HUDButton
          title="Continue"
          onPress={checkAllRequiredGranted}
          variant="primary"
          size="lg"
        />
        {onSkip && (
          <HUDButton
            title="Skip Setup"
            onPress={handleSkip}
            variant="ghost"
            size="md"
          />
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
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  headerTitle: {
    fontSize: FontSizes.heading,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 4,
  },

  headerSubtitle: {
    fontSize: FontSizes.body,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },

  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
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
    width: 50,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },

  stepContainer: {
    marginBottom: Spacing.md,
  },

  stepContainerActive: {
    // Additional styling for active step
  },

  stepCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
  },

  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },

  stepIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },

  stepIconGranted: {
    backgroundColor: Colors.success,
  },

  stepIconText: {
    fontSize: 24,
  },

  stepHeaderText: {
    flex: 1,
  },

  stepTitle: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: Colors.text,
  },

  stepRequired: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  stepStatus: {
    backgroundColor: Colors.success,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },

  stepStatusText: {
    fontSize: FontSizes.micro,
    color: Colors.background,
    fontWeight: '700',
    letterSpacing: 1,
  },

  stepDescription: {
    fontSize: FontSizes.bodySmall,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  stepAction: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },

  infoPanel: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },

  infoTitle: {
    fontSize: FontSizes.bodySmall,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: Spacing.xs,
  },

  infoText: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },

  infoItem: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginLeft: Spacing.sm,
  },

  footer: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
});

export default PermissionsScreen;
