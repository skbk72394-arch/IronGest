/**
 * IronGest - Native Hand Tracking Spec
 * Abstract base class for the Hand Tracking Module
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.handtracking

import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

/**
 * Base spec for Hand Tracking Module
 */
@ReactModule(name = NativeHandTrackingSpec.NAME)
abstract class NativeHandTrackingSpec(
    reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "HandTracking"
    }

    override fun getName(): String = NAME

    // Lifecycle
    abstract fun initialize(promise: Promise)
    abstract fun release()
    
    // Configuration
    abstract fun setConfig(configMap: ReadableMap)
    
    // State query
    abstract override fun isInitialized(): Boolean
    abstract fun getCurrentFps(): Double
    
    // Events
    abstract override fun addListener(eventName: String)
    abstract override fun removeListeners(count: Int)
}
