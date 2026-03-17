/**
 * IronGest - Multiplayer Cursor System
 * Two people controlling one screen simultaneously
 *
 * Features:
 * - Create/join multiplayer sessions
 * - Real-time cursor sharing
 * - Player identification
 * - Session management
 *
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.features.multiplayer

import android.content.Context
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Player information
 */
data class Player(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val color: String = "#00D4FF",
    var cursorX: Float = 0.5f,
    var cursorY: Float = 0.5f,
    var isConnected: Boolean = true,
    var lastActive: Long = System.currentTimeMillis()
)

/**
 * Multiplayer session
 */
data class MultiplayerSession(
    val sessionId: String = generateSessionId(),
    val hostId: String,
    val createdAt: Long = System.currentTimeMillis(),
    val expiresAt: Long,
    val maxPlayers: Int = 2
) {
    companion object {
        fun generateSessionId(): String {
            return UUID.randomUUID().toString().take(8).uppercase()
        }
    }
}

/**
 * Session state
 */
enum class SessionState {
    DISCONNECTED,
    HOSTING,
    JOINING,
    CONNECTED,
    ERROR
}

/**
 * Manager for multiplayer cursor sessions
 */
class MultiplayerCursorManager(private val context: Context) {

    companion object {
        private const val TAG = "MultiplayerCursorManager"
        private const val SESSION_TIMEOUT_MS = 3600000L  // 1 hour
        private const val HEARTBEAT_INTERVAL_MS = 5000L
        private const val CURSOR_UPDATE_INTERVAL_MS = 16L  // ~60fps
    }

    // Session state
    private var currentSession: MultiplayerSession? = null
    private var sessionState = SessionState.DISCONNECTED
    private val players = ConcurrentHashMap<String, Player>()
    private var localPlayerId: String? = null

    // Default cursor colors
    private val cursorColors = listOf(
        "#00D4FF",  // Cyan (Primary)
        "#FF6B00",  // Orange (Secondary)
        "#00FF88",  // Green
        "#FF4757",  // Red
        "#9B59B6",  // Purple
        "#F1C40F"   // Yellow
    )

    // Listeners
    private var onPlayerJoined: ((Player) -> Unit)? = null
    private var onPlayerLeft: ((String) -> Unit)? = null
    private var onCursorUpdated: ((String, Float, Float) -> Unit)? = null
    private var onSessionCreated: ((MultiplayerSession) -> Unit)? = null
    private var onSessionEnded: (() -> Unit)? = null

    // ============================================================================
    // Session Management
    // ============================================================================

    /**
     * Create a new multiplayer session as host
     */
    fun createSession(hostName: String = "Host", maxPlayers: Int = 2): MultiplayerSession {
        // End existing session if any
        endSession()

        // Create local player
        localPlayerId = UUID.randomUUID().toString()
        val host = Player(
            id = localPlayerId!!,
            name = hostName,
            color = cursorColors[0]
        )
        players[host.id] = host

        // Create session
        currentSession = MultiplayerSession(
            hostId = host.id,
            expiresAt = System.currentTimeMillis() + SESSION_TIMEOUT_MS,
            maxPlayers = maxPlayers
        )

        sessionState = SessionState.HOSTING
        onSessionCreated?.invoke(currentSession!!)

        return currentSession!!
    }

    /**
     * Join an existing session
     */
    fun joinSession(sessionId: String, playerName: String = "Player"): Boolean {
        if (sessionState != SessionState.DISCONNECTED) {
            return false
        }

        sessionState = SessionState.JOINING

        // Create local player
        localPlayerId = UUID.randomUUID().toString()
        val colorIndex = players.size % cursorColors.size
        val player = Player(
            id = localPlayerId!!,
            name = playerName,
            color = cursorColors[colorIndex]
        )

        // In a real implementation, this would connect to a signaling server
        // For now, we'll simulate it
        val success = connectToSession(sessionId, player)

        if (success) {
            players[player.id] = player
            sessionState = SessionState.CONNECTED
        } else {
            sessionState = SessionState.ERROR
        }

        return success
    }

    /**
     * End the current session
     */
    fun endSession() {
        currentSession = null
        players.clear()
        localPlayerId = null
        sessionState = SessionState.DISCONNECTED
        onSessionEnded?.invoke()
    }

    /**
     * Get session ID for sharing
     */
    fun getSessionId(): String? = currentSession?.sessionId

    /**
     * Get current session
     */
    fun getCurrentSession(): MultiplayerSession? = currentSession

    /**
     * Get session state
     */
    fun getSessionState(): SessionState = sessionState

    // ============================================================================
    // Player Management
    // ============================================================================

    /**
     * Get all connected players
     */
    fun getPlayers(): List<Player> = players.values.toList()

    /**
     * Get local player
     */
    fun getLocalPlayer(): Player? = localPlayerId?.let { players[it] }

    /**
     * Get player by ID
     */
    fun getPlayer(playerId: String): Player? = players[playerId]

    /**
     * Get player count
     */
    fun getPlayerCount(): Int = players.size

    /**
     * Check if session has room for more players
     */
    fun canAddPlayer(): Boolean {
        val session = currentSession ?: return false
        return players.size < session.maxPlayers
    }

    // ============================================================================
    // Cursor Updates
    // ============================================================================

    /**
     * Update local cursor position
     */
    fun updateLocalCursor(x: Float, y: Float) {
        val playerId = localPlayerId ?: return
        val player = players[playerId] ?: return

        player.cursorX = x
        player.cursorY = y
        player.lastActive = System.currentTimeMillis()

        // Broadcast to other players
        broadcastCursorPosition(playerId, x, y)
    }

    /**
     * Handle remote cursor update
     */
    fun handleRemoteCursorUpdate(playerId: String, x: Float, y: Float) {
        val player = players[playerId] ?: return

        player.cursorX = x
        player.cursorY = y
        player.lastActive = System.currentTimeMillis()

        onCursorUpdated?.invoke(playerId, x, y)
    }

    /**
     * Handle player joined event
     */
    fun handlePlayerJoined(player: Player) {
        if (!canAddPlayer()) return

        players[player.id] = player
        onPlayerJoined?.invoke(player)
    }

    /**
     * Handle player left event
     */
    fun handlePlayerLeft(playerId: String) {
        players.remove(playerId)
        onPlayerLeft?.invoke(playerId)

        // If host left, end session
        if (currentSession?.hostId == playerId) {
            endSession()
        }
    }

    // ============================================================================
    // Networking (Simulated)
    // ============================================================================

    private fun connectToSession(sessionId: String, player: Player): Boolean {
        // In production, this would:
        // 1. Connect to WebSocket signaling server
        // 2. Send join request with session ID
        // 3. Receive session state and other players

        // Simulated success
        return true
    }

    private fun broadcastCursorPosition(playerId: String, x: Float, y: Float) {
        // In production, this would:
        // 1. Send cursor position to signaling server
        // 2. Server broadcasts to other players

        // Simulated - just invoke local callback
        onCursorUpdated?.invoke(playerId, x, y)
    }

    // ============================================================================
    // Listeners
    // ============================================================================

    fun setOnPlayerJoinedListener(listener: (Player) -> Unit) {
        onPlayerJoined = listener
    }

    fun setOnPlayerLeftListener(listener: (String) -> Unit) {
        onPlayerLeft = listener
    }

    fun setOnCursorUpdatedListener(listener: (String, Float, Float) -> Unit) {
        onCursorUpdated = listener
    }

    fun setOnSessionCreatedListener(listener: (MultiplayerSession) -> Unit) {
        onSessionCreated = listener
    }

    fun setOnSessionEndedListener(listener: () -> Unit) {
        onSessionEnded = listener
    }
}

// ============================================================================
// JSON Extensions
// ============================================================================

fun Player.toJson(): JSONObject {
    return JSONObject().apply {
        put("id", id)
        put("name", name)
        put("color", color)
        put("cursorX", cursorX)
        put("cursorY", cursorY)
        put("isConnected", isConnected)
        put("lastActive", lastActive)
    }
}

fun MultiplayerSession.toJson(): JSONObject {
    return JSONObject().apply {
        put("sessionId", sessionId)
        put("hostId", hostId)
        put("createdAt", createdAt)
        put("expiresAt", expiresAt)
        put("maxPlayers", maxPlayers)
    }
}
