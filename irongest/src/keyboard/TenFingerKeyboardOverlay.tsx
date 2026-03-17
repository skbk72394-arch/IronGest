/**
 * IronGest - Ten Finger Keyboard Overlay
 * Production-grade 10-finger air typing component
 *
 * Features:
 * - Ghost keyboard showing all 10 finger positions
 * - Z-velocity keypress detection
 * - Visual key press animation
 * - WPM counter
 * - Error rate tracking
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  LayoutChangeEvent,
} from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import AnimatedValue = Animated.Value;
import AnimatedInterpolation = Animated.AnimatedInterpolation;

import {
  AirKeyboard,
  AirKeyboardMode,
  FingerIndex,
  FINGER_KEY_MAP,
  QWERTY_ROWS,
  KeyboardStatistics,
  KeyPressEvent,
} from './index';

// ============================================================================
// Types
// ============================================================================

interface FingerState {
  x: Animated.Value;
  y: Animated.Value;
  z: number;
  isPressed: boolean;
  lastPressTime: number;
}

interface KeyState {
  isPressed: boolean;
  pressAnim: Animated.Value;
}

interface TenFingerKeyboardOverlayProps {
  /** Whether the keyboard is visible */
  visible: boolean;
  /** Finger positions from hand tracking */
  fingerPositions: FingerPositionData[];
  /** Callback when a key is pressed */
  onKeyPress?: (character: string) => void;
  /** Callback when WPM updates */
  onWPMUpdate?: (wpm: number) => void;
  /** Show WPM counter */
  showWPM?: boolean;
  /** Show finger indicators */
  showFingerIndicators?: boolean;
  /** Keyboard opacity */
  opacity?: number;
  /** Custom styles */
  style?: any;
}

interface FingerPositionData {
  fingerIndex: FingerIndex;
  x: number;
  y: number;
  z: number;
  confidence: number;
}

// ============================================================================
// Constants
// ============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Z-velocity threshold for keypress (MediaPipe depth units)
const Z_VELOCITY_THRESHOLD = 0.15;

// Animation durations
const KEY_PRESS_DURATION = 150;
const FINGER_MOVE_DURATION = 50;

// Colors
const COLORS = {
  keyboardBg: 'rgba(0, 0, 0, 0.7)',
  keyBg: 'rgba(60, 60, 60, 0.8)',
  keyHover: 'rgba(0, 212, 255, 0.4)',
  keyPressed: '#00D4FF',
  keyText: '#FFFFFF',
  fingerIndicator: '#00D4FF',
  fingerIndicatorPressed: '#FF6B6B',
  wpmText: '#00D4FF',
  errorText: '#FF6B6B',
};

// ============================================================================
// Component
// ============================================================================

export const TenFingerKeyboardOverlay: React.FC<TenFingerKeyboardOverlayProps> = ({
  visible,
  fingerPositions,
  onKeyPress,
  onWPMUpdate,
  showWPM = true,
  showFingerIndicators = true,
  opacity = 0.8,
  style,
}) => {
  // ============================================================================
  // State
  // ============================================================================

  const [keyboardLayout, setKeyboardLayout] = useState<{ width: number; height: number }>({
    width: SCREEN_WIDTH * 0.9,
    height: SCREEN_HEIGHT * 0.35,
  });

  const [keyStates, setKeyStates] = useState<Record<string, KeyState>>({});
  const [statistics, setStatistics] = useState<KeyboardStatistics | null>(null);

  // Finger state refs for Z-velocity tracking
  const fingerStatesRef = useRef<Record<number, FingerState>>({});
  const prevZRef = useRef<number[]>(new Array(10).fill(0));

  // Animated values
  const keyboardOpacity = useRef(new Animated.Value(0)).current;
  const wpmScale = useRef(new Animated.Value(1)).current;

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    // Initialize key states
    const initialKeyStates: Record<string, KeyState> = {};
    QWERTY_ROWS.flat().forEach((key) => {
      initialKeyStates[key] = {
        isPressed: false,
        pressAnim: new Animated.Value(0),
      };
    });
    setKeyStates(initialKeyStates);

    // Initialize finger states
    for (let i = 0; i < 10; i++) {
      fingerStatesRef.current[i] = {
        x: new Animated.Value(SCREEN_WIDTH / 2),
        y: new Animated.Value(SCREEN_HEIGHT / 2),
        z: 0,
        isPressed: false,
        lastPressTime: 0,
      };
    }

    // Set keyboard mode
    AirKeyboard.setMode(AirKeyboardMode.TEN_FINGER);

    // Subscribe to events
    const keyPressSub = AirKeyboard.onKeyPressed((event: KeyPressEvent) => {
      handleKeyPressVisual(event.character);
      onKeyPress?.(event.character);
    });

    return () => {
      keyPressSub.remove();
    };
  }, []);

  useEffect(() => {
    // Animate keyboard visibility
    Animated.timing(keyboardOpacity, {
      toValue: visible ? opacity : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  useEffect(() => {
    // Process finger positions
    processFingerPositions(fingerPositions);
  }, [fingerPositions]);

  useEffect(() => {
    // Fetch statistics periodically
    const interval = setInterval(async () => {
      const stats = await AirKeyboard.getStatistics();
      setStatistics(stats);
      onWPMUpdate?.(stats.wpm);

      // Animate WPM counter
      Animated.sequence([
        Animated.timing(wpmScale, {
          toValue: 1.1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(wpmScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ============================================================================
  // Finger Position Processing
  // ============================================================================

  const processFingerPositions = useCallback((positions: FingerPositionData[]) => {
    const now = Date.now();

    positions.forEach((finger) => {
      const fingerState = fingerStatesRef.current[finger.fingerIndex];
      if (!fingerState || finger.confidence < 0.5) return;

      // Update position
      Animated.timing(fingerState.x, {
        toValue: finger.x * keyboardLayout.width,
        duration: FINGER_MOVE_DURATION,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }).start();

      Animated.timing(fingerState.y, {
        toValue: finger.y * keyboardLayout.height,
        duration: FINGER_MOVE_DURATION,
        useNativeDriver: true,
        easing: Easing.out(Easing.quad),
      }).start();

      // Calculate Z velocity
      const prevZ = prevZRef.current[finger.fingerIndex];
      const zVelocity = finger.z - prevZ;
      prevZRef.current[finger.fingerIndex] = finger.z;
      fingerState.z = finger.z;

      // Detect keypress (downward Z movement)
      const timeSinceLastPress = now - fingerState.lastPressTime;
      if (
        zVelocity > Z_VELOCITY_THRESHOLD &&
        timeSinceLastPress > 200 && // Debounce
        finger.confidence > 0.7
      ) {
        handleKeyPressDetection(finger);
        fingerState.lastPressTime = now;
        fingerState.isPressed = true;

        // Reset pressed state after animation
        setTimeout(() => {
          fingerState.isPressed = false;
        }, KEY_PRESS_DURATION);
      }
    });
  }, [keyboardLayout]);

  const handleKeyPressDetection = useCallback((finger: FingerPositionData) => {
    // Find the key under this finger
    const key = findKeyAtPosition(finger.x, finger.y);
    if (key) {
      // Check if this finger is assigned to this key
      const assignedKeys = FINGER_KEY_MAP[finger.fingerIndex] || [];
      const isCorrectFinger = assignedKeys.includes(key.toUpperCase());

      if (isCorrectFinger) {
        AirKeyboard.injectKey(key);
      } else {
        // Still inject but it counts as an error
        AirKeyboard.injectKey(key);
      }
    }
  }, []);

  const findKeyAtPosition = (normalizedX: number, normalizedY: number): string | null => {
    // Map normalized position to keyboard row/column
    const rowIndex = Math.floor(normalizedY * 4);
    if (rowIndex < 0 || rowIndex > 3) return null;

    const row = QWERTY_ROWS[rowIndex];
    if (!row) return null;

    const keyIndex = Math.floor(normalizedX * row.length);
    if (keyIndex < 0 || keyIndex >= row.length) return null;

    return row[keyIndex];
  };

  const handleKeyPressVisual = useCallback((character: string) => {
    const keyState = keyStates[character.toUpperCase()];
    if (!keyState) return;

    // Animate key press
    Animated.sequence([
      Animated.timing(keyState.pressAnim, {
        toValue: 1,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(keyState.pressAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [keyStates]);

  // ============================================================================
  // Render
  // ============================================================================

  const renderKeyboardRow = (row: readonly string[], rowIndex: number) => {
    const rowOffset = rowIndex * 10; // Stagger offset

    return (
      <View key={rowIndex} style={[styles.row, { marginLeft: rowOffset }]}>
        {row.map((key, keyIndex) => {
          const keyState = keyStates[key];
          if (!keyState) return null;

          const pressScale = keyState.pressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 0.9],
          });

          const pressOpacity = keyState.pressAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.8, 1],
          });

          return (
            <Animated.View
              key={keyIndex}
              style={[
                styles.key,
                {
                  transform: [{ scale: pressScale }],
                  opacity: pressOpacity,
                  backgroundColor: keyState.pressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [COLORS.keyBg, COLORS.keyPressed],
                  }),
                },
              ]}
            >
              <Text style={styles.keyText}>{key}</Text>
            </Animated.View>
          );
        })}
      </View>
    );
  };

  const renderFingerIndicator = (fingerIndex: FingerIndex) => {
    const fingerState = fingerStatesRef.current[fingerIndex];
    if (!fingerState) return null;

    return (
      <Animated.View
        key={fingerIndex}
        style={[
          styles.fingerIndicator,
          {
            transform: [
              { translateX: fingerState.x },
              { translateY: fingerState.y },
            ],
            backgroundColor: fingerState.isPressed
              ? COLORS.fingerIndicatorPressed
              : COLORS.fingerIndicator,
          },
        ]}
      >
        <Text style={styles.fingerIndicatorText}>{fingerIndex}</Text>
      </Animated.View>
    );
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setKeyboardLayout({ width, height });
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        style,
        { opacity: keyboardOpacity },
      ]}
      onLayout={handleLayout}
    >
      {/* WPM Counter */}
      {showWPM && statistics && (
        <Animated.View style={[styles.wpmContainer, { transform: [{ scale: wpmScale }] }]}>
          <Text style={styles.wpmLabel}>WPM</Text>
          <Text style={styles.wpmValue}>{Math.round(statistics.wpm)}</Text>
          {statistics.errorRate > 0.05 && (
            <Text style={styles.errorRate}>
              Error: {(statistics.errorRate * 100).toFixed(1)}%
            </Text>
          )}
        </Animated.View>
      )}

      {/* Ghost Keyboard */}
      <View style={styles.keyboardContainer}>
        {/* Home row indicator */}
        <View style={styles.homeRowIndicator}>
          <Text style={styles.homeRowText}>Home Row</Text>
        </View>

        {/* Keyboard rows */}
        {QWERTY_ROWS.map((row, index) => renderKeyboardRow(row, index))}

        {/* Space bar */}
        <View style={styles.spaceBarRow}>
          <Animated.View style={[styles.spaceBar, styles.key]}>
            <Text style={styles.keyText}>SPACE</Text>
          </Animated.View>
        </View>
      </View>

      {/* Finger indicators */}
      {showFingerIndicators && (
        <View style={styles.fingerIndicatorsContainer} pointerEvents="none">
          {Object.values(FingerIndex)
            .filter((v) => typeof v === 'number')
            .map((fingerIndex) => renderFingerIndicator(fingerIndex as FingerIndex))}
        </View>
      )}
    </Animated.View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    left: SCREEN_WIDTH * 0.05,
    right: SCREEN_WIDTH * 0.05,
    backgroundColor: COLORS.keyboardBg,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },

  wpmContainer: {
    position: 'absolute',
    top: -40,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  wpmLabel: {
    color: COLORS.wpmText,
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },

  wpmValue: {
    color: COLORS.wpmText,
    fontSize: 24,
    fontWeight: 'bold',
  },

  errorRate: {
    color: COLORS.errorText,
    fontSize: 10,
    marginTop: 2,
  },

  keyboardContainer: {
    alignItems: 'center',
  },

  homeRowIndicator: {
    marginBottom: 8,
  },

  homeRowText: {
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: 10,
    textTransform: 'uppercase',
  },

  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  key: {
    width: 32,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    backgroundColor: COLORS.keyBg,
  },

  keyText: {
    color: COLORS.keyText,
    fontSize: 14,
    fontWeight: '600',
  },

  spaceBarRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },

  spaceBar: {
    width: 150,
    height: 36,
  },

  fingerIndicatorsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  fingerIndicator: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.fingerIndicator,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },

  fingerIndicatorText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

export default TenFingerKeyboardOverlay;
