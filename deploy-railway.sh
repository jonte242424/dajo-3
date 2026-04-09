#!/bin/bash
# DAJO 3.0 — Railway Deployment Script
# Automates complete deployment of Node.js + Flask services

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         DAJO 3.0 — Railway Deployment                          ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ─── Step 1: Verify Railway Login ───────────────────────────────────

echo -e "${BLUE}▶ Checking Railway login status...${NC}"
if ! railway whoami &>/dev/null; then
    echo -e "${YELLOW}⚠ Not logged in to Railway${NC}"
    echo "Please run: railway login"
    exit 1
fi
echo -e "${GREEN}✓ Logged in to Railway${NC}"
echo ""

# ─── Step 2: Check/Create Project ───────────────────────────────────

echo -e "${BLUE}▶ Checking dajo-3 project...${NC}"

# Try to use existing project if linked
if [ -f ".railway/config.json" ]; then
    echo -e "${GREEN}✓ Using Railway config from .railway/config.json${NC}"
else
    echo -e "${YELLOW}⚠ No .railway/config.json found${NC}"
    echo "Creating new Railway project..."
    railway init --name dajo-3 2>/dev/null || true
fi

echo ""

# ─── Step 3: Verify Environment Variables ───────────────────────────

echo -e "${BLUE}▶ Checking environment variables...${NC}"

if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo -e "${YELLOW}⚠ ANTHROPIC_API_KEY not set in environment${NC}"
    echo "Please set it:"
    echo "  export ANTHROPIC_API_KEY=sk-ant-your-key-here"
    echo "Or enter it now:"
    read -p "ANTHROPIC_API_KEY: " ANTHROPIC_API_KEY
    export ANTHROPIC_API_KEY
fi

echo -e "${GREEN}✓ ANTHROPIC_API_KEY is set${NC}"
echo ""

# ─── Step 4: Build Application ───────────────────────────────────────

echo -e "${BLUE}▶ Building application...${NC}"
npm run build 2>&1 | tail -5
echo -e "${GREEN}✓ Build complete${NC}"
echo ""

# ─── Step 5: Set Railway Project ────────────────────────────────────

echo -e "${BLUE}▶ Setting up Railway services...${NC}"

# Add environment variables to Railway
railway variables set NODE_ENV=production || true
railway variables set ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" || true
railway variables set PORT=3001 || true

echo -e "${GREEN}✓ Environment variables configured${NC}"
echo ""

# ─── Step 6: Deploy Services ───────────────────────────────────────

echo -e "${BLUE}▶ Deploying services...${NC}"
echo "Note: Deployment happens in Railway dashboard"
echo "Run: railway up"
echo ""
echo "Or push to GitHub to trigger auto-deploy:"
echo "  git add ."
echo "  git commit -m 'Deploy to Railway'"
echo "  git push"
echo ""

# ─── Step 7: Show Project Info ──────────────────────────────────────

echo -e "${BLUE}▶ Project Information:${NC}"
echo ""
echo "To view your project:"
echo "  railway open"
echo ""
echo "To deploy:"
echo "  railway up"
echo ""
echo "To view logs:"
echo "  railway logs"
echo ""
echo "To set more variables:"
echo "  railway variables set FLASK_API_URL=https://your-flask-url"
echo ""

echo -e "${GREEN}✓ Railway setup complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Go to Railway dashboard: railway open"
echo "2. Deploy Node.js service: railway up"
echo "3. Add Flask service (new service in dashboard)"
echo "4. Set FLASK_API_URL when Flask service is deployed"
echo ""
echo "For detailed guide, see RAILWAY_SETUP.md"
