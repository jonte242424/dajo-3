"""
DAJO Chord Detection API — Python Flask Backend

Beat-synchronized chord progression detection from audio files.
Uses librosa for feature extraction and template-matching for chord quality.

Based on: https://github.com/ptnghia-j/ChordMiniApp
Attribution: ChordMiniApp project for chord detection models and architecture
"""

import os
import tempfile
import shutil
import librosa
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = '/tmp/dajo_audio'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ─── Lazy-loaded lyrics transcription ─────────────────────────────────────────
# faster-whisper + demucs are optional; endpoint returns 501 if unavailable.

_WHISPER_MODEL = None
_WHISPER_MODEL_SIZE = os.environ.get('WHISPER_MODEL', 'medium')  # tiny/base/small/medium/large-v3
_LYRICS_AVAILABLE = None  # None = not checked, True/False = known state


def _check_lyrics_deps():
    global _LYRICS_AVAILABLE
    if _LYRICS_AVAILABLE is not None:
        return _LYRICS_AVAILABLE
    try:
        import faster_whisper  # noqa: F401
        import demucs.separate  # noqa: F401
        _LYRICS_AVAILABLE = True
    except ImportError:
        _LYRICS_AVAILABLE = False
    return _LYRICS_AVAILABLE


def _get_whisper_model():
    """Load Whisper model once, cache globally."""
    global _WHISPER_MODEL
    if _WHISPER_MODEL is None:
        from faster_whisper import WhisperModel
        print(f'[lyrics] Loading Whisper model ({_WHISPER_MODEL_SIZE})…')
        _WHISPER_MODEL = WhisperModel(_WHISPER_MODEL_SIZE, device='cpu', compute_type='int8')
        print(f'[lyrics] Whisper model loaded')
    return _WHISPER_MODEL


def _separate_vocals(audio_path, out_dir):
    """Run Demucs to isolate vocals. Returns path to vocals.wav."""
    import demucs.separate
    args = [
        '--two-stems=vocals',
        '-n', 'htdemucs',
        '--out', out_dir,
        audio_path,
    ]
    demucs.separate.main(args)
    stem = os.path.splitext(os.path.basename(audio_path))[0]
    vocals_path = os.path.join(out_dir, 'htdemucs', stem, 'vocals.wav')
    if not os.path.exists(vocals_path):
        raise RuntimeError(f'Demucs did not produce vocals.wav at {vocals_path}')
    return vocals_path


def _transcribe_audio(audio_path, language='sv'):
    """Run Whisper on given audio. Returns (segments, info)."""
    model = _get_whisper_model()
    segments, info = model.transcribe(
        audio_path,
        language=language,
        beam_size=5,
        vad_filter=True,
        condition_on_previous_text=False,
        word_timestamps=True,
    )
    result = []
    for seg in segments:
        words = []
        if seg.words:
            for w in seg.words:
                words.append({
                    'start': float(w.start),
                    'end': float(w.end),
                    'text': w.word.strip(),
                })
        result.append({
            'start': float(seg.start),
            'end': float(seg.end),
            'text': seg.text.strip(),
            'words': words,
        })
    return result, {
        'language': info.language,
        'language_probability': float(info.language_probability),
    }

# ─── Chord templates ──────────────────────────────────────────────────────────
# 12-dimensional chroma vectors for common chord types (root at index 0).
# These are rotated for each root (C, C#, D, ..., B) during matching.

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

def _template(intervals):
    """Build a 12-dim binary chroma template from interval list."""
    t = np.zeros(12)
    for i in intervals:
        t[i % 12] = 1.0
    return t

CHORD_TEMPLATES = {
    # quality_suffix : (intervals from root)
    '':      [0, 4, 7],          # major
    'm':     [0, 3, 7],          # minor
    '7':     [0, 4, 7, 10],      # dominant 7
    'maj7':  [0, 4, 7, 11],      # major 7
    'm7':    [0, 3, 7, 10],      # minor 7
    'dim':   [0, 3, 6],          # diminished
    'dim7':  [0, 3, 6, 9],       # diminished 7
    'sus4':  [0, 5, 7],          # suspended 4
    'm7b5':  [0, 3, 6, 10],      # half-diminished
}

# Pre-compute all 12 rotations * 9 qualities = 108 templates
ALL_TEMPLATES = []
for quality, intervals in CHORD_TEMPLATES.items():
    base = _template(intervals)
    for root_idx in range(12):
        rotated = np.roll(base, root_idx)
        # Normalize template (L2 norm)
        rotated = rotated / np.linalg.norm(rotated)
        name = NOTE_NAMES[root_idx] + quality
        ALL_TEMPLATES.append((name, rotated, root_idx, quality))

# Krumhansl-Schmuckler key profiles (major and minor)
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])


# ─── Feature extraction ──────────────────────────────────────────────────────

def extract_features(audio_path, sr=22050):
    """Load audio and extract chroma + beat features."""
    y, sr = librosa.load(audio_path, sr=sr, mono=True)

    # Use HPSS to reduce percussive influence on chroma
    y_harmonic, _ = librosa.effects.hpss(y)

    # Chroma from constant-Q transform (better pitch resolution than STFT)
    chroma = librosa.feature.chroma_cqt(y=y_harmonic, sr=sr, hop_length=512)

    # Beat tracking
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
    tempo, beat_frames = librosa.beat.beat_track(
        onset_envelope=onset_env, sr=sr, hop_length=512
    )
    beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=512)

    duration = float(librosa.get_duration(y=y, sr=sr))

    return {
        'chroma': chroma,
        'beat_frames': beat_frames,
        'beat_times': beat_times,
        'tempo': float(tempo) if np.isscalar(tempo) else float(tempo[0]),
        'duration': duration,
        'sr': sr,
    }


# ─── Chord matching ──────────────────────────────────────────────────────────

def match_chord(chroma_vec):
    """Match a chroma vector against all templates; return best chord name."""
    # Normalize input
    norm = np.linalg.norm(chroma_vec)
    if norm < 1e-8:
        return 'N'  # No-chord (silence)
    chroma_vec = chroma_vec / norm

    best_score = -np.inf
    best_name = 'C'
    for name, tpl, _, _ in ALL_TEMPLATES:
        score = np.dot(chroma_vec, tpl)
        if score > best_score:
            best_score = score
            best_name = name
    return best_name


def detect_chord_progression(features):
    """
    Detect chord for each beat using beat-synchronous chroma.
    Returns list of { chord, start_time, end_time, beat_index }
    """
    chroma = features['chroma']
    beat_frames = features['beat_frames']
    beat_times = features['beat_times']
    duration = features['duration']

    # Beat-synchronous chroma: average chroma between consecutive beats
    if len(beat_frames) < 2:
        # Fall back to single chord
        chord = match_chord(np.mean(chroma, axis=1))
        return [{
            'chord': chord,
            'start_time': 0.0,
            'end_time': duration,
            'beat_index': 0,
        }]

    sync_chroma = librosa.util.sync(chroma, beat_frames, aggregate=np.median)

    progression = []
    for i in range(sync_chroma.shape[1]):
        chord = match_chord(sync_chroma[:, i])
        start = float(beat_times[i]) if i < len(beat_times) else 0.0
        end = float(beat_times[i + 1]) if i + 1 < len(beat_times) else duration
        progression.append({
            'chord': chord,
            'start_time': start,
            'end_time': end,
            'beat_index': i,
        })

    return progression


def collapse_progression(progression, min_duration=0.25):
    """Merge consecutive identical chords into single segments."""
    if not progression:
        return progression

    collapsed = [dict(progression[0])]
    for seg in progression[1:]:
        last = collapsed[-1]
        if seg['chord'] == last['chord']:
            last['end_time'] = seg['end_time']
        else:
            collapsed.append(dict(seg))

    # Remove very short segments (likely noise) by merging with previous
    filtered = []
    for seg in collapsed:
        dur = seg['end_time'] - seg['start_time']
        if dur < min_duration and filtered:
            filtered[-1]['end_time'] = seg['end_time']
        else:
            filtered.append(seg)

    return filtered


# ─── Key detection ────────────────────────────────────────────────────────────

def detect_key(chroma):
    """Estimate key using Krumhansl-Schmuckler correlation."""
    chroma_avg = np.mean(chroma, axis=1)
    norm = np.linalg.norm(chroma_avg)
    if norm < 1e-8:
        return 'C', 'major'
    chroma_avg = chroma_avg / norm

    best_score = -np.inf
    best_key = 'C'
    best_mode = 'major'

    for root_idx in range(12):
        maj_profile = np.roll(MAJOR_PROFILE, root_idx)
        maj_profile = maj_profile / np.linalg.norm(maj_profile)
        maj_score = np.dot(chroma_avg, maj_profile)

        min_profile = np.roll(MINOR_PROFILE, root_idx)
        min_profile = min_profile / np.linalg.norm(min_profile)
        min_score = np.dot(chroma_avg, min_profile)

        if maj_score > best_score:
            best_score = maj_score
            best_key = NOTE_NAMES[root_idx]
            best_mode = 'major'
        if min_score > best_score:
            best_score = min_score
            best_key = NOTE_NAMES[root_idx] + 'm'
            best_mode = 'minor'

    return best_key, best_mode


# ─── API endpoints ───────────────────────────────────────────────────────────

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'service': 'DAJO Chord Detection API',
        'version': '2.0.0 (chord-progression)',
        'attribution': 'Based on ChordMiniApp: https://github.com/ptnghia-j/ChordMiniApp'
    })


@app.route('/detect_chords', methods=['POST'])
def detect_chords():
    """
    Detect full chord progression from audio.

    Accepts either:
    1. multipart/form-data with 'audio' file field
    2. Raw binary audio data with X-Filename header

    Returns:
    {
      progression: [{ chord, start_time, end_time, beat_index }, ...],
      key: 'G',
      mode: 'major',
      tempo: 120.5,
      duration: 180.3,
      beat_count: 360,
      chord_count: 42,
      metadata: {...},
      attribution: {...}
    }
    """
    filepath = None
    try:
        # Parse upload
        if 'audio' in request.files:
            file = request.files['audio']
            if file.filename == '':
                return jsonify({'error': 'Fil utan namn'}), 400
            filepath = os.path.join(UPLOAD_FOLDER, file.filename)
            file.save(filepath)
        elif request.content_length and request.data:
            filename = request.headers.get('X-Filename', 'audio.mp3')
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            with open(filepath, 'wb') as f:
                f.write(request.data)
        else:
            return jsonify({'error': 'Ingen audio-data mottagen'}), 400

        # Extract features
        features = extract_features(filepath)

        # Detect progression and collapse identical consecutive chords
        raw_progression = detect_chord_progression(features)
        progression = collapse_progression(raw_progression, min_duration=0.25)

        # Detect key
        key, mode = detect_key(features['chroma'])

        # Build response
        response = {
            'success': True,
            'progression': progression,
            'key': key,
            'mode': mode,
            'tempo': features['tempo'],
            'duration': features['duration'],
            'beat_count': len(features['beat_times']),
            'chord_count': len(progression),
            'metadata': {
                'sample_rate': features['sr'],
                'detection_method': 'template-match-chroma-cqt (HPSS harmonic)',
            },
            'attribution': {
                'models': 'ChordMiniApp (https://github.com/ptnghia-j/ChordMiniApp)',
                'features': 'librosa (https://librosa.org/)',
                'license': 'ChordMiniApp is MIT licensed',
            },
        }

        return jsonify(response)

    except Exception as e:
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc(),
        }), 500

    finally:
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass


@app.route('/transcribe_lyrics', methods=['POST'])
def transcribe_lyrics():
    """
    Isolate vocals with Demucs, then transcribe with faster-whisper.

    Request: raw audio bytes (X-Filename header) or multipart with 'audio' field.
    Query/header params:
      - language: ISO code, default 'sv'
      - skip_separation: 'true' to run Whisper on raw mix (faster, lower quality)

    Response:
    {
      "success": true,
      "segments": [{"start", "end", "text", "words": [{"start","end","text"}]}],
      "language": "sv",
      "language_probability": 1.0,
      "duration": 204.6,
      "segment_count": 34,
      "word_count": 217,
      "method": "demucs-htdemucs + faster-whisper-medium",
      "attribution": {...}
    }
    """
    if not _check_lyrics_deps():
        return jsonify({
            'error': 'Lyrics transcription not available',
            'hint': 'Install: pip install faster-whisper demucs torchcodec',
        }), 501

    filepath = None
    work_dir = None
    try:
        # Parse upload
        if 'audio' in request.files:
            file = request.files['audio']
            filename = file.filename or 'audio.mp3'
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            file.save(filepath)
        elif request.content_length and request.data:
            filename = request.headers.get('X-Filename', 'audio.mp3')
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            with open(filepath, 'wb') as f:
                f.write(request.data)
        else:
            return jsonify({'error': 'Ingen audio-data mottagen'}), 400

        language = request.args.get('language') or request.headers.get('X-Language', 'sv')
        skip_sep = request.args.get('skip_separation', '').lower() in ('true', '1', 'yes')

        # Duration (for response metadata)
        try:
            duration = float(librosa.get_duration(path=filepath))
        except Exception:
            duration = 0.0

        # Step 1: separate vocals (or skip for speed)
        target_audio = filepath
        method = f'faster-whisper-{_WHISPER_MODEL_SIZE} (raw mix)'
        if not skip_sep:
            work_dir = tempfile.mkdtemp(prefix='dajo_demucs_')
            print(f'[lyrics] Separating vocals for {filename}…')
            target_audio = _separate_vocals(filepath, work_dir)
            method = f'demucs-htdemucs + faster-whisper-{_WHISPER_MODEL_SIZE}'

        # Step 2: transcribe
        print(f'[lyrics] Transcribing {os.path.basename(target_audio)} (lang={language})…')
        segments, info = _transcribe_audio(target_audio, language=language)

        word_count = sum(len(s.get('words') or []) for s in segments)

        return jsonify({
            'success': True,
            'segments': segments,
            'language': info['language'],
            'language_probability': info['language_probability'],
            'duration': duration,
            'segment_count': len(segments),
            'word_count': word_count,
            'method': method,
            'attribution': {
                'separation': 'Demucs htdemucs (https://github.com/facebookresearch/demucs) MIT',
                'transcription': 'faster-whisper (https://github.com/SYSTRAN/faster-whisper) MIT',
                'model_family': 'OpenAI Whisper',
            },
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc(),
        }), 500

    finally:
        if filepath and os.path.exists(filepath):
            try:
                os.remove(filepath)
            except OSError:
                pass
        if work_dir and os.path.exists(work_dir):
            try:
                shutil.rmtree(work_dir, ignore_errors=True)
            except OSError:
                pass


@app.route('/status', methods=['GET'])
def status():
    lyrics_ok = _check_lyrics_deps()
    capabilities = [
        'Beat-synchronized chord progression',
        'Key detection (Krumhansl-Schmuckler)',
        'Tempo extraction',
        'HPSS harmonic source separation',
        'Template matching: maj, min, 7, maj7, m7, dim, dim7, sus4, m7b5',
    ]
    if lyrics_ok:
        capabilities.append(f'Lyrics transcription (Demucs + faster-whisper-{_WHISPER_MODEL_SIZE})')
    return jsonify({
        'service': 'DAJO Chord Detection API',
        'version': '2.1.0',
        'capabilities': capabilities,
        'lyrics_available': lyrics_ok,
        'whisper_model': _WHISPER_MODEL_SIZE if lyrics_ok else None,
        'attribution': {
            'chords': 'ChordMiniApp (https://github.com/ptnghia-j/ChordMiniApp) — MIT',
            'separation': 'Demucs (https://github.com/facebookresearch/demucs) — MIT' if lyrics_ok else None,
            'transcription': 'faster-whisper (https://github.com/SYSTRAN/faster-whisper) — MIT' if lyrics_ok else None,
        },
    })


if __name__ == '__main__':
    lyrics_status = 'available' if _check_lyrics_deps() else 'NOT installed'
    print(f"""
    ╔════════════════════════════════════════════════════════════════╗
    ║       DAJO Audio Analysis API v2.1 (chords + lyrics)          ║
    ║   Chords:  ChordMiniApp (https://github.com/ptnghia-j/)       ║
    ║   Vocals:  Demucs htdemucs (Meta)                             ║
    ║   Lyrics:  faster-whisper (OpenAI Whisper / SYSTRAN)          ║
    ╚════════════════════════════════════════════════════════════════╝

    Server starting on http://localhost:5002
    Lyrics transcription: {lyrics_status}
    Whisper model: {_WHISPER_MODEL_SIZE}

    Endpoints:
      GET  /health             — Health check
      GET  /status             — Capabilities
      POST /detect_chords      — Detect chord progression (~8s/3min)
      POST /transcribe_lyrics  — Isolate vocals + transcribe (~120s/3min)
    """)
    app.run(host='0.0.0.0', port=5002, debug=False)
