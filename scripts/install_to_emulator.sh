#!/usr/bin/env bash
# install_to_emulator.sh — Push the latest Release build to the running
# emulator (Google Play Games Developer Emulator, or any standard Android
# emulator/device).
#
# Two install paths, picked automatically:
#   1. Universal APK (app-release.apk) — fast path: `adb install -r`.
#      Built by release_android.sh by default.
#   2. AAB → bundletool → device-tailored APKs — fallback when only the
#      AAB exists. Slower; downloads bundletool on first run.
#
# Usage:
#   bash scripts/install_to_emulator.sh
#
# Requires: an emulator/device visible via `adb devices`. Path 2 also needs
# Java (any JDK 11+).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"
AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"
APKS_OUT="$ROOT/android/app/build/outputs/bundle/release/app-release.apks"

TOOLS_DIR="${TOOLS_DIR:-$ROOT/tools}"
BUNDLETOOL_VERSION="1.18.1"
BUNDLETOOL="$TOOLS_DIR/bundletool-$BUNDLETOOL_VERSION.jar"

# ── Locate adb ──────────────────────────────────────────────────────────────
if command -v adb >/dev/null 2>&1; then
  ADB="adb"
elif [ -x "$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" ]; then
  ADB="$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe"
elif [ -x "/c/Users/$USER/AppData/Local/Android/Sdk/platform-tools/adb.exe" ]; then
  ADB="/c/Users/$USER/AppData/Local/Android/Sdk/platform-tools/adb.exe"
else
  echo "✗ adb not found. Install Android Studio or platform-tools."
  echo "  https://developer.android.com/studio/releases/platform-tools"
  exit 1
fi
echo "→ Using adb: $ADB"

# ── Sanity check: at least one of APK or AAB must exist ────────────────────
if [ ! -f "$APK" ] && [ ! -f "$AAB" ]; then
  echo "✗ Neither APK nor AAB found. Run: bash scripts/release_android.sh"
  exit 1
fi

# ── Confirm a device is connected ───────────────────────────────────────────
echo ""
echo "→ Connected devices:"
"$ADB" devices
DEVICES=$("$ADB" devices | tail -n +2 | awk '{print $1}' | grep -v '^$' || true)
if [ -z "$DEVICES" ]; then
  echo ""
  echo "✗ No devices connected. Start the emulator first and wait for it to fully boot."
  echo "  (You should see the Android home screen inside it.)"
  echo ""
  echo "  Tip — if the emulator is up but adb doesn't see it, try:"
  echo "    \"\$ADB\" connect localhost:6520"
  exit 1
fi

# ── Path 1 (preferred): direct APK install ─────────────────────────────────
if [ -f "$APK" ]; then
  echo ""
  echo "→ Installing universal APK directly via adb..."
  "$ADB" install -r "$APK"
  echo ""
  echo "✓ Installed. Look for 'The Long Road to Heaven' in the device's app drawer."
  exit 0
fi

# ── Path 2 (fallback): AAB → bundletool → device-tailored APKs ─────────────
echo ""
echo "→ No universal APK found, falling back to bundletool from AAB."

# Download bundletool if needed (one-time, ~10 MB)
if [ ! -f "$BUNDLETOOL" ]; then
  mkdir -p "$TOOLS_DIR"
  echo "→ Downloading bundletool $BUNDLETOOL_VERSION..."
  curl -fL -o "$BUNDLETOOL" \
    "https://github.com/google/bundletool/releases/download/$BUNDLETOOL_VERSION/bundletool-all-$BUNDLETOOL_VERSION.jar"
fi

echo ""
echo "→ Generating APKs from AAB..."
java -jar "$BUNDLETOOL" build-apks \
  --bundle="$AAB" \
  --output="$APKS_OUT" \
  --connected-device \
  --adb="$ADB" \
  --overwrite

echo ""
echo "→ Installing on device..."
java -jar "$BUNDLETOOL" install-apks \
  --apks="$APKS_OUT" \
  --adb="$ADB"

echo ""
echo "✓ Installed. Look for 'The Long Road to Heaven' in the device's app drawer."
