/**
 * IronGest - Settings Screen
 * Complete settings UI with Iron Man HUD aesthetic
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import Animated, {
  FadeIn,
  SlideInRight,
} from 'react-native-reanimated';
import { Colors, FontSizes, Spacing, BorderRadius } from '../theme';
import {
  HUDPanel,
  HUDButton,
  HUDSlider,
  HUDToggle,
} from '../components/HUDComponents';
import { AirKeyboardMode } from '../../keyboard';

// ============================================================================
// Types
// ============================================================================

interface SettingsState {
  cursorSensitivity: number;
  gestureThreshold: number;
  dwellTime: number;
  hapticFeedback: boolean;
  keyboardMode: AirKeyboardMode;
  keyPressMethod: 'pinch' | 'dwell' | 'both';
  cameraResolution: 'low' | 'medium' | 'high';
}

// ============================================================================
// Main Settings Screen
// ============================================================================

interface SettingsScreenProps {
  onNavigateOnboarding?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onNavigateOnboarding,
}) => {
  const [settings, setSettings] = useState<SettingsState>({
    cursorSensitivity: 50,
    gestureThreshold: 30,
    dwellTime: 500,
    hapticFeedback: true,
    keyboardMode: AirKeyboardMode.AUTO,
    keyPressMethod: 'both',
    cameraResolution: 'medium',
  });

  const updateSetting = <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SETTINGS</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Gesture Sensitivity */}
        <Animated.View entering={FadeIn.delay(100)}>
          <HUDPanel title="GESTURE SENSITIVITY">
            <HUDSlider
              value={settings.cursorSensitivity}
              onValueChange={(v) => updateSetting('cursorSensitivity', v)}
              min={10}
              max={100}
              label="Cursor Sensitivity"
            />
            <View style={styles.spacer} />
            <HUDSlider
              value={settings.gestureThreshold}
              onValueChange={(v) => updateSetting('gestureThreshold', v)}
              min={10}
              max={80}
              label="Detection Threshold"
            />
            <View style={styles.spacer} />
            <HUDSlider
              value={settings.dwellTime}
              onValueChange={(v) => updateSetting('dwellTime', v)}
              min={200}
              max={1000}
              label="Dwell Time (ms)"
            />
          </HUDPanel>
        </Animated.View>

        {/* Feedback */}
        <Animated.View entering={SlideInRight.delay(200)}>
          <HUDPanel title="FEEDBACK">
            <HUDToggle
              value={settings.hapticFeedback}
              onValueChange={(v) => updateSetting('hapticFeedback', v)}
              label="Haptic Feedback"
            />
          </HUDPanel>
        </Animated.View>

        {/* Keyboard Mode */}
        <Animated.View entering={SlideInRight.delay(300)}>
          <HUDPanel title="KEYBOARD MODE">
            <View style={styles.modeSelector}>
              {[
                { mode: AirKeyboardMode.AUTO, desc: 'Based on screen size' },
                { mode: AirKeyboardMode.INDEX_FINGER, desc: 'Single finger' },
                { mode: AirKeyboardMode.TEN_FINGER, desc: 'Full air typing' },
              ].map((item) => (
                <Pressable
                  key={item.mode}
                  onPress={() => updateSetting('keyboardMode', item.mode)}
                  style={[
                    styles.modeCard,
                    settings.keyboardMode === item.mode && styles.modeCardActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.modeLabel,
                      settings.keyboardMode === item.mode && styles.modeLabelActive,
                    ]}
                  >
                    {item.mode}
                  </Text>
                  <Text style={styles.modeDesc}>{item.desc}</Text>
                </Pressable>
              ))}
            </View>
          </HUDPanel>
        </Animated.View>

        {/* Key Press Method */}
        <Animated.View entering={SlideInRight.delay(400)}>
          <HUDPanel title="KEY PRESS METHOD">
            <View style={styles.pressMethodSelector}>
              {['pinch', 'dwell', 'both'].map((method) => (
                <Pressable
                  key={method}
                  onPress={() => updateSetting('keyPressMethod', method as any)}
                  style={[
                    styles.pressButton,
                    settings.keyPressMethod === method && styles.pressButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.pressButtonText,
                      settings.keyPressMethod === method && styles.pressButtonTextActive,
                    ]}
                  >
                    {method.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </HUDPanel>
        </Animated.View>

        {/* Camera Resolution */}
        <Animated.View entering={SlideInRight.delay(500)}>
          <HUDPanel title="CAMERA RESOLUTION">
            <View style={styles.resolutionSelector}>
              {['low', 'medium', 'high'].map((res) => (
                <Pressable
                  key={res}
                  onPress={() => updateSetting('cameraResolution', res as any)}
                  style={[
                    styles.resolutionButton,
                    settings.cameraResolution === res && styles.resolutionButtonActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.resolutionText,
                      settings.cameraResolution === res && styles.resolutionTextActive,
                    ]}
                  >
                    {res.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </HUDPanel>
        </Animated.View>

        {/* Onboarding Replay */}
        {onNavigateOnboarding && (
          <Animated.View entering={SlideInRight.delay(600)}>
            <HUDPanel>
              <HUDButton
                title="Replay Onboarding"
                onPress={onNavigateOnboarding}
                variant="ghost"
              />
            </HUDPanel>
          </Animated.View>
        )}

        {/* Version Info */}
        <View style={styles.versionInfo}>
          <Text style={styles.versionText}>IronGest v1.0.0</Text>
          <Text style={styles.versionSubtext}>Stark Industries</Text>
        </View>
      </ScrollView>
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
    paddingBottom: Spacing.md,
  },

  title: {
    fontSize: FontSizes.heading,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 4,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  spacer: {
    height: Spacing.md,
  },

  // Mode Selector
  modeSelector: {
    gap: Spacing.sm,
  },

  modeCard: {
    backgroundColor: Colors.surfaceLight,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  modeCardActive: {
    borderColor: Colors.primary,
  },

  modeLabel: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    color: Colors.text,
  },

  modeLabelActive: {
    color: Colors.primary,
  },

  modeDesc: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Press Method
  pressMethodSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  pressButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  pressButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  pressButtonText: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },

  pressButtonTextActive: {
    color: Colors.background,
    fontWeight: '600',
  },

  // Resolution
  resolutionSelector: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },

  resolutionButton: {
    flex: 1,
    padding: Spacing.sm,
    alignItems: 'center',
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  resolutionButtonActive: {
    borderColor: Colors.primary,
  },

  resolutionText: {
    fontSize: FontSizes.bodySmall,
    color: Colors.textSecondary,
  },

  resolutionTextActive: {
    color: Colors.primary,
  },

  // Version
  versionInfo: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },

  versionText: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
  },

  versionSubtext: {
    fontSize: FontSizes.micro,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
});

export default SettingsScreen;
