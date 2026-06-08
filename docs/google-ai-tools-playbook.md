# Google AI Tools Playbook: Anyfence Development & Rollout

This guide outlines how to leverage your **Google AI Ultra** plan to accelerate the development, data onboarding, and B2B outreach campaigns for Anyfence.

---

## 1. Google AI Studio (Gemini 1.5 Pro)
**Primary Purpose:** Deep Code audits, Supplier Catalog Extraction, and JSON Seed Generation.

### Core Strengths
- **2-Million Token Context Window**: You can upload the *entire* Anyfence codebase, database schema migrations, and all 48 skills from the learnings bundle at once.
- **System Prompt & Structured Outputs**: Design and enforce strict JSON schemas (`product-file.schema.json`) on Gemini's output for seed files.

### Actionable Workflows
1. **Catalog Mapping (Build Forge Engine)**:
   - **How**: Upload a supplier's PDF price catalog or product manual (e.g., Stratco's Colorbond pricing sheet).
   - **Prompt**: *"Using the `product-file.schema.json` schema and the `quickscreen-seed-data-conventions` rules, convert this PDF catalog into a verified seed JSON file. Map all component dimensions, finishes, and prices."*
2. **Codebase-Wide Refactoring**:
   - **How**: Upload your database migrations and edge function code.
   - **Prompt**: *"Analyze our multi-tenant database schema (`org_id` scopes) and verify that our `bom-calculator` edge function resolves and applies correct trade pricing based on profiles.role and user_org_id."*

---

## 2. NotebookLM
**Primary Purpose:** A private, grounded research assistant for Australian fencing compliance, regional database lookup, and product rules.

### Core Strengths
- **Source-Grounded Answering**: Only answers based on the documents you upload (PDFs, Markdown, links), eliminating AI hallucination.
- **Audio Overviews**: Generates professional, podcast-style summaries of complex technical and strategic documents.

### Actionable Workflows
1. **Compliance Sandbox**:
   - **How**: Create a notebook and upload Australian Standards `AS1926.1-2012` (pool barriers) and `AS3959-2018` (BAL bushfire).
   - **Use Case**: Instantly query compliance boundaries: *"What are the gate latch height restrictions under AS1926.1?"* or *"Generate validation warning messages for fences inside BAL-FZ zones."*
2. **Strategic Outreach Sync**:
   - **How**: Upload the `b2b-tiered-cold-outreach-playbook` and the `anyfence-strategic-playbook`.
   - **Use Case**: Generate interactive study guides or summary sheets on how to pitch Anyfence to Tier A manufacturers.
3. **Audio pitches for Partners**:
   - **How**: Generate an "Audio Overview" (podcast) based on your `PROJECT-OVERVIEW.md` and Amazing Fencing brief. Use this audio file to give your team or pilot contacts an instant, engaging brief on the Anyfence ecosystem.

---

## 3. Gemini in Google Workspace (Docs, Sheets, Slides, Gmail)
**Primary Purpose:** Pricing data cleaning, and personalized B2B outreach emails.

### Actionable Workflows
1. **Gemini in Sheets**:
   - **Use Case**: Clean raw supplier Excel spreadsheets. Standardize column names (SKU, Finish, Description, Price Ex GST) and automatically compute standard package/carton quantities using formulas mapped from the `cartonQuantities.ts` logic.
2. **Gemini in Gmail / Docs**:
   - **Use Case**: Draft personalized cold outreach emails directly inside your inbox. Highlight your 3-channel distribution model and the neutral data-layer approach, targeting Tier A decision-makers (like Robert Evans at BlueScope or Adam Barrack at Oxworks) using templates from your B2B outreach playbook.

---

## 4. Imagen 3 & Google Veo
**Primary Purpose:** App visual assets, installer diagrams, and onboarding video mockups.

### Actionable Workflows
1. **Isometric Product Mockups**:
   - **Prompt (Imagen 3)**: *"Minimalist 3D isometric render of a modern matte charcoal Colorbond steel fence panel, clean vector style, transparent background, studio lighting, high resolution."*
   - **Use Case**: Use these assets directly inside the product picker UI or customer configuration forms.
2. **Installer Video Storyboards**:
   - **Use Case**: Generate video clips demonstrating gate installation or layout measurements to link in the PDF/printed BOM QR cards.
