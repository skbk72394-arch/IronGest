# 🦾 IronGest - Iron Man Air Gesture Control

**Iron Man-style air hand gesture controller for Android using React Native with MediaPipe Hand Tracking**

![IronGest Banner](https://img.shields.io/badge/IronGest-1.0.0-cyan?style=for-the-badge&logo=android)
![Platform](https://img.shields.io/badge/Platform-Android-green?style=for-the-badge)
![React Native](https://img.shields.io/badge/React%20Native-0.73.2-blue?style=for-the-badge)
![MediaPipe](https://img.shields.io/badge/MediaPipe-0.10.9-orange?style=for-the-badge)

---

## ✨ Features

### 🎯 Hand Tracking
- Real-time 21-point hand landmark detection using MediaPipe
- Dual-hand tracking support (left + right)
- 30 FPS smooth landmark updates
- GPU acceleration support

### 🖱️ Cursor Control
- System-wide accessibility overlay cursor
- Iron Man HUD-style animated cursor
- Kalman filter smoothing for precise movement
- Acceleration curve (slow = precise, fast = coverage)
- Dwell-to-click support

### 👆 Gesture Recognition
- **Pinch Click** - Index finger + thumb pinch
- **Back Gesture** - Middle finger + thumb pinch  
- **Recent Apps** - Ring finger + thumb pinch
- **Drag Start/End** - Open/closed hand
- **Scroll** - Open hand swipe up/down
- **Swipe** - Directional gestures
- **Zoom** - Two-hand pinch spread

### ⌨️ Air Keyboard
- **Index Finger Mode** - Hover over keys, pinch to type
- **10-Finger Mode** - Touch typing in the air
- WPM tracking and practice mode
- Auto mode selection based on device size

### 🎨 Iron Man HUD Theme
- Dark theme (#0A0A0F background)
- Cyan accent (#00D4FF)
- Arc reactor-style cursor design
- Animated HUD components
- Custom transitions and effects

---

## 📱 Screenshots

```
┌─────────────────────────────────────┐
│                                     │
│         ╭───────────────╮           │
│         │   ◉ IRONGEST  │           │
│         ╰───────────────╯           │
│                                     │
│     ┌─────────────────────────┐     │
│     │  🖐️ Hand Detected       │     │
│     │  Cursor: [●]           │     │
│     │  Gesture: PINCH_CLICK  │     │
│     │  FPS: 30               │     │
│     └─────────────────────────┘     │
│                                     │
│   ┌─────┐ ┌─────┐ ┌─────┐          │
│   │  Q  │ │  W  │ │  E  │          │
│   └─────┘ └─────┘ └─────┘          │
│                                     │
└─────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Technology | Version |
|------------|---------|
| React Native | 0.73.2 |
| MediaPipe Tasks Vision | 0.10.9 |
| Kotlin | 1.9.22 |
| Android SDK | 26-34 |
| React Native Reanimated | 3.6.0 |
| Vision Camera | 3.9.0 |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Java 17
- Android Studio
- Android SDK 34
- NDK 25.2.9519653 (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/skbk72394-arch/IronGest.git

# Navigate to project
cd IronGest/irongest

# Install dependencies
npm install

# iOS pods (if needed)
# cd ios && pod install
```

### Running

```bash
# Debug build
npm run android

# Or with Gradle
cd android && ./gradlew assembleDebug
```

### Production Build (EAS)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build APK
eas build --platform android --profile apk

# Build App Bundle (Play Store)
eas build --platform android --profile production
```

---

## 📂 Project Structure

```
irongest/
├── android/
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── java/com/irongest/
│   │   │   │   ├── accessibility/      # Accessibility service
│   │   │   │   ├── cursor/             # Cursor control
│   │   │   │   ├── gestures/           # Gesture recognition
│   │   │   │   ├── handtracking/       # MediaPipe integration
│   │   │   │   ├── keyboard/           # Air keyboard
│   │   │   │   └── features/           # Advanced features
│   │   │   └── res/                    # Android resources
│   │   └── build.gradle
│   └── build.gradle
├── src/
│   ├── native/                         # TurboModule specs
│   ├── hand-tracking/                  # Hand tracking hooks
│   ├── cursor/                         # Cursor control
│   ├── gestures/                       # Gesture types
│   ├── keyboard/                       # Keyboard components
│   └── ui/
│       ├── screens/                    # App screens
│       ├── components/                 # HUD components
│       ├── navigation/                 # Navigation
│       └── theme/                      # Theme config
├── index.js
├── App.tsx
└── package.json
```

---

## 🔑 Permissions Required

| Permission | Purpose |
|------------|---------|
| `CAMERA` | Hand tracking |
| `SYSTEM_ALERT_WINDOW` | Overlay cursor |
| `BIND_ACCESSIBILITY_SERVICE` | Touch injection |
| `RECORD_AUDIO` | Voice commands |
| `VIBRATE` | Haptic feedback |
| `FOREGROUND_SERVICE` | Background operation |

---

## 📋 Configuration

### MediaPipe Model

The MediaPipe hand landmarker model is automatically downloaded during build. 
Location: `android/app/src/main/assets/models/hand_landmarker.task`

### Accessibility Service

After installation, enable the accessibility service:
1. Settings → Accessibility
2. Find "IronGest"
3. Enable the service

---

## 🧪 Testing

```bash
# Run tests
npm test

# Lint
npm run lint

# Type check
npx tsc --noEmit
```

---

## 📄 License

MIT License - See LICENSE file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📞 Support

- GitHub Issues: [https://github.com/skbk72394-arch/IronGest/issues](https://github.com/skbk72394-arch/IronGest/issues)

---

## 🙏 Acknowledgments

- [MediaPipe](https://mediapipe.dev/) by Google
- [React Native](https://reactnative.dev/) by Meta
- Iron Man design inspiration from Marvel Studios

---

**Made with ❤️ by IronGest Team**
