---
name: natural-language-product-configurator
description: Pattern for building natural-language input that configures a product (fence, roof, deck, etc.). Covers hard-coded regex parser (v1), LLM parser (v2), and sketch-upload (v3) — progressive enhancement without changing the UI.
---

# Natural Language Product Configurator

## The Pattern

Tradies and customers describe jobs in prose before clicking through forms: "30m of 1.8m aluminium slat fence in Monument with one pedestrian gate." Capture that prose and pre-fill the calculator.

## Three-Version Progressive Enhancement

### v1: Hard-coded regex parser (no AI, no API costs)
- Pure TypeScript regex + heuristic matching
- Deterministic: same input always produces same output
- Works offline, zero latency, zero cost
- Handles 80-90% of common descriptions

### v2: LLM parser (behind feature flag)
- Same input/output schema as v1
- Sends description to an LLM (GPT, Claude, etc.) with a structured prompt
- Handles edge cases, typos, ambiguous descriptions
- Falls back to v1 if API is unavailable

### v3: Sketch upload (vision)
- User uploads a photo of a hand-drawn sketch or property plan
- Vision model extracts layout, dimensions, fence type
- Same output schema as v1/v2
- Most complex, highest capability

**Key principle:** All three versions produce the same output schema. The UI doesn't change. You swap the parser implementation behind the scenes.

## v1 Parser Architecture

### Input → Output Schema

```typescript
interface ParsedFence {
  totalLength?: number;        // metres
  height?: number;             // mm
  systemType?: string;         // QSHS | VS | XPL | BAYG
  colour?: string;             // colour name
  slat_size?: number;          // mm (65 or 90)
  gap_size?: number;           // mm
  gates: Array<{
    type: "pedestrian" | "double" | "sliding";
    width?: number;            // mm
    position?: "centre" | number;  // centre or distance from start
  }>;
  post_mounting?: string;
  confidence: number;          // 0-1, how much of the input was parsed
  unparsed_fragments: string[]; // parts the parser couldn't interpret
}
```

### Parser Pipeline

1. **Normalize:** lowercase, strip extra whitespace, expand abbreviations ("m" → "metres", "ped" → "pedestrian")
2. **Extract measurements:** regex for `\d+\.?\d*\s*(m|mm|metres?|feet?)` — classify as length vs height by magnitude (>100 = mm height, <100 = m length)
3. **Extract colour:** match against a colour alias table (e.g. "monument" → "Monument", "black" → "Black Satin", "charcoal" → "Charcoal")
4. **Extract system type:** keyword matching ("horizontal slat" → QSHS, "vertical" → VS, "xpress" → XPL, "build as you go" → BAYG)
5. **Extract gates:** regex for gate patterns ("one gate", "2 pedestrian gates", "3m sliding gate", "double gate")
6. **Extract slat/gap size:** match against known values (65mm, 90mm for slats; 5mm, 9mm, 12mm for gaps)
7. **Compute confidence:** count parsed tokens / total tokens

### Colour Alias Table (example for fencing)

```typescript
const COLOUR_ALIASES: Record<string, string> = {
  "black": "Black Satin",
  "black satin": "Black Satin",
  "monument": "Monument",
  "charcoal": "Charcoal",
  "woodland grey": "Woodland Grey",
  "grey": "Woodland Grey",
  "gray": "Woodland Grey",
  "basalt": "Basalt",
  "dune": "Dune",
  "paperbark": "Paperbark",
  "cream": "Paperbark",
  "white": "Surfmist",
  "surfmist": "Surfmist",
  // ... full alias table from supplier catalogue
};
```

### Test Corpus

Build a test corpus of 10-15 descriptions covering:
- Simple: "30m of 1.8m fence in black"
- With gates: "25m fence with one pedestrian gate and one double gate"
- Mixed units: "40 metres of 1800mm high fence"
- Colour aliases: "monument" vs "Monument" vs "dark grey"
- System hints: "horizontal slat" vs "quickscreen" vs "QSHS"
- Edge cases: "just a gate" (no fence length), "fence around the pool" (no specifics)
- Garbage: "lorem ipsum" (should return low confidence)

Every test case should have an expected output. Run the full corpus on every parser change.

## UI Component: DescribeFenceBox

### Two states
1. **Collapsed:** a message icon button (compact, visually subtle)
2. **Expanded:** text area + Apply button

### Flow
1. User clicks the message icon → text area appears
2. User types description → clicks "Apply"
3. Parser runs → settings applied to calculator
4. Text area collapses back to icon
5. User can click icon again to modify

### Optional: mic button
Web Speech API for voice input. Falls back to text-only on unsupported browsers. The mic icon sits inside the text area (top-right corner).

### Direct-apply (skip preview)
v1 used a preview step showing parsed chips. This was removed — direct-apply is faster and the parser's output is visible in the sidebar settings. If the parser got something wrong, the user edits the setting directly.

## Height Snap-to-Catalogue

When the parser extracts a height (e.g. "1.8m" = 1800mm), snap to the nearest valid catalogue height rather than using the exact value. Valid heights are determined by slat count × (slat size + gap) - gap + rail allowance. "1800mm" might snap to "1818mm" (25 slats of 65mm + 9mm gap).

## Gate Auto-Placement

When the parser extracts gates but no position is specified, place them at the centre of the section. If multiple gates, distribute evenly.
