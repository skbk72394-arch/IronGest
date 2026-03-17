/**
 * IronGest - Finger Key Map
 * Production-grade touch typing finger-to-keyboard mapping
 *
 * Implements standard touch typing finger assignments:
 * - Left hand: Pinky(A, Q, Z, Shift) → Index(F, R, V, G, T, B)
 * - Right hand: Index(J, U, M, H, Y, N) → Pinky(;, P, /, Enter, Backspace)
 * - Thumbs: Space bar
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.keyboard

import android.view.KeyEvent
import java.util.Locale

/**
 * Finger indices for 10-finger tracking
 * Matches MediaPipe hand landmark convention
 */
enum class FingerIndex(val value: Int) {
    // Left hand (0-4)
    LEFT_THUMB(0),
    LEFT_INDEX(1),
    LEFT_MIDDLE(2),
    LEFT_RING(3),
    LEFT_PINKY(4),

    // Right hand (5-9)
    RIGHT_THUMB(5),
    RIGHT_INDEX(6),
    RIGHT_MIDDLE(7),
    RIGHT_RING(8),
    RIGHT_PINKY(9);

    companion object {
        fun fromValue(value: Int): FingerIndex? {
            return entries.find { it.value == value }
        }

        fun isLeftHand(fingerIndex: Int): Boolean = fingerIndex in 0..4
        fun isRightHand(fingerIndex: Int): Boolean = fingerIndex in 5..9
    }
}

/**
 * Keyboard modifier state
 */
data class ModifierState(
    var shift: Boolean = false,
    var ctrl: Boolean = false,
    var alt: Boolean = false,
    var capsLock: Boolean = false
) {
    fun isShiftActive(): Boolean = shift || capsLock
    fun reset() {
        shift = false
        ctrl = false
        alt = false
    }
}

/**
 * Key information
 */
data class KeyInfo(
    val character: Char,
    val keyCode: Int,
    val shiftCharacter: Char? = null,
    val finger: FingerIndex,
    val row: Int,              // 0 = number row, 1 = top, 2 = home, 3 = bottom
    val column: Int,           // Position in row
    val isSpecial: Boolean = false,
    val label: String = character.toString()
) {
    val displayCharacter: Char
        get() = character.uppercaseChar()

    fun getCharacter(modifiers: ModifierState): Char {
        return if (modifiers.isShiftActive() && shiftCharacter != null) {
            shiftCharacter
        } else if (modifiers.isShiftActive()) {
            character.uppercaseChar()
        } else {
            character
        }
    }
}

/**
 * Finger-to-keyboard region mapping
 * Implements standard touch typing assignments
 */
class FingerKeyMap {

    companion object {
        private const val TAG = "FingerKeyMap"

        // Keyboard dimensions
        const val ROWS = 4
        const val DEFAULT_KEY_WIDTH = 48  // dp
        const val DEFAULT_KEY_HEIGHT = 48 // dp

        // Standard QWERTY layout rows
        private val ROW_0 = "1234567890-="    // Number row
        private val ROW_1 = "QWERTYUIOP[]"    // Top row
        private val ROW_2 = "ASDFGHJKL;'"     // Home row
        private val ROW_3 = "ZXCVBNM,./"      // Bottom row

        // Shift row variants
        private val ROW_0_SHIFT = "!@#$%^&*()_+"
        private val ROW_1_SHIFT = "QWERTYUIOP{}"
        private val ROW_2_SHIFT = "ASDFGHJKL:\""
        private val ROW_3_SHIFT = "ZXCVBNM<>?"
    }

    // Key maps by character
    private val keyMap: Map<Char, KeyInfo>

    // Finger to keys mapping
    private val fingerToKeys: Map<FingerIndex, List<KeyInfo>>

    // Modifier state
    private val modifierState = ModifierState()

    init {
        keyMap = buildKeyMap()
        fingerToKeys = buildFingerToKeysMap()
    }

    /**
     * Build the complete key map
     */
    private fun buildKeyMap(): Map<Char, KeyInfo> {
        val map = mutableMapOf<Char, KeyInfo>()

        // Number row (row 0)
        addRowToMap(map, ROW_0, ROW_0_SHIFT, 0)

        // Top row (row 1)
        addRowToMap(map, ROW_1, ROW_1_SHIFT, 1)

        // Home row (row 2)
        addRowToMap(map, ROW_2, ROW_2_SHIFT, 2)

        // Bottom row (row 3)
        addRowToMap(map, ROW_3, ROW_3_SHIFT, 3)

        return map.toMap()
    }

    /**
     * Add a row to the key map
     */
    private fun addRowToMap(
        map: MutableMap<Char, KeyInfo>,
        row: String,
        shiftRow: String,
        rowIndex: Int
    ) {
        row.forEachIndexed { colIndex, char ->
            val shiftChar = shiftRow.getOrNull(colIndex)
            val finger = getFingerForPosition(rowIndex, colIndex)

            val keyInfo = KeyInfo(
                character = char.lowercaseChar(),
                keyCode = charToKeyCode(char),
                shiftCharacter = shiftChar,
                finger = finger,
                row = rowIndex,
                column = colIndex
            )

            map[char.lowercaseChar()] = keyInfo
            map[char.uppercaseChar()] = keyInfo
        }
    }

    /**
     * Get the finger responsible for a key position
     * Standard touch typing assignments
     */
    private fun getFingerForPosition(row: Int, col: Int): FingerIndex {
        return when (col) {
            // Left hand fingers
            0 -> FingerIndex.LEFT_PINKY      // 1, Q, A, Z
            1 -> FingerIndex.LEFT_RING       // 2, W, S, X
            2 -> FingerIndex.LEFT_MIDDLE     // 3, E, D, C
            3, 4 -> FingerIndex.LEFT_INDEX   // 4-5, R-T, F-G, V-B (index reaches)

            // Right hand fingers
            5, 6 -> FingerIndex.RIGHT_INDEX  // 6-7, Y-U, H-J, N-M
            7 -> FingerIndex.RIGHT_MIDDLE    // 8, I, K, ,
            8 -> FingerIndex.RIGHT_RING      // 9, O, L, .
            9, 10, 11 -> FingerIndex.RIGHT_PINKY // 0, -, =, P, [, ], ;, ', / (pinky reaches)

            else -> FingerIndex.RIGHT_PINKY  // Default for extended keys
        }
    }

    /**
     * Build reverse mapping from finger to keys
     */
    private fun buildFingerToKeysMap(): Map<FingerIndex, List<KeyInfo>> {
        return keyMap.values
            .distinctBy { it.character }
            .groupBy { it.finger }
            .mapValues { (_, keys) ->
                keys.sortedWith(compareBy({ it.row }, { it.column }))
            }
    }

    /**
     * Convert character to Android KeyEvent keycode
     */
    private fun charToKeyCode(char: Char): Int {
        return when (char.uppercaseChar()) {
            '1' -> KeyEvent.KEYCODE_1
            '2' -> KeyEvent.KEYCODE_2
            '3' -> KeyEvent.KEYCODE_3
            '4' -> KeyEvent.KEYCODE_4
            '5' -> KeyEvent.KEYCODE_5
            '6' -> KeyEvent.KEYCODE_6
            '7' -> KeyEvent.KEYCODE_7
            '8' -> KeyEvent.KEYCODE_8
            '9' -> KeyEvent.KEYCODE_9
            '0' -> KeyEvent.KEYCODE_0
            'A' -> KeyEvent.KEYCODE_A
            'B' -> KeyEvent.KEYCODE_B
            'C' -> KeyEvent.KEYCODE_C
            'D' -> KeyEvent.KEYCODE_D
            'E' -> KeyEvent.KEYCODE_E
            'F' -> KeyEvent.KEYCODE_F
            'G' -> KeyEvent.KEYCODE_G
            'H' -> KeyEvent.KEYCODE_H
            'I' -> KeyEvent.KEYCODE_I
            'J' -> KeyEvent.KEYCODE_J
            'K' -> KeyEvent.KEYCODE_K
            'L' -> KeyEvent.KEYCODE_L
            'M' -> KeyEvent.KEYCODE_M
            'N' -> KeyEvent.KEYCODE_N
            'O' -> KeyEvent.KEYCODE_O
            'P' -> KeyEvent.KEYCODE_P
            'Q' -> KeyEvent.KEYCODE_Q
            'R' -> KeyEvent.KEYCODE_R
            'S' -> KeyEvent.KEYCODE_S
            'T' -> KeyEvent.KEYCODE_T
            'U' -> KeyEvent.KEYCODE_U
            'V' -> KeyEvent.KEYCODE_V
            'W' -> KeyEvent.KEYCODE_W
            'X' -> KeyEvent.KEYCODE_X
            'Y' -> KeyEvent.KEYCODE_Y
            'Z' -> KeyEvent.KEYCODE_Z
            ',' -> KeyEvent.KEYCODE_COMMA
            '.' -> KeyEvent.KEYCODE_PERIOD
            '-' -> KeyEvent.KEYCODE_MINUS
            '=' -> KeyEvent.KEYCODE_EQUALS
            '[' -> KeyEvent.KEYCODE_LEFT_BRACKET
            ']' -> KeyEvent.KEYCODE_RIGHT_BRACKET
            '\\' -> KeyEvent.KEYCODE_BACKSLASH
            ';' -> KeyEvent.KEYCODE_SEMICOLON
            '\'' -> KeyEvent.KEYCODE_APOSTROPHE
            '/' -> KeyEvent.KEYCODE_SLASH
            ' ' -> KeyEvent.KEYCODE_SPACE
            else -> KeyEvent.KEYCODE_UNKNOWN
        }
    }

    // ============================================================================
    // Public API
    // ============================================================================

    /**
     * Get key info for a character
     */
    fun getKey(char: Char): KeyInfo? {
        return keyMap[char.uppercaseChar()] ?: keyMap[char.lowercaseChar()]
    }

    /**
     * Get all keys assigned to a finger
     */
    fun getKeysForFinger(finger: FingerIndex): List<KeyInfo> {
        return fingerToKeys[finger] ?: emptyList()
    }

    /**
     * Get the finger responsible for a character
     */
    fun getFingerForChar(char: Char): FingerIndex? {
        return getKey(char)?.finger
    }

    /**
     * Check if a key press is valid for the given finger
     */
    fun isValidFingerForChar(char: Char, finger: FingerIndex): Boolean {
        return getFingerForChar(char) == finger
    }

    /**
     * Get current modifier state
     */
    fun getModifierState(): ModifierState = modifierState

    /**
     * Set shift modifier
     */
    fun setShift(enabled: Boolean) {
        modifierState.shift = enabled
    }

    /**
     * Toggle caps lock
     */
    fun toggleCapsLock() {
        modifierState.capsLock = !modifierState.capsLock
    }

    /**
     * Reset modifiers
     */
    fun resetModifiers() {
        modifierState.reset()
    }

    /**
     * Get the display character for a key
     */
    fun getDisplayCharacter(char: Char): Char {
        val key = getKey(char) ?: return char
        return key.getCharacter(modifierState)
    }

    /**
     * Get Android KeyEvent keycode for a character
     */
    fun getKeyCode(char: Char): Int {
        return getKey(char)?.keyCode ?: KeyEvent.KEYCODE_UNKNOWN
    }

    /**
     * Get keyboard layout for rendering
     * Returns list of keys organized by row
     */
    fun getKeyboardLayout(): List<List<KeyInfo>> {
        return listOf(
            // Number row
            (0..11).mapNotNull { col ->
                keyMap.values.find { it.row == 0 && it.column == col }
            }.distinctBy { it.character },

            // Top row
            (0..11).mapNotNull { col ->
                keyMap.values.find { it.row == 1 && it.column == col }
            }.distinctBy { it.character },

            // Home row
            (0..9).mapNotNull { col ->
                keyMap.values.find { it.row == 2 && it.column == col }
            }.distinctBy { it.character },

            // Bottom row
            (0..9).mapNotNull { col ->
                keyMap.values.find { it.row == 3 && it.column == col }
            }.distinctBy { it.character }
        )
    }

    /**
     * Get key position for visual rendering
     * Returns (x, y) normalized position (0-1) on keyboard
     */
    fun getKeyPosition(key: KeyInfo): Pair<Float, Float> {
        val y = key.row.toFloat() / (ROWS - 1)
        val rowLength = when (key.row) {
            0 -> 12  // Number row
            1 -> 12  // Top row
            2 -> 10  // Home row
            3 -> 10  // Bottom row
            else -> 10
        }
        val x = key.column.toFloat() / (rowLength - 1)
        return Pair(x, y)
    }

    /**
     * Find the nearest key to a position (normalized 0-1)
     */
    fun findNearestKey(normalizedX: Float, normalizedY: Float): KeyInfo? {
        return keyMap.values.minByOrNull { key ->
            val (keyX, keyY) = getKeyPosition(key)
            val dx = normalizedX - keyX
            val dy = normalizedY - keyY
            dx * dx + dy * dy
        }
    }

    // ============================================================================
    // Special Keys
    // ============================================================================

    /**
     * Special key definitions
     */
    object SpecialKeys {
        val BACKSPACE = KeyInfo(
            character = '\b',
            keyCode = KeyEvent.KEYCODE_DEL,
            finger = FingerIndex.RIGHT_PINKY,
            row = 3,
            column = 10,
            isSpecial = true,
            label = "⌫"
        )

        val ENTER = KeyInfo(
            character = '\n',
            keyCode = KeyEvent.KEYCODE_ENTER,
            finger = FingerIndex.RIGHT_PINKY,
            row = 3,
            column = 11,
            isSpecial = true,
            label = "↵"
        )

        val SPACE = KeyInfo(
            character = ' ',
            keyCode = KeyEvent.KEYCODE_SPACE,
            finger = FingerIndex.LEFT_THUMB,
            row = 4,
            column = 5,
            isSpecial = true,
            label = "␣"
        )

        val SHIFT = KeyInfo(
            character = '⇧',
            keyCode = KeyEvent.KEYCODE_SHIFT_LEFT,
            finger = FingerIndex.LEFT_PINKY,
            row = 2,
            column = -1,
            isSpecial = true,
            label = "⇧"
        )

        val TAB = KeyInfo(
            character = '\t',
            keyCode = KeyEvent.KEYCODE_TAB,
            finger = FingerIndex.LEFT_PINKY,
            row = 1,
            column = -1,
            isSpecial = true,
            label = "⇥"
        )
    }

    /**
     * Get all special keys
     */
    fun getSpecialKeys(): List<KeyInfo> {
        return listOf(
            SpecialKeys.BACKSPACE,
            SpecialKeys.ENTER,
            SpecialKeys.SPACE,
            SpecialKeys.SHIFT,
            SpecialKeys.TAB
        )
    }
}
