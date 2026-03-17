/**
 * IronGest - Native Keyboard Module Spec
 * React Native module specification for air keyboard
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.keyboard

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.module.annotations.ReactModule

/**
 * Module spec for air keyboard
 */
@ReactModule(name = NativeKeyboardModuleSpec.NAME)
abstract class NativeKeyboardModuleSpec(context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    companion object {
        const val NAME = "KeyboardModule"
    }

    override fun getName(): String = NAME

    // ============================================================================
    // Keyboard Management
    // ============================================================================

    abstract fun showKeyboard(promise: Promise)
    abstract fun hideKeyboard(promise: Promise)
    abstract fun isKeyboardVisible(promise: Promise)
    abstract fun setMode(mode: String, promise: Promise)
    abstract fun getMode(promise: Promise)

    // ============================================================================
    // Index Finger Mode
    // ============================================================================

    abstract fun updateIndexFingerPosition(
        normalizedX: Double,
        normalizedY: Double,
        confidence: Double,
        promise: Promise
    )

    abstract fun handlePinchGesture(pinchDistance: Double, promise: Promise)
    abstract fun setOneHandedMode(mode: String, promise: Promise)
    abstract fun setKeyPressMethod(method: String, promise: Promise)

    // ============================================================================
    // Ten Finger Mode
    // ============================================================================

    abstract fun updateAllFingerPositions(
        positions: ReadableArray,
        confidences: ReadableArray,
        promise: Promise
    )

    abstract fun updateFingerPosition(
        fingerIndex: Double,
        x: Double,
        y: Double,
        z: Double,
        promise: Promise
    )

    // ============================================================================
    // Input
    // ============================================================================

    abstract fun injectKeystroke(character: String, promise: Promise)
    abstract fun injectSpecialKey(keyCode: Double, promise: Promise)
    abstract fun setSuggestions(suggestions: ReadableArray, promise: Promise)

    // ============================================================================
    // Statistics
    // ============================================================================

    abstract fun getStatistics(promise: Promise)
    abstract fun resetStatistics(promise: Promise)

    // ============================================================================
    // Event Listeners
    // ============================================================================

    abstract fun addListener(eventName: String)
    abstract fun removeListeners(count: Double)
}
