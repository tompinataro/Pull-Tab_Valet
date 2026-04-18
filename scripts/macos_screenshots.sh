#!/usr/bin/env bash
set -euo pipefail

# macos_screenshots.sh
# Capture Mac App Store / desktop screenshots for Pull Tab Valet (desktop app).
# Similar flow to scripts/ios_screenshots.sh: prompts you to navigate, then captures.

APP_NAME="Pull Tab Valet"
OUT_DIR="docs/release/SCREENSHOTS"

# Pick an .app bundle to launch (prefer universal build if present)
CANDIDATES=(
  "desktop/dist/mac-universal/${APP_NAME}.app"
  "desktop/dist/mac-arm64/${APP_NAME}.app"
  "desktop/dist/mac-x64/${APP_NAME}.app"
  "desktop/dist/mas-universal/${APP_NAME}.app"
  "desktop/dist/mas-arm64/${APP_NAME}.app"
)

APP_PATH=""
for p in "${CANDIDATES[@]}"; do
  if [[ -d "$p" ]]; then
    APP_PATH="$p"
    break
  fi
done

if [[ -z "$APP_PATH" ]]; then
  echo "Could not find ${APP_NAME}.app in desktop/dist." >&2
  echo "Expected one of:" >&2
  printf '  - %s\n' "${CANDIDATES[@]}" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "Launching: $APP_PATH"
open "$APP_PATH"

# Give the app a moment to boot
sleep 2

# Bring to front
osascript -e "tell application \"${APP_NAME}\" to activate" >/dev/null
sleep 0.5

# Screens to capture (edit as needed)
SCREENS=(login venues closeout reports)

get_front_window_id() {
  # Returns the window id of the first window for APP_NAME
  osascript <<OSA
set appName to "${APP_NAME}"
tell application "System Events"
  tell process appName
    if (count of windows) is 0 then return ""
    set w to window 1
    return (id of w) as string
  end tell
end tell
OSA
}

for screen in "${SCREENS[@]}"; do
  echo
  echo "Navigate the desktop app to: ${screen}" 
  read -r -p "Press Enter to capture '${screen}'..." _

  # Re-activate in case focus changed
  osascript -e "tell application \"${APP_NAME}\" to activate" >/dev/null
  sleep 0.2

  win_id="$(get_front_window_id)"
  if [[ -z "$win_id" ]]; then
    echo "Could not detect a window for '${APP_NAME}'. Is it running and visible?" >&2
    exit 1
  fi

  out_file="${OUT_DIR}/macos-${screen}.png"
  echo "Capturing window ${win_id} -> ${out_file}"

  # -l <windowid> captures a specific window; -x disables UI sounds and cursor
  screencapture -x -l "$win_id" "$out_file"

done

echo
printf "Done. Saved:\n"
for screen in "${SCREENS[@]}"; do
  echo "  - ${OUT_DIR}/macos-${screen}.png"
done
