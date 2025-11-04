#!/usr/bin/env bash
set -euo pipefail

# Deploy script for VPS
# - builds the frontend
# - creates a timestamped release under RELEASES_DIR
# - atomically updates TARGET_SYMLINK to point to new release
# - restarts pm2 processes
# Usage: sudo ./scripts/deploy_vps.sh [branch]

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${1:-main}"
RELEASES_DIR="/var/www/releases"
TARGET_SYMLINK="/var/www/frimousse_current"
DIST_DIR="$PROJECT_ROOT/dist"
PM2_CMD="pm2"

echo "Project root: $PROJECT_ROOT"
echo "Branch: $BRANCH"

if [ "$(id -u)" -ne 0 ]; then
  echo "Warning: Not running as root. Some operations may require sudo."
  SUDO='sudo'
else
  SUDO=''
fi

cd "$PROJECT_ROOT"

echo "Fetching latest from origin/$BRANCH..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

echo "Installing dependencies..."
npm ci

echo "Building frontend (npm run build)..."
npm run build

if [ ! -d "$DIST_DIR" ]; then
  echo "Build failed: $DIST_DIR not found." >&2
  exit 1
fi

REV="release-$(date -u +%Y%m%d%H%M%S)"
RELEASE_PATH="$RELEASES_DIR/$REV"

echo "Creating release dir: $RELEASE_PATH"
$SUDO mkdir -p "$RELEASE_PATH"

echo "Copying build files to release dir..."
$SUDO cp -r "$DIST_DIR"/* "$RELEASE_PATH/"

echo "Updating symlink $TARGET_SYMLINK -> $RELEASE_PATH"
$SUDO ln -sfn "$RELEASE_PATH" "$TARGET_SYMLINK"

# Optional: set ownership to web user (uncomment and adjust if needed)
# $SUDO chown -R www-data:www-data "$RELEASE_PATH"

echo "Restarting pm2 processes..."
$SUDO $PM2_CMD restart all || { echo "pm2 restart failed, attempting pm2 reload all"; $SUDO $PM2_CMD reload all || true; }

echo "Deploy finished successfully. Current -> $(readlink -f "$TARGET_SYMLINK")"
echo "You can remove old releases manually from $RELEASES_DIR when desired."

exit 0
