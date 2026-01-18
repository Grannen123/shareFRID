#!/bin/bash
set -euo pipefail

# Only run in remote (web) environment
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Check if package.json exists (project has been initialized)
if [ ! -f "$CLAUDE_PROJECT_DIR/package.json" ]; then
  echo "No package.json found - skipping dependency installation"
  exit 0
fi

echo "Installing dependencies..."
cd "$CLAUDE_PROJECT_DIR"
npm install

echo "Dependencies installed successfully"
