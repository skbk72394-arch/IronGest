pluginManagement {
    repositories {
        gradlePluginPortal()
        google()
        mavenCentral()
    }
}

plugins {
    id("com.android.settings") version "8.2.2"
}

extensions.configure(com.android.build.api.dsl.SettingsExtension){
    compileSdk = 34
    minSdk = 26
    targetSdk = 34
}

rootProject.name = "IronGest"
include(":app")

// React Native autolinking
apply(from = "../../node_modules/@react-native-community/cli-platform-android/native_modules.gradle")
applyNativeModulesSettingsGradle(settings)
