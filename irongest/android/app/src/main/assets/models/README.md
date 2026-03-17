# MediaPipe Models

This directory should contain the MediaPipe model files.

## Required Files

1. `hand_landmarker.task` - Hand landmark detection model

## How to Download

The model will be automatically downloaded during the Gradle build process.
Alternatively, download manually:

```bash
# Download hand landmarker model
curl -o hand_landmarker.task https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
```

## Model Size

- hand_landmarker.task: ~30 MB

## License

MediaPipe models are licensed under Apache 2.0.
See: https://github.com/google/mediapipe/blob/master/LICENSE
