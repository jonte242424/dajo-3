# DAJO 3.0 — AI-Powered Chord Chart Creation

Create, edit, and share chord charts with ease. DAJO uses Claude AI and ChordMiniApp for intelligent chord detection from PDF sheets, images, and audio files.

## Features

### 📝 Create & Edit
- **WYSIWYG Chord Editor** — Edit chord charts in real-time
- **Undo/Redo** — Full history with Cmd+Z / Cmd+Shift+Z
- **Multiple Formats** — ChordPro, iReal Pro, Notation styles
- **Lyrics Support** — Sync lyrics with chords

### 🎵 Import with AI
- **PDF & Images** — Upload chord sheets and let Claude extract chords
- **Audio Files** — Auto-detect chords from MP3, WAV, OGG (via ChordMiniApp)
- **Sheet Music** — Parse standard notation and lead sheets
- **Smart Detection** — Identifies format and extracts data automatically

### 📊 Export
- **iReal Pro Format** — Grid-style chord charts
- **ChordPro** — Text-based chord notation
- **Notation** — Sheet music with leadsheets
- **Setlists** — Export multiple songs with TOC

### 🎹 Setlist Management
- **Organize Songs** — Group songs by setlist
- **Drag & Drop** — Reorder with ease
- **Batch Export** — Export entire setlist to PDF

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS + Vite
- **Backend**: Express.js (Node.js)
- **Audio**: Flask (Python) + librosa + ChordMiniApp
- **AI**: Claude Vision API (Anthropic)
- **Database**: PostgreSQL
- **PDF**: PDFKit

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+
- PostgreSQL (for production)

### Installation

```bash
# Clone and install
git clone <repo>
cd dajo-3
npm install

# Set up Python environment
cd chord-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Configure environment
cp .env.example .env
# Edit .env with your ANTHROPIC_API_KEY and database config
```

### Development

```bash
# Start everything
npm run dev:all

# Or separately:
npm run dev              # Node.js + Client
npm run dev:audio       # Flask server
```

Visit `http://localhost:5173` for the client.

### Testing

```bash
# Test audio import pipeline
./test-audio-import.sh
```

## Architecture

DAJO uses a modular architecture:

```
React Client (port 5173)
    ↓
Express API (port 3001)
    ↓
├─ Claude Vision API (images, PDFs)
├─ Flask Audio API (port 5002)
│   └─ ChordMiniApp + librosa
└─ PostgreSQL Database
```

See [CHORD_DETECTION.md](./CHORD_DETECTION.md) for audio architecture details.

## Project Structure

```
dajo-3/
├── client/               # React frontend
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── hooks/       # Custom React hooks
│   │   └── lib/         # Utilities
│   └── vite.config.ts
├── server/              # Express.js backend
│   ├── index.ts         # Main server
│   ├── ai-import.ts     # File analysis
│   ├── import/          # Import strategies
│   └── pdf-export.ts    # PDF generation
├── chord-api/           # Flask audio backend
│   ├── app.py          # Chord detection service
│   └── requirements.txt
└── README.md
```

## Key Files

### Import Pipeline
- `server/ai-import.ts` — Main import orchestrator
- `server/import/detect-format.ts` — File type detection
- `server/import/classify-format.ts` — Claude Vision classification
- `server/import/extract-*.ts` — Format-specific extraction

### Audio
- `chord-api/app.py` — Flask chord detection server
- `server/ai-import.ts#analyzeAudioFile()` — Audio processing

### Export
- `server/pdf-export.ts` — PDF generation (all formats)
- `client/src/pages/Setlists.tsx` — Setlist export UI

### Editor
- `client/src/pages/Editor.tsx` — Main editor
- `client/src/hooks/useUndoRedo.ts` — History management

## API Endpoints

### Import
- `POST /api/import/analyze` — Analyze file and extract songs
- `POST /api/import/save` — Save imported songs

### Songs
- `GET /api/songs` — List all songs
- `GET /api/songs/:id` — Get song details
- `POST /api/songs` — Create song
- `PATCH /api/songs/:id` — Update song
- `DELETE /api/songs/:id` — Delete song

### Setlists
- `GET /api/setlists` — List setlists
- `GET /api/setlists/:id` — Get setlist details
- `GET /api/setlists/:id/export` — Export setlist to PDF
- `POST /api/setlists` — Create setlist
- `PATCH /api/setlists/:id` — Update setlist

### Chord Detection
- `POST /chord-api/detect_chords` — Detect chords from audio (Flask)

## Credits

### Open Source
- **ChordMiniApp** — Chord detection models and architecture
  - GitHub: https://github.com/ptnghia-j/ChordMiniApp
  - License: MIT
- **librosa** — Audio feature extraction
- **Flask** — Web framework
- **React** — UI framework

### Anthropic
- Claude Vision API for intelligent file analysis

## License

MIT License — See LICENSE file

## Getting Help

1. Check [CHORD_DETECTION.md](./CHORD_DETECTION.md) for audio setup
2. Review [Contributing Guide](./CONTRIBUTING.md) (if available)
3. Open an issue on GitHub

---

**DAJO** — *Detecting Chords, Organizing Music* 🎵
