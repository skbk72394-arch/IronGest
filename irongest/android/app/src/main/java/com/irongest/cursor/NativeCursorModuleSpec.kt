/**
 * IronGest - Native Cursor Module Spec
 * React Native module specification for cursor control
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.cursor

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.module.annotations.ReactModule

/**
 * Module spec for cursor control
 */
@ReactModule(name = NativeCursorModuleSpec.NAME)
abstract class NativeCursorModuleSpec(context: ReactApplicationContext) :
    ReactContextBaseJavaModule(context) {

    companion object {
        const val NAME = "CursorModule"
    }

    override fun getName(): String = NAME

    // ============================================================================
    // Overlay Management
    // ============================================================================

    abstract fun showOverlay(promise: Promise)
    abstract fun hideOverlay(promise: Promise)
    abstract fun isOverlayShowing(promise: Promise)
    abstract fun setCursorVisible(visible: Boolean, promise: Promise)

    // ============================================================================
    // Position Control
    // ============================================================================

    abstract fun updatePosition(normalizedX: Double, normalizedY: Double, confidence: Double, promise: Promise)
    abstract fun updateScreenPosition(x: Double, y: Double, promise: Promise)
    abstract fun getCurrentPosition(promise: Promise)
    abstract fun setSmoothingFactor(factor: Double, promise: Promise)

    // ============================================================================
    // Cursor Appearance
    // ============================================================================

    abstract fun setCursorColor(color: String, promise: Promise)
    abstract fun setCursorSize(sizeDp: Double, promise: Promise)

    // ============================================================================
    // Click Actions
    // ============================================================================

    abstract fun performClick(promise: Promise)
    abstract fun performDoubleClick(promise: Promise)
    abstract fun performLongPress(durationMs: Double, promise: Promise)

    // ============================================================================
    // Drag Actions
    // ============================================================================

    abstract fun startDrag(promise: Promise)
    abstract fun endDrag(promise: Promise)

    // ============================================================================
    // Scroll Actions
    // ============================================================================

    abstract fun performScroll(deltaY: Double, promise: Promise)

    // ============================================================================
    // Swipe Actions
    // ============================================================================

    abstract fun performSwipe(
        startX: Double,
        startY: Double,
        endX: Double,
        endY: Double,
        durationMs: Double,
        promise: Promise
    )

    abstract fun performDirectionalSwipe(direction: String, distance: Double, promise: Promise)

    // ============================================================================
    // Zoom Actions
    // ============================================================================

    abstract fun performZoomIn(centerX: Double, centerY: Double, promise: Promise)
    abstract fun performZoomOut(centerX: Double, centerY: Double, promise: Promise)

    // ============================================================================
    // Global Actions
    // ============================================================================

    abstract fun performBack(promise: Promise)
    abstract fun performHome(promise: Promise)
    abstract fun performRecents(promise: Promise)
    abstract fun openNotifications(promise: Promise)
    abstract fun takeScreenshot(promise: Promise)

    // ============================================================================
    // State
    // ============================================================================

    abstract fun getCurrentState(promise: Promise)
    abstract fun getScreenDimensions(promise: Promise)
    abstract fun setDwellClickEnabled(enabled: Boolean, promise: Promise)

    // ============================================================================
    // Event Listeners
    // ============================================================================

    abstract fun addListener(eventName: String)
    abstract fun removeListeners(count: Double)
}
