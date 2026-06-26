#!/bin/bash
set -e

SERVER="root@backend.ayahosni.com"
REMOTE_PATH="/var/www/portfolio/dist"
DIST_LOCAL="dist/portfolio"

echo "Building..."
npm run build -- --configuration production

echo "Uploading to server..."
rsync -az --delete "$DIST_LOCAL/" "$SERVER:$REMOTE_PATH/portfolio_new/"

echo "Swapping directories (atomic, no downtime)..."
ssh "$SERVER" "
  mv $REMOTE_PATH/portfolio $REMOTE_PATH/portfolio_old
  mv $REMOTE_PATH/portfolio_new $REMOTE_PATH/portfolio
  rm -rf $REMOTE_PATH/portfolio_old
"

echo "Done. Site updated with zero downtime."
