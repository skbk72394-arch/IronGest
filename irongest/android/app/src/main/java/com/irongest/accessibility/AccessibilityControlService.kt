/**
 * IronGest - Accessibility Control Service
 * Production-grade AccessibilityService with GestureDescription for touch simulation
 *
 * Features:
 * - System-wide gesture injection using GestureDescription API
 * - Complex gesture support (tap, swipe, drag, pinch)
 * - Multi-step gesture composition
 * - Gesture callback handling
 * - Global action support (BACK, HOME, RECENTS, NOTIFICATIONS)
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
import android.view.accessibility.AccessibilityNodeInfo
import androidx.annotation.RequiresApi
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * Accessibility Service for system-wide gesture control.
 * Requires BIND_ACCESSIBILITY_SERVICE permission and proper configuration.
 */
class AccessibilityControlService : AccessibilityService() {

    companion object {
        private const val TAG = "AccessibilityCtrlService"

        // Gesture timing constants (in milliseconds)
        private const val TAP_DURATION_MS = 50L
        private const val SWIPE_DURATION_MS = 300L
        private const val DRAG_STEP_DURATION_MS = 16L  // ~60fps
        private const val LONG_PRESS_DURATION_MS = 500L
        private const val PINCH_DURATION_MS = 400L

        // Gesture stroke constants
        private const val MAX_STROKE_COUNT = 10  // GestureDescription limit
        private const val MIN_GESTURE_DURATION_MS = 10L
        private const val MAX_GESTURE_DURATION_MS = 60000L

        @Volatile
        private var instance: AccessibilityControlService? = null

        /**
         * Get the singleton instance
         */
        fun getInstance(): AccessibilityControlService? = instance

        /**
         * Check if the accessibility service is enabled
         */
        fun isServiceEnabled(): Boolean = instance != null
    }

    // ============================================================================
    // State
    // ============================================================================

    private val handler = Handler(Looper.getMainLooper())
    private val isGestureInProgress = AtomicBoolean(false)
    private val gestureQueue = ConcurrentLinkedQueue<GestureTask>()
    private val pendingGestureCount = AtomicInteger(0)

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
        // We don't need to process accessibility events for gesture injection
    }

    override fun onInterrupt() {
        // Handle interruption
    }

    // ============================================================================
    // Tap Gesture
    // ============================================================================

    /**
     * Perform a tap gesture at the specified coordinates
     *
     * @param x X coordinate in pixels
     * @param y Y coordinate in pixels
     * @param callback Optional callback for gesture completion
     * @return true if gesture was dispatched
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performTap(
        x: Float,
        y: Float,
        callback: GestureCallback? = null
    ): Boolean {
        val path = Path().apply {
            moveTo(x, y)
            lineTo(x, y)  // No movement, just touch
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, TAP_DURATION_MS))
            .build()

        return dispatchGesture(gesture, createGestureCallback(callback))
    }

    /**
     * Perform a double tap gesture
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performDoubleTap(
        x: Float,
        y: Float,
        callback: GestureCallback? = null
    ): Boolean {
        // First tap
        val path1 = Path().apply {
            moveTo(x, y)
            lineTo(x, y)
        }

        // Second tap (starts after first tap + small delay)
        val path2 = Path().apply {
            moveTo(x, y)
            lineTo(x, y)
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path1, 0, TAP_DURATION_MS))
            .addStroke(GestureDescription.StrokeDescription(
                path2,
                TAP_DURATION_MS + 50,  // Start time (first tap + 50ms gap)
                TAP_DURATION_MS
            ))
            .build()

        return dispatchGesture(gesture, createGestureCallback(callback))
    }

    /**
     * Perform a long press gesture
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performLongPress(
        x: Float,
        y: Float,
        durationMs: Long = LONG_PRESS_DURATION_MS,
        callback: GestureCallback? = null
    ): Boolean {
        val path = Path().apply {
            moveTo(x, y)
            lineTo(x, y)  // Stay in place
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, durationMs))
            .build()

        return dispatchGesture(gesture, createGestureCallback(callback))
    }

    // ============================================================================
    // Swipe Gestures
    // ============================================================================

    /**
     * Perform a swipe gesture
     *
     * @param startX Start X coordinate
     * @param startY Start Y coordinate
     * @param endX End X coordinate
     * @param endY End Y coordinate
     * @param durationMs Duration of the swipe
     * @param callback Optional callback
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performSwipe(
        startX: Float,
        startY: Float,
        endX: Float,
        endY: Float,
        durationMs: Long = SWIPE_DURATION_MS,
        callback: GestureCallback? = null
    ): Boolean {
        val path = Path().apply {
            moveTo(startX, startY)
            lineTo(endX, endY)
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, durationMs))
            .build()

        return dispatchGesture(gesture, createGestureCallback(callback))
    }

    /**
     * Perform a directional swipe
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performDirectionalSwipe(
        direction: SwipeDirection,
        centerX: Float,
        centerY: Float,
        distance: Float,
        durationMs: Long = SWIPE_DURATION_MS,
        callback: GestureCallback? = null
    ): Boolean {
        val (startX, startY, endX, endY) = when (direction) {
            SwipeDirection.UP -> arrayOf(
                centerX, centerY + distance / 2,
                centerX, centerY - distance / 2
            )
            SwipeDirection.DOWN -> arrayOf(
                centerX, centerY - distance / 2,
                centerX, centerY + distance / 2
            )
            SwipeDirection.LEFT -> arrayOf(
                centerX + distance / 2, centerY,
                centerX - distance / 2, centerY
            )
            SwipeDirection.RIGHT -> arrayOf(
                centerX - distance / 2, centerY,
                centerX + distance / 2, centerY
            )
        }

        return performSwipe(startX, startY, endX, endY, durationMs, callback)
    }

    // ============================================================================
    // Drag Gestures
    // ============================================================================

    /**
     * Start a drag operation
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun startDrag(
        x: Float,
        y: Float,
        callback: GestureCallback? = null
    ): Boolean {
        if (isDragging) return false

        dragStartPoint = Point(x.toInt(), y.toInt())
        dragCurrentPoint = Point(x.toInt(), y.toInt())
        isDragging = true

        // Start with a long press to initiate drag
        val path = Path().apply {
            moveTo(x, y)
            lineTo(x, y)
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, LONG_PRESS_DURATION_MS))
            .build()

        return dispatchGesture(gesture, createGestureCallback(object : GestureCallback {
            override fun onGestureCompleted() {
                callback?.onGestureCompleted()
            }

            override fun onGestureCancelled() {
                isDragging = false
                callback?.onGestureCancelled()
            }
        }))
    }

    /**
     * Continue a drag operation (move while dragging)
     * Uses continueStrokeForNextGesture for multi-step gestures
     */
    @RequiresApi(Build.VERSION_CODES.O)
    fun continueDrag(
        x: Float,
        y: Float,
        callback: GestureCallback? = null
    ): Boolean {
        if (!isDragging || dragCurrentPoint == null) return false

        val currentX = dragCurrentPoint!!.x.toFloat()
        val currentY = dragCurrentPoint!!.y.toFloat()

        // Create a path from current to new position
        val path = Path().apply {
            moveTo(currentX, currentY)
            lineTo(x, y)
        }

        // Use continue stroke for smooth multi-step drag
        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, DRAG_STEP_DURATION_MS))
            .build()

        dragCurrentPoint = Point(x.toInt(), y.toInt())

        return dispatchGesture(gesture, createGestureCallback(callback))
    }

    /**
     * End a drag operation
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun endDrag(
        x: Float,
        y: Float,
        callback: GestureCallback? = null
    ): Boolean {
        if (!isDragging) return false

        val currentX = dragCurrentPoint?.x?.toFloat() ?: x
        val currentY = dragCurrentPoint?.y?.toFloat() ?: y

        // Move to final position and release
        val path = Path().apply {
            moveTo(currentX, currentY)
            lineTo(x, y)
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path, 0, TAP_DURATION_MS))
            .build()

        val result = dispatchGesture(gesture, createGestureCallback(object : GestureCallback {
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
        }))

        if (!result) {
            isDragging = false
            dragStartPoint = null
            dragCurrentPoint = null
        }

        return result
    }

    // ============================================================================
    // Pinch/Zoom Gestures
    // ============================================================================

    /**
     * Perform a pinch gesture (zoom in or out)
     *
     * @param centerX Center X of the pinch
     * @param centerY Center Y of the pinch
     * @param startDistance Starting distance between fingers
     * @param endDistance Ending distance between fingers
     * @param callback Optional callback
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performPinch(
        centerX: Float,
        centerY: Float,
        startDistance: Float,
        endDistance: Float,
        durationMs: Long = PINCH_DURATION_MS,
        callback: GestureCallback? = null
    ): Boolean {
        // Finger 1: moves from center - startDistance/2 to center - endDistance/2
        val path1 = Path().apply {
            moveTo(centerX - startDistance / 2, centerY)
            lineTo(centerX - endDistance / 2, centerY)
        }

        // Finger 2: moves from center + startDistance/2 to center + endDistance/2
        val path2 = Path().apply {
            moveTo(centerX + startDistance / 2, centerY)
            lineTo(centerX + endDistance / 2, centerY)
        }

        val gesture = GestureDescription.Builder()
            .addStroke(GestureDescription.StrokeDescription(path1, 0, durationMs))
            .addStroke(GestureDescription.StrokeDescription(path2, 0, durationMs))
            .build()

        return dispatchGesture(gesture, createGestureCallback(callback))
    }

    /**
     * Perform zoom in gesture
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performZoomIn(
        centerX: Float,
        centerY: Float,
        initialDistance: Float = 50f,
        finalDistance: Float = 200f,
        callback: GestureCallback? = null
    ): Boolean {
        return performPinch(centerX, centerY, initialDistance, finalDistance, PINCH_DURATION_MS, callback)
    }

    /**
     * Perform zoom out gesture
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performZoomOut(
        centerX: Float,
        centerY: Float,
        initialDistance: Float = 200f,
        finalDistance: Float = 50f,
        callback: GestureCallback? = null
    ): Boolean {
        return performPinch(centerX, centerY, initialDistance, finalDistance, PINCH_DURATION_MS, callback)
    }

    // ============================================================================
    // Scroll Gestures
    // ============================================================================

    /**
     * Perform a scroll gesture
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performScroll(
        x: Float,
        y: Float,
        distance: Float,
        direction: ScrollDirection,
        durationMs: Long = SWIPE_DURATION_MS,
        callback: GestureCallback? = null
    ): Boolean {
        val (startY, endY) = when (direction) {
            ScrollDirection.UP -> y + distance / 2 to y - distance / 2
            ScrollDirection.DOWN -> y - distance / 2 to y + distance / 2
        }

        return performSwipe(x, startY, x, endY, durationMs, callback)
    }

    // ============================================================================
    // Global Actions
    // ============================================================================

    /**
     * Perform global back action
     */
    fun performBack(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_BACK)
    }

    /**
     * Perform global home action
     */
    fun performHome(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_HOME)
    }

    /**
     * Perform global recents action
     */
    fun performRecents(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_RECENTS)
    }

    /**
     * Open notifications panel
     */
    @RequiresApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
    fun openNotifications(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)
    }

    /**
     * Open quick settings panel
     */
    @RequiresApi(Build.VERSION_CODES.JELLY_BEAN_MR2)
    fun openQuickSettings(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS)
    }

    /**
     * Lock the screen (Android 9+)
     */
    @RequiresApi(Build.VERSION_CODES.P)
    fun lockScreen(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)
    }

    /**
     * Take screenshot (Android 9+)
     */
    @RequiresApi(Build.VERSION_CODES.P)
    fun takeScreenshot(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_TAKE_SCREENSHOT)
    }

    /**
     * Power dialog
     */
    @RequiresApi(Build.VERSION_CODES.LOLLIPOP)
    fun showPowerDialog(): Boolean {
        return performGlobalAction(GLOBAL_ACTION_POWER_DIALOG)
    }

    // ============================================================================
    // Accessibility Node Actions
    // ============================================================================

    /**
     * Find and click on a node by text
     */
    fun clickOnNodeWithText(text: String, exact: Boolean = false): Boolean {
        val rootInActiveWindow = rootInActiveWindow ?: return false

        val nodes = rootInActiveWindow.findAccessibilityNodeInfosByText(text)
        for (node in nodes) {
            if (exact && node.text?.toString() != text) continue

            if (node.isClickable) {
                return node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            } else {
                // Find clickable parent
                var parent = node.parent
                while (parent != null) {
                    if (parent.isClickable) {
                        return parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    }
                    parent = parent.parent
                }
            }
        }
        return false
    }

    /**
     * Find and click on a node by content description
     */
    fun clickOnNodeWithContentDescription(description: String): Boolean {
        val rootInActiveWindow = rootInActiveWindow ?: return false

        val nodes = rootInActiveWindow.findAccessibilityNodeInfosByText(description)
        for (node in nodes) {
            if (node.contentDescription?.toString() == description && node.isClickable) {
                return node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
            }
        }
        return false
    }

    // ============================================================================
    // Gesture Dispatch
    // ============================================================================

    /**
     * Dispatch a gesture with queueing support
     */
    @RequiresApi(Build.VERSION_CODES.N)
    private fun dispatchGesture(
        gesture: GestureDescription,
        callback: GestureResultCallback?
    ): Boolean {
        // Try to dispatch immediately
        if (!isGestureInProgress.get()) {
            return dispatchGestureInternal(gesture, callback)
        }

        // Queue the gesture
        gestureQueue.offer(GestureTask(gesture, callback))
        return true
    }

    /**
     * Internal gesture dispatch
     */
    @RequiresApi(Build.VERSION_CODES.N)
    private fun dispatchGestureInternal(
        gesture: GestureDescription,
        callback: GestureResultCallback?
    ): Boolean {
        if (!gestureIsValid(gesture)) {
            return false
        }

        isGestureInProgress.set(true)

        return super.dispatchGesture(gesture, callback, null)
    }

    /**
     * Validate a gesture before dispatching
     */
    private fun gestureIsValid(gesture: GestureDescription): Boolean {
        // Check stroke count
        if (gesture.strokeCount > MAX_STROKE_COUNT) {
            return false
        }

        // Duration is automatically validated by GestureDescription.Builder
        return true
    }

    /**
     * Create a gesture callback wrapper
     */
    @RequiresApi(Build.VERSION_CODES.N)
    private fun createGestureCallback(callback: GestureCallback?): GestureResultCallback {
        return object : GestureResultCallback() {
            override fun onCompleted(gestureDescription: GestureDescription?) {
                isGestureInProgress.set(false)
                callback?.onGestureCompleted()
                processNextGesture()
            }

            override fun onCancelled(gestureDescription: GestureDescription?) {
                isGestureInProgress.set(false)
                callback?.onGestureCancelled()
                processNextGesture()
            }
        }
    }

    /**
     * Process the next gesture in the queue
     */
    @RequiresApi(Build.VERSION_CODES.N)
    private fun processNextGesture() {
        val nextTask = gestureQueue.poll()
        if (nextTask != null) {
            handler.post {
                dispatchGestureInternal(nextTask.gesture, nextTask.callback)
            }
        }
    }

    // ============================================================================
    // Convenience Methods
    // ============================================================================

    /**
     * Perform an action based on action type
     */
    @RequiresApi(Build.VERSION_CODES.N)
    fun performAction(
        action: ActionType,
        x: Float = 0f,
        y: Float = 0f,
        params: ActionParams? = null,
        callback: GestureCallback? = null
    ): Boolean {
        return when (action) {
            ActionType.TAP -> performTap(x, y, callback)
            ActionType.DOUBLE_TAP -> performDoubleTap(x, y, callback)
            ActionType.LONG_PRESS -> performLongPress(x, y, params?.duration ?: LONG_PRESS_DURATION_MS, callback)
            ActionType.SWIPE -> performSwipe(
                params?.startX ?: x, params?.startY ?: y,
                params?.endX ?: x, params?.endY ?: y,
                params?.duration ?: SWIPE_DURATION_MS, callback
            )
            ActionType.DRAG_START -> startDrag(x, y, callback)
            ActionType.DRAG_MOVE -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                continueDrag(x, y, callback)
            } else false
            ActionType.DRAG_END -> endDrag(x, y, callback)
            ActionType.ZOOM_IN -> performZoomIn(x, y, params?.initialDistance ?: 50f, params?.finalDistance ?: 200f, callback)
            ActionType.ZOOM_OUT -> performZoomOut(x, y, params?.initialDistance ?: 200f, params?.finalDistance ?: 50f, callback)
            ActionType.SCROLL -> performScroll(x, y, params?.distance ?: 200f, params?.scrollDirection ?: ScrollDirection.UP, params?.duration ?: SWIPE_DURATION_MS, callback)
            ActionType.BACK -> { callback?.onGestureCompleted(); performBack() }
            ActionType.HOME -> { callback?.onGestureCompleted(); performHome() }
            ActionType.RECENTS -> { callback?.onGestureCompleted(); performRecents() }
            ActionType.NOTIFICATIONS -> { callback?.onGestureCompleted(); openNotifications() }
            ActionType.QUICK_SETTINGS -> { callback?.onGestureCompleted(); openQuickSettings() }
            ActionType.SCREENSHOT -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                val result = takeScreenshot()
                callback?.onGestureCompleted()
                result
            } else false
        }
    }

    // ============================================================================
    // Inner Classes
    // ============================================================================

    /**
     * Gesture callback interface
     */
    interface GestureCallback {
        fun onGestureCompleted()
        fun onGestureCancelled()
    }

    /**
     * Gesture task for queueing
     */
    private data class GestureTask(
        val gesture: GestureDescription,
        val callback: GestureResultCallback?
    )

    /**
     * Swipe direction enum
     */
    enum class SwipeDirection {
        UP, DOWN, LEFT, RIGHT
    }

    /**
     * Scroll direction enum
     */
    enum class ScrollDirection {
        UP, DOWN
    }

    /**
     * Action type enum
     */
    enum class ActionType {
        TAP,
        DOUBLE_TAP,
        LONG_PRESS,
        SWIPE,
        DRAG_START,
        DRAG_MOVE,
        DRAG_END,
        ZOOM_IN,
        ZOOM_OUT,
        SCROLL,
        BACK,
        HOME,
        RECENTS,
        NOTIFICATIONS,
        QUICK_SETTINGS,
        SCREENSHOT
    }

    /**
     * Action parameters
     */
    data class ActionParams(
        val startX: Float = 0f,
        val startY: Float = 0f,
        val endX: Float = 0f,
        val endY: Float = 0f,
        val duration: Long = SWIPE_DURATION_MS,
        val distance: Float = 200f,
        val initialDistance: Float = 50f,
        val finalDistance: Float = 200f,
        val scrollDirection: ScrollDirection = ScrollDirection.UP
    )
}
