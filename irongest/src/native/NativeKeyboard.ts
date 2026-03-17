/**
 * IronGest - Native Keyboard TurboModule Spec
 * TypeScript specification for React Native New Architecture
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Lifecycle
  initialize(): Promise<boolean>;
  release(): void;
  show(): Promise<boolean>;
  hide(): void;
  
  // Input
  insertText(text: string): void;
  deleteCharacter(): void;
  sendKeyEvent(keyCode: number): void;
  
  // Mode
  setMode(mode: 'index' | 'ten_finger'): void;
  getMode(): string;
  
  // Configuration
  setKeymap(keymap: Object): void;
  
  // State
  isInitialized(): boolean;
  isShowing(): boolean;
  
  // Events
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('AirKeyboard');
