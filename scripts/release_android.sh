#!/usr/bin/env bash
# release_android.sh — local one-shot Android release build.
#
# Bumps versionCode + patch, builds web bundle, syncs Capacitor, generates a
# signed AAB (for Play Console upload) AND a signed universal APK (for
# direct sideload onto devices / emulators / sharing with testers).
#
# Usage:
#   bash scripts/release_android.sh                # bump + build AAB + APK
#   bash scripts/release_android.sh --no-bump      # skip versionCode bump
#   bash scripts/release_android.sh --no-apk       # skip APK (faster, AAB only)
#
# Outputs the AAB and APK paths on success.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GRADLE_FILE="$ROOT/android/app/build.gradle"
BUMP=true
BUILD_APK=true

for arg in "$@"; do
  case "$arg" in
    --no-bump) BUMP=false ;;
    --no-apk)  BUILD_APK=false ;;
  esac
done

# ── Bump versionCode + versionName patch ────────────────────────────────────
if [ "$BUMP" = true ]; then
  CURRENT_CODE=$(grep -E '^\s*versionCode' "$GRADLE_FILE" | head -1 | awk '{print $2}')
  NEXT_CODE=$((CURRENT_CODE + 1))

  CURRENT_NAME=$(grep -E '^\s*versionName' "$GRADLE_FILE" | head -1 | sed -E 's/.*"([^"]+)".*/\1/')
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_NAME"
  NEXT_NAME="${MAJOR}.${MINOR}.$((PATCH + 1))"

  sed -i.bak -E "s/versionCode $CURRENT_CODE/versionCode $NEXT_CODE/" "$GRADLE_FILE"
  sed -i.bak -E "s/versionName \"$CURRENT_NAME\"/versionName \"$NEXT_NAME\"/" "$GRADLE_FILE"
  rm -f "$GRADLE_FILE.bak"

  echo "→ Bumped versionCode $CURRENT_CODE → $NEXT_CODE, versionName $CURRENT_NAME → $NEXT_NAME"
fi

# ── Web build + Capacitor sync ──────────────────────────────────────────────
cd "$ROOT"
echo "→ Building web bundle (vite mode=native)..."
npm run build:native

echo "→ Syncing Capacitor..."
npx cap sync android

# ── Signed AAB + APK via Gradle ─────────────────────────────────────────────
# Both tasks run in a single Gradle invocation so shared compile/lint work
# is done once. assembleRelease produces the universal APK; bundleRelease
# produces the AAB. assembleRelease is skipped when --no-apk is passed.
cd "$ROOT/android"
TASKS="bundleRelease"
if [ "$BUILD_APK" = true ]; then
  TASKS="$TASKS assembleRelease"
  echo "→ Building signed Release AAB + universal APK..."
else
  echo "→ Building signed Release AAB (APK skipped)..."
fi
./gradlew $TASKS

AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"
APK="$ROOT/android/app/build/outputs/apk/release/app-release.apk"

echo ""
if [ -f "$AAB" ]; then
  SIZE=$(du -h "$AAB" | awk '{print $1}')
  echo "✓ AAB ready ($SIZE):"
  echo "   $AAB"
  echo "   → Upload this to Play Console (Internal testing → Create release)"
else
  echo "✗ AAB not found at expected path"
  exit 1
fi

if [ "$BUILD_APK" = true ]; then
  echo ""
  if [ -f "$APK" ]; then
    SIZE=$(du -h "$APK" | awk '{print $1}')
    echo "✓ APK ready ($SIZE):"
    echo "   $APK"
    echo "   → Sideload directly: bash scripts/install_to_emulator.sh"
    echo "   → Or share with testers (they install with: adb install <apk>)"
  else
    echo "✗ APK not found at expected path"
    exit 1
  fi
fi
