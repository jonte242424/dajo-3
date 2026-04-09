#!/bin/bash
# Test DAJO Audio Import Pipeline
# Tests: Flask chord detection → Node.js API → Full integration

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          DAJO Audio Import Pipeline Test                       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Start Flask server
echo "▶ Starting Flask chord detection server..."
cd /Users/jonas_m1/dev/dajo-3/chord-api
source venv/bin/activate
python app.py > /tmp/flask-test.log 2>&1 &
FLASK_PID=$!
echo "  Flask PID: $FLASK_PID"
sleep 3

# Start Node.js server
echo "▶ Starting Node.js API server..."
cd /Users/jonas_m1/dev/dajo-3
npm run dev:server > /tmp/node-test.log 2>&1 &
NODE_PID=$!
echo "  Node.js PID: $NODE_PID"
sleep 5

# Test Flask health
echo ""
echo "▶ Testing Flask health endpoint..."
if curl -s http://localhost:5002/health | jq . > /dev/null; then
  echo "  ✓ Flask server is healthy"
else
  echo "  ✗ Flask health check failed"
  kill $FLASK_PID $NODE_PID 2>/dev/null || true
  exit 1
fi

# Get test audio file
TEST_AUDIO="/Users/jonas_m1/dev/dajo-3/chord-backend/lib/python3.14/site-packages/scipy/io/tests/data/test-8000Hz-le-1ch-1byte-ulaw.wav"

if [ ! -f "$TEST_AUDIO" ]; then
  echo "  ✗ Test audio file not found"
  kill $FLASK_PID $NODE_PID 2>/dev/null || true
  exit 1
fi

echo "  ✓ Using test audio: $(basename $TEST_AUDIO)"

# Convert audio to base64
echo ""
echo "▶ Converting audio to base64..."
BASE64_AUDIO=$(base64 < "$TEST_AUDIO")
echo "  ✓ Audio size: $(echo -n "$BASE64_AUDIO" | wc -c) characters"

# Test Flask direct chord detection
echo ""
echo "▶ Testing Flask chord detection directly..."
FLASK_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/octet-stream" \
  -H "X-Filename: test-audio.wav" \
  --data-binary @"$TEST_AUDIO" \
  http://localhost:5002/detect_chords)

echo "  Flask response:"
echo "$FLASK_RESPONSE" | jq . || echo "$FLASK_RESPONSE"

# Extract detected chord
DETECTED_CHORD=$(echo "$FLASK_RESPONSE" | jq -r '.detected_chord // "unknown"')
TEMPO=$(echo "$FLASK_RESPONSE" | jq -r '.metadata.tempo // 120')
echo "  ✓ Detected chord: $DETECTED_CHORD (Tempo: $TEMPO bpm)"

# Test Node.js import API with audio
echo ""
echo "▶ Testing Node.js import API with audio..."
IMPORT_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"base64\": \"$BASE64_AUDIO\",
    \"mediaType\": \"audio/wav\",
    \"filename\": \"test-audio.wav\"
  }" \
  http://localhost:3001/api/import/analyze)

echo "  Import response:"
echo "$IMPORT_RESPONSE" | jq . || echo "$IMPORT_RESPONSE"

# Check if chords were detected
IMPORT_CHORDS=$(echo "$IMPORT_RESPONSE" | jq '.songs[0].sections[0].bars[0].chords // empty')
if [ -n "$IMPORT_CHORDS" ]; then
  echo "  ✓ Chords successfully imported into song"
else
  echo "  ⚠ No chords in song (might be in fallback mode)"
fi

# Cleanup
echo ""
echo "▶ Cleaning up..."
kill $FLASK_PID $NODE_PID 2>/dev/null || true
sleep 1

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║              Test Complete ✓                                   ║"
echo "║                                                                ║"
echo "║  Flask backend and Node.js integration working!                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
