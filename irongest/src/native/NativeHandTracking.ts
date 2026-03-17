/**
 * IronGest - Native Hand Tracking TurboModule Spec
 * TypeScript specification for React Native New Architecture
 */

import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface HandTrackingConfig {
  numHands: number;
  minDetectionConfidence: number;
  minTrackingConfidence: number;
  useGpu: boolean;
  targetFps: number;
  enableFrameSkipping: boolean;
}

export interface Spec extends TurboModule {
  // Lifecycle
  initialize(): Promise<boolean>;
  release(): void;
  start(): Promise<boolean>;
  stop(): void;
  pause(): void;
  resume(): void;
  
  // Configuration
  setConfig(config: HandTrackingConfig): void;
  setTargetFps(fps: number): void;
  
  // State query
  isInitialized(): boolean;
  isRunning(): boolean;
  isPaused(): boolean;
  getQueueDepth(): number;
  getPerformanceStats(): Promise<{
    avgFps: number;
    minFps: number;
    maxFps: number;
    avgProcessingTimeMs: number;
    queueDepth: number;
    totalFramesProcessed: number;
    totalFramesSkipped: number;
  }>;
  
  // Events
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>('HandTracking');
