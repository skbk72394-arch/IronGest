/**
 * IronGest - Babel Configuration
 * Production-grade Babel configuration for React Native
 */

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],

  plugins: [
    // Reanimated plugin must be listed first
    'react-native-reanimated/plugin',

    // Optional: Module resolver for cleaner imports
    [
      'module-resolver',
      {
        alias: {
          // Common aliases
          '@': './src',
          '@components': './src/components',
          '@screens': './src/screens',
          '@hooks': './src/hooks',
          '@utils': './src/utils',
          '@assets': './assets',
          '@theme': './src/ui/theme',
          '@native': './src/native',

          // Module aliases
          'irongest/hand-tracking': './src/hand-tracking',
          'irongest/gestures': './src/gestures',
          'irongest/cursor': './src/cursor',
          'irongest/keyboard': './src/keyboard',
        },
        extensions: ['.js', '.jsx', '.ts', '.tsx', '.android.js', '.ios.js'],
      },
    ],
  ],

  // Environment configuration
  env: {
    production: {
      plugins: ['react-native-reanimated/plugin'],
    compact: true,
    minified: true,
  },
    development: {
    plugins: ['react-native-reanimated/plugin'],
    compact: false,
    minified: false,
  },
  test: {
    plugins: ['react-native-reanimated/plugin'],
  },
  },

  // Source maps for debugging
  sourceMaps: 'inline',

  // Target environments
  targets: {
    android: {
      chrome: '90',
      node: 'current',
    },
    ios: {
      safari: '15',
      node: 'current',
    },
  },

  // Ignore certain directories
  ignore: [
    'node_modules/**',
    'android/**',
    'ios/**',
    '.git/**',
    '.gradle/**',
  ],
};
