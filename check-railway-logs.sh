#!/bin/bash

# Try to check recent commits and see if we need to manually trigger a deployment
echo "Checking git history..."
git log --oneline -3

echo ""
echo "Checking if there are any uncommitted changes..."
git status

echo ""
echo "Note: The application is showing as 'Online' on Railway,"
echo "but returning 404 errors. This could mean:"
echo "  1. The service hasn't fully deployed yet"
echo "  2. The start command isn't correct"
echo "  3. The port binding is incorrect"
echo ""
echo "The .railway/config.json shows the dajo-3 service should run:"
echo "  Start Command: npm run build && npm start"
echo "  Port: 3001"
echo ""

