#!/bin/bash
# DAJO Complete Railway Setup
# Sets up Node.js + Flask + PostgreSQL with full configuration

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    DAJO 3.0 — Complete Railway Setup                          ║"
echo "║    Node.js API + Flask Audio + PostgreSQL Database            ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Load API key
source .env.local 2>/dev/null || true

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo "❌ ANTHROPIC_API_KEY not found!"
    echo "Make sure .env.local has your API key"
    exit 1
fi

echo "✓ API Key loaded"
echo ""

# Get project details
echo "▶ Getting Railway project info..."
PROJECT_ID=$(railway project 2>/dev/null | grep -o "ID: [^ ]*" | cut -d' ' -f2)
echo "Project ID: $PROJECT_ID"
echo ""

# Configure and display instructions
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  NEXT STEPS — Go to Railway Dashboard                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "🔗 Open: railway open"
echo ""
echo "📋 In Railway Dashboard:"
echo "  1. Click '+ Add Service'"
echo "  2. Select 'GitHub Repo'"
echo "  3. Select: dajo-3"
echo ""
echo "⚙️  For Node.js Service:"
echo "  • Root Directory: (leave empty)"
echo "  • Start Command: npm run build && npm start"
echo "  • Environment Variables:"
echo "    - NODE_ENV = production"
echo "    - PORT = 3001"
echo "    - ANTHROPIC_API_KEY = (already set in global)"
echo ""
echo "⚙️  For Flask Service:"
echo "  • Root Directory: chord-api"
echo "  • Start Command: python app.py"
echo "  • Environment Variables:"
echo "    - PYTHON_VERSION = 3.11"
echo "    - PORT = 5002"
echo ""
echo "🔗 After Flask deploys:"
echo "  • Get Flask public URL"
echo "  • Set in Node.js environment:"
echo "    - FLASK_API_URL = https://[flask-url]"
echo ""
echo "─────────────────────────────────────────────────────────────────"
echo ""
echo "✅ When everything is deployed:"
echo "  Test: curl https://[your-domain]/api/health"
echo "  Try audio import at https://[your-domain]"
echo ""
echo "For detailed guide: see RAILWAY_SETUP.md"
echo ""
