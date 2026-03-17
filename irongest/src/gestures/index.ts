/**
 * IronGest - Gestures Module Index
 * Production exports for gesture recognition
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

// Types
export * from './types';

// Hooks
export {
  useGestureRecognizer,
  useGestureDetection,
  useGestureCursor,
  useGestureAction,
} from './useGestureRecognizer';

// Default export
export { default } from './useGestureRecognizer';
