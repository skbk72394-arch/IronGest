/**
 * IronGest - HUD Components
 * Reusable Iron Man HUD-style components
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  ViewStyle,
  TextStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  runOnJS,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, BorderRadius, FontSizes, Shadows, Durations } from '../theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// HUD Panel - Glassmorphism container
// ============================================================================

interface HUDPanelProps {
  children: React.ReactNode;
  title?: string;
  variant?: 'default' | 'primary' | 'warning' | 'success' | 'error';
  glow?: boolean;
  scanline?: boolean;
  style?: ViewStyle;
  animated?: boolean;
}

export const HUDPanel: React.FC<HUDPanelProps> = ({
  children,
  title,
  variant = 'default',
  glow = false,
  scanline = false,
  style,
  animated = true,
}) => {
  const borderColor = {
    default: Colors.surfaceBorder,
    primary: Colors.primary,
    warning: Colors.warning,
    success: Colors.success,
    error: Colors.error,
  }[variant];

  const glowColor = {
    default: Colors.primaryGlow,
    primary: Colors.primaryGlow,
    warning: Colors.warningGlow,
    success: Colors.successGlow,
    error: Colors.errorGlow,
  }[variant];

  const scanlineAnim = useSharedValue(0);

  useEffect(() => {
    if (scanline) {
      scanlineAnim.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [scanline]);

  const scanlineStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scanlineAnim.value, [0, 1], [-100, SCREEN_HEIGHT]) }],
  }));

  return (
    <Animated.View
      entering={animated ? FadeIn.duration(Durations.normal) : undefined}
      style={[
        styles.panel,
        { borderColor },
        glow && { shadowColor: glowColor, ...Shadows.glow },
        style,
      ]}
    >
      {/* Glass overlay */}
      <View style={styles.panelGlass} />

      {/* Scanline effect */}
      {scanline && (
        <Animated.View style={[styles.scanline, scanlineStyle]}>
          <LinearGradient
            colors={['transparent', Colors.scanline, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      )}

      {/* Title */}
      {title && (
        <View style={styles.panelHeader}>
          <View style={[styles.panelTitleLine, { backgroundColor: borderColor }]} />
          <Text style={[styles.panelTitle, { color: borderColor }]}>{title}</Text>
          <View style={[styles.panelTitleLine, { backgroundColor: borderColor }]} />
        </View>
      )}

      {/* Content */}
      <View style={styles.panelContent}>{children}</View>

      {/* Corner decorations */}
      <View style={[styles.corner, styles.cornerTopLeft, { borderColor }]} />
      <View style={[styles.corner, styles.cornerTopRight, { borderColor }]} />
      <View style={[styles.corner, styles.cornerBottomLeft, { borderColor }]} />
      <View style={[styles.corner, styles.cornerBottomRight, { borderColor }]} />
    </Animated.View>
  );
};

// ============================================================================
// HUD Button - Iron Man style button
// ============================================================================

interface HUDButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'default' | 'primary' | 'warning' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

export const HUDButton: React.FC<HUDButtonProps> = ({
  title,
  onPress,
  variant = 'default',
  size = 'md',
  disabled = false,
  icon,
  style,
}) => {
  const scale = useSharedValue(1);
  const glow = useSharedValue(0);

  const backgroundColor = {
    default: Colors.surface,
    primary: Colors.primary,
    warning: Colors.warning,
    ghost: 'transparent',
  }[variant];

  const textColor = {
    default: Colors.text,
    primary: Colors.background,
    warning: Colors.background,
    ghost: Colors.text,
  }[variant];

  const borderColor = {
    default: Colors.surfaceBorder,
    primary: Colors.primaryLight,
    warning: Colors.warningLight,
    ghost: Colors.primary,
  }[variant];

  const sizeStyles = {
    sm: { height: 36, paddingHorizontal: Spacing.md },
    md: { height: 48, paddingHorizontal: Spacing.lg },
    lg: { height: 56, paddingHorizontal: Spacing.xl },
  }[size];

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    shadowOpacity: glow.value * 0.5,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 20, stiffness: 300 });
    glow.value = withTiming(1, { duration: 100 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
    glow.value = withTiming(0, { duration: 200 });
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.button,
          sizeStyles,
          { backgroundColor, borderColor },
          disabled && styles.buttonDisabled,
          animatedStyle,
          style,
        ]}
      >
        {icon && <View style={styles.buttonIcon}>{icon}</View>}
        <Text style={[styles.buttonText, { color: textColor }]}>{title}</Text>

        {/* Animated border */}
        <View style={styles.buttonBorder}>
          <View style={[styles.buttonBorderLine, { backgroundColor: borderColor }]} />
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ============================================================================
// HUD Status Indicator
// ============================================================================

interface StatusIndicatorProps {
  label: string;
  value: string | number;
  status?: 'normal' | 'warning' | 'error' | 'success';
  icon?: React.ReactNode;
  animateValue?: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  label,
  value,
  status = 'normal',
  icon,
  animateValue = false,
}) => {
  const statusColor = {
    normal: Colors.textSecondary,
    warning: Colors.warning,
    error: Colors.error,
    success: Colors.success,
  }[status];

  const pulseAnim = useSharedValue(1);

  useEffect(() => {
    if (status === 'warning' || status === 'error') {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [status]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  return (
    <View style={styles.statusIndicator}>
      {icon && (
        <Animated.View style={[styles.statusIcon, { borderColor: statusColor }, pulseStyle]}>
          {icon}
        </Animated.View>
      )}
      <View style={styles.statusContent}>
        <Text style={styles.statusLabel}>{label}</Text>
        <Text style={[styles.statusValue, { color: statusColor }]}>{value}</Text>
      </View>
    </View>
  );
};

// ============================================================================
// HUD Data Display - Rolling number animation
// ============================================================================

interface DataDisplayProps {
  value: number | string;
  label?: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg';
  precision?: number;
}

export const DataDisplay: React.FC<DataDisplayProps> = ({
  value,
  label,
  unit,
  size = 'md',
  precision = 0,
}) => {
  const displayValue = typeof value === 'number' ? value.toFixed(precision) : value;

  const fontSize = {
    sm: FontSizes.dataSmall,
    md: FontSizes.data,
    lg: FontSizes.dataLarge,
  }[size];

  return (
    <View style={styles.dataDisplay}>
      <Text style={[styles.dataValue, { fontSize }]}>{displayValue}</Text>
      {unit && <Text style={styles.dataUnit}>{unit}</Text>}
      {label && <Text style={styles.dataLabel}>{label}</Text>}
    </View>
  );
};

// ============================================================================
// HUD Toggle
// ============================================================================

interface HUDToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export const HUDToggle: React.FC<HUDToggleProps> = ({
  value,
  onValueChange,
  label,
  disabled = false,
}) => {
  const trackAnim = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    trackAnim.value = withSpring(value ? 1 : 0, { damping: 20, stiffness: 300 });
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolate(
      trackAnim.value,
      [0, 1],
      [Colors.surfaceLight, Colors.primary]
    ),
    borderColor: interpolate(
      trackAnim.value,
      [0, 1],
      [Colors.surfaceBorder, Colors.primary]
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: trackAnim.value * 20 }],
    backgroundColor: interpolate(
      trackAnim.value,
      [0, 1],
      [Colors.textSecondary, Colors.text]
    ),
  }));

  return (
    <Pressable
      onPress={() => !disabled && onValueChange(!value)}
      style={styles.toggleContainer}
      disabled={disabled}
    >
      {label && <Text style={styles.toggleLabel}>{label}</Text>}
      <Animated.View style={[styles.toggleTrack, trackStyle, disabled && styles.toggleDisabled]}>
        <Animated.View style={[styles.toggleThumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
};

// ============================================================================
// HUD Slider
// ============================================================================

interface HUDSliderProps {
  value: number;
  onValueChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
}

export const HUDSlider: React.FC<HUDSliderProps> = ({
  value,
  onValueChange,
  min = 0,
  max = 100,
  step = 1,
  label,
}) => {
  const fillAnim = useSharedValue((value - min) / (max - min));

  useEffect(() => {
    fillAnim.value = withSpring((value - min) / (max - min), { damping: 20, stiffness: 300 });
  }, [value, min, max]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${fillAnim.value * 100}%`,
  }));

  const handlePress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const containerWidth = 200; // Approximate
    const newValue = min + (locationX / containerWidth) * (max - min);
    const steppedValue = Math.round(newValue / step) * step;
    onValueChange(Math.max(min, Math.min(max, steppedValue)));
  };

  return (
    <View style={styles.sliderContainer}>
      {label && (
        <View style={styles.sliderHeader}>
          <Text style={styles.sliderLabel}>{label}</Text>
          <Text style={styles.sliderValue}>{value}</Text>
        </View>
      )}
      <Pressable style={styles.sliderTrack} onPress={handlePress}>
        <Animated.View style={[styles.sliderFill, fillStyle]} />
        <View style={[styles.sliderThumb, { left: `${((value - min) / (max - min)) * 100}%` }]} />
      </Pressable>
    </View>
  );
};

// ============================================================================
// HUD Gesture Log Item
// ============================================================================

interface GestureLogItemProps {
  gestureName: string;
  timestamp: number;
  confidence: number;
  index: number;
}

export const GestureLogItem: React.FC<GestureLogItemProps> = ({
  gestureName,
  timestamp,
  confidence,
  index,
}) => {
  const time = new Date(timestamp).toLocaleTimeString();

  return (
    <Animated.View
      entering={SlideInRight.delay(index * 50).duration(Durations.fast)}
      style={styles.gestureLogItem}
    >
      <View style={styles.gestureLogIndex}>
        <Text style={styles.gestureLogIndexText}>{index + 1}</Text>
      </View>
      <View style={styles.gestureLogContent}>
        <Text style={styles.gestureLogName}>{gestureName}</Text>
        <Text style={styles.gestureLogTime}>{time}</Text>
      </View>
      <View style={styles.gestureLogConfidence}>
        <Text style={styles.gestureLogConfidenceText}>{Math.round(confidence * 100)}%</Text>
      </View>
    </Animated.View>
  );
};

// ============================================================================
// Grid Background
// ============================================================================

interface GridBackgroundProps {
  animated?: boolean;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({ animated = true }) => {
  const gridAnim = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      gridAnim.value = withRepeat(
        withTiming(1, { duration: 10000, easing: Easing.linear }),
        -1,
        false
      );
    }
  }, [animated]);

  const gridStyle = useAnimatedStyle(() => ({
    opacity: interpolate(gridAnim.value, [0, 0.5, 1], [0.3, 0.5, 0.3]),
  }));

  return (
    <View style={styles.gridBackground}>
      {/* Horizontal lines */}
      {Array.from({ length: 20 }).map((_, i) => (
        <View
          key={`h-${i}`}
          style={[
            styles.gridLine,
            { top: `${(i + 1) * 5}%` },
          ]}
        />
      ))}
      {/* Vertical lines */}
      {Array.from({ length: 12 }).map((_, i) => (
        <View
          key={`v-${i}`}
          style={[
            styles.gridLine,
            styles.gridLineVertical,
            { left: `${(i + 1) * 8}%` },
          ]}
        />
      ))}
      {/* Overlay gradient */}
      <LinearGradient
        colors={['transparent', Colors.background, Colors.background, 'transparent']}
        locations={[0, 0.2, 0.8, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
};

// ============================================================================
// Styles
// ============================================================================

const styles = StyleSheet.create({
  // Panel
  panel: {
    backgroundColor: Colors.backgroundCard,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },

  panelGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.glass,
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },

  panelTitle: {
    fontSize: FontSizes.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginHorizontal: Spacing.sm,
  },

  panelTitleLine: {
    flex: 1,
    height: 1,
  },

  panelContent: {
    padding: Spacing.md,
  },

  scanline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 100,
    zIndex: 1,
  },

  corner: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderWidth: 2,
  },

  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },

  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },

  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },

  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },

  // Button
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonIcon: {
    marginRight: Spacing.sm,
  },

  buttonText: {
    fontSize: FontSizes.body,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  buttonBorder: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },

  buttonBorderLine: {
    flex: 1,
  },

  // Status Indicator
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },

  statusContent: {
    flex: 1,
  },

  statusLabel: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  statusValue: {
    fontSize: FontSizes.body,
    fontWeight: '600',
  },

  // Data Display
  dataDisplay: {
    alignItems: 'flex-end',
  },

  dataValue: {
    fontFamily: 'monospace',
    color: Colors.primary,
    fontWeight: '700',
  },

  dataUnit: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
    marginLeft: Spacing.xs,
  },

  dataLabel: {
    fontSize: FontSizes.micro,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    marginTop: Spacing.xs,
  },

  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  toggleLabel: {
    fontSize: FontSizes.body,
    color: Colors.text,
    flex: 1,
  },

  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    padding: 2,
  },

  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
  },

  toggleDisabled: {
    opacity: 0.5,
  },

  // Slider
  sliderContainer: {
    marginVertical: Spacing.sm,
  },

  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },

  sliderLabel: {
    fontSize: FontSizes.bodySmall,
    color: Colors.text,
  },

  sliderValue: {
    fontSize: FontSizes.bodySmall,
    color: Colors.primary,
    fontFamily: 'monospace',
  },

  sliderTrack: {
    height: 6,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },

  sliderFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },

  sliderThumb: {
    position: 'absolute',
    top: -3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.text,
  },

  // Gesture Log Item
  gestureLogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.xs,
  },

  gestureLogIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },

  gestureLogIndexText: {
    fontSize: FontSizes.micro,
    color: Colors.background,
    fontWeight: '700',
  },

  gestureLogContent: {
    flex: 1,
  },

  gestureLogName: {
    fontSize: FontSizes.bodySmall,
    color: Colors.text,
    fontWeight: '600',
  },

  gestureLogTime: {
    fontSize: FontSizes.caption,
    color: Colors.textSecondary,
  },

  gestureLogConfidence: {
    backgroundColor: Colors.surfaceLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
  },

  gestureLogConfidenceText: {
    fontSize: FontSizes.caption,
    color: Colors.success,
    fontFamily: 'monospace',
  },

  // Grid Background
  gridBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
  },

  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.gridLine,
  },

  gridLineVertical: {
    top: 0,
    bottom: 0,
    width: 1,
    height: undefined,
    left: undefined,
    right: undefined,
    backgroundColor: Colors.gridLine,
  },
});

export default {
  HUDPanel,
  HUDButton,
  StatusIndicator,
  DataDisplay,
  HUDToggle,
  HUDSlider,
  GestureLogItem,
  GridBackground,
};
