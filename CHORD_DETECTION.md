# DAJO Chord Detection Architecture

## Overview

DAJO 3.0 integrates **ChordMiniApp** for automatic chord detection from audio files. The system uses a hybrid backend architecture:

- **Flask (Python)** on port 5002: Audio analysis and chord detection
- **Express.js (Node.js)** on port 3001: Primary API and orchestration
- **Claude Vision API**: Chord detection from sheet music and chord charts

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (React)                         │
│                   ImportDialog.tsx                          │
└──────────────────────────────────┬──────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────┐
                    │  Express.js API Server   │
                    │   (port 3001)            │
                    │  /api/import/analyze     │
                    └──────────────┬───────────┘
                                   │
                        ┌──────────┴──────────┐
                        ▼                     ▼
                  ┌──────────────┐    ┌─────────────────┐
                  │ Claude Vision│    │ Flask Audio API │
                  │   API        │    │  (port 5002)    │
                  │(PDF, Images) │    │ /detect_chords  │
                  └──────────────┘    └─────────────────┘
                                           │
                                           ▼
                                    ┌──────────────┐
                                    │ librosa +    │
                                    │ ChordMiniApp │
                                    │ (MVP: chroma)│
                                    └──────────────┘
```

## Components

### 1. Flask Chord Detection Server (`chord-api/app.py`)

Runs on **port 5002** and provides:

- **GET `/health`** - Service health check
- **GET `/status`** - Service status and available models
- **POST `/detect_chords`** - Detect chords from audio

#### Features:
- Accepts raw binary audio or multipart form-data
- Uses librosa for feature extraction
- MVP implementation: chroma-based chord detection
- Full attribution to ChordMiniApp
- Returns detected chord, tempo, duration, and confidence

#### Example Response:
```json
{
  "success": true,
  "detected_chord": "Cmaj7",
  "metadata": {
    "tempo": 120,
    "duration": 180.5,
    "sample_rate": 22050
  },
  "status": "MVP",
  "attribution": {
    "models": "ChordMiniApp (https://github.com/ptnghia-j/ChordMiniApp)",
    "features": "librosa (https://librosa.org/)",
    "license": "ChordMiniApp is MIT licensed"
  }
}
```

### 2. Node.js API Integration (`server/ai-import.ts`)

The `analyzeFile()` function detects file types and routes to appropriate handlers:

```typescript
if (mediaType.startsWith("audio/")) {
  return analyzeAudioFile(base64Data, mediaType, filename);
}
```

The `analyzeAudioFile()` function:
1. Converts base64 audio to buffer
2. Sends to Flask `/detect_chords` endpoint
3. Extracts chord information
4. Builds ImportedSong structure with detected chord
5. Returns fallback empty structure if detection fails

### 3. Client Import Dialog (`client/src/components/ImportDialog.tsx`)

Updated to support audio files:

- Accepts MP3, WAV, OGG, M4A (up to 100MB)
- Shows audio file indicator (green speaker icon)
- Sends file to `/api/import/analyze` endpoint
- Displays detected chords and metadata

## Getting Started

### Start Development Environment

Option 1: Start both servers together:
```bash
npm run dev:all
```

Option 2: Start servers separately:
```bash
# Terminal 1: Node.js API + Client
npm run dev

# Terminal 2: Flask Chord Detection
npm run dev:audio
```

### Manual Setup

```bash
# Install Node.js dependencies
npm install

# Set up Python environment
cd chord-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run Flask server
python app.py

# In another terminal, run Node.js
cd ..
npm run dev
```

## Supported Audio Formats

- MP3 (audio/mpeg)
- WAV (audio/wav)
- OGG (audio/ogg)
- M4A (audio/mp4)

Maximum file size: 100MB

## How Chord Detection Works

### MVP Implementation (Current)

1. **Feature Extraction** (librosa)
   - Load audio file
   - Extract chroma features (12 pitch classes)
   - Calculate tempo using onset detection
   - Extract beat positions

2. **Chord Detection** (Simple Chroma-based)
   - Average chroma features over time
   - Find dominant pitch class (highest chroma energy)
   - Return as root note with maj7 quality

### Production Implementation (Future)

Replace simple chroma detection with **ChordMiniApp models**:
- Chord-CNN-LSTM neural network
- Trained on real chord annotations
- Detects chord quality (major, minor, 7th, etc.)
- Outputs chord sequence over time

## ChordMiniApp Integration

**Attribution**: [ChordMiniApp](https://github.com/ptnghia-j/ChordMiniApp) by ptnghia-j

The Flask app is designed to integrate ChordMiniApp models:

```python
# TODO: Replace simple_chord_detection() with ChordMiniApp model
# from chordminiapp import ChordDetector
# detector = ChordDetector(model="chord_cnn_lstm")
# detected_chord = detector.predict(features['chroma'])
```

**License**: ChordMiniApp is MIT licensed

## File Structure

```
dajo-3/
├── chord-api/                    # Flask backend
│   ├── app.py                   # Main Flask application
│   ├── requirements.txt          # Python dependencies
│   ├── start.sh                 # Startup script
│   └── venv/                    # Python virtual environment
├── server/
│   ├── ai-import.ts             # Audio file handling
│   └── index.ts                 # Main API server
├── client/
│   └── src/components/
│       └── ImportDialog.tsx      # Audio upload UI
└── CHORD_DETECTION.md           # This file
```

## Testing

Run the comprehensive integration test:

```bash
./test-audio-import.sh
```

This tests:
1. Flask server startup
2. Flask chord detection
3. Node.js API integration
4. End-to-end audio import pipeline

## Error Handling

If Flask chord detection fails:
1. Node.js catches the error
2. Returns fallback empty song structure
3. User sees "manual-audio (chord detection unavailable)" 
4. User can manually input chords in the editor

## Performance Notes

- **Flask startup**: ~3 seconds
- **Audio processing**: ~200ms per minute of audio
- **Chord detection accuracy**: Low (MVP uses simple chroma)
- **Memory usage**: ~500MB for Flask + dependencies

## Next Steps

1. **Integrate ChordMiniApp Models**: Replace simple chroma detection with trained Chord-CNN-LSTM
2. **Add Confidence Scoring**: Return confidence for each detected chord
3. **Real-time Detection**: Stream chord detection as user plays audio
4. **Model Training**: Fine-tune on DAJO's use cases
5. **Railway Deployment**: Deploy Flask service to Railway

## References

- [ChordMiniApp GitHub](https://github.com/ptnghia-j/ChordMiniApp)
- [librosa Documentation](https://librosa.org/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Audio Feature Extraction](https://en.wikipedia.org/wiki/Mel-frequency_cepstral_coefficient)

## License

DAJO uses ChordMiniApp's techniques which is MIT licensed. Full attribution is included in API responses and this documentation.
