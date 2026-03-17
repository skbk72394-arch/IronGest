# IronGest - Build Documentation

Complete guide for building IronGest for Android.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Building with EAS CLI](#building-with-eas-cli)
4. [Building with Android Studio](#building-with-android-studio)
5. [Signing Configuration](#signing-configuration)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| npm | 9+ | Package manager |
| JDK | 17 | Java development |
| Android Studio | Hedgehog (2023.1.1)+ | IDE and SDK |
| Android NDK | 25.2.9519653 | Native development |
| CMake | 3.22.1+ | Native build system |

### Required Android SDK Components

- Android SDK Platform 34
- Android SDK Build-Tools 34.0.0
- Android SDK Command-line Tools
- Android Emulator (for testing)

### Environment Variables

```bash
# Linux/macOS (~/.bashrc or ~/.zshrc)
export ANDROID_HOME=$HOME/Android/Sdk
export ANDROID_SDK_ROOT=$ANDROID_HOME
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools

# Windows (System Environment Variables)
ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk
ANDROID_NDK_HOME=%ANDROID_HOME%\ndk\25.2.9519653
```

---

## Environment Setup

### 1. Clone and Install Dependencies

```bash
# Clone the repository
git clone https://github.com/your-org/irongest.git
cd irongest

# Install Node.js dependencies
npm install

# Install EAS CLI globally (optional, for cloud builds)
npm install -g eas-cli
```

### 2. Configure EAS (for cloud builds)

```bash
# Login to Expo
eas login

# Configure project
eas build:configure
```

### 3. Download MediaPipe Models

```bash
# Create assets directory
mkdir -p android/app/src/main/assets/models

# Download hand landmark model
curl -o android/app/src/main/assets/models/hand_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task

# Download gesture recognizer model
curl -o android/app/src/main/assets/models/gesture_recognizer.task \
  https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task
```

---

## Building with EAS CLI

### Production Build (AAB for Play Store)

```bash
# Build production AAB
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

### APK Build (Direct Distribution)

```bash
# Build release APK
eas build --platform android --profile apk

# The APK will be available for download from the EAS dashboard
```

### Development Build

```bash
# Build development APK for testing
eas build --platform android --profile development

# Install on connected device
eas build:run --platform android
```

### Local Build with EAS

```bash
# Build locally without uploading
eas build --platform android --profile local --local

# Output will be in ./android/app/build/outputs/
```

---

## Building with Android Studio

### 1. Open Project

1. Launch Android Studio
2. Select "Open an existing Android Studio project"
3. Navigate to the `irongest/android` directory and click "OK"
4. Wait for Gradle sync to complete

### 2. Configure Build Variants

1. Open "Build Variants" tab (View > Tool Windows > Build Variants)
2. Select your desired variant:
   - `fullDebug` - Full features, debuggable
   - `fullRelease` - Full features, optimized
   - `liteDebug` - Reduced features, debuggable
   - `liteRelease` - Reduced features, optimized

### 3. Build APK

**Debug Build:**
```
Build > Make Project (Ctrl+F9)
Build > Build Bundle(s) / APK(s) > Build APK(s)
```

**Release Build:**
```
Build > Generate Signed Bundle / APK
Select APK
Choose keystore (or create new)
Select "fullRelease" build variant
Click Finish
```

### 4. Run on Device

```bash
# Via Android Studio
Run > Run 'app'

# Via command line
adb install -r android/app/build/outputs/apk/full/release/app-full-release.apk
```

### 5. Build from Command Line

```bash
cd android

# Debug build
./gradlew assembleFullDebug

# Release build
./gradlew assembleFullRelease

# Clean build
./gradlew clean assembleFullRelease

# Output locations:
# Debug APK: android/app/build/outputs/apk/full/debug/app-full-debug.apk
# Release APK: android/app/build/outputs/apk/full/release/app-full-release.apk
```

---

## Signing Configuration

### Generate Keystore

```bash
# Generate release keystore
keytool -genkey -v -keystore release.keystore \
  -alias irongest \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass YOUR_STORE_PASSWORD \
  -keypass YOUR_KEY_PASSWORD \
  -dname "CN=IronGest, OU=Development, O=Stark Industries, L=Malibu, ST=CA, C=US"
```

### Configure Signing

**Option 1: Environment Variables**
```bash
export RELEASE_STORE_FILE=/path/to/release.keystore
export RELEASE_STORE_PASSWORD=your_store_password
export RELEASE_KEY_ALIAS=irongest
export RELEASE_KEY_PASSWORD=your_key_password
```

**Option 2: local.properties**
```properties
# local.properties (DO NOT COMMIT THIS FILE)
release_store_file=/path/to/release.keystore
release_store_password=your_store_password
release_key_alias=irongest
release_key_password=your_key_password
```

**Option 3: Build.gradle (hardcoded - not recommended for production)**

Add to `android/app/build.gradle`:
```gradle
android {
    signingConfigs {
        release {
            storeFile file('../release.keystore')
            storePassword 'your_store_password'
            keyAlias 'irongest'
            keyPassword 'your_key_password'
        }
    }
}
```

### Verify APK Signature

```bash
# Verify APK is signed
apksigner verify --print-certs android/app/build/outputs/apk/full/release/app-full-release.apk

# Check signing certificates
jarsigner -verify -verbose -certs android/app/build/outputs/apk/full/release/app-full-release.apk
```

---

## Troubleshooting

### Common Issues

#### 1. NDK Not Found

```
Error: NDK not configured. Define ANDROID_NDK_HOME or set ndk.dir in local.properties
```

**Solution:**
```bash
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/25.2.9519653
# Or add to local.properties:
ndk.dir=/path/to/Android/sdk/ndk/25.2.9519653
```

#### 2. CMake Error: MediaPipe not found

```
Error: Could not find mediapipe_jni library
```

**Solution:**
Ensure MediaPipe AAR is properly extracted:
```bash
# The build.gradle should handle this automatically
# If issues persist, clean and rebuild:
./gradlew clean
./gradlew assembleFullRelease
```

#### 3. React Native New Architecture Errors

```
Error: TurboModule not found
```

**Solution:**
```bash
# Enable new architecture in gradle.properties
echo "newArchEnabled=true" >> android/gradle.properties

# Or disable if not needed
echo "newArchEnabled=false" >> android/gradle.properties
```

#### 4. Out of Memory during Build

```
Error: Java heap space
```

**Solution:**
Increase Gradle memory in `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx8192m -XX:MaxMetaspaceSize=1g
```

#### 5. Multiple dex files

```
Error: Cannot fit requested classes in a single dex file
```

**Solution:**
Enable multidex in `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        multiDexEnabled true
    }
}
dependencies {
    implementation 'androidx.multidex:multidex:2.0.1'
}
```

#### 6. Camera Permission Denied

```
Error: Camera permission not granted
```

**Solution:**
Grant runtime permissions:
- Settings > Apps > IronGest > Permissions > Camera > Allow

### Clean Build

If experiencing persistent issues:

```bash
# Complete clean
cd android
./gradlew clean
rm -rf .gradle
rm -rf app/.cxx
rm -rf app/build
rm -rf build
rm -rf .cxx
rm -rf $HOME/.gradle/caches/
rm -rf $HOME/.android/cache

# Rebuild
./gradlew assembleFullRelease
```

---

## Build Output Locations

| Build Type | Location |
|------------|----------|
| Debug APK | `android/app/build/outputs/apk/full/debug/app-full-debug.apk` |
| Release APK | `android/app/build/outputs/apk/full/release/app-full-release.apk` |
| Release AAB | `android/app/build/outputs/bundle/fullRelease/app-full-release.aab` |
| Native Libraries | `android/app/build/intermediates/cmake/debug/obj/*/` |

---

## Performance Optimization

### Reduce APK Size

```gradle
// android/app/build.gradle
android {
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
        }
    }
}
```

### Native Library Compression

```gradle
android {
    defaultConfig {
        ndk {
            abiFilters 'arm64-v8a'  // Only include ARM64 for modern devices
        }
    }
}
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/your-org/irongest/issues
- Documentation: https://irongest.dev/docs
