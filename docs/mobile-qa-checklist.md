# Mobile QA Checklist

Use this checklist for real-device validation before marking mobile calculator releases ready.

## Devices

- iPhone Safari, current iOS: portrait and landscape.
- iPhone Safari, one older supported iOS version if available.
- iPad Safari: portrait, landscape, split-screen if available.
- Android Chrome: common phone viewport, portrait and landscape.
- Android Chrome: tablet or large-screen emulator if no physical tablet is available.

## Core Quote Flow

- Open `/fence-calculator` from a fresh browser session.
- Create a new job and confirm the job name persists in the workspace.
- Enter an address, select the property anchor, and confirm the map snapshot appears.
- Draw a fence run on the map and confirm the run reaches the job tab.
- Add at least one gate, set its position, and confirm gate details remain editable.
- Generate the BOM and confirm line items, run details, and gate items render on mobile.
- Save the quote, reload the page, reopen the quote, and confirm the run, map snapshot, and BOM survive reload.
- Edit the saved quote, regenerate the BOM, and confirm totals update without runtime errors.

## PWA And Offline

- Confirm the app manifest is discoverable from browser dev tools.
- Confirm the custom install-for-offline-access banner does not appear after browser eligibility is met.
- Confirm the iPhone Add to Home Screen hint banner does not appear.
- Install to the home screen where the device supports it, then launch from the icon.
- While online, load `/fence-calculator` once, close the browser, reopen the installed app, and confirm the shell appears.
- Switch to offline mode mid-quote and confirm the mobile menu offline status appears.
- While offline, confirm map/BOM save actions do not silently claim success.
- Reconnect and confirm the offline banner clears and save works again.

## Network Conditions

- Repeat the core quote flow on Slow 3G throttling.
- Repeat the BOM generation step with high latency and confirm loading states remain visible.
- Toggle offline while the map is visible and confirm the UI remains usable.
- Toggle offline while the BOM tab is visible and confirm existing BOM rows remain visible.

## Thermal And Battery

- Keep the mapper open for a 30 minute on-site style session.
- Draw, pan, zoom, and switch tabs during the session.
- Watch for excessive device heat, visible frame drops, or rapid battery drain.
- Confirm the browser does not terminate the tab during the session.

## PR Evidence

- Attach screenshots for each device class tested.
- Include at least one screenshot each of Job, Map, BOM, customer mode, and the mobile menu offline status.
- Note any unavailable device/browser combinations in the PR comment.
- Record the tested browser and OS versions.
