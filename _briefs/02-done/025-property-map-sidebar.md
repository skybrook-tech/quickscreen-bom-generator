# 025 — Property map sidebar refinements (hybrid type, button repositioning, GPS removal)

Branch: `codex/brief-025-property-map-sidebar`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 023 (PR #58) merged — already true on master.

Use npm 10.x if package-lock.json needs touching.

## Goal

Tighten the property map sidebar widget for the small mobile sidebar real estate:
- Default to hybrid map type (satellite + road/POI labels) so street names and house numbers are visible
- Remove the map type selector entirely (one less UI control)
- Move the "Use this image" button ABOVE the map (currently below) so it's reachable without scrolling
- Remove the GPS coordinate display (clutter — tradies don't need to read lat/lng)

## What to implement

1. **Audit the PropertyMap sidebar component**. Search `src/components/` for the component that:
   - Renders the captured Maps Static API image
   - Has the map type selector (radio buttons or dropdown for satellite/roadmap/hybrid/terrain)
   - Has a "Use this image" button
   - Displays GPS coordinates (lat,lng) near the map
   Likely file: `src/components/PropertyMap.tsx`, `src/components/calculator-v3/PropertyMapSidebar.tsx`, or similar. Check `src/components/calculator-v3/` first.

2. **Set default map type to hybrid**:
   - Find where the map type is selected for the Maps Static API request. Likely a state variable like `mapType` initialized to `'satellite'` or read from a selector.
   - Hard-code it to `'hybrid'`. Remove all references to other types (`satellite`, `roadmap`, `terrain`) in this component.
   - Confirm the Maps Static API request URL includes `&maptype=hybrid`.
   - The hybrid type renders satellite imagery + road/POI/address labels overlaid. Tradies will see street names and house numbers as they zoom in.

3. **Remove the map type selector UI**:
   - Delete the JSX block that renders the radio buttons / dropdown / button group for selecting map type.
   - Delete the associated state, handlers, and any constants/enums used only by the selector.
   - Make sure no other component references the deleted state.

4. **Move "Use this image" button to ABOVE the map**:
   - Find the JSX where the button currently renders (likely below the `<img>` tag for the map snapshot).
   - Move it so it renders BEFORE the map image in the DOM order.
   - Keep all existing behavior (the click handler, disabled state, label).
   - Adjust spacing/margins so it looks clean above the map (likely `mb-2` or similar on the button).

5. **Remove the GPS coordinates display**:
   - Find the element displaying the current map center as `(lat, lng)` or `12.345, -67.890` or similar.
   - Delete it entirely.
   - Remove any associated state variables, formatters, or helper components that ONLY existed to display GPS coordinates.

6. **Verify the address autocomplete + map navigation still works**:
   - The Google Places autocomplete (or address entry input) should remain functional.
   - When user enters an address, the map should still center on it.
   - The captured snapshot URL should still get the hybrid type.

## Files likely involved

- `src/components/calculator-v3/PropertyMapSidebar.tsx` or `PropertyMap.tsx` (primary)
- Possibly `src/lib/maps/staticMapUrl.ts` (if map URL construction is centralized)
- Tests under `src/components/calculator-v3/` for PropertyMap behavior

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- `canonicalAdapter.ts` public function signatures
- `canvasEngine.ts` public types
- Maps Static API key handling (just change the maptype parameter)
- The capture-snapshot logic that writes the image to canvas state
- `package.json` beyond strictly necessary

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual on Netlify preview:
  1. Open the property map sidebar (mobile or desktop)
  2. Enter an address (e.g., "123 Main St, Sydney")
  3. Map renders as hybrid: satellite background + visible street names + house numbers (visible at appropriate zoom levels)
  4. No map type selector UI is present
  5. "Use this image" button is ABOVE the map (visible without scrolling)
  6. No GPS coordinate display anywhere on the sidebar
  7. Tapping "Use this image" still captures the snapshot and transfers it to the canvas tab

New tests:
- PropertyMap renders without the map type selector
- Maps Static URL uses `maptype=hybrid`
- "Use this image" button renders before the map img in DOM order

## Manual reproduction (for PR description)

1. Open `npm run dev`, navigate to `/fence-calculator`
2. Enter an address in the sidebar autocomplete
3. Verify hybrid map (street names + house numbers visible)
4. Verify no map type selector buttons/dropdown
5. Verify "Use this image" is above the map
6. Verify no GPS coordinates anywhere

## Risk

**LOW** — UI cleanup in a single component. No state model changes, no API surface changes. The biggest risk is accidentally breaking the snapshot capture flow when restructuring the JSX — mitigated by running the existing PropertyMap tests.

## Note on label density

If after testing, the hybrid view shows too many road labels (cluttery), we'll add a follow-up brief with custom Maps Static API styling to hide minor roads (`&style=feature:road.local|element:labels|visibility:off`). For now, plain hybrid is the closest match to "satellite with addresses."
