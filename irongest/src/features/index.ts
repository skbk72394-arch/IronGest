/**
 * IronGest - Extra Features TypeScript Interface
 * Complete TypeScript definitions for all extra features
 *
 * @author IronGest Team
 * @version 1.0.0
 */

import { NativeModules, NativeEventEmitter } from 'react-native';

// ============================================================================
// Gesture Macros System
// ============================================================================

/**
 * Single gesture step in a macro
 */
export interface GestureStep {
  gestureType: string;
  durationMs: number;
  position?: { x: number; y: number };
  intensity: number;
  delayAfterMs: number;
}

/**
 * Trigger types for macros
 */
export enum MacroTriggerType {
  GESTURE_SEQUENCE = 'GESTURE_SEQUENCE',
  APP_FOREGROUND = 'APP_FOREGROUND',
  TIME_OF_DAY = 'TIME_OF_DAY',
  LOCATION = 'LOCATION',
  BLUETOOTH_DEVICE = 'BLUETOOTH_DEVICE',
  CUSTOM_CONDITION = 'CUSTOM_CONDITION',
}

/**
 * Trigger conditions
 */
export enum TriggerCondition {
  EXACT = 'EXACT',
  PARTIAL = 'PARTIAL',
  ORDER_INDEPENDENT = 'ORDER_INDEPENDENT',
  WITHIN_TIMEOUT = 'WITHIN_TIMEOUT',
}

/**
 * Macro trigger configuration
 */
export interface MacroTrigger {
  type: MacroTriggerType;
  value: string;
  condition: TriggerCondition;
}

/**
 * Action types
 */
export enum MacroActionType {
  LAUNCH_APP = 'LAUNCH_APP',
  OPEN_URL = 'OPEN_URL',
  EXECUTE_SHORTCUT = 'EXECUTE_SHORTCUT',
  SIMULATE_GESTURE = 'SIMULATE_GESTURE',
  TOGGLE_SETTING = 'TOGGLE_SETTING',
  SEND_INTENT = 'SEND_INTENT',
  RUN_SCRIPT = 'RUN_SCRIPT',
  PLAY_SOUND = 'PLAY_SOUND',
  SHOW_NOTIFICATION = 'SHOW_NOTIFICATION',
  VIBRATE_PATTERN = 'VIBRATE_PATTERN',
  CONTROL_MEDIA = 'CONTROL_MEDIA',
  ADJUST_VOLUME = 'ADJUST_VOLUME',
  ADJUST_BRIGHTNESS = 'ADJUST_BRIGHTNESS',
}

/**
 * Macro action
 */
export interface MacroAction {
  type: MacroActionType;
  data: Record<string, any>;
  delayMs: number;
}

/**
 * Complete gesture macro
 */
export interface GestureMacro {
  id: string;
  name: string;
  description: string;
  icon?: string;
  trigger: MacroTrigger;
  steps: GestureStep[];
  actions: MacroAction[];
  enabled: boolean;
  priority: number;
  cooldownMs: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Macro recording state
 */
export interface MacroRecordingState {
  isRecording: boolean;
  recordedSteps: GestureStep[];
  duration: number;
}

// ============================================================================
// App Profiles System
// ============================================================================

/**
 * App profile configuration
 */
export interface AppProfile {
  id: string;
  packageName: string;
  appName: string;
  enabled: boolean;
  gestureMappings: Record<string, string>;
  sensitivityMultiplier: number;
  cursorSpeedMultiplier: number;
  dwellTimeOverride?: number;
  hapticFeedbackEnabled: boolean;
  customCursorColor?: string;
  enabledGestures: string[];
  disabledGestures: string[];
  priority: number;
}

/**
 * App information
 */
export interface AppInfo {
  packageName: string;
  appName: string;
  hasProfile: boolean;
}

/**
 * Profile switching mode
 */
export enum ProfileSwitchMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
  HYBRID = 'HYBRID',
}

/**
 * Profile presets
 */
export enum ProfilePreset {
  BROWSER = 'BROWSER',
  VIDEO_PLAYER = 'VIDEO_PLAYER',
  READER = 'READER',
  GAME = 'GAME',
  SOCIAL = 'SOCIAL',
  MUSIC = 'MUSIC',
  CUSTOM = 'CUSTOM',
}

// ============================================================================
// Wake Gesture System
// ============================================================================

/**
 * Wake gesture types
 */
export enum WakeGestureType {
  WAVE = 'WAVE',
  TAP = 'TAP',
  PEAK = 'PEAK',
  FIST = 'FIST',
  PEACE = 'PEACE',
  CUSTOM = 'CUSTOM',
}

/**
 * Wake gesture configuration
 */
export interface WakeGestureConfig {
  enabled: boolean;
  gestureType: WakeGestureType;
  sensitivity: number;
  proximityRequired: boolean;
  doubleGestureRequired: boolean;
  timeWindowMs: number;
  screenTimeoutAfterWakeMs: number;
  vibrationFeedback: boolean;
}

/**
 * Wake state
 */
export enum WakeState {
  STANDBY = 'STANDBY',
  DETECTING = 'DETECTING',
  CONFIRMED = 'CONFIRMED',
  AWAKE = 'AWAKE',
  SLEEPING = 'SLEEPING',
}

// ============================================================================
// Voice + Gesture Combo
// ============================================================================

/**
 * Voice command configuration
 */
export interface VoiceCommandConfig {
  enabled: boolean;
  language: string;
  keyword: string;
  sensitivity: number;
  offlineMode: boolean;
  confidenceThreshold: number;
}

/**
 * Voice + gesture combo action
 */
export interface VoiceGestureCombo {
  voicePhrase: string;
  gestureType: string;
  action: string;
  description: string;
}

/**
 * Voice recognition result
 */
export interface VoiceRecognitionResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  language: string;
}

// ============================================================================
// Multiplayer Cursor
// ============================================================================

/**
 * Player information
 */
export interface PlayerInfo {
  id: string;
  name: string;
  color: string;
  cursorPosition: { x: number; y: number };
  isConnected: boolean;
  lastActive: number;
}

/**
 * Multiplayer session
 */
export interface MultiplayerSession {
  sessionId: string;
  hostId: string;
  players: PlayerInfo[];
  maxPlayers: number;
  createdAt: number;
  expiresAt: number;
}

/**
 * Multiplayer configuration
 */
export interface MultiplayerConfig {
  enabled: boolean;
  maxPlayers: number;
  sessionTimeoutMs: number;
  cursorColors: string[];
  showPlayerNames: boolean;
  showConnectionStatus: boolean;
}

// ============================================================================
// Gesture Lock Screen
// ============================================================================

/**
 * Lock gesture type
 */
export enum LockGestureType {
  SEQUENCE = 'SEQUENCE',
  PATTERN = 'PATTERN',
  CUSTOM = 'CUSTOM',
}

/**
 * Lock gesture configuration
 */
export interface GestureLockConfig {
  enabled: boolean;
  gestureType: LockGestureType;
  gestureSequence: string[];
  maxAttempts: number;
  lockoutTimeMs: number;
  vibrateOnError: boolean;
  showHint: boolean;
  autoLockTimeoutMs: number;
}

/**
 * Lock state
 */
export enum LockState {
  LOCKED = 'LOCKED',
  UNLOCKING = 'UNLOCKING',
  UNLOCKED = 'UNLOCKED',
  LOCKED_OUT = 'LOCKED_OUT',
}

// ============================================================================
// Eye Tracking Combo
// ============================================================================

/**
 * Eye tracking configuration
 */
export interface EyeTrackingConfig {
  enabled: boolean;
  sensitivity: number;
  smoothFactor: number;
  blinkToSelect: boolean;
  dwellToSelect: boolean;
  dwellTimeMs: number;
  showGazeIndicator: boolean;
}

/**
 * Gaze data
 */
export interface GazeData {
  x: number;
  y: number;
  leftEyeOpen: boolean;
  rightEyeOpen: boolean;
  confidence: number;
  timestamp: number;
}

/**
 * Eye + gesture combo action
 */
export interface EyeGestureCombo {
  gazeRegion: string;  // 'center', 'top', 'bottom', 'left', 'right'
  gestureType: string;
  action: string;
}

// ============================================================================
// HUD Notifications
// ============================================================================

/**
 * HUD notification type
 */
export enum HUDNotificationType {
  INFO = 'INFO',
  SUCCESS = 'SUCCESS',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

/**
 * HUD notification
 */
export interface HUDNotification {
  id: string;
  type: HUDNotificationType;
  title: string;
  message: string;
  icon?: string;
  duration: number;
  position: 'top' | 'center' | 'bottom';
  dismissGesture?: string;
  actions: NotificationAction[];
  createdAt: number;
}

/**
 * Notification action
 */
export interface NotificationAction {
  id: string;
  label: string;
  gesture?: string;
  action: () => void;
}

/**
 * HUD notification configuration
 */
export interface HUDNotificationConfig {
  enabled: boolean;
  showSystemNotifications: boolean;
  showGestureHints: boolean;
  autoDismiss: boolean;
  defaultDuration: number;
  maxVisible: number;
  position: 'top' | 'center' | 'bottom';
  animationDuration: number;
}

// ============================================================================
// Event Names
// ============================================================================

export const FeatureEvents = {
  // Macros
  MACRO_TRIGGERED: 'onMacroTriggered',
  MACRO_RECORDED: 'onMacroRecorded',

  // Profiles
  PROFILE_CHANGED: 'onProfileChanged',
  APP_DETECTED: 'onAppDetected',

  // Wake
  WAKE_GESTURE_DETECTED: 'onWakeGestureDetected',
  WAKE_STATE_CHANGED: 'onWakeStateChanged',

  // Voice
  VOICE_RECOGNIZED: 'onVoiceRecognized',

  // Multiplayer
  PLAYER_JOINED: 'onPlayerJoined',
  PLAYER_LEFT: 'onPlayerLeft',
  CURSOR_SHARED: 'onCursorShared',

  // Lock
  LOCK_STATE_CHANGED: 'onLockStateChanged',
  LOCK_ATTEMPT: 'onLockAttempt',

  // Eye tracking
  GAZE_DETECTED: 'onGazeDetected',
  BLINK_DETECTED: 'onBlinkDetected',

  // Notifications
  NOTIFICATION_RECEIVED: 'onNotificationReceived',
  NOTIFICATION_DISMISSED: 'onNotificationDismissed',
} as const;

// ============================================================================
// React Hooks
// ============================================================================

/**
 * Hook for gesture macros
 */
export function useGestureMacros() {
  return {
    startRecording: async () => {},
    stopRecording: async () => {},
    cancelRecording: async () => {},
    getMacros: async (): Promise<GestureMacro[]> => [],
    addMacro: async (macro: GestureMacro) => {},
    updateMacro: async (macro: GestureMacro) => {},
    deleteMacro: async (id: string) => {},
    exportMacros: async (): Promise<string> => '',
    importMacros: async (json: string) => {},
    onMacroTriggered: (callback: (macro: GestureMacro) => void) => {},
    onMacroRecorded: (callback: (macro: GestureMacro) => void) => {},
  };
}

/**
 * Hook for app profiles
 */
export function useAppProfiles() {
  return {
    getProfiles: async (): Promise<AppProfile[]> => [],
    getCurrentProfile: async (): Promise<AppProfile | null> => null,
    setProfile: async (profile: AppProfile) => {},
    removeProfile: async (packageName: string) => {},
    getInstalledApps: async (): Promise<AppInfo[]> => [],
    createPresetProfile: async (packageName: string, preset: ProfilePreset): Promise<AppProfile> => null as any,
    setSwitchMode: async (mode: ProfileSwitchMode) => {},
    setManualOverride: async (packageName: string | null) => {},
    onProfileChanged: (callback: (profile: AppProfile) => void) => {},
  };
}

/**
 * Hook for wake gestures
 */
export function useWakeGesture() {
  return {
    startMonitoring: async () => {},
    stopMonitoring: async () => {},
    setConfig: async (config: WakeGestureConfig) => {},
    getConfig: async (): Promise<WakeGestureConfig> => null as any,
    getCurrentState: async (): Promise<WakeState> => WakeState.STANDBY,
    onWakeGestureDetected: (callback: () => void) => {},
    onStateChanged: (callback: (state: WakeState) => void) => {},
  };
}

/**
 * Hook for voice + gesture combo
 */
export function useVoiceGesture() {
  return {
    startListening: async () => {},
    stopListening: async () => {},
    setConfig: async (config: VoiceCommandConfig) => {},
    addCombo: async (combo: VoiceGestureCombo) => {},
    removeCombo: async (phrase: string, gesture: string) => {},
    onVoiceRecognized: (callback: (result: VoiceRecognitionResult) => void) => {},
  };
}

/**
 * Hook for multiplayer cursor
 */
export function useMultiplayerCursor() {
  return {
    createSession: async (): Promise<MultiplayerSession> => null as any,
    joinSession: async (sessionId: string): Promise<boolean> => false,
    leaveSession: async () => {},
    getPlayers: async (): Promise<PlayerInfo[]> => [],
    setCursorPosition: async (x: number, y: number) => {},
    onPlayerJoined: (callback: (player: PlayerInfo) => void) => {},
    onPlayerLeft: (callback: (playerId: string) => void) => {},
    onCursorShared: (callback: (data: { playerId: string; x: number; y: number }) => void) => {},
  };
}

/**
 * Hook for gesture lock screen
 */
export function useGestureLock() {
  return {
    setConfig: async (config: GestureLockConfig) => {},
    lock: async () => {},
    attemptUnlock: async (sequence: string[]): Promise<boolean> => false,
    getLockState: async (): Promise<LockState> => LockState.LOCKED,
    onLockStateChanged: (callback: (state: LockState) => void) => {},
  };
}

/**
 * Hook for eye tracking combo
 */
export function useEyeTracking() {
  return {
    setConfig: async (config: EyeTrackingConfig) => {},
    startTracking: async () => {},
    stopTracking: async () => {},
    getGazeData: async (): Promise<GazeData | null> => null,
    addCombo: async (combo: EyeGestureCombo) => {},
    onGazeDetected: (callback: (gaze: GazeData) => void) => {},
    onBlinkDetected: (callback: () => void) => {},
  };
}

/**
 * Hook for HUD notifications
 */
export function useHUDNotifications() {
  return {
    show: async (notification: Omit<HUDNotification, 'id' | 'createdAt'>) => {},
    dismiss: async (id: string) => {},
    dismissAll: async () => {},
    setConfig: async (config: HUDNotificationConfig) => {},
    getActive: async (): Promise<HUDNotification[]> => [],
    onNotificationReceived: (callback: (notification: HUDNotification) => void) => {},
    onNotificationDismissed: (callback: (id: string) => void) => {},
  };
}

export default {
  useGestureMacros,
  useAppProfiles,
  useWakeGesture,
  useVoiceGesture,
  useMultiplayerCursor,
  useGestureLock,
  useEyeTracking,
  useHUDNotifications,
};
