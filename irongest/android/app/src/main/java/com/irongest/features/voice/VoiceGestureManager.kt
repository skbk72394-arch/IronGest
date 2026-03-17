/**
 * IronGest - Voice + Gesture Combo
 * Voice for text, gesture for control
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.features.voice

import android.content.Context
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import org.json.JSONObject
import java.util.Locale
import java.util.UUID

/**
 * Voice command configuration
 */
data class VoiceCommandConfig(
    val enabled: Boolean = true,
    val language: String = Locale.getDefault().language,
    val keyword: String = "Iron Man",
    val sensitivity: Float = 0.7f,
    val offlineMode: Boolean = false,
    val confidenceThreshold: Float = 0.6f,
    val continuousListening: Boolean = true
)

/**
 * Voice + gesture combo action
 */
data class VoiceGestureCombo(
    val id: String,
    val voicePhrase: String,
    val gestureType: String,
    val action: String,
    val description: String = "",
    val enabled: Boolean = true
)

/**
 * Voice recognition result
 */
data class VoiceRecognitionResult(
    val text: String,
    val confidence: Float,
    val isFinal: Boolean,
    val language: String,
    val timestamp: Long = System.currentTimeMillis()
)

/**
 * Manager for voice + gesture combo
 */
class VoiceGestureManager(private val context: Context) {

    companion object {
        private const val TAG = "VoiceGestureManager"
        private const val PREFS_NAME = "irongest_voice"
    }

    // Configuration
    private var config = VoiceCommandConfig()

    // Speech recognizer
    private var speechRecognizer: SpeechRecognizer? = null

    // Text to speech
    private var textToSpeech: TextToSpeech? = null
    private var ttsReady = false

    // Voice + gesture combos
    private val combos = mutableListOf<VoiceGestureCombo>()

    // State
    private var isListening = false
    private var keywordDetected = false

    // Pending gesture (waiting for voice to complete combo)
    private var pendingGesture: String? = null
    private var pendingGestureTime = 0L
    private val comboTimeoutMs = 3000L

    // Listeners
    private var onVoiceRecognized: ((VoiceRecognitionResult) -> Unit)? = null
    private var onComboTriggered: ((VoiceGestureCombo) -> Unit)? = null
    private var onKeywordDetected: (() -> Unit)? = null

    init {
        initializeSpeechRecognizer()
        initializeTextToSpeech()
        loadDefaultCombos()
    }

    // ============================================================================
    // Initialization
    // ============================================================================

    private fun initializeSpeechRecognizer() {
        if (!SpeechRecognizer.isRecognitionAvailable(context)) return

        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
            setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) {
                    isListening = true
                }

                override fun onBeginningOfSpeech() {}

                override fun onRmsChanged(rmsdB: Float) {}

                override fun onBufferReceived(buffer: ByteArray?) {}

                override fun onEndOfSpeech() {
                    isListening = false
                }

                override fun onError(error: Int) {
                    isListening = false
                    if (config.continuousListening) {
                        restartListening()
                    }
                }

                override fun onResults(results: Bundle?) {
                    isListening = false
                    handleRecognitionResults(results)
                    if (config.continuousListening) {
                        restartListening()
                    }
                }

                override fun onPartialResults(partialResults: Bundle?) {
                    handlePartialResults(partialResults)
                }

                override fun onEvent(eventType: Int, params: Bundle?) {}
            })
        }
    }

    private fun initializeTextToSpeech() {
        textToSpeech = TextToSpeech(context) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
            if (ttsReady) {
                textToSpeech?.language = Locale.forLanguageTag(config.language)
            }
        }
    }

    // ============================================================================
    // Configuration
    // ============================================================================

    fun setConfig(newConfig: VoiceCommandConfig) {
        config = newConfig
        if (ttsReady) {
            textToSpeech?.language = Locale.forLanguageTag(config.language)
        }
    }

    fun getConfig(): VoiceCommandConfig = config

    // ============================================================================
    // Listening Control
    // ============================================================================

    fun startListening() {
        if (!config.enabled || isListening) return

        val intent = android.content.Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, config.language)
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3)
            putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, context.packageName)
        }

        speechRecognizer?.startListening(intent)
    }

    fun stopListening() {
        speechRecognizer?.stopListening()
        isListening = false
    }

    fun isListening(): Boolean = isListening

    private fun restartListening() {
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            startListening()
        }, 500)
    }

    // ============================================================================
    // Recognition Handling
    // ============================================================================

    private fun handleRecognitionResults(results: Bundle?) {
        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: return
        val confidences = results.getFloatArray(SpeechRecognizer.CONFIDENCE_SCORES)

        matches.forEachIndexed { index: Int, text: String ->
            val confidence = confidences?.getOrNull(index) ?: 0f

            if (confidence >= config.confidenceThreshold) {
                processVoiceCommand(text, confidence, true)
            }
        }
    }

    private fun handlePartialResults(partialResults: Bundle?) {
        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) ?: return

        matches.forEach { text: String ->
            // Check for keyword in partial results
            if (config.keyword.equals(text, ignoreCase = true)) {
                onKeywordDetected?.invoke()
                keywordDetected = true
            }
        }
    }

    private fun processVoiceCommand(text: String, confidence: Float, isFinal: Boolean) {
        val result = VoiceRecognitionResult(
            text = text,
            confidence = confidence,
            isFinal = isFinal,
            language = config.language
        )

        onVoiceRecognized?.invoke(result)

        // Check for pending gesture combo
        pendingGesture?.let { gesture ->
            if (System.currentTimeMillis() - pendingGestureTime <= comboTimeoutMs) {
                checkCombo(text, gesture)
            }
            pendingGesture = null
        }

        // Check for voice-only combos
        checkVoiceOnlyCombo(text)
    }

    // ============================================================================
    // Gesture Combo
    // ============================================================================

    /**
     * Register a gesture (called when gesture is detected)
     */
    fun registerGesture(gestureType: String) {
        pendingGesture = gestureType
        pendingGestureTime = System.currentTimeMillis()
    }

    private fun checkCombo(voiceText: String, gestureType: String) {
        val matchingCombo = combos.find { combo ->
            combo.enabled &&
            combo.voicePhrase.equals(voiceText, ignoreCase = true) &&
            combo.gestureType == gestureType
        }

        if (matchingCombo != null) {
            onComboTriggered?.invoke(matchingCombo)
        }
    }

    private fun checkVoiceOnlyCombo(voiceText: String) {
        // Check for voice-only commands
        val matchingCombo = combos.find { combo ->
            combo.enabled &&
            combo.gestureType.isEmpty() &&
            combo.voicePhrase.equals(voiceText, ignoreCase = true)
        }

        if (matchingCombo != null) {
            onComboTriggered?.invoke(matchingCombo)
        }
    }

    // ============================================================================
    // Combo Management
    // ============================================================================

    fun addCombo(combo: VoiceGestureCombo) {
        combos.add(combo)
    }

    fun removeCombo(id: String) {
        combos.removeAll { it.id == id }
    }

    fun getCombos(): List<VoiceGestureCombo> = combos.toList()

    private fun loadDefaultCombos() {
        // Default voice + gesture combos
        combos.addAll(listOf(
            VoiceGestureCombo(
                id = "search",
                voicePhrase = "search",
                gestureType = "PINCH_CLICK",
                action = "OPEN_SEARCH",
                description = "Search with pinch click"
            ),
            VoiceGestureCombo(
                id = "scroll",
                voicePhrase = "scroll",
                gestureType = "SWIPE_UP",
                action = "SCROLL",
                description = "Scroll with swipe"
            ),
            VoiceGestureCombo(
                id = "volume",
                voicePhrase = "volume",
                gestureType = "SCROLL_UP",
                action = "VOLUME_CONTROL",
                description = "Volume control"
            ),
            VoiceGestureCombo(
                id = "brightness",
                voicePhrase = "brightness",
                gestureType = "SCROLL_DOWN",
                action = "BRIGHTNESS_CONTROL",
                description = "Brightness control"
            ),
            VoiceGestureCombo(
                id = "type",
                voicePhrase = "type",
                gestureType = "CURSOR_MOVE",
                action = "DICTATE_TEXT",
                description = "Dictate text at cursor position"
            )
        ))
    }

    // ============================================================================
    // Text to Speech
    // ============================================================================

    fun speak(text: String, utteranceId: String = UUID.randomUUID().toString()) {
        if (!ttsReady) return
        textToSpeech?.speak(text, TextToSpeech.QUEUE_ADD, null, utteranceId)
    }

    // ============================================================================
    // Listeners
    // ============================================================================

    fun setOnVoiceRecognizedListener(listener: (VoiceRecognitionResult) -> Unit) {
        onVoiceRecognized = listener
    }

    fun setOnComboTriggeredListener(listener: (VoiceGestureCombo) -> Unit) {
        onComboTriggered = listener
    }

    fun setOnKeywordDetectedListener(listener: () -> Unit) {
        onKeywordDetected = listener
    }

    // ============================================================================
    // Cleanup
    // ============================================================================

    fun release() {
        stopListening()
        speechRecognizer?.destroy()
        textToSpeech?.shutdown()
    }
}

