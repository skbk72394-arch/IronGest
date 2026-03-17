/**
 * IronGest - Keyboard UI Component
 * Production-grade settings and practice mode for air keyboard
 *
 * Features:
 * - Settings screen for keyboard configuration
 * - Practice mode with WPM test
 * - Visual tutorial for typing techniques
 * - Statistics display
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Switch,
  Animated,
  Easing,
  Alert,
} from 'react-native';

import {
  AirKeyboard,
  AirKeyboardMode,
  OneHandedMode,
  KeyPressMethod,
  KeyboardStatistics,
  QWERTY_ROWS,
  FINGER_KEY_MAP,
  FingerIndex,
} from './index';

// ============================================================================
// Types
// ============================================================================

type KeyboardScreen = 'settings' | 'practice' | 'tutorial' | 'stats';

interface KeyboardUIProps {
  /** Initial screen to show */
  initialScreen?: KeyboardScreen;
  /** Callback when user closes the UI */
  onClose?: () => void;
  /** Custom styles */
  style?: any;
}

// ============================================================================
// Constants
// ============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const COLORS = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  surfaceLight: '#2A2A2A',
  primary: '#00D4FF',
  primaryDark: '#0099CC',
  accent: '#FF6B6B',
  text: '#FFFFFF',
  textSecondary: '#888888',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
};

const PRACTICE_TEXTS = [
  'the quick brown fox jumps over the lazy dog',
  'pack my box with five dozen liquor jugs',
  'how vexingly quick daft zebras jump',
  'sphinx of black quartz judge my vow',
  'two driven jocks help fax my big quiz',
  'the five boxing wizards jump quickly',
];

// ============================================================================
// Main Component
// ============================================================================

export const KeyboardUI: React.FC<KeyboardUIProps> = ({
  initialScreen = 'settings',
  onClose,
  style,
}) => {
  // ============================================================================
  // State
  // ============================================================================

  const [currentScreen, setCurrentScreen] = useState<KeyboardScreen>(initialScreen);
  const [currentMode, setCurrentMode] = useState<AirKeyboardMode>(AirKeyboardMode.AUTO);
  const [oneHandedMode, setOneHandedMode] = useState<OneHandedMode>(OneHandedMode.CENTER);
  const [pressMethod, setPressMethod] = useState<KeyPressMethod>(KeyPressMethod.BOTH);
  const [hapticEnabled, setHapticEnabled] = useState(true);
  const [dwellTimeMs, setDwellTimeMs] = useState(500);

  // Practice mode state
  const [practiceText, setPracticeText] = useState('');
  const [typedText, setTypedText] = useState('');
  const [isPracticeActive, setIsPracticeActive] = useState(false);
  const [practiceStartTime, setPracticeStartTime] = useState(0);
  const [practiceWPM, setPracticeWPM] = useState(0);
  const [practiceAccuracy, setPracticeAccuracy] = useState(100);

  // Statistics
  const [statistics, setStatistics] = useState<KeyboardStatistics | null>(null);

  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    loadSettings();
    loadStatistics();

    const interval = setInterval(loadStatistics, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 1,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [currentScreen]);

  // ============================================================================
  // Data Loading
  // ============================================================================

  const loadSettings = async () => {
    const mode = await AirKeyboard.getMode();
    setCurrentMode(mode);
  };

  const loadStatistics = async () => {
    const stats = await AirKeyboard.getStatistics();
    setStatistics(stats);
  };

  // ============================================================================
  // Settings Handlers
  // ============================================================================

  const handleModeChange = async (mode: AirKeyboardMode) => {
    await AirKeyboard.setMode(mode);
    setCurrentMode(mode);
  };

  const handleOneHandedModeChange = async (mode: OneHandedMode) => {
    await AirKeyboard.setOneHandedMode(mode);
    setOneHandedMode(mode);
  };

  const handlePressMethodChange = async (method: KeyPressMethod) => {
    await AirKeyboard.setPressMethod(method);
    setPressMethod(method);
  };

  const handleShowKeyboard = async () => {
    await AirKeyboard.show();
  };

  const handleHideKeyboard = async () => {
    await AirKeyboard.hide();
  };

  const handleResetStatistics = async () => {
    Alert.alert(
      'Reset Statistics',
      'Are you sure you want to reset all keyboard statistics?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AirKeyboard.resetStatistics();
            loadStatistics();
          },
        },
      ]
    );
  };

  // ============================================================================
  // Practice Mode Handlers
  // ============================================================================

  const startPractice = () => {
    const randomText = PRACTICE_TEXTS[Math.floor(Math.random() * PRACTICE_TEXTS.length)];
    setPracticeText(randomText);
    setTypedText('');
    setIsPracticeActive(true);
    setPracticeStartTime(Date.now());
    setPracticeWPM(0);
    setPracticeAccuracy(100);
  };

  const endPractice = () => {
    setIsPracticeActive(false);
    const elapsed = (Date.now() - practiceStartTime) / 1000 / 60; // minutes
    const words = typedText.length / 5;
    const wpm = words / elapsed;
    setPracticeWPM(Math.round(wpm));
  };

  const handlePracticeKeyPress = useCallback(
    (character: string) => {
      if (!isPracticeActive) return;

      const expectedChar = practiceText[typedText.length];
      const newTypedText = typedText + character;
      setTypedText(newTypedText);

      // Calculate accuracy
      let correct = 0;
      for (let i = 0; i < newTypedText.length; i++) {
        if (newTypedText[i] === practiceText[i]) {
          correct++;
        }
      }
      setPracticeAccuracy(Math.round((correct / newTypedText.length) * 100));

      // Check if completed
      if (newTypedText.length >= practiceText.length) {
        endPractice();
      }
    },
    [isPracticeActive, practiceText, typedText]
  );

  // ============================================================================
  // Render Functions
  // ============================================================================

  const renderSettingsScreen = () => (
    <ScrollView style={styles.screenContainer}>
      <Text style={styles.sectionTitle}>Keyboard Mode</Text>
      <View style={styles.optionGroup}>
        {[
          { mode: AirKeyboardMode.AUTO, label: 'Auto', description: 'Based on screen size' },
          { mode: AirKeyboardMode.INDEX_FINGER, label: 'Index Finger', description: 'Single finger typing' },
          { mode: AirKeyboardMode.TEN_FINGER, label: '10-Finger', description: 'Full air typing' },
        ].map((item) => (
          <TouchableOpacity
            key={item.mode}
            style={[
              styles.optionItem,
              currentMode === item.mode && styles.optionItemSelected,
            ]}
            onPress={() => handleModeChange(item.mode)}
          >
            <View style={styles.optionContent}>
              <Text style={styles.optionLabel}>{item.label}</Text>
              <Text style={styles.optionDescription}>{item.description}</Text>
            </View>
            {currentMode === item.mode && (
              <View style={styles.checkmark}>
                <Text style={styles.checkmarkText}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {currentMode === AirKeyboardMode.INDEX_FINGER && (
        <>
          <Text style={styles.sectionTitle}>One-Handed Mode</Text>
          <View style={styles.optionGroup}>
            {[
              { mode: OneHandedMode.LEFT_HAND, label: 'Left Hand' },
              { mode: OneHandedMode.RIGHT_HAND, label: 'Right Hand' },
              { mode: OneHandedMode.CENTER, label: 'Center' },
            ].map((item) => (
              <TouchableOpacity
                key={item.mode}
                style={[
                  styles.optionItem,
                  oneHandedMode === item.mode && styles.optionItemSelected,
                ]}
                onPress={() => handleOneHandedModeChange(item.mode)}
              >
                <Text style={styles.optionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Key Press Method</Text>
          <View style={styles.optionGroup}>
            {[
              { method: KeyPressMethod.PINCH, label: 'Pinch Gesture' },
              { method: KeyPressMethod.DWELL, label: 'Dwell to Press' },
              { method: KeyPressMethod.BOTH, label: 'Both' },
            ].map((item) => (
              <TouchableOpacity
                key={item.method}
                style={[
                  styles.optionItem,
                  pressMethod === item.method && styles.optionItemSelected,
                ]}
                onPress={() => handlePressMethodChange(item.method)}
              >
                <Text style={styles.optionLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <Text style={styles.sectionTitle}>Feedback</Text>
      <View style={styles.optionGroup}>
        <View style={styles.switchItem}>
          <Text style={styles.optionLabel}>Haptic Feedback</Text>
          <Switch
            value={hapticEnabled}
            onValueChange={setHapticEnabled}
            trackColor={{ false: COLORS.surfaceLight, true: COLORS.primary }}
          />
        </View>
      </View>

      <View style={styles.buttonGroup}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleShowKeyboard}>
          <Text style={styles.primaryButtonText}>Show Keyboard</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={handleHideKeyboard}>
          <Text style={styles.secondaryButtonText}>Hide Keyboard</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderPracticeScreen = () => (
    <View style={styles.screenContainer}>
      {!isPracticeActive ? (
        <View style={styles.practiceStart}>
          <Text style={styles.practiceTitle}>Typing Practice</Text>
          <Text style={styles.practiceDescription}>
            Practice your air typing skills. Try to type the text shown on screen as fast and
            accurately as possible.
          </Text>
          {practiceWPM > 0 && (
            <View style={styles.lastResult}>
              <Text style={styles.lastResultLabel}>Last Session</Text>
              <Text style={styles.lastResultValue}>
                {practiceWPM} WPM • {practiceAccuracy}% Accuracy
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.primaryButton} onPress={startPractice}>
            <Text style={styles.primaryButtonText}>Start Practice</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.practiceActive}>
          <View style={styles.practiceStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{practiceWPM}</Text>
              <Text style={styles.statLabel}>WPM</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{practiceAccuracy}%</Text>
              <Text style={styles.statLabel}>Accuracy</Text>
            </View>
          </View>

          <View style={styles.practiceTextContainer}>
            <Text style={styles.practiceText}>
              {practiceText.split('').map((char, index) => {
                let style = styles.practiceCharPending;
                if (index < typedText.length) {
                  style =
                    typedText[index] === char
                      ? styles.practiceCharCorrect
                      : styles.practiceCharWrong;
                }
                return (
                  <Text key={index} style={style}>
                    {char}
                  </Text>
                );
              })}
            </Text>
          </View>

          <Text style={styles.practiceProgress}>
            {typedText.length} / {practiceText.length} characters
          </Text>

          <TouchableOpacity style={styles.secondaryButton} onPress={endPractice}>
            <Text style={styles.secondaryButtonText}>End Practice</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderTutorialScreen = () => (
    <ScrollView style={styles.screenContainer}>
      <Text style={styles.tutorialTitle}>How to Use Air Keyboard</Text>

      <View style={styles.tutorialSection}>
        <Text style={styles.tutorialSectionTitle}>Index Finger Mode</Text>
        <Text style={styles.tutorialText}>
          Move your index finger over the keyboard. Hover over a key to highlight it, then:
        </Text>
        <View style={styles.tutorialList}>
          <Text style={styles.tutorialListItem}>
            • Pinch your fingers together to press the key
          </Text>
          <Text style={styles.tutorialListItem}>
            • Or dwell (hold still) for {dwellTimeMs}ms to auto-press
          </Text>
        </View>
      </View>

      <View style={styles.tutorialSection}>
        <Text style={styles.tutorialSectionTitle}>10-Finger Mode</Text>
        <Text style={styles.tutorialText}>
          Position your hands above the keyboard. Use standard touch typing finger positions:
        </Text>
        <View style={styles.fingerMapContainer}>
          <Text style={styles.fingerMapTitle}>Left Hand</Text>
          <View style={styles.fingerMapRow}>
            <Text style={styles.fingerMapText}>Pinky: Q, A, Z</Text>
            <Text style={styles.fingerMapText}>Ring: W, S, X</Text>
          </View>
          <View style={styles.fingerMapRow}>
            <Text style={styles.fingerMapText}>Middle: E, D, C</Text>
            <Text style={styles.fingerMapText}>Index: R, F, V + T, G, B</Text>
          </View>
          <Text style={styles.fingerMapTitle}>Right Hand</Text>
          <View style={styles.fingerMapRow}>
            <Text style={styles.fingerMapText}>Index: Y, H, N + U, J, M</Text>
            <Text style={styles.fingerMapText}>Middle: I, K, ,</Text>
          </View>
          <View style={styles.fingerMapRow}>
            <Text style={styles.fingerMapText}>Ring: O, L, .</Text>
            <Text style={styles.fingerMapText}>Pinky: P, ;, / + others</Text>
          </View>
        </View>
        <Text style={styles.tutorialText}>
          Move your finger downward (negative Z) to press a key.
        </Text>
      </View>

      <View style={styles.tutorialSection}>
        <Text style={styles.tutorialSectionTitle}>Tips</Text>
        <View style={styles.tutorialList}>
          <Text style={styles.tutorialListItem}>
            • Keep your hands at a comfortable distance from the camera
          </Text>
          <Text style={styles.tutorialListItem}>
            • Use slow, deliberate movements for accuracy
          </Text>
          <Text style={styles.tutorialListItem}>
            • Practice regularly to improve your WPM
          </Text>
          <Text style={styles.tutorialListItem}>
            • Adjust settings to match your typing style
          </Text>
        </View>
      </View>
    </ScrollView>
  );

  const renderStatsScreen = () => (
    <View style={styles.screenContainer}>
      <Text style={styles.statsTitle}>Statistics</Text>

      {statistics && (
        <View style={styles.statsGrid}>
          <View style={styles.statsCard}>
            <Text style={styles.statsCardValue}>{Math.round(statistics.wpm)}</Text>
            <Text style={styles.statsCardLabel}>Words Per Minute</Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={styles.statsCardValue}>{statistics.totalKeyPresses}</Text>
            <Text style={styles.statsCardLabel}>Total Keypresses</Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={[styles.statsCardValue, { color: COLORS.success }]}>
              {(100 - statistics.errorRate * 100).toFixed(1)}%
            </Text>
            <Text style={styles.statsCardLabel}>Accuracy</Text>
          </View>

          <View style={styles.statsCard}>
            <Text style={[styles.statsCardValue, { color: COLORS.errorText }]}>
              {statistics.errorCount}
            </Text>
            <Text style={styles.statsCardLabel}>Errors</Text>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.dangerButton} onPress={handleResetStatistics}>
        <Text style={styles.dangerButtonText}>Reset Statistics</Text>
      </TouchableOpacity>
    </View>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_WIDTH * 0.1, 0],
  });

  return (
    <Animated.View style={[styles.container, style, { opacity: fadeAnim, transform: [{ translateX }] }]}>
      {/* Navigation */}
      <View style={styles.navigation}>
        {(['settings', 'practice', 'tutorial', 'stats'] as KeyboardScreen[]).map((screen) => (
          <TouchableOpacity
            key={screen}
            style={[styles.navItem, currentScreen === screen && styles.navItemActive]}
            onPress={() => setCurrentScreen(screen)}
          >
            <Text style={[styles.navItemText, currentScreen === screen && styles.navItemTextActive]}>
              {screen.charAt(0).toUpperCase() + screen.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {currentScreen === 'settings' && renderSettingsScreen()}
        {currentScreen === 'practice' && renderPracticeScreen()}
        {currentScreen === 'tutorial' && renderTutorialScreen()}
        {currentScreen === 'stats' && renderStatsScreen()}
      </View>

      {/* Close Button */}
      {onClose && (
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderRadius: 16,
    overflow: 'hidden',
  },

  navigation: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },

  navItem: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },

  navItemActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },

  navItemText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },

  navItemTextActive: {
    color: COLORS.primary,
  },

  content: {
    flex: 1,
  },

  screenContainer: {
    flex: 1,
    padding: 16,
  },

  sectionTitle: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },

  optionGroup: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },

  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },

  optionItemSelected: {
    backgroundColor: `${COLORS.primary}15`,
  },

  optionContent: {
    flex: 1,
  },

  optionLabel: {
    color: COLORS.text,
    fontSize: 16,
  },

  optionDescription: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },

  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  checkmarkText: {
    color: COLORS.background,
    fontWeight: 'bold',
  },

  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },

  buttonGroup: {
    marginTop: 24,
    gap: 12,
  },

  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: COLORS.background,
    fontSize: 16,
    fontWeight: '600',
  },

  secondaryButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceLight,
  },

  secondaryButtonText: {
    color: COLORS.text,
    fontSize: 16,
  },

  dangerButton: {
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },

  dangerButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },

  // Practice Screen
  practiceStart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  practiceTitle: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
  },

  practiceDescription: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },

  lastResult: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },

  lastResultLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginBottom: 4,
  },

  lastResultValue: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '600',
  },

  practiceActive: {
    flex: 1,
  },

  practiceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },

  statItem: {
    alignItems: 'center',
  },

  statValue: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: 'bold',
  },

  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  practiceTextContainer: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginVertical: 16,
  },

  practiceText: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  practiceCharPending: {
    color: COLORS.textSecondary,
    fontSize: 24,
    fontFamily: 'monospace',
  },

  practiceCharCorrect: {
    color: COLORS.success,
    fontSize: 24,
    fontFamily: 'monospace',
  },

  practiceCharWrong: {
    color: COLORS.error,
    fontSize: 24,
    fontFamily: 'monospace',
    textDecorationLine: 'underline',
  },

  practiceProgress: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },

  // Tutorial Screen
  tutorialTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },

  tutorialSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  tutorialSectionTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },

  tutorialText: {
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
  },

  tutorialList: {
    marginTop: 12,
  },

  tutorialListItem: {
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 24,
  },

  fingerMapContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },

  fingerMapTitle: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },

  fingerMapRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },

  fingerMapText: {
    color: COLORS.textSecondary,
    fontSize: 12,
  },

  // Stats Screen
  statsTitle: {
    color: COLORS.text,
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 24,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },

  statsCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 12,
  },

  statsCardValue: {
    color: COLORS.primary,
    fontSize: 36,
    fontWeight: 'bold',
  },

  statsCardLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },

  // Close Button
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },

  closeButtonText: {
    color: COLORS.text,
    fontSize: 16,
  },
});

export default KeyboardUI;
