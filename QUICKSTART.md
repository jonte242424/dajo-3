# DAJO 3.0 Quick Start Guide

Get up and running in 5 minutes.

## One-Minute Setup

```bash
# 1. Install Node.js dependencies
npm install

# 2. Set up Python environment
cd chord-api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

# 3. Configure environment
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
```

## Start Development

### Option A: All Services Together (Easiest)
```bash
npm run dev:all
```

This starts:
- React client on http://localhost:5173
- Express API on http://localhost:3001
- Flask audio service on http://localhost:5002

Then open http://localhost:5173 in your browser.

### Option B: Separate Terminals

Terminal 1:
```bash
npm run dev
```

Terminal 2:
```bash
npm run dev:audio
```

## First Steps

1. **Create a Song**
   - Click "New Song"
   - Enter title and artist
   - Add chord chart sections
   - Click Save

2. **Import from File**
   - Click "Import with AI"
   - Upload PDF, image, or audio
   - Adjust if needed
   - Save to library

3. **Export to PDF**
   - Open song in editor
   - Click "Export"
   - Choose format (iReal, ChordPro, Notation)
   - Download PDF

4. **Create Setlist**
   - Go to Setlists
   - Click "New Setlist"
   - Add songs by dragging
   - Export entire setlist to PDF

## Test Audio Import

```bash
# Run integration test
./test-audio-import.sh
```

This verifies:
- Flask server is running
- Chord detection works
- Node.js can call Flask
- Full pipeline is functional

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+S` | Save (auto-save enabled) |
| `Escape` | Close dialog |

## Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Kill process on port 5002
lsof -ti:5002 | xargs kill -9
```

### Python Package Issues
```bash
# Reinstall Python environment
cd chord-api
rm -rf venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Node Modules Issues
```bash
# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

### Audio Import Not Working
1. Make sure Flask is running: `curl http://localhost:5002/health`
2. Check Flask logs: `tail -f /tmp/flask-test.log`
3. Verify audio file format (MP3, WAV, OGG, M4A)
4. Check file size (max 100MB)

## Environment Variables

Create `.env` file in project root:

```env
# Anthropic API
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Database (optional for local dev)
DATABASE_URL=postgresql://user:password@localhost/dajo

# Flask API URL (for production)
FLASK_API_URL=http://localhost:5002
```

## Project Structure Quick Reference

```
dajo-3/
├── client/              ← React app (npm run dev)
│   └── src/
│       ├── components/  ← Reusable components
│       ├── pages/       ← Page views
│       └── hooks/       ← Custom hooks
├── server/              ← Express API (npm run dev)
│   ├── index.ts         ← Main server
│   └── ai-import.ts     ← File analysis
├── chord-api/           ← Flask backend (npm run dev:audio)
│   └── app.py           ← Chord detection
└── README.md            ← Full documentation
```

## Making Changes

### Edit a Page
```
client/src/pages/Editor.tsx  → Changes appear instantly
```

### Change API Behavior
```
server/ai-import.ts          → Restart with npm run dev:server
```

### Update Chord Detection
```
chord-api/app.py             → Restart Flask with npm run dev:audio
```

## What's Happening Behind the Scenes

1. **You upload a file**
   ↓
2. **Client sends to Express API** (`/api/import/analyze`)
   ↓
3. **Express handles based on file type:**
   - PDF/Images → Claude Vision API analyzes
   - Audio → Flask backend detects chords
   ↓
4. **Extracted data returns to client**
   ↓
5. **You review and save to database**

## Next Steps

- **Learn More**: Read [CHORD_DETECTION.md](./CHORD_DETECTION.md) for audio details
- **Deploy**: See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup
- **Full Docs**: Check [README.md](./README.md) for complete documentation
- **Progress**: See [PROGRESS.md](./PROGRESS.md) for what's been built

## Getting Help

1. Check the relevant documentation file
2. Look at integration test: `./test-audio-import.sh`
3. Review server logs: `npm run dev` output
4. Check Flask logs: Flask output in second terminal

## Common Tasks

### Add a New Component
1. Create file: `client/src/components/MyComponent.tsx`
2. Use in a page
3. Styling: Tailwind CSS (no CSS files needed)

### Add a New API Endpoint
1. Edit: `server/index.ts`
2. Add route handler
3. Restart dev server with `Ctrl+C` and `npm run dev:server`

### Change Export Format
1. Edit: `server/pdf-export.ts`
2. Modify PDF generation logic
3. Restart to see changes

### Test Audio Detection
```bash
curl -X POST \
  -H "Content-Type: application/octet-stream" \
  -H "X-Filename: test.wav" \
  --data-binary @path/to/audio.wav \
  http://localhost:5002/detect_chords | jq
```

---

**Questions?** Check the documentation files or examine the code — it's well-commented!

**Ready to deploy?** Jump to [DEPLOYMENT.md](./DEPLOYMENT.md)

**Want to understand the architecture?** Read [CHORD_DETECTION.md](./CHORD_DETECTION.md)
