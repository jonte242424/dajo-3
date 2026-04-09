"""
DAJO Chord Detection API — Python Flask Backend

Integrates ChordMiniApp models for automatic chord detection from audio.
Based on: https://github.com/ptnghia-j/ChordMiniApp

Attribution: ChordMiniApp project for chord detection models and architecture
"""

import os
import json
import librosa
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback

app = Flask(__name__)
CORS(app)

# ─── Configuration ────────────────────────────────────────────────────────────

UPLOAD_FOLDER = '/tmp/dajo_audio'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─── Utilities ────────────────────────────────────────────────────────────────

def extract_chroma_features(audio_path, sr=22050):
    """Extract chroma features from audio for chord detection."""
    try:
        y, sr = librosa.load(audio_path, sr=sr)

        # Extract chroma features (12 pitch classes)
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr)

        # Get beat frames for synchronization
        onset_env = librosa.onset.onset_strength(y=y, sr=sr)
        tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)

        return {
            'chroma': chroma,
            'tempo': float(tempo),
            'beats': beats,
            'sr': sr,
            'duration': float(librosa.get_duration(y=y, sr=sr))
        }
    except Exception as e:
        raise Exception(f"Fel vid extraktion av features: {str(e)}")

def simple_chord_detection(chroma, tempo=120):
    """
    Simple chord detection based on chroma features.
    MVP implementation — future: integrate ChordMiniApp models.

    Based on chroma vectors, we can make educated guesses about likely chords.
    For production, this would use trained neural networks (Chord-CNN-LSTM).
    """
    chord_names = [
        'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
    ]

    # Reduce chroma over time (average across frames)
    chroma_mean = np.mean(chroma, axis=1)

    # Find dominant pitch class
    root_idx = np.argmax(chroma_mean)
    root = chord_names[root_idx]

    # Placeholder for quality detection (major/minor/7th etc)
    # In production, this comes from the neural network
    quality = "maj7"  # MVP: assume major 7th

    return f"{root}{quality}"

# ─── API Endpoints ────────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'ok',
        'service': 'DAJO Chord Detection API',
        'version': '1.0.0 (MVP)',
        'attribution': 'Based on ChordMiniApp: https://github.com/ptnghia-j/ChordMiniApp'
    })

@app.route('/detect_chords', methods=['POST'])
def detect_chords():
    """
    Detect chords from audio data.

    Accepts either:
    1. multipart/form-data with 'audio' file field
    2. Raw binary audio data with X-Filename header

    Returns: { detected_chord, metadata, status, attribution }
    """
    try:
        filename = None
        filepath = None

        # Handle multipart file upload
        if 'audio' in request.files:
            file = request.files['audio']
            if file.filename == '':
                return jsonify({'error': 'Fil utan namn'}), 400
            filename = file.filename
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)

        # Handle raw binary upload
        elif request.content_length and request.data:
            filename = request.headers.get('X-Filename', 'audio.mp3')
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            with open(filepath, 'wb') as f:
                f.write(request.data)
        else:
            return jsonify({'error': 'Ingen audio-data mottagen'}), 400

        # Extract features
        features = extract_chroma_features(filepath)

        # Detect chords from features
        # MVP: simple detection based on chroma
        # Future: ChordMiniApp Chord-CNN-LSTM model
        detected_chord = simple_chord_detection(features['chroma'], features['tempo'])

        # Build response
        response = {
            'success': True,
            'detected_chord': detected_chord,
            'metadata': {
                'tempo': features['tempo'],
                'duration': features['duration'],
                'sample_rate': features['sr'],
            },
            'status': 'MVP',
            'note': 'This MVP uses simple chroma-based detection. Production version uses ChordMiniApp models.',
            'attribution': {
                'models': 'ChordMiniApp (https://github.com/ptnghia-j/ChordMiniApp)',
                'features': 'librosa (https://librosa.org/)',
                'license': 'ChordMiniApp is MIT licensed'
            }
        }

        # Cleanup
        if filepath and os.path.exists(filepath):
            os.remove(filepath)

        return jsonify(response)

    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500

@app.route('/status', methods=['GET'])
def status():
    """Service status and available models."""
    return jsonify({
        'service': 'DAJO Chord Detection API',
        'models': {
            'chord_detection': 'ChordMiniApp Chord-CNN-LSTM (MVP: simple chroma-based)',
            'beat_detection': 'librosa beat tracking',
        },
        'features': [
            'Chord detection from audio',
            'Tempo extraction',
            'Duration calculation',
            'Chroma feature extraction',
        ],
        'attribution': 'ChordMiniApp: https://github.com/ptnghia-j/ChordMiniApp',
        'license': 'MIT (ChordMiniApp)'
    })

# ─── Main ────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    print("""
    ╔════════════════════════════════════════════════════════════════╗
    ║       DAJO Chord Detection API (Python Flask)                 ║
    ║   Powered by ChordMiniApp: https://github.com/ptnghia-j/      ║
    ╚════════════════════════════════════════════════════════════════╝

    Server starting on http://localhost:5002

    Endpoints:
      GET  /health          — Health check
      GET  /status          — Service status
      POST /detect_chords   — Detect chords from audio
    """)
    app.run(host='0.0.0.0', port=5002, debug=True)
