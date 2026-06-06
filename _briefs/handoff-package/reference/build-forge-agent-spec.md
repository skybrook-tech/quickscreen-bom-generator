# Build Forge — agent reference

**Build Forge is a Hyperagent agent saved in Liam's library.** You're not building it — you're building the React page (Brief 004) that embeds it. This document explains what Build Forge does, so you know what behaviour the React UI needs to support.

## What Build Forge is

A patient, plain-language wizard that helps fence suppliers and contractors build their own Anyfence calculators in about 20 minutes. It translates plain-English fence knowledge ("I do palings on a 45 diagonal") into the canonical config the platform engine consumes.

## Who Build Forge talks to

Australian fence suppliers and contractors. Non-technical. They know fence construction inside out. They do NOT know what "canonical product name" or "cuts_per_run formula" means — and they shouldn't have to.

## The two starting paths

At the start of every conversation, Build Forge asks:

1. **"Tweak an existing fence type"** → supplier picks a base archetype (Timber Paling, Colorbond, Pool Glass, Aluminium Slat, Chain Wire, Picket, Hardwood, Tubular) and only tells you what's different. Faster path. Default recommendation.
2. **"Build a brand new fence type from scratch"** → no base. Longer path. For genuinely new archetypes (e.g. retaining-wall fences, brushwood).

## The 6-stage wizard sequence

Build Forge drives the customer through these stages. The React page (Brief 004) shows the progress in a top bar but does NOT hardcode the stages — Build Forge emits a `step_changed` event when it moves.

1. **Start** — path picker (Tweak existing or Build from scratch)
2. **Brand** — supplier name, slug, logo, accent colour, install policy
3. **Catalogue** — upload price list (Cin7 xlsx, CSV, PDF, photo, URL, or manual), parse into canonical structure
4. **Variations** — what dropdowns/options appear on the supplier's calculator (heights, paling widths, post materials, etc.)
5. **Test** — run a worked example through the new config, supplier confirms it matches what they'd quote
6. **Publish** — preview URL → publish to `/s/{supplier_slug}/calculator/{instance_slug}`

## Rich content types Build Forge emits

The React chat panel needs to render these:

| Content type | Used when | What it looks like |
|--------------|----------|-------------------|
| Text bubble | Default conversation | White rounded card with text |
| Quick-reply chips | Multiple-choice questions | Row of pill buttons under the message |
| Upload zone | Asking for a file | Dashed ember-orange drop-zone in the message |
| Uploaded file | Confirming a file has been received | Compact card with icon + filename + size + ✓ |
| Mapping table | Confirming catalogue mapping | Structured table with canonical name + SKU + price + status pill (OK / CHECK / NEW) |
| Formula card | Translating BOM math | Navy card with plain-English description + IBM Plex Mono formula |
| Compliance card | Surfacing applicable rules | Coloured card (green = OK, amber = warn, red = block) |
| Recap card | Showing what's been captured so far | Structured key-value grid |
| Confirm row | Explicit yes/no decisions | Two buttons (Yes that's right / No, let me fix it) |

## What Build Forge will NEVER do

- Rename a canonical product name (these are a versioned contract)
- Let a `block_quote` compliance rule be silently disabled
- Publish without showing the supplier the final config first
- Use jargon without translating it
- Invent BOM math for a domain it doesn't understand — surfaces to Fence Forge instead

## Coordination with Fence Forge

Fence Forge owns the platform-side canonical-name calculator skills (one per archetype). Build Forge owns the supplier-side wizard. When Build Forge runs into an edge case:

- **New canonical names** → it proposes them with a version-bump notation, but they go through Fence Forge before becoming part of the contract
- **Brand-new archetypes** → it scaffolds the supplier-side instance, but the underlying archetype skill is Fence Forge's responsibility
- **BOM math kernel changes** → file a ticket for Fence Forge

The React page (Brief 004) doesn't need to know about Fence Forge. Build Forge handles the coordination internally.

## Tools Build Forge has

(For your awareness — these are Build Forge's tools, not the React page's responsibilities.)

- File tools (Read/Write/Edit/Bash) for working on calculator.py scripts and config JSON
- BrowserSession + family for supplier websites and price-list PDFs
- ExaSearch / ExaContents / ExaResearch for researching new fence types
- AskQuestion (primary wizard interaction tool)
- SearchKnowledge / GetKnowledgeDetails / FetchSkillScripts / RunWithCredentials for existing skills
- CreateSkill / UpdateSkillAndScripts for publishing new fence-type skills
- CreateDocument / UpdateDocument for spec docs per supplier-instance
- CreateMemory / UpdateMemory for supplier-specific facts
- CreateTable / AddTableRows / GetTable / ExportTable for catalogue tables
- SearchIntegrations / ExecuteIntegration for connecting to supplier inventory systems (Cin7, Xero, etc.)
- GenerateImage for fence-type illustrations
- PublishWebpage for calculator-preview pages

## Outputs of every successful Build Forge build

1. Published `fence_system_config.json` that validates against the schema
2. `system_instance` row in Postgres (supplier_id + archetype_id + slug)
3. Price book pinned to a version
4. Spec document recording the supplier's intent + custom math
5. Preview URL the supplier can share with their team before going live
6. (Optional) `calculator.py` if the BOM math diverges from the base archetype

## API integration (for Brief 004)

The React page connects to Build Forge via Hyperagent's webhook/API. Implementation details depend on Hyperagent's integration spec — if the integration mechanism isn't documented in the repo yet, surface to Liam.

Suggested events the React page should handle:
- `bf_message` — incoming text + rich content from Build Forge
- `bf_step_changed` — Build Forge moved to a new wizard stage (update progress bar)
- `bf_preview_updated` — supplier's calculator config changed (update live preview pane)
- `bf_thinking` — Build Forge is processing (show typing indicator)

Suggested events the React page sends:
- `user_message` — supplier typed a message
- `user_chip_clicked` — supplier clicked a quick-reply chip
- `user_file_uploaded` — supplier dropped a file in the upload-zone
- `user_confirmed` / `user_denied` — supplier clicked Yes/No on a confirm-row
