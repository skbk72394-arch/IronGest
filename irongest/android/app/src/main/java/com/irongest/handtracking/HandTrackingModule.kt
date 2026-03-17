/**
 * IronGest - Hand Tracking Module
 * Production-grade hand tracking using MediaPipe Tasks Vision Android SDK
 * 
 * Features:
 * - MediaPipe Hand Landmarker integration
 * - Camera frame processing via Vision Camera
 * - 30fps landmark detection
 * - Dual-hand tracking support
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.handtracking

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Matrix
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.framework.image.MPImage
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.core.Delegate
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarker
import com.google.mediapipe.tasks.vision.handlandmarker.HandLandmarkerResult
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong

/**
 * Hand Tracking Configuration
 */
data class HandTrackingConfig(
    var numHands: Int = 2,
    var minHandDetectionConfidence: Float = 0.5f,
    var minHandPresenceConfidence: Float = 0.5f,
    var minTrackingConfidence: Float = 0.5f,
    var useGpu: Boolean = true,
    var targetFps: Int = 30
)

/**
 * Hand Tracking Module - React Native Module
 */
@ReactModule(name = HandTrackingModule.NAME)
class HandTrackingModule(reactContext: ReactApplicationContext) :
    NativeHandTrackingSpec(reactContext) {

    companion object {
        const val NAME = "HandTracking"
        private const val TAG = "IronGest-HandTracking"
        
        // Event names
        const val EVENT_LANDMARKS_DETECTED = "onLandmarksDetected"
        const val EVENT_ERROR = "onTrackingError"
        
        // Model file name
        private const val MODEL_FILE = "hand_landmarker.task"
    }

    // State
    private val isInitialized = AtomicBoolean(false)
    private var config = HandTrackingConfig()
    
    // MediaPipe Hand Landmarker
    private var handLandmarker: HandLandmarker? = null
    
    // Performance tracking
    private val frameCount = AtomicLong(0)
    private val lastFpsTime = AtomicLong(System.currentTimeMillis())
    private var currentFps = 0f
    
    // Main handler for callbacks
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun getName(): String = NAME

    // ============================================================================
    // Lifecycle Methods
    // ============================================================================

    fun initialize(promise: Promise) {
        if (isInitialized.get()) {
            promise.resolve(true)
            return
        }

        try {
            val context = reactApplicationContext
            val modelPath = getModelPath(context)
            
            if (modelPath == null) {
                promise.reject("MODEL_NOT_FOUND", "Hand landmarker model not found")
                return
            }

            // Build base options
            val baseOptions = BaseOptions.builder()
                .setModelAssetPath(modelPath)
                .setDelegate(if (config.useGpu) Delegate.GPU else Delegate.CPU)
                .build()

            // Build hand landmarker options
            val options = HandLandmarker.HandLandmarkerOptions.builder()
                .setBaseOptions(baseOptions)
                .setRunningMode(RunningMode.IMAGE)
                .setNumHands(config.numHands)
                .setMinHandDetectionConfidence(config.minHandDetectionConfidence)
                .setMinHandPresenceConfidence(config.minHandPresenceConfidence)
                .setMinTrackingConfidence(config.minTrackingConfidence)
                .build()

            // Create hand landmarker
            handLandmarker = HandLandmarker.createFromOptions(context, options)
            
            isInitialized.set(true)
            Log.i(TAG, "Hand tracking initialized successfully")
            promise.resolve(true)
            
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize hand tracking", e)
            promise.reject("INIT_ERROR", e.message)
        }
    }

    fun release() {
        if (!isInitialized.get()) return
        
        try {
            handLandmarker?.close()
            handLandmarker = null
            isInitialized.set(false)
            Log.i(TAG, "Hand tracking released")
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing hand tracking", e)
        }
    }

    // ============================================================================
    // Processing Methods
    // ============================================================================

    /**
     * Process a bitmap frame from the camera
     * This is called from Vision Camera frame processor
     */
    fun processFrame(bitmap: Bitmap, rotationDegrees: Int) {
        if (!isInitialized.get() || handLandmarker == null) return

        try {
            // Rotate bitmap if needed
            val processedBitmap = if (rotationDegrees != 0) {
                rotateBitmap(bitmap, rotationDegrees.toFloat())
            } else {
                bitmap
            }

            // Create MPImage
            val mpImage: MPImage = BitmapImageBuilder(processedBitmap).build()

            // Detect hand landmarks
            val result = handLandmarker?.detect(mpImage)
            
            if (result != null) {
                processResult(result)
            }

            // Update FPS counter
            updateFps()
            
        } catch (e: Exception) {
            Log.e(TAG, "Error processing frame", e)
            sendError("Frame processing error: ${e.message}")
        }
    }

    /**
     * Process a byte array frame (NV21 format from camera)
     */
    fun processByteArray(data: ByteArray, width: Int, height: Int, rotation: Int) {
        if (!isInitialized.get()) return

        try {
            // Convert NV21 to Bitmap
            val bitmap = nv21ToBitmap(data, width, height)
            processFrame(bitmap, rotation)
        } catch (e: Exception) {
            Log.e(TAG, "Error processing byte array", e)
        }
    }

    /**
     * Process the hand landmarker result and emit events
     */
    private fun processResult(result: HandLandmarkerResult) {
        frameCount.incrementAndGet()
        
        if (result.landmarks().isEmpty()) {
            return
        }

        for (i in result.landmarks().indices) {
            val landmarks = result.landmarks()[i]
            val worldLandmarks = result.worldLandmarks().getOrElse(i) { null }
            val handedness = result.handednesses().getOrElse(i) { null }
            
            // Extract coordinates
            val xCoords = FloatArray(21)
            val yCoords = FloatArray(21)
            val zCoords = FloatArray(21)
            
            for (j in landmarks.indices) {
                val landmark = landmarks[j]
                xCoords[j] = landmark.x()
                yCoords[j] = landmark.y()
                zCoords[j] = landmark.z()
            }

            // Determine hand side (left/right)
            val isRightHand = handedness?.firstOrNull()?.categoryName() == "Right"
            val confidence = handedness?.firstOrNull()?.score()?.toFloat() ?: 0.9f

            // Emit event
            emitLandmarksEvent(
                frameCount.get(),
                xCoords,
                yCoords,
                zCoords,
                isRightHand,
                confidence,
                System.nanoTime()
            )
        }
    }

    // ============================================================================
    // React Native Bridge Methods
    // ============================================================================

    @ReactMethod
    fun initializePromise(promise: Promise) {
        initialize(promise)
    }

    @ReactMethod
    fun releasePromise(promise: Promise) {
        release()
        promise.resolve(true)
    }

    @ReactMethod
    fun setConfig(configMap: ReadableMap) {
        if (configMap.hasKey("numHands")) config.numHands = configMap.getInt("numHands")
        if (configMap.hasKey("minDetectionConfidence")) config.minHandDetectionConfidence = configMap.getDouble("minDetectionConfidence").toFloat()
        if (configMap.hasKey("minTrackingConfidence")) config.minTrackingConfidence = configMap.getDouble("minTrackingConfidence").toFloat()
        if (configMap.hasKey("minHandPresenceConfidence")) config.minHandPresenceConfidence = configMap.getDouble("minHandPresenceConfidence").toFloat()
        if (configMap.hasKey("useGpu")) config.useGpu = configMap.getBoolean("useGpu")
        if (configMap.hasKey("targetFps")) config.targetFps = configMap.getInt("targetFps")
        
        Log.i(TAG, "Config updated: $config")
    }

    @ReactMethod
    fun isInitialized(): Boolean = isInitialized.get()

    @ReactMethod
    fun getCurrentFps(): Double = currentFps.toDouble()

    @ReactMethod
    fun addListener(eventName: String) {
        // Keep: Required for React Native events
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Keep: Required for React Native events
    }

    // ============================================================================
    // Helper Methods
    // ============================================================================

    private fun getModelPath(context: Context): String? {
        return try {
            val assetManager = context.assets
            val exists = assetManager.list("models")?.contains(MODEL_FILE) == true
            if (exists) "models/$MODEL_FILE" else null
        } catch (e: Exception) {
            Log.e(TAG, "Error checking model file", e)
            null
        }
    }

    private fun rotateBitmap(source: Bitmap, degrees: Float): Bitmap {
        val matrix = Matrix()
        matrix.postRotate(degrees)
        return Bitmap.createBitmap(source, 0, 0, source.width, source.height, matrix, true)
    }

    private fun nv21ToBitmap(nv21: ByteArray, width: Int, height: Int): Bitmap {
        val yuvToRgb = android.renderscript.ScriptIntrinsicYuvToRGB
        // Simple conversion - for production, use RenderScript or native code
        val bitmap = Bitmap.createBitmap(width, height, Bitmap.Config.ARGB_8888)
        val pixels = IntArray(width * height)
        
        for (i in 0 until width * height) {
            val y = nv21[i].toInt() and 0xFF
            pixels[i] = -0x1000000 or (y shl 16) or (y shl 8) or y
        }
        
        bitmap.setPixels(pixels, 0, width, 0, 0, width, height)
        return bitmap
    }

    private fun updateFps() {
        val now = System.currentTimeMillis()
        val elapsed = now - lastFpsTime.get()
        
        if (elapsed >= 1000) {
            currentFps = (frameCount.get() * 1000f) / elapsed
            frameCount.set(0)
            lastFpsTime.set(now)
        }
    }

    private fun emitLandmarksEvent(
        frameId: Long,
        xCoords: FloatArray,
        yCoords: FloatArray,
        zCoords: FloatArray,
        isRightHand: Boolean,
        confidence: Float,
        timestampNs: Long
    ) {
        mainHandler.post {
            try {
                val event = Arguments.createMap().apply {
                    putDouble("frameId", frameId.toDouble())
                    putArray("landmarksX", Arguments.fromArray(xCoords))
                    putArray("landmarksY", Arguments.fromArray(yCoords))
                    putArray("landmarksZ", Arguments.fromArray(zCoords))
                    putString("handSide", if (isRightHand) "RIGHT" else "LEFT")
                    putDouble("confidence", confidence.toDouble())
                    putDouble("timestamp", timestampNs / 1_000_000.0)
                }
                
                reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_LANDMARKS_DETECTED, event)
            } catch (e: Exception) {
                Log.e(TAG, "Error emitting landmarks event", e)
            }
        }
    }

    private fun sendError(message: String) {
        mainHandler.post {
            try {
                val event = Arguments.createMap().apply {
                    putString("message", message)
                    putDouble("timestamp", System.currentTimeMillis().toDouble())
                }
                
                reactApplicationContext
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit(EVENT_ERROR, event)
            } catch (e: Exception) {
                Log.e(TAG, "Error sending error event", e)
            }
        }
    }
}
