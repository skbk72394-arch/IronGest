/**
 * IronGest - Gesture Recognizer Module
 * Production-grade gesture recognition TurboModule for React Native
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.gestures

import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Gesture Types matching C++ enum
 */
object GestureTypes {
    const val NONE = 0
    const val PINCH_CLICK = 1
    const val BACK_GESTURE = 2
    const val RECENT_APPS = 3
    const val DRAG_START = 4
    const val DRAG_END = 5
    const val DRAG_MOVE = 6
    const val SCROLL_UP = 7
    const val SCROLL_DOWN = 8
    const val SWIPE_LEFT = 9
    const val SWIPE_RIGHT = 10
    const val SWIPE_UP = 11
    const val SWIPE_DOWN = 12
    const val ZOOM_IN = 13
    const val ZOOM_OUT = 14
    const val SCREENSHOT = 15
    const val VOLUME_UP = 16
    const val VOLUME_DOWN = 17
    const val NOTIFICATION_PULL = 18
    const val CURSOR_MOVE = 19
    const val HOME_GESTURE = 20
    
    fun toString(type: Int): String = when (type) {
        NONE -> "NONE"
        PINCH_CLICK -> "PINCH_CLICK"
        BACK_GESTURE -> "BACK_GESTURE"
        RECENT_APPS -> "RECENT_APPS"
        DRAG_START -> "DRAG_START"
        DRAG_END -> "DRAG_END"
        SCROLL_UP -> "SCROLL_UP"
        SCROLL_DOWN -> "SCROLL_DOWN"
        SWIPE_LEFT -> "SWIPE_LEFT"
        SWIPE_RIGHT -> "SWIPE_RIGHT"
        ZOOM_IN -> "ZOOM_IN"
        ZOOM_OUT -> "ZOOM_OUT"
        SCREENSHOT -> "SCREENSHOT"
        VOLUME_UP -> "VOLUME_UP"
        VOLUME_DOWN -> "VOLUME_DOWN"
        NOTIFICATION_PULL -> "NOTIFICATION_PULL"
        CURSOR_MOVE -> "CURSOR_MOVE"
        HOME_GESTURE -> "HOME_GESTURE"
        else -> "UNKNOWN"
    }
}

enum class GestureState { IDLE, DETECTING, ACTIVE, HELD, RELEASING, RELEASED }

data class Point2D(val x: Float, val y: Float) {
    fun distance(other: Point2D): Float = sqrt((other.x - x) * (other.x - x) + (other.y - y) * (other.y - y))
    operator fun minus(other: Point2D) = Point2D(x - other.x, y - other.y)
    operator fun times(scalar: Float) = Point2D(x * scalar, y * scalar)
}

/**
 * 2D Kalman Filter for cursor smoothing
 */
class KalmanFilter2D(private val processNoise: Float = 0.015f, private val measurementNoise: Float = 0.05f) {
    private var state = floatArrayOf(0f, 0f, 0f, 0f)
    private var initialized = false
    private var lastTime = 0L
    
    fun update(x: Float, y: Float, timestampNs: Long): Point2D {
        if (!initialized) {
            state[0] = x; state[1] = y
            initialized = true; lastTime = timestampNs
            return Point2D(x, y)
        }
        val dt = (timestampNs - lastTime) / 1e9f; lastTime = timestampNs
        if (dt <= 0f || dt > 0.1f) return Point2D(state[0], state[1])
        
        state[0] += state[2] * dt; state[1] += state[3] * dt
        val kg = processNoise / (processNoise + measurementNoise)
        state[0] += kg * (x - state[0]); state[1] += kg * (y - state[1])
        state[2] = (state[2] + (x - state[0]) / dt * 0.3f) * 0.7f
        state[3] = (state[3] + (y - state[1]) / dt * 0.3f) * 0.7f
        return Point2D(state[0], state[1])
    }
    fun getVelocity(): Point2D = Point2D(state[2], state[3])
    fun reset() { initialized = false; state = floatArrayOf(0f, 0f, 0f, 0f) }
}

/**
 * Gesture Recognizer Module
 */
@ReactModule(name = GestureRecognizerModule.NAME)
class GestureRecognizerModule(reactContext: ReactApplicationContext) :
    NativeGestureRecognizerSpec(reactContext) {

    companion object {
        const val NAME = "GestureRecognizer"
        private const val TAG = "IronGest-Gestures"
        const val EVENT_GESTURE_DETECTED = "onGestureDetected"
        const val EVENT_CURSOR_MOVED = "onCursorMoved"
        
        const val WRIST = 0; const val THUMB_TIP = 4
        const val INDEX_TIP = 8; const val INDEX_MCP = 5
        const val MIDDLE_TIP = 12; const val MIDDLE_MCP = 9
        const val RING_TIP = 16; const val RING_MCP = 13
        const val PINKY_TIP = 20; const val PINKY_MCP = 17
        
        const val PINCH_THRESHOLD = 0.08f
        const val GESTURE_COOLDOWN_MS = 300L
    }

    private val isInitialized = AtomicBoolean(false)
    private val mainHandler = Handler(Looper.getMainLooper())
    private val cursorFilter = KalmanFilter2D(0.015f, 0.05f)
    private val gestureCooldowns = ConcurrentHashMap<Int, Long>()
    
    private var currentGestureType = GestureTypes.NONE
    private var currentState = GestureState.IDLE
    private var gestureStartTime = 0L
    
    private var lastTimestamp = 0L
    private var lastPalmCenter = Point2D(0f, 0f)
    private var palmVelocity = Point2D(0f, 0f)
    
    private var screenWidth = 1080f; private var screenHeight = 1920f
    private var gestureListeners = 0; private var cursorListeners = 0

    override fun getName(): String = NAME

    override fun initialize(promise: Promise) {
        if (isInitialized.get()) { promise.resolve(true); return }
        try {
            val wm = reactApplicationContext.getSystemService(android.content.Context.WINDOW_SERVICE) as android.view.WindowManager
            val size = android.graphics.Point()
            wm.defaultDisplay.getRealSize(size)
            screenWidth = size.x.toFloat(); screenHeight = size.y.toFloat()
            isInitialized.set(true)
            Log.i(TAG, "Gesture recognizer initialized")
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("INIT_ERROR", e.message)
        }
    }

    override fun release() {
        cursorFilter.reset()
        gestureCooldowns.clear()
        isInitialized.set(false)
    }

    override fun processLandmarks(
        landmarksX: ReadableArray, landmarksY: ReadableArray, landmarksZ: ReadableArray,
        confidence: Double, isRightHand: Boolean, timestamp: Double, promise: Promise
    ) {
        if (!isInitialized.get()) { promise.reject("NOT_INITIALIZED", "Not initialized"); return }
        
        try {
            val x = FloatArray(21) { landmarksX.getDouble(it).toFloat() }
            val y = FloatArray(21) { landmarksY.getDouble(it).toFloat() }
            val z = FloatArray(21) { landmarksZ.getDouble(it).toFloat() }
            val timestampNs = (timestamp * 1e6).toLong()
            
            val gesture = detectGesture(x, y, z, confidence.toFloat(), timestampNs)
            updateCursorPosition(x, y, timestampNs)
            promise.resolve(gesture)
        } catch (e: Exception) {
            promise.reject("PROCESS_ERROR", e.message)
        }
    }

    private fun detectGesture(x: FloatArray, y: FloatArray, z: FloatArray, confidence: Float, timestampNs: Long): Int {
        val palmX = (x[WRIST] + x[INDEX_MCP] + x[MIDDLE_MCP] + x[RING_MCP] + x[PINKY_MCP]) / 5f
        val palmY = (y[WRIST] + y[INDEX_MCP] + y[MIDDLE_MCP] + y[RING_MCP] + y[PINKY_MCP]) / 5f
        val palmCenter = Point2D(palmX, palmY)
        
        if (lastTimestamp > 0) {
            val dt = (timestampNs - lastTimestamp) / 1e9f
            if (dt > 0 && dt < 0.5f) palmVelocity = (palmCenter - lastPalmCenter) * (1f / dt.toFloat())
        }
        
        val handSize = sqrt((x[MIDDLE_TIP] - x[WRIST]) * (x[MIDDLE_TIP] - x[WRIST]) + (y[MIDDLE_TIP] - y[WRIST]) * (y[MIDDLE_TIP] - y[WRIST]))
        val fingerStates = calculateFingerStates(x, y, handSize)
        
        val gesture = when {
            detectPinch(x, y, handSize, INDEX_TIP) -> GestureTypes.PINCH_CLICK
            detectPinch(x, y, handSize, MIDDLE_TIP) -> GestureTypes.BACK_GESTURE
            detectPinch(x, y, handSize, RING_TIP) -> GestureTypes.RECENT_APPS
            fingerStates.all { it == 0 } -> GestureTypes.DRAG_START
            fingerStates.count { it >= 2 } >= 3 -> GestureTypes.DRAG_END
            fingerStates.count { it >= 1 } >= 4 && abs(palmVelocity.y) > 0.3f -> if (palmVelocity.y > 0) GestureTypes.SCROLL_DOWN else GestureTypes.SCROLL_UP
            fingerStates[1] == 2 && fingerStates[2] == 2 && fingerStates[3] == 0 && fingerStates[4] == 0 -> GestureTypes.SCREENSHOT
            fingerStates[0] == 2 && fingerStates[1] == 0 && fingerStates[2] == 0 && fingerStates[3] == 0 && fingerStates[4] == 0 -> if (y[THUMB_TIP] < y[2]) GestureTypes.VOLUME_UP else GestureTypes.VOLUME_DOWN
            fingerStates[1] == 2 && fingerStates[2] <= 1 && fingerStates[3] <= 1 && fingerStates[4] <= 1 -> GestureTypes.CURSOR_MOVE
            fingerStates.all { it >= 1 } && z[INDEX_TIP] < z[WRIST] -> GestureTypes.HOME_GESTURE
            else -> GestureTypes.NONE
        }
        
        updateStateMachine(gesture, timestampNs)
        
        if (shouldEmitGesture(gesture, timestampNs) && gesture != GestureTypes.NONE) {
            emitGestureEvent(gesture, confidence, palmCenter, timestampNs)
            gestureCooldowns[gesture] = timestampNs
        }
        
        lastTimestamp = timestampNs; lastPalmCenter = palmCenter
        return gesture
    }

    private fun calculateFingerStates(x: FloatArray, y: FloatArray, handSize: Float): IntArray {
        val tipIndices = intArrayOf(THUMB_TIP, INDEX_TIP, MIDDLE_TIP, RING_TIP, PINKY_TIP)
        val mcpIndices = intArrayOf(2, INDEX_MCP, MIDDLE_MCP, RING_MCP, PINKY_MCP)
        return IntArray(5) { i ->
            val tipDist = sqrt((x[tipIndices[i]] - x[WRIST]) * (x[tipIndices[i]] - x[WRIST]) + (y[tipIndices[i]] - y[WRIST]) * (y[tipIndices[i]] - y[WRIST]))
            val mcpDist = sqrt((x[mcpIndices[i]] - x[WRIST]) * (x[mcpIndices[i]] - x[WRIST]) + (y[mcpIndices[i]] - y[WRIST]) * (y[mcpIndices[i]] - y[WRIST]))
            val ratio = if (mcpDist > 0.001f) tipDist / mcpDist else 0f
            when { ratio > 1.1f -> 2; ratio < 0.8f -> 0; else -> 1 }
        }
    }

    private fun detectPinch(x: FloatArray, y: FloatArray, handSize: Float, fingerTip: Int): Boolean {
        val dist = sqrt((x[THUMB_TIP] - x[fingerTip]) * (x[THUMB_TIP] - x[fingerTip]) + (y[THUMB_TIP] - y[fingerTip]) * (y[THUMB_TIP] - y[fingerTip]))
        return dist / handSize < PINCH_THRESHOLD
    }

    private fun updateStateMachine(gesture: Int, timestampNs: Long) {
        when (currentState) {
            GestureState.IDLE -> if (gesture != GestureTypes.NONE) { currentState = GestureState.DETECTING; gestureStartTime = timestampNs; currentGestureType = gesture }
            GestureState.DETECTING -> { if (gesture == GestureTypes.NONE) currentState = GestureState.IDLE else if (timestampNs - gestureStartTime > 50_000_000L) currentState = GestureState.ACTIVE }
            GestureState.ACTIVE -> if (gesture == GestureTypes.NONE) { currentState = GestureState.RELEASING; gestureStartTime = timestampNs } else if (gesture == currentGestureType) currentState = GestureState.HELD
            GestureState.HELD -> if (gesture == GestureTypes.NONE) { currentState = GestureState.RELEASING; gestureStartTime = timestampNs }
            GestureState.RELEASING -> if (timestampNs - gestureStartTime > 100_000_000L) { currentState = GestureState.RELEASED }
            GestureState.RELEASED -> { currentState = GestureState.IDLE; currentGestureType = GestureTypes.NONE }
        }
    }

    private fun shouldEmitGesture(gesture: Int, timestampNs: Long): Boolean {
        if (gesture == GestureTypes.CURSOR_MOVE) return true
        val lastTime = gestureCooldowns[gesture] ?: 0L
        return (timestampNs - lastTime) > GESTURE_COOLDOWN_MS * 1_000_000L
    }

    private fun updateCursorPosition(x: FloatArray, y: FloatArray, timestampNs: Long) {
        val cursorX = x[INDEX_TIP]; val cursorY = y[INDEX_TIP]
        val smoothed = cursorFilter.update(cursorX, cursorY, timestampNs)
        val velocity = cursorFilter.getVelocity()
        if (cursorListeners > 0) emitCursorEvent(smoothed.x * screenWidth, smoothed.y * screenHeight, velocity.x * screenWidth, velocity.y * screenHeight)
    }

    private fun emitGestureEvent(type: Int, confidence: Float, position: Point2D, timestampNs: Long) {
        if (gestureListeners == 0) return
        mainHandler.post {
            val event = Arguments.createMap().apply {
                putInt("type", type)
                putString("typeName", GestureTypes.toString(type))
                putDouble("confidence", confidence.toDouble())
                putString("state", currentState.name)
                putDouble("positionX", position.x.toDouble())
                putDouble("positionY", position.y.toDouble())
                putDouble("screenX", (position.x * screenWidth).toDouble())
                putDouble("screenY", (position.y * screenHeight).toDouble())
                putDouble("velocityX", palmVelocity.x.toDouble())
                putDouble("velocityY", palmVelocity.y.toDouble())
                putDouble("timestamp", timestampNs / 1e6)
            }
            reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(EVENT_GESTURE_DETECTED, event)
        }
    }

    private fun emitCursorEvent(x: Float, y: Float, vx: Float, vy: Float) {
        mainHandler.post {
            val event = Arguments.createMap().apply {
                putDouble("x", x.toDouble()); putDouble("y", y.toDouble())
                putDouble("velocityX", vx.toDouble()); putDouble("velocityY", vy.toDouble())
            }
            reactApplicationContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java).emit(EVENT_CURSOR_MOVED, event)
        }
    }

    override fun setScreenSize(width: Int, height: Int) { screenWidth = width.toFloat(); screenHeight = height.toFloat() }
    override fun setConfig(config: ReadableMap) { Log.i(TAG, "Config updated") }
    override fun getCurrentGesture(): Int = currentGestureType
    override fun isInitialized(): Boolean = isInitialized.get()
    override fun getCursorPosition(): WritableMap = Arguments.createMap().apply { putDouble("x", 0.0); putDouble("y", 0.0) }
    override fun addListener(eventName: String) { if (eventName == EVENT_GESTURE_DETECTED) gestureListeners++ else if (eventName == EVENT_CURSOR_MOVED) cursorListeners++ }
    override fun removeListeners(count: Int) { gestureListeners = maxOf(0, gestureListeners - count); cursorListeners = maxOf(0, cursorListeners - count) }
    override fun invalidate() { release(); super.invalidate() }
}
