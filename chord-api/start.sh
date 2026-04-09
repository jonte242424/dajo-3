#!/bin/bash
# Start DAJO Chord Detection API (Flask Backend)

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║       DAJO Chord Detection API Startup                         ║"
echo "║   ChordMiniApp: https://github.com/ptnghia-j/ChordMiniApp      ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "Installing dependencies from requirements.txt..."
pip install -q -r requirements.txt

# Run Flask app
echo ""
echo "Starting Flask server on port 5002..."
echo ""
python app.py
