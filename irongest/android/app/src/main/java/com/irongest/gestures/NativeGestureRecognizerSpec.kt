/**
 * IronGest - Native Gesture Recognizer Spec
 * TurboModule specification for React Native New Architecture
 */

package com.irongest.gestures

import com.facebook.react.bridge.*
import com.facebook.react.turbomodule.core.interfaces.TurboModule

abstract class NativeGestureRecognizerSpec(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext), TurboModule {

    abstract fun initialize(promise: Promise)
    abstract fun release()
    abstract fun processLandmarks(
        landmarksX: ReadableArray,
        landmarksY: ReadableArray,
        landmarksZ: ReadableArray,
        confidence: Double,
        isRightHand: Boolean,
        timestamp: Double,
        promise: Promise
    )
    abstract fun setScreenSize(width: Int, height: Int)
    abstract fun setConfig(config: ReadableMap)
    abstract fun getCurrentGesture(): Int
    abstract fun isInitialized(): Boolean
    abstract fun getCursorPosition(): WritableMap
    abstract fun addListener(eventName: String)
    abstract fun removeListeners(count: Int)
}
