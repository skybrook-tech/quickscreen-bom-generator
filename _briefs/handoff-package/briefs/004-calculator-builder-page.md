# Handoff 004 — Calculator Builder page (embeds Build Forge agent)

**Depends on:** nothing in this handoff (can run parallel to 001-003)
**Implements:** `wireframes/02-calculator-builder-v1.html`
**Target route:** `/builder` and `/builder/:instanceId`
**Target file:** Replace body of `src/pages/CalculatorBuilderPage.tsx` (Atlas's existing 45KB scaffolded version is likely V3-style — replace, don't extend)

## Goal

Build the React page that hosts the **Build Forge** wizard agent. Build Forge is a Hyperagent agent (already saved in Liam's library, system prompt in `reference/build-forge-agent-spec.md`). This brief builds the chat-driven page that embeds it — used by Amazing Fencing (and future suppliers) to build their own calculators in ~20 minutes.

**This brief is NOT about building the agent itself.** The agent exists as a Hyperagent agent. This brief is about the React surface that connects to it via the Hyperagent webhook/API.

## What to build

### Page shell

Layout: chat-first, with live preview alongside

- **Top header**: Anyfence brand + "Calculator Builder" context tag + supplier-name pill (auto-populates as build progresses) + user avatar
- **Progress bar across top**: 6 steps — Start / Brand / Catalogue / Variations / Test / Publish. Active step in ember; done steps in success-green; upcoming in grey.
- **Main body — two columns**:
  - **Left (~50%)**: chat panel with Build Forge
  - **Right (~50%)**: live preview pane showing the supplier's calculator as it builds

### Chat panel (left)

- Header band: Build Forge avatar (BF mark, ember) + "Build Forge" + status pill ("• ready" / "• Working" / "• Asking")
- **Messages area**: scrollable, with rich content types
  - BF messages (left-aligned, BF avatar, white bubble)
  - User messages (right-aligned, user avatar, beige bubble)
  - **Rich content embedded in BF bubbles**:
    - `chat-chips` for quick-reply options ("Tweak existing" / "Build from scratch")
    - `upload-zone` for file uploads (Cin7 xlsx, PDF, photo, URL)
    - `upload-file` for files the user has uploaded (filename + size + ✓)
    - `chat-card` for structured content (catalogue mapping table, formula card, compliance card, recap card)
    - `confirm-row` for explicit yes/no decisions
    - `formula-card` for the BOM-math translation moments (navy block with plain-English + IBM Plex Mono formula)
- **Input bar at bottom**: text input + Send button. Below input: small "or type your answer here" placeholder hint.

### Live preview pane (right)

Renders the supplier's calculator as it's being configured:

- Top header: device toggle (🖥️ Desktop / 📱 Mobile) + "Customer preview" label
- Body: renders a miniature version of the entry-page calculator (similar to a thumbnail, but interactive)
- Updates progressively as the supplier configures branding, products, variations
- "DRAFT — NOT PUBLISHED" watermark in the corner until publish

### Connecting to Build Forge

The chat panel is the React frontend for a Hyperagent agent. Implementation options (pick whichever Hyperagent provides):

1. **Webhook**: User message → POST to Hyperagent webhook for Build Forge → response streams back to UI
2. **Direct API**: Use Hyperagent's REST/streaming API to invoke Build Forge with user messages

The Build Forge agent's system prompt + tool config are already saved in Liam's Hyperagent library. **You don't configure the agent.** You build the React wrapper that talks to it.

If Hyperagent's integration mechanism isn't documented in the repo yet, stop and surface to Liam — don't guess.

### Stub the 6 wizard stages

The wireframe shows 6 stages of the conversation. The React frontend doesn't hardcode these — Build Forge drives the conversation. But the frontend SHOULD:

- Update the progress bar based on Build Forge's signals (Build Forge sends a `step_changed` event when it moves)
- Render the rich content types in BF's messages (chips, upload-zone, structured cards, formula cards, etc.)
- Persist the conversation state so a supplier can resume mid-build
- Show the live preview pane as Build Forge updates it (e.g. "supplier just picked their brand colour" → preview header updates)

## Files to modify / create

- `src/pages/CalculatorBuilderPage.tsx` — replace Atlas's existing body (audit it first; salvage anything useful)
- New components: `src/components/builder/BuildForgeChat.tsx`, `ChatMessage.tsx`, `ChatChips.tsx`, `UploadZone.tsx`, `MappingTable.tsx`, `FormulaCard.tsx`, `ComplianceCard.tsx`, `RecapCard.tsx`, `ConfirmRow.tsx`, `LivePreviewPane.tsx`
- New hook: `src/hooks/useBuildForge.ts` — manages the chat connection to the agent
- `src/App.tsx` — confirm `/builder` and `/builder/:instanceId` routes exist (Atlas added them; verify they point to the new page body)

## Files NOT to modify

See `reference/protected-paths.md`.

## Acceptance criteria

1. Navigate to `/builder` while logged in as Amazing Fencing → see the page shell load
2. Build Forge sends its first greeting in the chat panel within 2 seconds
3. Click a quick-reply chip ("Tweak existing fence type") → message appears in user-bubble form on the right side of chat, Build Forge responds
4. Upload a sample xlsx file → see the upload-file preview appear in the user message, Build Forge starts the catalogue-mapping flow
5. Build Forge sends a `chat-card` with a mapping table → the table renders inline
6. Build Forge sends a `formula-card` (the diagonal-palings moment) → navy block renders correctly
7. Confirm row buttons (Yes / No) work end-to-end
8. Progress bar updates as Build Forge moves between stages
9. Live preview on the right updates as the supplier configures their brand
10. Refresh the page mid-conversation → state persists (conversation resumes from where it left off)

## What's deliberately out of scope

- The Build Forge agent's prompt + tool config (already exists in Liam's Hyperagent library)
- The "Build from scratch" path (the wireframe shows "Tweak existing"; brand-new archetypes are a separate brief)
- Edit-an-existing-calculator flow (separate brief)
- Mobile layout (separate brief)
- Calculator publishing workflow (`system_instances` row creation + price-book versioning is partially Atlas's work in migrations; verify what exists)

## Reference

- Wireframe: `wireframes/02-calculator-builder-v1.html` — all 6 stages
- Build Forge agent spec: `reference/build-forge-agent-spec.md`
- Canonical name contract: `reference/canonical-name-contract.md`
- Protected paths: `reference/protected-paths.md`
