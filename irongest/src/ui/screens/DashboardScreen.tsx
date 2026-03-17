/**
 * IronGest - Dashboard Screen
 * Main control dashboard with Iron Man HUD aesthetic
 *
 * Features:
 * - Live camera feed with hand skeleton overlay
 * - Gesture log (last 10 gestures with timestamps)
 * - Status indicators: FPS, hands detected, cursor position
 * - Quick toggle buttons: cursor on/off, keyboard mode, sensitivity
 * - Battery/performance monitor
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
  FadeIn,
  SlideInUp,
  Layout,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, FontSizes, Spacing, BorderRadius, Durations } from '../theme';
import {
  HUDPanel,
  HUDButton,
  HUDToggle,
  StatusIndicator,
  DataDisplay,
  GestureLogItem,
} from '../components/HUDComponents';
import { useHandTracking } from '../../hand-tracking/useHandTracking';
import { useGestureRecognizer } from '../../gestures/useGestureRecognizer';
import { GestureType, getGestureName, GestureEvent } from '../../gestures/types';
import { Cursor, CursorState } from '../../cursor';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// Types
// ============================================================================

interface GestureLogEntry {
  id: string;
  gestureName: string;
  timestamp: number;
  confidence: number;
}

interface SystemStatus {
  fps: number;
  handsDetected: number;
  cursorPosition: { x: number; y: number };
  cursorState: CursorState;
  batteryLevel: number;
  cpuUsage: number;
  memoryUsage: number;
}

// ============================================================================
// Status Bar Component
// ============================================================================

interface StatusBarProps {
  status: SystemStatus;
}

const StatusBar: React.FC<StatusBarProps> = ({ status }) => {
  const fpsColor = status.fps >= 25 ? Colors.success : status.fps >= 15 ? Colors.warning : Colors.error;

  return (
    <View style={styles.statusBar}>
      <View style={styles.statusItem}>
        <Text style={styles.statusLabel}>FPS</Text>
        <DataDisplay value={status.fps} size="sm" />
      </View>

      <View style={styles.statusDivider} />

      <View style={styles.statusItem}>
        <Text style={styles.statusLabel}>HANDS</Text>
        <DataDisplay value={status.handsDetected} size="sm" />
      </View>

      <View style={styles.statusDivider} />

      <View style={styles.statusItem}>
        <Text style={styles.statusLabel}>CURSOR</Text>
        <Text style={styles.cursorPosition}>
          {Math.round(status.cursorPosition.x)}, {Math.round(status.cursorPosition.y)}
        </Text>
      </View>

      <View style={styles.statusDivider} />

      <View style={styles.statusItem}>
        <Text style={styles.statusLabel}>STATE</Text>
        <View style={[styles.stateBadge, status.cursorState === CursorState.ACTIVE && styles.stateBadgeActive]}>
          <Text style={styles.stateText}>{status.cursorState}</Text>
        </View>
      </View>
    </View>
  );
};

// ============================================================================
// Camera Preview Component
// ============================================================================

interface CameraPreviewProps {
  isActive: boolean;
  handData: any;
}

const CameraPreview: React.FC<CameraPreviewProps> = ({ isActive, handData }) => {
  const scanAnim = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      scanAnim.value = withRepeat(
        withTiming(1, { duration: 3000, easing: (t) => t }),
        -1,
        false
      );
    }
  }, [isActive]);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanAnim.value * 200 }],
  }));

  return (
    <View style={styles.cameraPreview}>
      {/* Placeholder for camera feed */}
      <View style={styles.cameraPlaceholder}>
        <Text style={styles.cameraPlaceholderText}>CAMERA FEED</Text>
        <Text style={styles.cameraPlaceholderSubtext}>
          {isActive ? 'Active' : 'Inactive'}
        </Text>
      </View>

      {/* Scan line effect */}
      {isActive && (
        <Animated.View style={[styles.scanLineOverlay, scanStyle]}>
          <LinearGradient
            colors={['transparent', Colors.primaryGlow, 'transparent']}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {/* Hand skeleton overlay would go here */}
      {isActive && handData && (
        <View style={styles.handOverlay}>
          <Text style={styles.handOverlayText}>Hand Detected</Text>
        </View>
      )}

      {/* Corner brackets */}
      <View style={styles.cameraCorner} />
      <View style={[styles.cameraCorner, styles.cameraCornerTR]} />
      <View style={[styles.cameraCorner, styles.cameraCornerBL]} />
      <View style={[styles.cameraCorner, styles.cameraCornerBR]} />
    </View>
  );
};

// ============================================================================
// Quick Controls Component
// ============================================================================

interface QuickControlsProps {
  cursorEnabled: boolean;
  onCursorToggle: (enabled: boolean) => void;
  keyboardMode: string;
  onKeyboardModeChange: (mode: string) => void;
  sensitivity: number;
  onSensitivityChange: (value: number) => void;
}

const QuickControls: React.FC<QuickControlsProps> = ({
  cursorEnabled,
  onCursorToggle,
  keyboardMode,
  onKeyboardModeChange,
  sensitivity,
  onSensitivityChange,
}) => {
  const keyboardModes = ['auto', 'index', '10-finger'];

  return (
    <HUDPanel title="QUICK CONTROLS" style={styles.quickControls}>
      <View style={styles.controlRow}>
        <View style={styles.controlItem}>
          <Text style={styles.controlLabel}>CURSOR</Text>
          <HUDToggle
            value={cursorEnabled}
            onValueChange={onCursorToggle}
          />
        </View>

        <View style={styles.controlItem}>
          <Text style={styles.controlLabel}>KEYBOARD MODE</Text>
          <View style={styles.modeSelector}>
            {keyboardModes.map((mode) => (
              <Pressable
                key={mode}
                onPress={() => onKeyboardModeChange(mode)}
                style={[
                  styles.modeButton,
                  keyboardMode === mode && styles.modeButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    keyboardMode === mode && styles.modeButtonTextActive,
                  ]}
                >
                  {mode.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.controlRow}>
        <View style={styles.controlItemFull}>
          <Text style={styles.controlLabel}>SENSITIVITY: {sensitivity}%</Text>
          <View style={styles.sensitivityBar}>
            <View
              style={[styles.sensitivityFill, { width: `${sensitivity}%` }]}
            />
          </View>
          <View style={styles.sensitivityButtons}>
            {[10, 25, 50, 75, 100].map((value) => (
              <Pressable
                key={value}
                onPress={() => onSensitivityChange(value)}
                style={[
                  styles.sensitivityButton,
                  sensitivity === value && styles.sensitivityButtonActive,
                ]}
              >
                <Text style={styles.sensitivityButtonText}>{value}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </HUDPanel>
  );
};

// ============================================================================
// Gesture Log Component
// ============================================================================

interface GestureLogProps {
  entries: GestureLogEntry[];
}

const GestureLog: React.FC<GestureLogProps> = ({ entries }) => {
  return (
    <HUDPanel title="GESTURE LOG" style={styles.gestureLog}>
      {entries.length === 0 ? (
        <View style={styles.emptyLog}>
          <Text style={styles.emptyLogText}>No gestures recorded</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.gestureLogScroll}
          showsVerticalScrollIndicator={false}
        >
          {entries.slice(0, 10).map((entry, index) => (
            <GestureLogItem
              key={entry.id}
              gestureName={entry.gestureName}
              timestamp={entry.timestamp}
              confidence={entry.confidence}
              index={index}
            />
          ))}
        </ScrollView>
      )}
    </HUDPanel>
  );
};

// ============================================================================
// Performance Monitor Component
// ============================================================================

interface PerformanceMonitorProps {
  batteryLevel: number;
  cpuUsage: number;
  memoryUsage: number;
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  batteryLevel,
  cpuUsage,
  memoryUsage,
}) => {
  const batteryColor =
    batteryLevel > 50 ? Colors.success : batteryLevel > 20 ? Colors.warning : Colors.error;

  return (
    <HUDPanel title="SYSTEM STATUS" style={styles.performanceMonitor}>
      <View style={styles.monitorRow}>
        <View style={styles.monitorItem}>
          <Text style={styles.monitorLabel}>BATTERY</Text>
          <View style={styles.monitorBar}>
            <View
              style={[
                styles.monitorFill,
                { width: `${batteryLevel}%`, backgroundColor: batteryColor },
              ]}
            />
          </View>
          <Text style={[styles.monitorValue, { color: batteryColor }]}>
            {batteryLevel}%
          </Text>
        </View>

        <View style={styles.monitorItem}>
          <Text style={styles.monitorLabel}>CPU</Text>
          <View style={styles.monitorBar}>
            <View
              style={[
                styles.monitorFill,
                { width: `${cpuUsage}%`, backgroundColor: Colors.primary },
              ]}
            />
          </View>
          <Text style={styles.monitorValue}>{cpuUsage}%</Text>
        </View>

        <View style={styles.monitorItem}>
          <Text style={styles.monitorLabel}>MEMORY</Text>
          <View style={styles.monitorBar}>
            <View
              style={[
                styles.monitorFill,
                { width: `${memoryUsage}%`, backgroundColor: Colors.warning },
              ]}
            />
          </View>
          <Text style={styles.monitorValue}>{memoryUsage}%</Text>
        </View>
      </View>
    </HUDPanel>
  );
};

// ============================================================================
// Main Dashboard Screen
// ============================================================================

export const DashboardScreen: React.FC = () => {
  // State
  const [cursorEnabled, setCursorEnabled] = useState(true);
  const [keyboardMode, setKeyboardMode] = useState('auto');
  const [sensitivity, setSensitivity] = useState(50);
  const [gestureLog, setGestureLog] = useState<GestureLogEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    fps: 30,
    handsDetected: 0,
    cursorPosition: { x: 0, y: 0 },
    cursorState: CursorState.IDLE,
    batteryLevel: 85,
    cpuUsage: 25,
    memoryUsage: 40,
  });

  // Animation for active gesture
  const activeGesturePulse = useSharedValue(1);

  useEffect(() => {
    activeGesturePulse.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 500 }),
        withTiming(1, { duration: 500 })
      ),
      -1,
      true
    );
  }, []);

  // Simulate system status updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemStatus((prev) => ({
        ...prev,
        fps: 25 + Math.random() * 10,
        cpuUsage: 20 + Math.random() * 15,
        memoryUsage: 35 + Math.random() * 10,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Handle gesture detection
  const handleGesture = useCallback((event: GestureEvent) => {
    const entry: GestureLogEntry = {
      id: Date.now().toString(),
      gestureName: getGestureName(event.type),
      timestamp: event.timestamp,
      confidence: event.confidence,
    };

    setGestureLog((prev) => [entry, ...prev].slice(0, 10));

    // Update cursor state based on gesture
    if (event.type === GestureType.CURSOR_MOVE) {
      setSystemStatus((prev) => ({
        ...prev,
        cursorPosition: { x: event.screenX, y: event.screenY },
        cursorState: CursorState.ACTIVE,
      }));
    }
  }, []);

  // Handle cursor toggle
  const handleCursorToggle = useCallback(async (enabled: boolean) => {
    setCursorEnabled(enabled);
    if (enabled) {
      await Cursor.showOverlay();
    } else {
      await Cursor.hideOverlay();
    }
  }, []);

  // Handle keyboard mode change
  const handleKeyboardModeChange = useCallback((mode: string) => {
    setKeyboardMode(mode);
    // Would integrate with AirKeyboard module
  }, []);

  // Handle sensitivity change
  const handleSensitivityChange = useCallback((value: number) => {
    setSensitivity(value);
    // Would update gesture recognition sensitivity
  }, []);

  return (
    <View style={styles.container}>
      {/* Background grid */}
      <View style={styles.gridBackground}>
        {Array.from({ length: 20 }).map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLineH, { top: `${(i + 1) * 5}%` }]} />
        ))}
        {Array.from({ length: 12 }).map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLineV, { left: `${(i + 1) * 8}%` }]} />
        ))}
      </View>

      {/* Status Bar */}
      <StatusBar status={systemStatus} />

      {/* Main Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Camera Preview */}
        <Animated.View entering={FadeIn.delay(100)}>
          <CameraPreview
            isActive={cursorEnabled}
            handData={systemStatus.handsDetected > 0}
          />
        </Animated.View>

        {/* Quick Controls */}
        <Animated.View entering={SlideInUp.delay(200)}>
          <QuickControls
            cursorEnabled={cursorEnabled}
            onCursorToggle={handleCursorToggle}
            keyboardMode={keyboardMode}
            onKeyboardModeChange={handleKeyboardModeChange}
            sensitivity={sensitivity}
            onSensitivityChange={handleSensitivityChange}
          />
        </Animated.View>

        {/* Gesture Log */}
        <Animated.View entering={SlideInUp.delay(300)}>
          <GestureLog entries={gestureLog} />
        </Animated.View>

        {/* Performance Monitor */}
        <Animated.View entering={SlideInUp.delay(400)}>
          <PerformanceMonitor
            batteryLevel={systemStatus.batteryLevel}
            cpuUsage={systemStatus.cpuUsage}
            memoryUsage={systemStatus.memoryUsage}
          />
        </Animated.View>
      </ScrollView>

      {/* Active Gesture Indicator */}
      {systemStatus.cursorState === CursorState.ACTIVE && (
        <Animated.View
          style={[
            styles.activeGestureIndicator,
            { transform: [{ scale: activeGesturePulse }] },
          ]}
        >
          <Text style={styles.activeGestureText}>GESTURING</Text>
        </Animated.View>
      )}
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

  // Grid Background
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

  // Status Bar
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceBorder,
  },

  statusItem: {
    alignItems: 'center',
  },

  statusLabel: {
    fontSize: FontSizes.micro,
    color: Colors.textMuted,
    letterSpacing: 1,
  },

  statusDivider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.surfaceBorder,
  },

  cursorPosition: {
    fontSize: FontSizes.dataSmall,
    color: Colors.primary,
    fontFamily: 'monospace',
  },

  stateBadge: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },

  stateBadgeActive: {
    backgroundColor: Colors.primary,
  },

  stateText: {
    fontSize: FontSizes.micro,
    color: Colors.text,
    fontWeight: '600',
  },

  // Scroll View
  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },

  // Camera Preview
  cameraPreview: {
    aspectRatio: 4 / 3,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderColor: Colors.surfaceBorder,
    overflow: 'hidden',
    marginBottom: Spacing.md,
    position: 'relative',
  },

  cameraPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cameraPlaceholderText: {
    fontSize: FontSizes.heading,
    color: Colors.textMuted,
    letterSpacing: 4,
  },

  cameraPlaceholderSubtext: {
    fontSize: FontSizes.caption,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  scanLineOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
  },

  handOverlay: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },

  handOverlayText: {
    fontSize: FontSizes.micro,
    color: Colors.background,
    fontWeight: '600',
  },

  cameraCorner: {
    position: 'absolute',
    top: 10,
    left: 10,
    width: 20,
    height: 20,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: Colors.primary,
  },

  cameraCornerTR: {
    left: undefined,
    right: 10,
    borderLeftWidth: 0,
    borderRightWidth: 2,
  },

  cameraCornerBL: {
    top: undefined,
    bottom: 10,
    borderTopWidth: 0,
    borderBottomWidth: 2,
  },

  cameraCornerBR: {
    top: undefined,
    left: undefined,
    bottom: 10,
    right: 10,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 2,
    borderRightWidth: 2,
  },

  // Quick Controls
  quickControls: {
    marginBottom: Spacing.md,
  },

  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },

  controlItem: {
    flex: 1,
    alignItems: 'center',
  },

  controlItemFull: {
    flex: 1,
  },

  controlLabel: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    letterSpacing: 1,
  },

  modeSelector: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },

  modeButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },

  modeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  modeButtonText: {
    fontSize: FontSizes.micro,
    color: Colors.textSecondary,
  },

  modeButtonTextActive: {
    color: Colors.background,
    fontWeight: '600',
  },

  sensitivityBar: {
    height: 4,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },

  sensitivityFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },

  sensitivityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  sensitivityButton: {
    width: 36,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.xs,
    backgroundColor: Colors.surfaceLight,
  },

  sensitivityButtonActive: {
    backgroundColor: Colors.primary,
  },

  sensitivityButtonText: {
    fontSize: FontSizes.micro,
    color: Colors.textSecondary,
  },

  // Gesture Log
  gestureLog: {
    marginBottom: Spacing.md,
    minHeight: 200,
  },

  gestureLogScroll: {
    maxHeight: 200,
  },

  emptyLog: {
    padding: Spacing.lg,
    alignItems: 'center',
  },

  emptyLogText: {
    fontSize: FontSizes.bodySmall,
    color: Colors.textMuted,
  },

  // Performance Monitor
  performanceMonitor: {
    marginBottom: Spacing.md,
  },

  monitorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  monitorItem: {
    flex: 1,
    alignItems: 'center',
  },

  monitorLabel: {
    fontSize: FontSizes.micro,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },

  monitorBar: {
    width: '80%',
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },

  monitorFill: {
    height: '100%',
    borderRadius: 3,
  },

  monitorValue: {
    fontSize: FontSizes.caption,
    color: Colors.text,
    fontFamily: 'monospace',
  },

  // Active Gesture Indicator
  activeGestureIndicator: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  activeGestureText: {
    fontSize: FontSizes.bodySmall,
    color: Colors.warning,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.warning,
    letterSpacing: 2,
  },
});

export default DashboardScreen;
