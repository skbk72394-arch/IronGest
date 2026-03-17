package com.irongest

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.irongest.accessibility.GestureAccessibilityService

class MainActivity : AppCompatActivity() {

    private lateinit var statusText: TextView
    private lateinit var enableAccessibilityButton: Button
    private lateinit var startTrackingButton: Button

    companion object {
        private const val CAMERA_PERMISSION_REQUEST = 1001
        private const val OVERLAY_PERMISSION_REQUEST = 1002
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        initViews()
        setupClickListeners()
        checkPermissions()
    }

    private fun initViews() {
        statusText = findViewById(R.id.statusText)
        enableAccessibilityButton = findViewById(R.id.enableAccessibilityButton)
        startTrackingButton = findViewById(R.id.startTrackingButton)
    }

    private fun setupClickListeners() {
        enableAccessibilityButton.setOnClickListener {
            openAccessibilitySettings()
        }
        
        startTrackingButton.setOnClickListener {
            if (checkAllPermissions()) {
                startTracking()
            } else {
                requestPermissions()
            }
        }
    }

    private fun checkPermissions() {
        updateStatus()
    }

    private fun checkAllPermissions(): Boolean {
        val cameraGranted = ContextCompat.checkSelfPermission(
            this, Manifest.permission.CAMERA
        ) == PackageManager.PERMISSION_GRANTED
        
        val overlayGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            android.provider.Settings.canDrawOverlays(this)
        } else {
            true
        }
        
        val accessibilityEnabled = GestureAccessibilityService.isServiceEnabled()

        return cameraGranted && overlayGranted && accessibilityEnabled
    }

    private fun requestPermissions() {
        // Request camera permission
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) 
            != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                arrayOf(Manifest.permission.CAMERA),
                CAMERA_PERMISSION_REQUEST
            )
        }

        // Request overlay permission
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && 
            !android.provider.Settings.canDrawOverlays(this)) {
            val intent = Intent(
                android.provider.Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                android.net.Uri.parse("package:$packageName")
            )
            startActivityForResult(intent, OVERLAY_PERMISSION_REQUEST)
        }
    }

    private fun openAccessibilitySettings() {
        val intent = Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS)
        startActivity(intent)
        Toast.makeText(
            this, 
            "Find 'IronGest' in the list and enable it", 
            Toast.LENGTH_LONG
        ).show()
    }

    private fun startTracking() {
        Toast.makeText(this, "Starting hand tracking...", Toast.LENGTH_SHORT).show()
        updateStatus()
        // Hand tracking will be started by the service
    }

    private fun updateStatus() {
        val cameraStatus = if (ContextCompat.checkSelfPermission(
                this, Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED) "✅ Granted" else "❌ Not granted"
        
        val overlayStatus = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (android.provider.Settings.canDrawOverlays(this)) "✅ Granted" else "❌ Not granted"
        } else {
            "✅ Not required"
        }
        
        val accessibilityStatus = if (GestureAccessibilityService.isServiceEnabled()) {
            "✅ Enabled"
        } else {
            "❌ Disabled"
        }

        statusText.text = """
            IronGest Status
            
            📷 Camera: $cameraStatus
            🔲 Overlay: $overlayStatus
            ♿ Accessibility: $accessibilityStatus
            
            ${if (checkAllPermissions()) "✅ All permissions granted!\nReady to track hands." else "⚠️ Please grant all permissions above."}
        """.trimIndent()
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        updateStatus()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        updateStatus()
    }
}
