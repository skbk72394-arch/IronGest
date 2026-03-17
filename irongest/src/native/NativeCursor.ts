/**
 * IronGest - Native Cursor TurboModule Spec
 * TypeScript specification for React Native New Architecture
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  // Overlay management
  showOverlay(): Promise<boolean>;
  hideOverlay(): void;
  isOverlayShowing(): boolean;
  
  // Position
  updatePosition(normalizedX: number, normalizedY: number, confidence: number): void;
  getCurrentPosition(): Promise<{ x: number; y: number }>;
  
  // Actions
  performClick(): void;
  performDoubleClick(): void;
  performLongPress(durationMs: number): void;
  startDrag(): void;
  endDrag(): void;
  performScroll(deltaY: number): void;
  performSwipe(startX: number, startY: number, endX: number, endY: number, durationMs: number): void;
  
  // Global actions
  performBack(): boolean;
  performHome(): boolean;
  performRecents(): boolean;
  openNotifications(): boolean;
  takeScreenshot(): boolean;
  
  // Configuration
  setSmoothingFactor(factor: number): void;
  setCursorColor(color: string): void;
  setCursorVisible(visible: boolean): void;
  
  // Events
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('CursorControl');
