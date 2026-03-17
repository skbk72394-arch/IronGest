/**
 * IronGest - React Native Configuration
 * Native module configuration and linking
 */

module.exports = {
  // Project configuration
  project: {
    ios: {},
    android: {},
  },

  // Native module linking configuration
  dependencies: {
    // React Native Reanimated - requires specific config
    'react-native-reanimated': {
    platforms: {
    android: {
    sourceDir: '../node_modules/react-native-reanimated/android',
    packageImportPath: 'com/swmansion/reanimated',
  },
  ios: {
    sourceDir: '../node_modules/react-native-reanimated/ios',
    packageImportPath: 'com.swmansion.reanimated',
  },
  },
  },

  // React Native Gesture Handler
  'react-native-gesture-handler': {
  platforms: {
    android: {
    sourceDir: '../node_modules/react-native-gesture-handler/android',
    packageImportPath: 'com.swmansion/gesturehandler',
  },
  ios: {
    sourceDir: '../node_modules/react-native-gesture-handler/ios',
  },
  },
  },

  // React Native Screens
  'react-native-screens': {
  platforms: {
    android: {
    sourceDir: '../node_modules/react-native-screens/android',
  },
  ios: {
    sourceDir: '../node_modules/react-native-screens/ios',
  },
  },
  },

  // React Native Safe Area Context
  'react-native-safe-area-context': {
  platforms: {
    android: {
    sourceDir: '../node_modules/react-native-safe-area-context/android',
  },
  ios: {
    sourceDir: '../node_modules/react-native-safe-area-context/ios',
  },
  },
  },

  // React Native SVG
  'react-native-svg': {
  platforms: {
    android: {
    sourceDir: '../node_modules/react-native-svg/android',
  },
  ios: {
    sourceDir: '../node_modules/react-native-svg/ios',
  },
  },
  },

  // Vision Camera
  'react-native-vision-camera': {
  platforms: {
    android: {
    sourceDir: '../node_modules/react-native-vision-camera/android',
  },
  ios: {
    sourceDir: '../node_modules/react-native-vision-camera/ios',
  },
  },
  },
  },

  // Custom native modules
  'irongest-native': {
  platforms: {
    android: {
    sourceDir: './android/app/src/main',
    cmakeListsPath: './android/app/src/main/cpp/CMakeLists.txt',
    },
  },
  },
  },

  // Asset configuration
  assets: ['./assets/**/*'],

  // Ignore patterns
  ignore: [
    '**/__tests__/**',
    '**/__mocks__/**',
    '**/*.test.js',
    '**/*.spec.js',
    '**/node_modules/**/test/**',
  ],

  // Code generation configuration
  codegenConfig: {
    libraries: [],
  name: 'irongest',
  jsSrcsDir: './src',
  android: {
    javaDir: './android/app/src/main/java',
    jniDir: './android/app/src/main/cpp',
    cmakeListsPath: './android/app/src/main/cpp/CMakeLists.txt',
  },
  ios: {
    jsSrcsDir: './ios',
  },
  },
};
