# 024 — Voice + AI input fixes (mic button persistence, AI fuzzy-match parsing)

Branch: `codex/brief-024-voice-ai-fixes`
Target: PR base branch MUST be `master`. Confirm before submitting.

**Depends on**: brief 017 (PR #51) merged.

Use npm 10.x if package-lock.json needs touching.

## Goal

Fix two pain points with voice/AI input:
1. **Microphone button disappears after first use** — tradies tap mic, dictate one measurement, then the button is gone for the rest of the session
2. **AI measurement parsing is brittle** — fuzzy/conversational measurements ("about 6 meters", "six and a half", "6m 50") often fail to parse, forcing tradies back to typing

## What to implement

### A. Microphone button persistence

1. Audit the microphone button component. Likely in a voice-input wrapper component or directly in the Job tab.
2. Identify the cause of disappearance. Probable causes (verify which):
   - State variable like `hasUsedMic` flips true and a conditional render hides the button afterward
   - Web Speech API event handler unmounts the component on `onend`
   - A cleanup effect (`useEffect` return) removes the button when it shouldn't
3. Fix so the button persists across multiple uses. After dictation ends:
   - Button returns to idle state (icon back to default)
   - User can tap again immediately to dictate another field
4. Make sure repeated use doesn't leak event listeners (proper cleanup in `useEffect`).

### B. AI parsing fuzzy-match for measurements

5. Find the AI parsing service (likely `src/services/aiParser.ts`, `src/lib/measurementParser.ts`, or invoked from a Supabase edge function).
6. Improve robustness for common Australian-tradie-spoken-measurement patterns:
   - "six meters" / "6 meters" / "6m" / "6.0m" / "six metres" → 6.0
   - "six and a half meters" / "6 and a half meters" → 6.5
   - "six point five" / "6.5m" → 6.5
   - "six fifty" / "6m 50" / "6.5m" (ambiguous — document chosen interpretation) → 6.5 (treating "6 50" as 6m + 50cm)
   - "about six meters" / "roughly 6m" / "around six" → 6.0 (strip filler words "about", "roughly", "around", "approximately")
   - Plain numbers like "6" or "six" (no unit) → 6.0 (assume meters, the dominant unit)
7. **Test fixtures**: add unit tests in `src/services/aiParser.test.ts` (or wherever the existing tests for this live) with at least 10 of the above patterns as cases.
8. **Fallback behavior**: if parsing fails (unrecognized phrase), return `null` or an explicit "unparseable" sentinel — do NOT silently substitute 0 or a default. The UI should then prompt "Couldn't understand — please type the measurement".
9. **Locale**: keep the parser in en-AU. Do not introduce other locales in this brief.

## Files likely involved

- Microphone button: search for "mic", "microphone", "speech", "Web Speech" in `src/components/`
- AI parser: search for "parser", "parseMeasurement", "aiParse" in `src/services/`, `src/lib/`, `supabase/functions/`
- Tests: `src/services/aiParser.test.ts` or equivalent

## Constraints

DO NOT change:
- `src/lib/localBomCalculator.ts`
- BOM calculation logic
- `canonicalAdapter.ts`
- Canvas files (unrelated)
- `package.json` unless a parsing library is strictly necessary (avoid — pure regex should suffice for these patterns)
- The Web Speech API integration itself (only fix the button-disappearance bug; the speech recognition logic is fine)

## Acceptance criteria

- `npm run typecheck/test/build` pass
- `localBomCalculator.test.ts` passes UNCHANGED
- Manual:
  1. Tap mic → dictate "6 meters" → number is parsed as 6.0 → tap mic again → button is present → dictate another measurement
  2. Repeat 5 times in a row — button never disappears
  3. Dictate fuzzy phrases from the brief list → all parse correctly
  4. Dictate gibberish ("banana") → graceful failure, UI prompts for manual entry, no silent 0 substitution
- Network errors during AI parse → graceful error toast, no crash

New tests:
- At least 10 fuzzy-match measurement patterns parse correctly
- Mic button component re-renders correctly after `onend` event fires
- Mic button event listeners are cleaned up on unmount (no memory leak)
- Unparseable phrase returns null / sentinel (not 0)

## Manual reproduction (for PR description)

1. Open `npm run dev`, go to `/fence-calculator`, Job tab
2. Tap mic icon → dictate "six and a half meters" → confirm value populates as 6.5
3. Tap mic again → confirm button visible → dictate "about 4 metres" → confirm 4.0
4. Do this 5x in a row → button persists

## Risk

**LOW-MEDIUM** — Web Speech API behavior varies across browsers. Mitigations:
- iOS Safari Web Speech support is limited; this brief does NOT add new platform support, only fixes the existing button bug
- AI parsing is server-side (or pure function) — easy to add unit tests for fuzzy patterns without browser involvement
- Graceful failure for unparseable input prevents silent data corruption
