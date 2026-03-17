/**
 * IronGest - Keyboard Module
 * TurboModule implementation for air keyboard
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.keyboard

import android.os.Build
import android.view.KeyEvent
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule

@ReactModule(name = KeyboardModule.NAME)
class KeyboardModule(
    reactContext: ReactApplicationContext
) : NativeKeyboardModuleSpec(reactContext) {

    companion object {
        const val NAME = "KeyboardModule"

        // Event names
        const val EVENT_KEY_PRESSED = "onKeyPressed"
        const val EVENT_MODE_CHANGED = "onModeChanged"
        const val EVENT_STATE_CHANGED = "onStateChanged"
        const val EVENT_WPM_UPDATED = "onWPMUpdated"
    }

    private val keyboardManager: AirKeyboardManager by lazy {
        AirKeyboardManager.getInstance(reactContext)
    }

    private var listenersCount = 0

    override fun initialize() {
        super.initialize()
        setupEventListeners()
    }

    private fun setupEventListeners() {
        keyboardManager.setOnKeyPressedListener { character ->
            sendEvent(EVENT_KEY_PRESSED, Arguments.createMap().apply {
                putString("character", character.toString())
                putDouble("timestamp", System.currentTimeMillis().toDouble())
            })
        }

        keyboardManager.setOnModeChangedListener { mode ->
            sendEvent(EVENT_MODE_CHANGED, Arguments.createMap().apply {
                putString("mode", mode.name)
            })
        }

        keyboardManager.setOnStateChangedListener { state ->
            sendEvent(EVENT_STATE_CHANGED, Arguments.createMap().apply {
                putString("state", state.name)
            })
        }

        keyboardManager.setOnWPMUpdatedListener { wpm ->
            sendEvent(EVENT_WPM_UPDATED, Arguments.createMap().apply {
                putDouble("wpm", wpm.toDouble())
            })
        }
    }

    // ============================================================================
    // Keyboard Management
    // ============================================================================

    @RequiresApi(Build.VERSION_CODES.M)
    override fun showKeyboard(promise: Promise) {
        try {
            val result = keyboardManager.showKeyboard()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("KEYBOARD_ERROR", e.message)
        }
    }

    override fun hideKeyboard(promise: Promise) {
        try {
            keyboardManager.hideKeyboard()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("KEYBOARD_ERROR", e.message)
        }
    }

    override fun isKeyboardVisible(promise: Promise) {
        promise.resolve(keyboardManager.isVisible())
    }

    override fun setMode(mode: String, promise: Promise) {
        try {
            val keyboardMode = when (mode.uppercase()) {
                "INDEX_FINGER" -> AirKeyboardMode.INDEX_FINGER
                "TEN_FINGER" -> AirKeyboardMode.TEN_FINGER
                "AUTO" -> AirKeyboardMode.AUTO
                else -> throw IllegalArgumentException("Invalid mode: $mode")
            }
            keyboardManager.setMode(keyboardMode)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("MODE_ERROR", e.message)
        }
    }

    override fun getMode(promise: Promise) {
        val mode = keyboardManager.getMode()
        val result = Arguments.createMap().apply {
            putString("mode", mode.name)
        }
        promise.resolve(result)
    }

    // ============================================================================
    // Index Finger Mode
    // ============================================================================

    override fun updateIndexFingerPosition(
        normalizedX: Double,
        normalizedY: Double,
        confidence: Double,
        promise: Promise
    ) {
        try {
            keyboardManager.updateIndexFingerPosition(
                normalizedX.toFloat(),
                normalizedY.toFloat(),
                confidence.toFloat()
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("POSITION_ERROR", e.message)
        }
    }

    override fun handlePinchGesture(pinchDistance: Double, promise: Promise) {
        try {
            keyboardManager.handlePinchGesture(pinchDistance.toFloat())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("GESTURE_ERROR", e.message)
        }
    }

    override fun setOneHandedMode(mode: String, promise: Promise) {
        try {
            val keyboardMode = when (mode.uppercase()) {
                "LEFT_HAND" -> KeyboardMode.LEFT_HAND
                "RIGHT_HAND" -> KeyboardMode.RIGHT_HAND
                "CENTER" -> KeyboardMode.CENTER
                else -> throw IllegalArgumentException("Invalid mode: $mode")
            }
            keyboardManager.setOneHandedMode(keyboardMode)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("MODE_ERROR", e.message)
        }
    }

    override fun setKeyPressMethod(method: String, promise: Promise) {
        try {
            val pressMethod = when (method.uppercase()) {
                "PINCH" -> KeyPressMethod.PINCH
                "DWELL" -> KeyPressMethod.DWELL
                "BOTH" -> KeyPressMethod.BOTH
                else -> throw IllegalArgumentException("Invalid method: $method")
            }
            keyboardManager.setKeyPressMethod(pressMethod)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("METHOD_ERROR", e.message)
        }
    }

    // ============================================================================
    // Ten Finger Mode
    // ============================================================================

    override fun updateAllFingerPositions(
        positions: ReadableArray,
        confidences: ReadableArray,
        promise: Promise
    ) {
        try {
            require(positions.size() == 30) { "Positions array must have 30 elements" }
            require(confidences.size() == 10) { "Confidences array must have 10 elements" }

            val posArray = FloatArray(30) { positions.getDouble(it).toFloat() }
            val confArray = FloatArray(10) { confidences.getDouble(it).toFloat() }

            keyboardManager.updateAllFingerPositions(posArray, confArray)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("POSITION_ERROR", e.message)
        }
    }

    override fun updateFingerPosition(
        fingerIndex: Double,
        x: Double,
        y: Double,
        z: Double,
        promise: Promise
    ) {
        try {
            keyboardManager.updateFingerPosition(
                fingerIndex.toInt(),
                x.toFloat(),
                y.toFloat(),
                z.toFloat()
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("POSITION_ERROR", e.message)
        }
    }

    // ============================================================================
    // Input
    // ============================================================================

    override fun injectKeystroke(character: String, promise: Promise) {
        try {
            val char = character.first()
            keyboardManager.injectKeystroke(char)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INPUT_ERROR", e.message)
        }
    }

    override fun injectSpecialKey(keyCode: Double, promise: Promise) {
        try {
            keyboardManager.injectSpecialKey(keyCode.toInt())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INPUT_ERROR", e.message)
        }
    }

    override fun setSuggestions(suggestions: ReadableArray, promise: Promise) {
        try {
            val list = (0 until suggestions.size()).map { suggestions.getString(it) }
            keyboardManager.setSuggestions(list)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SUGGESTION_ERROR", e.message)
        }
    }

    // ============================================================================
    // Statistics
    // ============================================================================

    override fun getStatistics(promise: Promise) {
        try {
            val stats = keyboardManager.getStatistics()
            val result = Arguments.createMap().apply {
                putDouble("totalKeyPresses", stats.totalKeyPresses.toDouble())
                putDouble("errorCount", stats.errorCount.toDouble())
                putDouble("wpm", stats.wpm.toDouble())
                putDouble("errorRate", stats.errorRate.toDouble())
                putString("mode", stats.mode.name)
                putString("state", stats.state.name)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("STATS_ERROR", e.message)
        }
    }

    override fun resetStatistics(promise: Promise) {
        try {
            keyboardManager.resetStatistics()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STATS_ERROR", e.message)
        }
    }

    // ============================================================================
    // Event Listeners
    // ============================================================================

    override fun addListener(eventName: String) {
        listenersCount++
    }

    override fun removeListeners(count: Double) {
        listenersCount = (listenersCount - count.toInt()).coerceAtLeast(0)
    }

    // ============================================================================
    // Helpers
    // ============================================================================

    private fun sendEvent(eventName: String, params: com.facebook.react.bridge.WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    override fun onCatalystInstanceDestroy() {
        keyboardManager.release()
        super.onCatalystInstanceDestroy()
    }
}
