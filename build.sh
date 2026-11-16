#!/bin/sh
# Builds the ZIP to upload to the Chrome Web Store.
cd "$(dirname "$0")"
VERSION=$(sed -n 's/.*"version": "\(.*\)".*/\1/p' manifest.json)
OUT="dist/bulgarian-evening-news-$VERSION.zip"
mkdir -p dist && rm -f "$OUT"
zip -q -r "$OUT" manifest.json channels.js content.js content.css popup.html popup.css popup.js icons/*.png
echo "$OUT"
