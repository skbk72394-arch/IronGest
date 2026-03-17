/**
 * IronGest - Native Gesture Recognizer TurboModule Spec
 * TypeScript specification for React Native New Architecture
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Lifecycle
  initialize(): Promise<boolean>;
  release(): void;
  
  // Processing
  processLandmarks(
    landmarksX: number[],
    landmarksY: number[],
    landmarksZ: number[],
    confidence: number,
    isRightHand: boolean,
    timestamp: number
  ): Promise<number>;
  
  // Configuration
  setScreenSize(width: number, height: number): void;
  setConfig(config: Object): void;
  
  // State
  getCurrentGesture(): number;
  isInitialized(): boolean;
  getCursorPosition(): Promise<{ x: number; y: number }>;
  
  // Events
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('GestureRecognizer');
