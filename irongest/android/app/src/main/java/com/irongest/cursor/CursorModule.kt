/**
 * IronGest - Cursor Module
 * TurboModule implementation for cursor control
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.cursor

import android.graphics.Color
import android.os.Build
import android.util.Log
import androidx.annotation.RequiresApi
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * TurboModule implementation for cursor control.
 * Provides React Native access to cursor functionality.
 */
@ReactModule(name = CursorModule.NAME)
class CursorModule(
    private val reactContext: ReactApplicationContext
) : NativeCursorModuleSpec(reactContext) {

    companion object {
        const val NAME = "CursorModule"
        private const val TAG = "CursorModule"

        // Event names
        const val EVENT_CURSOR_MOVED = "onCursorMoved"
        const val EVENT_STATE_CHANGED = "onCursorStateChanged"
        const val EVENT_DWELL_PROGRESS = "onDwellProgress"
    }

    // Cursor manager instance
    private val cursorManager: CursorManager by lazy {
        CursorManager.getInstance(reactContext)
    }

    // Event listeners count
    private var listenersCount = 0

    // ============================================================================
    // Lifecycle
    // ============================================================================

    override fun initialize() {
        super.initialize()
        setupEventListeners()
    }

    /**
     * Set up event listeners for cursor events
     */
    private fun setupEventListeners() {
        cursorManager.setOnCursorPositionChangedListener { x, y ->
            sendEvent(EVENT_CURSOR_MOVED, createPositionEvent(x, y))
        }

        cursorManager.setOnCursorStateChangedListener { state ->
            sendEvent(EVENT_STATE_CHANGED, createStateEvent(state))
        }

        cursorManager.setOnDwellProgressChangedListener { progress ->
            sendEvent(EVENT_DWELL_PROGRESS, createDwellProgressEvent(progress))
        }
    }

    // ============================================================================
    // Overlay Management
    // ============================================================================

    @RequiresApi(Build.VERSION_CODES.M)
    override fun showOverlay(promise: Promise) {
        try {
            val result = cursorManager.showOverlay()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("OVERLAY_ERROR", e.message)
        }
    }

    override fun hideOverlay(promise: Promise) {
        try {
            cursorManager.hideOverlay()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("OVERLAY_ERROR", e.message)
        }
    }

    override fun isOverlayShowing(promise: Promise) {
        promise.resolve(cursorManager.isOverlayShowing())
    }

    override fun setCursorVisible(visible: Boolean, promise: Promise) {
        try {
            cursorManager.setCursorVisible(visible)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CURSOR_ERROR", e.message)
        }
    }

    // ============================================================================
    // Position Control
    // ============================================================================

    override fun updatePosition(normalizedX: Double, normalizedY: Double, confidence: Double, promise: Promise) {
        try {
            cursorManager.updatePosition(
                normalizedX.toFloat(),
                normalizedY.toFloat(),
                confidence.toFloat()
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("POSITION_ERROR", e.message)
        }
    }

    override fun updateScreenPosition(x: Double, y: Double, promise: Promise) {
        try {
            cursorManager.updateScreenPosition(x.toFloat(), y.toFloat())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("POSITION_ERROR", e.message)
        }
    }

    override fun getCurrentPosition(promise: Promise) {
        try {
            val (x, y) = cursorManager.getCurrentPosition()
            val result = Arguments.createMap().apply {
                putDouble("x", x.toDouble())
                putDouble("y", y.toDouble())
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("POSITION_ERROR", e.message)
        }
    }

    override fun setSmoothingFactor(factor: Double, promise: Promise) {
        try {
            cursorManager.setSmoothingFactor(factor.toFloat())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CONFIG_ERROR", e.message)
        }
    }

    // ============================================================================
    // Cursor Appearance
    // ============================================================================

    override fun setCursorColor(color: String, promise: Promise) {
        try {
            val parsedColor = Color.parseColor(color)
            cursorManager.setCursorColor(parsedColor)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("COLOR_ERROR", "Invalid color format: $color")
        }
    }

    override fun setCursorSize(sizeDp: Double, promise: Promise) {
        try {
            // Note: This would require updating CursorView to support dynamic size
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SIZE_ERROR", e.message)
        }
    }

    // ============================================================================
    // Click Actions
    // ============================================================================

    @RequiresApi(Build.VERSION_CODES.N)
    override fun performClick(promise: Promise) {
        try {
            cursorManager.performClick()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLICK_ERROR", e.message)
        }
    }

    @RequiresApi(Build.VERSION_CODES.N)
    override fun performDoubleClick(promise: Promise) {
        try {
            cursorManager.performDoubleClick()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLICK_ERROR", e.message)
        }
    }

    @RequiresApi(Build.VERSION_CODES.N)
    override fun performLongPress(durationMs: Double, promise: Promise) {
        try {
            cursorManager.performLongPress(durationMs.toLong())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CLICK_ERROR", e.message)
        }
    }

    // ============================================================================
    // Drag Actions
    // ============================================================================

    @RequiresApi(Build.VERSION_CODES.N)
    override fun startDrag(promise: Promise) {
        try {
            cursorManager.startDrag()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DRAG_ERROR", e.message)
        }
    }

    @RequiresApi(Build.VERSION_CODES.N)
    override fun endDrag(promise: Promise) {
        try {
            cursorManager.endDrag()
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DRAG_ERROR", e.message)
        }
    }

    // ============================================================================
    // Scroll Actions
    // ============================================================================

    @RequiresApi(Build.VERSION_CODES.N)
    override fun performScroll(deltaY: Double, promise: Promise) {
        try {
            cursorManager.performScroll(deltaY.toFloat())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SCROLL_ERROR", e.message)
        }
    }

    // ============================================================================
    // Swipe Actions
    // ============================================================================

    @RequiresApi(Build.VERSION_CODES.N)
    override fun performSwipe(
        startX: Double,
        startY: Double,
        endX: Double,
        endY: Double,
        durationMs: Double,
        promise: Promise
    ) {
        try {
            cursorManager.performSwipe(
                startX.toFloat(),
                startY.toFloat(),
                endX.toFloat(),
                endY.toFloat(),
                durationMs.toLong()
            )
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SWIPE_ERROR", e.message)
        }
    }

    @RequiresApi(Build.VERSION_CODES.N)
    override fun performDirectionalSwipe(direction: String, distance: Double, promise: Promise) {
        try {
            val swipeDirection = when (direction.uppercase()) {
                "UP" -> com.irongest.accessibility.AccessibilityControlService.SwipeDirection.UP
                "DOWN" -> com.irongest.accessibility.AccessibilityControlService.SwipeDirection.DOWN
                "LEFT" -> com.irongest.accessibility.AccessibilityControlService.SwipeDirection.LEFT
                "RIGHT" -> com.irongest.accessibility.AccessibilityControlService.SwipeDirection.RIGHT
                else -> throw IllegalArgumentException("Invalid direction: $direction")
            }

            cursorManager.performDirectionalSwipe(swipeDirection, distance.toFloat())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SWIPE_ERROR", e.message)
        }
    }

    // ============================================================================
    // Zoom Actions
    // ============================================================================

    @RequiresApi(Build.VERSION_CODES.N)
    override fun performZoomIn(centerX: Double, centerY: Double, promise: Promise) {
        try {
            cursorManager.performZoomIn(centerX.toFloat(), centerY.toFloat())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ZOOM_ERROR", e.message)
        }
    }

    @RequiresApi(Build.VERSION_CODES.N)
    override fun performZoomOut(centerX: Double, centerY: Double, promise: Promise) {
        try {
            cursorManager.performZoomOut(centerX.toFloat(), centerY.toFloat())
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ZOOM_ERROR", e.message)
        }
    }

    // ============================================================================
    // Global Actions
    // ============================================================================

    override fun performBack(promise: Promise) {
        try {
            val result = cursorManager.performBack()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ACTION_ERROR", e.message)
        }
    }

    override fun performHome(promise: Promise) {
        try {
            val result = cursorManager.performHome()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ACTION_ERROR", e.message)
        }
    }

    override fun performRecents(promise: Promise) {
        try {
            val result = cursorManager.performRecents()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ACTION_ERROR", e.message)
        }
    }

    override fun openNotifications(promise: Promise) {
        try {
            val result = cursorManager.openNotifications()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ACTION_ERROR", e.message)
        }
    }

    @RequiresApi(Build.VERSION_CODES.P)
    override fun takeScreenshot(promise: Promise) {
        try {
            val result = cursorManager.takeScreenshot()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ACTION_ERROR", e.message)
        }
    }

    // ============================================================================
    // State
    // ============================================================================

    override fun getCurrentState(promise: Promise) {
        try {
            val state = cursorManager.getCurrentState()
            val result = Arguments.createMap().apply {
                putString("state", state.name)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("STATE_ERROR", e.message)
        }
    }

    override fun getScreenDimensions(promise: Promise) {
        try {
            val (width, height) = cursorManager.getScreenDimensions()
            val result = Arguments.createMap().apply {
                putInt("width", width)
                putInt("height", height)
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("SCREEN_ERROR", e.message)
        }
    }

    override fun setDwellClickEnabled(enabled: Boolean, promise: Promise) {
        try {
            cursorManager.setDwellClickEnabled(enabled)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CONFIG_ERROR", e.message)
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
    // Event Helpers
    // ============================================================================

    /**
     * Send event to JavaScript
     */
    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    /**
     * Create position event payload
     */
    private fun createPositionEvent(x: Float, y: Float): WritableMap {
        return Arguments.createMap().apply {
            putDouble("x", x.toDouble())
            putDouble("y", y.toDouble())
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
    }

    /**
     * Create state change event payload
     */
    private fun createStateEvent(state: CursorState): WritableMap {
        return Arguments.createMap().apply {
            putString("state", state.name)
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
    }

    /**
     * Create dwell progress event payload
     */
    private fun createDwellProgressEvent(progress: Float): WritableMap {
        return Arguments.createMap().apply {
            putDouble("progress", progress.toDouble())
            putDouble("timestamp", System.currentTimeMillis().toDouble())
        }
    }

    // ============================================================================
    // Cleanup
    // ============================================================================

    override fun onCatalystInstanceDestroy() {
        cursorManager.release()
        super.onCatalystInstanceDestroy()
    }
}
