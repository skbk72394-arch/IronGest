/**
 * IronGest - Boot Receiver
 * Handles device boot to optionally start the service
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest.receivers

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class BootReceiver : BroadcastReceiver() {
    
    companion object {
        private const val TAG = "IronGest-BootReceiver"
    }

    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            Log.i(TAG, "Device boot completed")
            // The service will be started when the user opens the app
            // Auto-start requires special permissions and user consent
        }
    }
}
