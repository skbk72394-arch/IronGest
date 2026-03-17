/**
 * IronGest - Theme Configuration
 * Iron Man HUD aesthetic design tokens
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// Colors
// ============================================================================

export const Colors = {
  // Primary background
  background: '#0a0a0f',
  backgroundLight: '#12121a',
  backgroundCard: '#16161f',

  // Surface colors
  surface: '#1a1a24',
  surfaceLight: '#24242f',
  surfaceBorder: '#2a2a35',

  // Accent colors
  primary: '#00d4ff',         // Arc reactor blue
  primaryDark: '#0099cc',
  primaryLight: '#40e0ff',
  primaryGlow: 'rgba(0, 212, 255, 0.3)',

  warning: '#ff6b00',         // Warning orange
  warningLight: '#ff8c40',
  warningGlow: 'rgba(255, 107, 0, 0.3)',

  success: '#00ff88',         // Success green
  successGlow: 'rgba(0, 255, 136, 0.3)',

  error: '#ff4757',           // Error red
  errorGlow: 'rgba(255, 71, 87, 0.3)',

  // Text colors
  text: '#ffffff',
  textPrimary: '#ffffff',
  textSecondary: '#8888aa',
  textMuted: '#555566',

  // Special effects
  glass: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  scanline: 'rgba(0, 212, 255, 0.03)',

  // Grid
  gridLine: 'rgba(0, 212, 255, 0.1)',
  gridLineActive: 'rgba(0, 212, 255, 0.3)',

  // Arc reactor gradient
  arcReactorInner: '#00d4ff',
  arcReactorOuter: '#0066aa',
  arcReactorGlow: 'rgba(0, 212, 255, 0.6)',
};

// ============================================================================
// Typography
// ============================================================================

export const Fonts = {
  // Display font - Orbitron style (fallback to system)
  display: {
    fontFamily: 'Orbitron-Bold',
    fontFamilyFallback: 'System',
  },

  // Body font - Rajdhani style (fallback to system)
  body: {
    fontFamily: 'Rajdhani-Regular',
    fontFamilyFallback: 'System',
  },

  // Mono font for data
  mono: {
    fontFamily: 'JetBrainsMono-Regular',
    fontFamilyFallback: 'monospace',
  },
};

export const FontSizes = {
  // Display sizes
  hero: 48,
  title: 32,
  heading: 24,
  subheading: 20,

  // Body sizes
  body: 16,
  bodySmall: 14,
  caption: 12,
  micro: 10,

  // Data sizes
  data: 18,
  dataLarge: 24,
  dataSmall: 14,
};

export const LineHeights = {
  tight: 1.1,
  normal: 1.4,
  relaxed: 1.6,
};

// ============================================================================
// Spacing
// ============================================================================

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// ============================================================================
// Border Radius
// ============================================================================

export const BorderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

// ============================================================================
// Shadows
// ============================================================================

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },

  sm: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },

  md: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },

  lg: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },

  glow: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },

  warningGlow: {
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 15,
  },
};

// ============================================================================
// Animation Durations
// ============================================================================

export const Durations = {
  instant: 0,
  fast: 100,
  normal: 200,
  slow: 300,
  verySlow: 500,
  dramatic: 800,
  loading: 1500,
};

// ============================================================================
// Layout Constants
// ============================================================================

export const Layout = {
  screen: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },

  header: {
    height: 60,
    paddingTop: 8,
  },

  tabBar: {
    height: 70,
  },

  panel: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
  },

  card: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },

  button: {
    height: 48,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },

  input: {
    height: 48,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
  },
};

// ============================================================================
// Gradients
// ============================================================================

export const Gradients = {
  primary: {
    colors: [Colors.primaryLight, Colors.primary, Colors.primaryDark],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },

  background: {
    colors: [Colors.background, Colors.backgroundLight],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },

  glass: {
    colors: ['rgba(255, 255, 255, 0.1)', 'rgba(255, 255, 255, 0.05)'],
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },

  arcReactor: {
    colors: [
      Colors.arcReactorInner,
      Colors.arcReactorOuter,
      Colors.arcReactorGlow,
    ],
    start: { x: 0.5, y: 0.5 },
    end: { x: 1, y: 1 },
  },
};

// ============================================================================
// Z-Index Layers
// ============================================================================

export const ZIndex = {
  background: -1,
  content: 0,
  panel: 10,
  header: 100,
  overlay: 200,
  modal: 300,
  tooltip: 400,
  toast: 500,
};

// ============================================================================
// Reanimated Spring Configs
// ============================================================================

export const Springs = {
  gentle: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },

  bouncy: {
    damping: 12,
    stiffness: 180,
    mass: 1,
  },

  snappy: {
    damping: 25,
    stiffness: 300,
    mass: 1,
  },

  slow: {
    damping: 30,
    stiffness: 50,
    mass: 1.5,
  },
};

// ============================================================================
// Theme Object
// ============================================================================

export const Theme = {
  colors: Colors,
  fonts: Fonts,
  fontSizes: FontSizes,
  lineHeights: LineHeights,
  spacing: Spacing,
  borderRadius: BorderRadius,
  shadows: Shadows,
  durations: Durations,
  layout: Layout,
  gradients: Gradients,
  zIndex: ZIndex,
  springs: Springs,
};

export default Theme;
