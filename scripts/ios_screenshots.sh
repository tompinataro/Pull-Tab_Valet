#!/usr/bin/env bash
set -euo pipefail

# Capture iOS App Store screenshots from simulators with consistent status bar.
# - Boots the best available 6.7" and 6.1" iPhone simulators on this Mac.
# - Applies clean status bar.
# - Prompts you to navigate to each screen; press Enter to capture.
# - Saves to docs/release/SCREENSHOTS/.

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
OUT_DIR="$ROOT_DIR/docs/release/SCREENSHOTS"
mkdir -p "$OUT_DIR"

PREFERRED_67=("iPhone 17 Pro Max" "iPhone 16 Pro Max" "iPhone 15 Pro Max")
PREFERRED_61=("iPhone 17 Pro" "iPhone 16 Pro" "iPhone 15 Pro")

SCREENS=(login venues closeout reports)

function udid_for() {
  local name="$1"
  xcrun simctl list devices | awk -v n="$name" -F '[()]' '$0 ~ n {print $2; exit}'
}

function first_available_device() {
  local devices
  devices=$(xcrun simctl list devices available)

  for candidate in "$@"; do
    if grep -Fq "$candidate (" <<<"$devices"; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

function boot_device() {
  local name="$1"
  echo "-> Booting: $name"
  xcrun simctl boot "$name" >/dev/null 2>&1 || true
  # Wait until booted
  for i in {1..60}; do
    state=$(xcrun simctl list devices | grep -F "$name (" | sed -E 's/.*\(([^)]*)\).*/\1/' || true)
    if [[ "$state" == *"Booted"* ]]; then break; fi
    sleep 1
  done
}

function clean_statusbar() {
  local udid="$1"
  echo "-> Setting status bar (udid=$udid)"
  xcrun simctl status_bar "$udid" override \
    --time 9:41 \
    --dataNetwork wifi \
    --wifiBars 3 \
    --cellularMode active \
    --cellularBars 4 \
    --batteryState charged \
    --batteryLevel 100 || true
}

function screenshot_prompts() {
  local udid="$1"
  local tag="$2"
  for screen in "${SCREENS[@]}"; do
    read -r -p "Navigate $tag simulator to screen: '$screen' then press Enter to capture..." _
    local path="$OUT_DIR/iphone-${tag}-${screen}.png"
    echo "-> Capturing $path"
    xcrun simctl io "$udid" screenshot "$path" --type=png
  done
}

echo "Output directory: $OUT_DIR"

DEVICE_67=$(first_available_device "${PREFERRED_67[@]}")
DEVICE_61=$(first_available_device "${PREFERRED_61[@]}")

if [[ -z "${DEVICE_67:-}" || -z "${DEVICE_61:-}" ]]; then
  echo "Could not find suitable 6.7\" and 6.1\" iPhone simulators on this Mac."
  exit 1
fi

echo "Using devices: $DEVICE_67 (6.7\") and $DEVICE_61 (6.1\")"

boot_device "$DEVICE_67"
boot_device "$DEVICE_61"

UDID_67=$(udid_for "$DEVICE_67")
UDID_61=$(udid_for "$DEVICE_61")

clean_statusbar "$UDID_67"
clean_statusbar "$UDID_61"

echo "\nNow open your app in each simulator. If using an Expo Dev Client, keep 'npx expo start --dev-client --tunnel' running.\n"

screenshot_prompts "$UDID_67" "6.7"
screenshot_prompts "$UDID_61" "6.1"

echo "\nAll screenshots saved to: $OUT_DIR\n"
