/**
 * IronGest - Gesture Accessibility Service
 * Main accessibility service for system-wide gesture control
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.accessibility

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.content.Intent
import android.graphics.Path
import android.graphics.Point
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import androidx.annotation.RequiresApi

/**
 * Accessibility Service for system-wide gesture control.
 * This is the service referenced in AndroidManifest.xml
 */
class GestureAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "GestureAccessibilitySvc"

        // Gesture timing constants
        private const val TAP_DURATION_MS = 50L
        private const val SWIPE_DURATION_MS = 300L
        private const val LONG_PRESS_DURATION_MS = 500L

        @Volatile
        private var instance: GestureAccessibilityService? = null

        fun getInstance(): GestureAccessibilityService? = instance
        fun isServiceEnabled(): Boolean = instance != null
    }

    private val handler = Handler(Looper.getMainLooper())
    private var isGestureInProgress = false

    // Current drag state
    private var dragStartPoint: Point? = null
    private var dragCurrentPoint: Point? = null
    private var isDragging = false

    // ============================================================================
    // Service Lifecycle
    // ============================================================================

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
    }

    override fun onUnbind(intent: Intent?): Boolean {
        instance = null
        return super.onUnbind(intent)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        // Not needed for gesture injection
    }

    override fun onInterrupt() {
        // Handle interruption
    }

    // ============================================================================
    // Tap Gestures
    // ============================================================================

    @RequiresApi(Build.VERSION_CODES.N)
    fun performTap(x: Float, y: Float, callback: GestureCallback? = null): Boolean {
        val path = Path().apply {
            moveTo(x, y)
            lineTo(x, y)
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, TAP_DURATION_MS))
            .build()

        return dispatchGesture(gesture, createCallback(callback), null)
    }

    @RequiresApi(Build.VERSION_CODES.N)
    fun performDoubleTap(x: Float, y: Float, callback: GestureCallback? = null): Boolean {
        val path1 = Path().apply { moveTo(x, y); lineTo(x, y) }
        val path2 = Path().apply { moveTo(x, y); lineTo(x, y) }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path1, 0, TAP_DURATION_MS))
            .addStroke(GestureDescription.StrokeDescription(path2, TAP_DURATION_MS + 50, TAP_DURATION_MS))
            .build()

        return dispatchGesture(gesture, createCallback(callback), null)
    }

    @RequiresApi(Build.VERSION_CODES.N)
    fun performLongPress(x: Float, y: Float, durationMs: Long = LONG_PRESS_DURATION_MS, callback: GestureCallback? = null): Boolean {
        val path = Path().apply { moveTo(x, y); lineTo(x, y) }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, durationMs))
            .build()

        return dispatchGesture(gesture, createCallback(callback), null)
    }

    // ============================================================================
    // Swipe Gestures
    // ============================================================================

    @RequiresApi(Build.VERSION_CODES.N)
    fun performSwipe(startX: Float, startY: Float, endX: Float, endY: Float, durationMs: Long = SWIPE_DURATION_MS, callback: GestureCallback? = null): Boolean {
        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(endX, endY)
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, durationMs))
            .build()

        return dispatchGesture(gesture, createCallback(callback), null)
    }

    // ============================================================================
    // Drag Gestures
    // ============================================================================

    @RequiresApi(Build.VERSION_CODES.N)
    fun startDrag(x: Float, y: Float, callback: GestureCallback? = null): Boolean {
        if (isDragging) return false

        dragStartPoint = Point(x.toInt(), y.toInt())
        dragCurrentPoint = Point(x.toInt(), y.toInt())
        isDragging = true

        val path = Path().apply { moveTo(x, y); lineTo(x, y) }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, LONG_PRESS_DURATION_MS))
            .build()

        return dispatchGesture(gesture, createCallback(object : GestureCallback {
            override fun onGestureCompleted() { callback?.onGestureCompleted() }
            override fun onGestureCancelled() { isDragging = false; callback?.onGestureCancelled() }
        }), null)
    }

    @RequiresApi(Build.VERSION_CODES.O)
    fun continueDrag(x: Float, y: Float, callback: GestureCallback? = null): Boolean {
        if (!isDragging || dragCurrentPoint == null) return false

        val currentX = dragCurrentPoint!!.x.toFloat()
        val currentY = dragCurrentPoint!!.y.toFloat()

        val path = Path().apply {
            moveTo(currentX, currentY)
            lineTo(x, y)
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, 16))
            .build()

        dragCurrentPoint = Point(x.toInt(), y.toInt())

        return dispatchGesture(gesture, createCallback(callback), null)
    }

    @RequiresApi(Build.VERSION_CODES.N)
    fun endDrag(x: Float, y: Float, callback: GestureCallback? = null): Boolean {
        if (!isDragging) return false

        val currentX = dragCurrentPoint?.x?.toFloat() ?: x
        val currentY = dragCurrentPoint?.y?.toFloat() ?: y

        val path = Path().apply {
            moveTo(currentX, currentY)
            lineTo(x, y)
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, TAP_DURATION_MS))
            .build()

        val result = dispatchGesture(gesture, createCallback(object : GestureCallback {
            override fun onGestureCompleted() {
                isDragging = false
                dragStartPoint = null
                dragCurrentPoint = null
                callback?.onGestureCompleted()
            }
            override fun onGestureCancelled() {
                isDragging = false
                dragStartPoint = null
                dragCurrentPoint = null
                callback?.onGestureCancelled()
            }
        }), null)

        if (!result) {
            isDragging = false
            dragStartPoint = null
            dragCurrentPoint = null
        }

        return result
    }

    // ============================================================================
    // Global Actions
    // ============================================================================

    fun performBack(): Boolean = performGlobalAction(GLOBAL_ACTION_BACK)
    fun performHome(): Boolean = performGlobalAction(GLOBAL_ACTION_HOME)
    fun performRecents(): Boolean = performGlobalAction(GLOBAL_ACTION_RECENTS)
    
    @RequiresApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
    fun openNotifications(): Boolean = performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)

    @RequiresApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
    fun openQuickSettings(): Boolean = performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS)

    @RequiresApi(Build.VERSION_CODES.P)
    fun lockScreen(): Boolean = performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)

    @RequiresApi(Build.VERSION_CODES.P)
    fun takeScreenshot(): Boolean = performGlobalAction(GLOBAL_ACTION_TAKE_SCREENSHOT)

    // ============================================================================
    // Helpers
    // ============================================================================

    @RequiresApi(Build.VERSION_CODES.N)
    private fun createCallback(callback: GestureCallback?): GestureResultCallback {
        return object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                isGestureInProgress = false
                callback?.onGestureCompleted()
            }
            override fun onCancelled(gestureDescription: GestureDescription?) {
                isGestureInProgress = false
                callback?.onGestureCancelled()
            }
        }
    }

    interface GestureCallback {
        fun onGestureCompleted()
        fun onGestureCancelled()
    }
}
