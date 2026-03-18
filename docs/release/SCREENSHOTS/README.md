App Store Screenshots

This folder will contain App Store Connect screenshots generated from the iOS Simulator.

How to generate
- Prereqs: Xcode + iOS Simulator installed; your app runs in Simulator (Expo Dev Client or Expo Go is fine for screenshots).
- Start your development server if needed: `cd mobile && npx expo start --dev-client --tunnel`.
- In another terminal, run the helper script:

  `bash scripts/ios_screenshots.sh`

- The script will:
  - Boot the best available 6.7" and 6.1" iPhone simulators on this Mac.
  - Apply a clean status bar (9:41, full battery, Wi‑Fi).
  - Prompt you four times per device (`login`, `venues`, `closeout`, `reports`). Navigate to each screen and press Enter to capture.
  - Save PNGs here as `iphone-6.7-login.png`, `iphone-6.7-venues.png`, `iphone-6.7-closeout.png`, `iphone-6.7-reports.png`, and the 6.1" equivalents.

Notes
- You can edit the `SCREENS=(...)` list inside `scripts/ios_screenshots.sh` to add/remove prompts or change names.
- If you want device frames or captions, add them later in a graphics tool; the raw Simulator captures meet Apple’s requirements.
- If status bar looks wrong, re-run the script; it re-applies overrides each time. To clear overrides manually: `xcrun simctl status_bar booted clear`.
