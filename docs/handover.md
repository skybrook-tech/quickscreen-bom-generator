# Context Handover Document — AnyFence Platform Expansion

This document serves as the single source of truth for transferring state, accomplished tasks, and next steps to the next conversation thread.

---

## 1. Current Status

We have successfully completed the implementation of the **AnyFence Platform Expansion** features (including tiered supplier pricing, consumer postcode checks, visually drawing map runs, walk-through video uploads, and the visual description parsing builder wizard).

Key achievements:
- **Database Migration Applied**: Applied migration [`050_anyfence_install_pricing.sql`](file:///c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/supabase/migrations/050_anyfence_install_pricing.sql) to add tables `pricing_tiers`, `contractor_install_rates`, and quote metrics to the remote Supabase database.
- **Contractor Embed Quoting Portal**: Implemented the customer-facing `/embed/:contractorSlug` page enabling postcode serviced checks, interactive map layout drawings, drag-and-drop walk-through video uploads, and Supply & Install pricing breakdowns.
- **Tiered Discounts & Installation Rates**: Integrated queries inside [`CalculatorV3Page.tsx`](file:///c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/src/pages/CalculatorV3Page.tsx) to resolve and apply category-level overrides and base trade discounts, dynamically show install rates/directories, and hide the Bunnings integration toggle for retail visitors.
- **Visual Calculator Builder Wizard**: Created the 3-step walk-through configuration wizard inside [`CalculatorBuilderWizard.tsx`](file:///c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/src/components/calculator-builder/CalculatorBuilderWizard.tsx) with a regex-based description parser that pre-fills fencing dimensions, colors, gaps, and posts from plain text conversation strings.

---

## 2. Modified Files

| File | Status | Description |
|---|---|---|
| [`supabase/migrations/050_anyfence_install_pricing.sql`](file:///c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/supabase/migrations/050_anyfence_install_pricing.sql) | **New** | Adds `pricing_tiers`, `contractor_install_rates` tables and quotes schema updates. |
| [`src/App.tsx`](file:///c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/src/App.tsx) | **Modified** | Registers new embed routes (`/embed/:contractorSlug`, `/embed`). |
| [`src/context/ProfileContext.tsx`](file:///c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/src/context/ProfileContext.tsx) | **Modified** | Exposes the user profile's `pricing_tier` setting to children. |
| [`src/pages/CalculatorV3Page.tsx`](file:///c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/src/pages/CalculatorV3Page.tsx) | **Modified** | Implements contractor tiered discount calculations, installation saving, and contextual Bunnings toggle hiding. |
| [`src/pages/ContractorEmbedQuotePage.tsx`](file:///c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/src/pages/ContractorEmbedQuotePage.tsx) | **New** | Homeowner public estimate page with postcode verification, map drawing, video dropzone, and supply & install cost estimates. |
| [`src/pages/ContractorPortalPage.tsx`](file:///c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/src/pages/ContractorPortalPage.tsx) | **Modified** | Exposes preview links allowing contractors to test their public embed portal page. |
| [`src/components/calculator-builder/CalculatorBuilderWizard.tsx`](file:///c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/src/components/calculator-builder/CalculatorBuilderWizard.tsx) | **New** | 3-step walkthrough builder wizard with description parsing pre-fill. |
| [`src/pages/CalculatorBuilderPage.tsx`](file:///c:/Users/Liam/Documents/GitHub/quickscreen-colorbond-bom-generator/src/pages/CalculatorBuilderPage.tsx) | **Modified** | Links header launcher button to trigger the Builder Wizard component. |

---

## 3. Active Technical Context

### Environment & Remote Database
- **Local Dev Server**: Vite dev server can be started in your terminal via:
  ```powershell
  $env:PATH += ";C:\Program Files\nodejs"
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  npm run dev
  ```
  Runs at: **`http://localhost:5173/`**
- **Supabase Credentials**: Front-end is configured in `.env.local` to connect to the remote Supabase project `https://pmgfbvpiozvpezmtqhuz.supabase.co`.
- **Database Seeding**: Seeding auth credentials can be refreshed using:
  ```powershell
  & "C:\Program Files\nodejs\node.exe" supabase/seeds/seed-auth.js
  ```

### Default Login Accounts (Test / QA)
* **Admin / Promoter Account**:
  * Email: `admin@glass-outlet.com`
  * Password: `123456`
* **Contractor Account**:
  * Email: `test@glass-outlet.com`
  * Password: `123456`

*(Note: Navigate to `/builder` or `/contractor` manually in the address bar once logged in to access the respective dashboards).*

---

## 4. Next Steps

1. **Deploy & Manually Verify Embed Flow**: 
   - Open `/embed/skybrook-fencing` in your browser.
   - Enter contact details and postcode `4000` (verified range) to unlock the design sections.
   - Draw runs on the map canvas, upload a walk-through video, and confirm the computed Materials + Labor install calculations match the target contractor rates.
2. **Onboard Custom Install Rates for Test Contractors**:
   - Write custom rows in `contractor_install_rates` linking test contractor profile IDs to system instances (horizontal-slat, vertical-slat) to verify custom rates map correctly to estimates.
3. **Verify Wizard Conversational Parser**:
   - Launch the builder wizard on the `/builder` page.
   - Test various descriptive prompts in the text parser box (e.g., *"Need a 1800mm high Monument horizontal slat fence with 9mm gaps concreted in ground"*).
   - Ensure the extracted tokens correctly pre-hydrate form fields.
