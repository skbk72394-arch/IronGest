/**
 * IronGest - Metro Bundler Configuration
 * Configures Metro bundler for React Native with native module support
 */

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration for IronGest
 * 
 * Features:
 * - C++ source file handling
 * - Native module resolution
 * - Asset handling for MediaPipe models
 */
module.exports = (async () => {
  const defaultConfig = await getDefaultConfig();

  return mergeConfig(defaultConfig, {
    // Project root
    projectRoot: path.resolve(__dirname),

    // Watcher configuration
    watcher: {
    additionalExts: ['.cpp', '.h', '.cc', '.hpp'],
  },

  // Resolver configuration
  resolver: {
    // Add C++ extensions to assetExts for proper handling
    assetExts: [
    ...defaultConfig.resolver.assetExts,
    'cpp',
    'h',
    'cc',
    'hpp',
    'tflite',
    'task',
  ],

  // Source extensions for native modules
  sourceExts: [
    ...defaultConfig.resolver.sourceExts,
    'cpp',
    'h',
  ],

  // Additional asset platforms
  platforms: {
    android: {
    assets: ['./assets/**/*', './src/main/assets/**/*'],
  },
  },

  // Transformer configuration for native files
  transformer: {
    getTransformOptions: async () => ({
    transform: {
    experimentalImportSupport: true,
  },
  }),
  },

  // Serializer configuration
  serializer: {
    // Custom serializers for native modules
    getModulesRunBeforeMainModule: () => [
    require.resolve('./src/native/init'),
    ],
  },

  // Server configuration
  server: {
  enhanceMiddleware: (middleware) => {
    return middleware;
  },
  },

  // Cache configuration
  cacheStores: [
  {
    // Cache for C++ compilation artifacts
    name: 'cpp-cache',
    path: path.resolve(__dirname, '.metro', 'cpp-cache'),
  },
  {
    // Cache for MediaPipe models
    name: 'model-cache',
    path: path.resolve(__dirname, '.metro', 'model-cache'),
  },
  ],

  // Symbolication options
  symbolicator: {
  options: {
    platform: 'android',
    customErrorHandler: true,
  },
  },

  // Reset cache configuration
  resetCache: true,

  // Worker configuration for faster builds
  maxWorkers: 4,
  });
})();
