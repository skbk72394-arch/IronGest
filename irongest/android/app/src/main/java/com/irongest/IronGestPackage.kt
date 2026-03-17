/**
 * IronGest - React Native Package
 * Registers all native modules for React Native bridge
 * 
 * @author IronGest Team
 * @version 1.0.0
 */

package com.irongest

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.irongest.handtracking.HandTrackingModule
import com.irongest.cursor.CursorModule
import com.irongest.gestures.GestureRecognizerModule
import com.irongest.keyboard.KeyboardModule

class IronGestPackage : ReactPackage {
    
    override fun getNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            HandTrackingModule(reactContext),
            CursorModule(reactContext),
            GestureRecognizerModule(reactContext),
            KeyboardModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
