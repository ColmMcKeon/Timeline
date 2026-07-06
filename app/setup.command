#!/bin/bash
# Run this once to create Timeline.app with the custom icon.
# Before running: save the icon image as icon.png in this folder.

DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/Timeline.app"

echo "Building Timeline.app..."

# ── App bundle structure ──
rm -rf "$APP"
mkdir -p "$APP/Contents/MacOS"
mkdir -p "$APP/Contents/Resources"

# ── Launcher script inside the bundle ──
cat > "$APP/Contents/MacOS/Timeline" << 'SCRIPT'
#!/bin/bash
DIR="$(cd "$(dirname "$0")/../../.." && pwd)"

# App bundles don't inherit shell PATH — search all common Node locations
NODE=""
for candidate in \
  /usr/local/bin/node \
  /opt/homebrew/bin/node \
  /usr/bin/node \
  "$HOME/.nvm/versions/node/$(ls $HOME/.nvm/versions/node 2>/dev/null | tail -1)/bin/node" \
  "$HOME/.nodenv/shims/node" \
  /opt/local/bin/node; do
  if [ -x "$candidate" ]; then
    NODE="$candidate"
    break
  fi
done

if [ -z "$NODE" ]; then
  osascript -e 'display alert "Node.js not found" message "Please install Node.js from https://nodejs.org and try again."'
  exit 1
fi

# Kill any previous instance on port 3456
lsof -ti:3456 | xargs kill -9 2>/dev/null
sleep 0.3

"$NODE" "$DIR/server.js"
SCRIPT
chmod +x "$APP/Contents/MacOS/Timeline"

# ── Info.plist ──
cat > "$APP/Contents/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleName</key>          <string>Timeline</string>
  <key>CFBundleDisplayName</key>   <string>Timeline</string>
  <key>CFBundleIdentifier</key>    <string>com.colm.timeline</string>
  <key>CFBundleVersion</key>       <string>1.0</string>
  <key>CFBundlePackageType</key>   <string>APPL</string>
  <key>CFBundleExecutable</key>    <string>Timeline</string>
  <key>CFBundleIconFile</key>      <string>AppIcon</string>
  <key>LSUIElement</key>           <false/>
  <key>NSHighResolutionCapable</key><true/>
</dict>
</plist>
PLIST

# ── Convert icon.png → AppIcon.icns ──
if [ -f "$DIR/icon.png" ]; then
  echo "Converting icon..."
  ICONSET="$DIR/AppIcon.iconset"
  mkdir -p "$ICONSET"

  sips -z 16   16   "$DIR/icon.png" --out "$ICONSET/icon_16x16.png"       > /dev/null 2>&1
  sips -z 32   32   "$DIR/icon.png" --out "$ICONSET/icon_16x16@2x.png"    > /dev/null 2>&1
  sips -z 32   32   "$DIR/icon.png" --out "$ICONSET/icon_32x32.png"       > /dev/null 2>&1
  sips -z 64   64   "$DIR/icon.png" --out "$ICONSET/icon_32x32@2x.png"    > /dev/null 2>&1
  sips -z 128  128  "$DIR/icon.png" --out "$ICONSET/icon_128x128.png"     > /dev/null 2>&1
  sips -z 256  256  "$DIR/icon.png" --out "$ICONSET/icon_128x128@2x.png"  > /dev/null 2>&1
  sips -z 256  256  "$DIR/icon.png" --out "$ICONSET/icon_256x256.png"     > /dev/null 2>&1
  sips -z 512  512  "$DIR/icon.png" --out "$ICONSET/icon_256x256@2x.png"  > /dev/null 2>&1
  sips -z 512  512  "$DIR/icon.png" --out "$ICONSET/icon_512x512.png"     > /dev/null 2>&1
  sips -z 1024 1024 "$DIR/icon.png" --out "$ICONSET/icon_512x512@2x.png"  > /dev/null 2>&1

  iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/AppIcon.icns"
  rm -rf "$ICONSET"
  echo "Icon applied."
else
  echo "⚠️  No icon.png found — app will use a default icon."
  echo "   Save your icon as icon.png in the Timeline folder and re-run setup."
fi

# ── Touch to refresh Finder icon cache ──
touch "$APP"

echo ""
echo "✅  Timeline.app is ready!"
echo "    Double-click Timeline.app to launch."
echo ""

open "$DIR"
