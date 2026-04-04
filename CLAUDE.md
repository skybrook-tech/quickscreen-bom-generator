# QuickScreen BOM Generator — Architecture & Development Guide

> **Purpose**: This document is the single source of truth for Claude Code (or any developer) working on the QuickScreen BOM Generator rewrite. It describes the existing application, the target architecture, every component, data model, business rule, and implementation constraint.

---

## 1. Project Overview

### What This App Does

QuickScreen is a **Bill of Materials (BOM) generator** for aluminium slat screening/fencing systems. It is built for **The Glass Outlet** (a fencing supplier) and branded under **SkybrookAI**.

The app allows staff and trade customers to:

1. **Draw a fence layout** on a canvas (with optional Google Maps satellite underlay)
2. **Configure fence specifications** — system type, length, height, slat size, gap, colour, posts, corners
3. **Configure gates** — swing/sliding, dimensions, hardware (hinges, latches), posts
4. **Generate a priced BOM** — every post, rail, slat, bracket, screw, and accessory with quantities and pricing
5. **Export quotes** — print, CSV, clipboard, saved quotes per user

> **Deferred to v2**: AI job description parsing (natural language → form fill) and AI BOM review (Claude sanity check on generated BOM). The edge function stubs and UI hooks for these features should NOT be built in v1.

### Current State

- **Single monolithic HTML file** (~6000+ lines) hosted on GitHub Pages (public repo)
- All business logic (BOM calculations, pricing, panel layout algorithms) is client-side JavaScript
- Authentication is cosmetic (no real backend)
- Pricing data and margin structures are fully exposed in the source code
- Uses localStorage for saved quotes and API keys

### Target State

- **React + Vite** SPA with **Tailwind CSS**
- **Supabase** backend: Auth, Postgres DB, Edge Functions
- **TanStack Query** for server state management
- **React Context + useReducer** for client state (fence config, UI state)
- **All pricing and BOM calculation logic moved to Supabase Edge Functions** (IP protection)
- **Private GitHub repo**, deployed to Vercel or similar

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | React 18+ with Vite | SPA build tooling, HMR, fast dev |
| Styling | Tailwind CSS 3 | Utility-first CSS, matches existing dark UI theme |
| Server State | TanStack Query v5 | Caching, mutations, optimistic updates for all Supabase calls |
| Client State | React Context + useReducer | Fence config, gate list, UI accordion/modal state |
| Auth | Supabase Auth | Email/password, session management, RLS |
| Database | Supabase Postgres | Quotes, customers, pricing tiers, product catalog |
| Edge Functions | Supabase Edge Functions (Deno) | BOM calculation, pricing — **all sensitive IP here** |
| Forms | React Hook Form + Zod | Complex fence/gate forms with conditional validation |
| Canvas | Vanilla JS (ported from existing app) | Fence layout drawing tool — wrapped in React via useRef+useEffect |
| Maps | Google Maps JS API (loaded via script tag) | Satellite underlay for fence layout |
| PDF Export | @react-pdf/renderer | Quote PDF generation |
| CSV Export | Papaparse | CSV export of BOM |
| Routing | React Router v6 | Auth pages, main app, quote viewer |
| Icons | Lucide React | Consistent icon set |

### Package Installation

```bash
# Core
npm create vite@latest quickscreen-bom -- --template react-ts
cd quickscreen-bom

# UI & Styling
npm i tailwindcss @tailwindcss/vite

# Supabase
npm i @supabase/supabase-js

# State & Data
npm i @tanstack/react-query react-hook-form @hookform/resolvers zod

# Canvas & Maps
# No additional packages — canvas tool is ported vanilla JS from the existing app.
# Google Maps is loaded via <script> tag, not an npm package.

# Export
npm i @react-pdf/renderer papaparse

# Routing & UI
npm i react-router-dom lucide-react

# Dev
npm i -D @types/react @types/react-dom typescript
```

---

## 3. Project Structure

```
quickscreen-bom/
├── public/
│   └── glass-outlet-logo.png
├── src/
│   ├── main.tsx                          # Entry point
│   ├── App.tsx                           # Router + providers
│   ├── lib/
│   │   ├── supabase.ts                   # Supabase client init
│   │   ├── queryClient.ts                # TanStack Query client
│   │   └── constants.ts                  # Colours, slat sizes, system types, etc.
│   ├── schemas/
│   │   ├── fence.schema.ts               # Zod schema for fence configuration
│   │   ├── gate.schema.ts                # Zod schema for gate configuration
│   │   ├── quote.schema.ts               # Zod schema for saved quotes
│   │   └── contact.schema.ts             # Zod schema for contact/delivery
│   ├── context/
│   │   ├── FenceConfigContext.tsx         # useReducer for fence state
│   │   ├── GateContext.tsx                # useReducer for gate list
│   │   └── UIContext.tsx                  # Accordion open/close, modals, active view
│   ├── hooks/
│   │   ├── useAuth.ts                    # Supabase auth hook
│   │   ├── useBOM.ts                     # TanStack Query mutation → edge function
│   │   ├── usePricing.ts                 # TanStack Query for pricing tiers
│   │   └── useQuotes.ts                  # CRUD for saved quotes
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx              # Main layout wrapper
│   │   │   ├── Header.tsx                # SkybrookAI + Glass Outlet branding
│   │   │   └── Footer.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── SignUpForm.tsx
│   │   │   └── AuthGuard.tsx             # Redirect if not authenticated
│   │   ├── fence/
│   │   │   ├── FenceConfigForm.tsx        # Main fence configuration form
│   │   │   ├── SystemTypeSelect.tsx       # QSHS, VS, XPL, BAYG selector
│   │   │   ├── ColourSelect.tsx           # Shared colour picker (fence + gate)
│   │   │   ├── SlatSizeSelect.tsx         # 65mm / 90mm
│   │   │   ├── SlatGapSelect.tsx          # 5mm / 9mm / 20mm
│   │   │   ├── PostMountingSelect.tsx     # Concreted / base-plated / core-drilled
│   │   │   ├── TerminationSelect.tsx      # Post vs Wall (F-section)
│   │   │   └── CornerInput.tsx            # Number of 90° corners
│   │   ├── gate/
│   │   │   ├── GateConfigPanel.tsx        # Gate configuration section
│   │   │   ├── GateForm.tsx               # Individual gate form
│   │   │   ├── GateList.tsx               # List of configured gates
│   │   │   └── GateTypeSelect.tsx         # Single swing / double swing / sliding
│   │   ├── canvas/
│   │   │   ├── FenceLayoutCanvas.tsx      # React wrapper: useRef+useEffect hosting vanilla JS canvas
│   │   │   ├── canvasEngine.ts            # Ported vanilla JS: all drawing, interaction, snap, undo logic
│   │   │   ├── CanvasToolbar.tsx           # Draw, Gate, Move, Undo, Clear tool buttons (React)
│   │   │   └── MapControls.tsx            # Google Maps load/opacity/type controls (React)
│   │   ├── bom/
│   │   │   ├── BOMDisplay.tsx             # Generated BOM table
│   │   │   ├── BOMLineItem.tsx            # Individual BOM row
│   │   │   ├── BOMSummary.tsx             # Total, pricing tier, filters
│   │   │   ├── ExtraItemsAdder.tsx        # Manual BOM additions
│   │   │   └── PricingTierSelect.tsx      # Tier 1/2/3 selector
│   │   ├── quote/
│   │   │   ├── QuoteActions.tsx           # Print, CSV, Copy, Save buttons
│   │   │   ├── SavedQuotesList.tsx        # Sidebar/modal of saved quotes
│   │   │   └── QuotePDFTemplate.tsx       # @react-pdf/renderer template
│   │   ├── contact/
│   │   │   ├── ContactDeliveryForm.tsx    # Name, phone, email, fulfilment
│   │   │   └── JobSummary.tsx             # Pre-generate summary panel
│   │   └── shared/
│   │       ├── AccordionSection.tsx        # Collapsible sections (▼/▲)
│   │       ├── FormField.tsx              # Reusable form field wrapper
│   │       ├── Select.tsx                 # Styled select component
│   │       └── Button.tsx                 # Styled button variants
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── MainApp.tsx                    # The main BOM generator view
│   │   └── QuoteViewPage.tsx             # View/print a saved quote
│   └── types/
│       ├── fence.types.ts                 # TypeScript interfaces
│       ├── gate.types.ts
│       ├── bom.types.ts
│       └── quote.types.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 001_create_organisations.sql
│   │   ├── 002_create_profiles.sql
│   │   ├── 003_create_quotes.sql
│   │   ├── 004_create_pricing.sql
│   │   └── 005_create_products.sql
│   └── functions/
│       ├── calculate-bom/
│       │   └── index.ts                   # CORE IP: BOM calculation engine
│       ├── calculate-pricing/
│       │   └── index.ts                   # CORE IP: Pricing/margin logic
│       └── _shared/
│           ├── cors.ts                    # CORS headers helper
│           ├── auth.ts                    # JWT verification helper
│           └── types.ts                   # Shared Deno types
├── .env.local                             # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
├── .env.local.example
├── tailwind.config.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 4. Data Models & Schemas

### 4.1 Fence Configuration

```typescript
// src/schemas/fence.schema.ts
import { z } from 'zod';

export const SystemType = z.enum(['QSHS', 'VS', 'XPL', 'BAYG']);

export const SlatSize = z.enum(['65', '90']);

export const SlatGap = z.enum(['5', '9', '20']);

export const Colour = z.enum([
  'black-satin',
  'monument-matt',
  'woodland-grey-matt',
  'surfmist-matt',
  'pearl-white-gloss',
  'basalt-satin',
  'dune-satin',
  'mill',
  'primrose',        // limited availability
  'paperbark',       // limited availability
  'palladium-silver-pearl',
]);

export const PostMounting = z.enum([
  'concreted-in-ground',
  'base-plated',
  'core-drilled',
]);

export const Termination = z.enum(['post', 'wall']);

export const MaxPanelWidth = z.enum(['2600', '2000']);

export const FenceConfigSchema = z.object({
  systemType: SystemType.default('QSHS'),
  customerRef: z.string().optional(),
  totalRunLength: z.number().positive('Run length must be positive'),
  targetHeight: z.number().min(300).max(2400),
  slatSize: SlatSize.default('65'),
  slatGap: SlatGap.default('9'),
  colour: Colour.default('monument-matt'),
  maxPanelWidth: MaxPanelWidth.default('2600'),
  leftTermination: Termination.default('post'),
  rightTermination: Termination.default('post'),
  postMounting: PostMounting.default('concreted-in-ground'),
  corners: z.number().int().min(0).default(0),
});

export type FenceConfig = z.infer<typeof FenceConfigSchema>;
```

### 4.2 Gate Configuration

```typescript
// src/schemas/gate.schema.ts
import { z } from 'zod';
import { Colour, SlatGap, SlatSize } from './fence.schema';

export const GateType = z.enum([
  'single-swing',
  'double-swing',
  'sliding',
]);

export const GatePostSize = z.enum([
  '50x50',
  '65x65',
  '75x75',
  '100x100',
]);

export const HingeType = z.enum([
  'dd-kwik-fit-fixed',
  'dd-kwik-fit-adjustable',
  'heavy-duty-weld-on',
]);

export const LatchType = z.enum([
  'dd-magna-latch-top-pull',
  'dd-magna-latch-lock-box',
  'drop-bolt',
  'none',
]);

export const GateSchema = z.object({
  id: z.string().uuid(),
  gateType: GateType.default('single-swing'),
  openingWidth: z.number().positive(),
  gateHeight: z.union([
    z.literal('match-fence'),
    z.number().min(600).max(2400),
  ]).default('match-fence'),
  colour: z.union([z.literal('match-fence'), Colour]).default('match-fence'),
  slatGap: z.union([z.literal('match-fence'), SlatGap]).default('match-fence'),
  slatSize: z.union([z.literal('match-fence'), SlatSize]).default('match-fence'),
  gatePostSize: GatePostSize.default('65x65'),
  hingeType: HingeType.default('dd-kwik-fit-adjustable'),
  latchType: LatchType.default('dd-magna-latch-top-pull'),
  matchFence: z.boolean().default(true),
});

export type GateConfig = z.infer<typeof GateSchema>;
```

### 4.3 BOM Line Item (returned from edge function)

```typescript
// src/types/bom.types.ts
export interface BOMLineItem {
  category: 'post' | 'rail' | 'slat' | 'bracket' | 'screw' | 'gate' | 'hardware' | 'accessory';
  sku: string;
  description: string;
  quantity: number;
  unit: 'each' | 'length' | 'pack' | 'box';
  unitPrice: number;       // ex-GST
  lineTotal: number;       // quantity × unitPrice
  notes?: string;          // e.g. "⚠ Limited colour"
}

export interface BOMResult {
  fenceItems: BOMLineItem[];
  gateItems: BOMLineItem[];
  total: number;
  gst: number;
  grandTotal: number;
  pricingTier: 'tier1' | 'tier2' | 'tier3';
  generatedAt: string;     // ISO timestamp
}
```

### 4.4 Saved Quote

```typescript
// src/types/quote.types.ts
export interface SavedQuote {
  id: string;
  orgId: string;
  userId: string;
  customerRef: string;
  fenceConfig: FenceConfig;
  gates: GateConfig[];
  bom: BOMResult;
  contact: ContactInfo;
  notes: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 5. Supabase Database Schema

### Multi-Tenancy Model

Every data table includes an `org_id` column. RLS policies ensure users only see data belonging to their organisation. This is set up now (even though v1 only has one org) to avoid a painful migration later.

A helper function `auth.user_org_id()` resolves the current user's org from their profile. All RLS policies use this function rather than duplicating the lookup logic.

### Migrations

```sql
-- 001_create_organisations.sql
CREATE TABLE organisations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,               -- URL-friendly identifier e.g. 'glass-outlet'
  logo_url TEXT,
  branding JSONB DEFAULT '{}'::JSONB,      -- v2: colours, fonts, etc.
  settings JSONB DEFAULT '{}'::JSONB,      -- v2: feature flags, defaults
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the first org
INSERT INTO organisations (name, slug) VALUES ('The Glass Outlet', 'glass-outlet');

-- No RLS on organisations — it's read by the helper function below using SECURITY DEFINER.
-- Direct client access is gated through profiles.
```

```sql
-- 002_create_profiles.sql

-- Helper function: get the current user's org_id from their profile.
-- Used by all RLS policies. SECURITY DEFINER so it can read profiles regardless of RLS.
CREATE OR REPLACE FUNCTION auth.user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organisations(id),
  full_name TEXT,
  company TEXT,
  phone TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  pricing_tier TEXT DEFAULT 'tier1' CHECK (pricing_tier IN ('tier1', 'tier2', 'tier3')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);
-- Admins/owners can view profiles in their org (for user management in v2)
CREATE POLICY "Org admins can view org profiles" ON profiles
  FOR SELECT USING (org_id = auth.user_org_id());

-- Auto-create profile on signup.
-- NOTE: The signup flow must pass org_id in user metadata.
-- For v1, default to the Glass Outlet org.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  default_org UUID;
BEGIN
  -- Use org_id from metadata if provided, otherwise fall back to Glass Outlet
  IF NEW.raw_user_meta_data->>'org_id' IS NOT NULL THEN
    INSERT INTO public.profiles (id, org_id, full_name)
    VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'org_id')::UUID,
      NEW.raw_user_meta_data->>'full_name'
    );
  ELSE
    SELECT id INTO default_org FROM public.organisations WHERE slug = 'glass-outlet';
    INSERT INTO public.profiles (id, org_id, full_name)
    VALUES (NEW.id, default_org, NEW.raw_user_meta_data->>'full_name');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

```sql
-- 003_create_quotes.sql
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_ref TEXT,
  fence_config JSONB NOT NULL,
  gates JSONB DEFAULT '[]'::JSONB,
  bom JSONB NOT NULL,
  contact JSONB DEFAULT '{}'::JSONB,
  notes TEXT DEFAULT '',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
-- Users see all quotes in their org (not just their own — staff need to see each other's quotes)
CREATE POLICY "Users can view org quotes" ON quotes
  FOR SELECT USING (org_id = auth.user_org_id());
-- Users can only insert/update/delete their own quotes
CREATE POLICY "Users can insert own quotes" ON quotes
  FOR INSERT WITH CHECK (
    org_id = auth.user_org_id() AND user_id = auth.uid()
  );
CREATE POLICY "Users can update own quotes" ON quotes
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own quotes" ON quotes
  FOR DELETE USING (user_id = auth.uid());

CREATE INDEX idx_quotes_org ON quotes(org_id);
CREATE INDEX idx_quotes_user ON quotes(user_id);
CREATE INDEX idx_quotes_created ON quotes(created_at DESC);
```

```sql
-- 004_create_pricing.sql
-- Pricing lives in DB so it can be updated without redeployment.
-- Edge functions read this table. Never exposed directly to the client.
CREATE TABLE product_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id),
  sku TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'each',
  tier1_price NUMERIC(10,2) NOT NULL,
  tier2_price NUMERIC(10,2) NOT NULL,
  tier3_price NUMERIC(10,2) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (org_id, sku)                     -- SKUs unique per org, not globally
);

-- NO RLS — only accessed by edge functions via service role key.
REVOKE ALL ON product_pricing FROM anon, authenticated;
```

```sql
-- 005_create_products.sql
-- Product catalog: slat profiles, post types, rails, brackets, hardware
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organisations(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  system_types TEXT[] DEFAULT ARRAY['QSHS'],
  colours TEXT[],
  sizes JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  active BOOLEAN DEFAULT TRUE,
  UNIQUE (org_id, sku)
);

REVOKE ALL ON products FROM anon, authenticated;
```

---

## 6. Supabase Edge Functions

### Org Scoping

All edge functions must resolve the calling user's `org_id` from their profile before querying any data. The pattern:

```typescript
// In every edge function:
const { data: { user } } = await supabaseAdmin.auth.getUser(jwt);
const { data: profile } = await supabaseAdmin
  .from('profiles')
  .select('org_id, pricing_tier')
  .eq('id', user.id)
  .single();
const orgId = profile.org_id;

// Then scope all queries:
const { data: pricing } = await supabaseAdmin
  .from('product_pricing')
  .select('*')
  .eq('org_id', orgId)
  .eq('active', true);
```

### 6.1 calculate-bom (CORE IP — most critical function)

**Endpoint**: `POST /functions/v1/calculate-bom`

**Auth**: Requires valid JWT (Supabase Auth token in Authorization header). User's `org_id` is resolved server-side from their profile — never sent by the client.

**Request body** (validated with Zod on the server):
```json
{
  "fenceConfig": { /* FenceConfig object */ },
  "gates": [ /* GateConfig[] */ ],
  "layoutSegments": [ /* optional: from canvas tool */ ]
}
```

**Response**:
```json
{
  "fenceItems": [ /* BOMLineItem[] */ ],
  "gateItems": [ /* BOMLineItem[] */ ],
  "total": 1234.56,
  "pricingTier": "tier1"
}
```

**Business logic this function must contain** (extracted from the existing app):

1. **Panel layout algorithm**:
   - Total run length divided into panels of max width (2600mm or 2000mm)
   - Panels are distributed evenly — NOT max panels + one short panel
   - Example: 10m run with 2600mm max = 4 panels of 2500mm each
   - Each panel boundary = 1 intermediate post

2. **Post calculation**:
   - Posts = panels + 1 (for a straight run with post terminations on both ends)
   - Subtract 1 for each end that is wall-terminated (F-section instead of post)
   - Add 1 for each 90° corner
   - Add gate posts separately (gate posts are additional to fence posts)

3. **Slat calculation**:
   - Number of slats per panel = floor((target_height - top_gap - bottom_gap) / (slat_height + slat_gap))
   - Total slats = slats_per_panel × number_of_panels
   - Slats come in 5800mm lengths; calculate how many slats can be cut from one length based on panel width
   - Account for offcuts / waste

4. **Rail calculation** (top rail + bottom rail per panel):
   - 2 rails per panel
   - Rails are cut to panel width
   - Rails come in stock lengths (5800mm) — calculate cuts

5. **Bracket/fixing calculation**:
   - Post brackets: 2 per post (top + bottom)
   - End caps, screws, rivets based on system type

6. **System-specific rules**:
   - **QSHS** (Horizontal Slat Screen): Standard system. Slats run horizontally, inserted into slotted posts.
   - **VS** (Vertical Slat Screen): Slats run vertically, inserted into top and bottom rails.
   - **XPL** (XPress Plus Premium): 65mm slats only (forced). Insert system — slats clip into rails. Different bracket/fixing requirements.
   - **BAYG** (Buy As You Go): Spacers are separate line items. Customer assembles themselves.

7. **Gate BOM** (separate from fence):
   - Gate frame (welded or knock-down depending on type)
   - Gate slats (always 65mm for swing gates, 65 or 90 for sliding)
   - Gate posts (sized per config: 50×50, 65×65, 75×75, 100×100)
   - Hinges (2 per single swing, 4 per double swing, track for sliding)
   - Latch hardware
   - Drop bolts for double swing
   - Guide rollers for sliding gates
   - Gate track for sliding gates

### 6.2 calculate-pricing

**Endpoint**: `POST /functions/v1/calculate-pricing`

**Auth**: Requires valid JWT

**Request body**:
```json
{
  "bomItems": [ /* BOMLineItem[] without prices */ ],
  "pricingTier": "tier1"
}
```

**Logic**:
- Resolves user's `org_id` from profile (same pattern as calculate-bom)
- Reads `product_pricing` table using service role key, filtered by `org_id`
- Matches SKUs to pricing tier
- Returns priced BOM items
- All prices are **ex-GST**
- GST is calculated at 10% (Australian GST) on the total

> **Note**: This could be merged with `calculate-bom` into a single function. Keeping them separate allows the BOM to be generated once and repriced across tiers without recalculation. Decide based on UX needs.

> **Deferred to v2**: `parse-job-description` and `review-bom` edge functions (AI-powered features). Do NOT build these in v1.

---

## 7. Constants & Reference Data

### 7.1 Colour Options

```typescript
// src/lib/constants.ts
export const COLOURS = [
  { value: 'black-satin',             label: 'Black Satin',              limited: false },
  { value: 'monument-matt',           label: 'Monument Matt',            limited: false },
  { value: 'woodland-grey-matt',      label: 'Woodland Grey Matt',       limited: false },
  { value: 'surfmist-matt',           label: 'Surfmist Matt',            limited: false },
  { value: 'pearl-white-gloss',       label: 'Pearl White Gloss',        limited: false },
  { value: 'basalt-satin',            label: 'Basalt Satin',             limited: false },
  { value: 'dune-satin',              label: 'Dune Satin',               limited: false },
  { value: 'mill',                    label: 'Mill (raw aluminium)',      limited: false },
  { value: 'primrose',                label: 'Primrose',                 limited: true  },
  { value: 'paperbark',               label: 'Paperbark',                limited: true  },
  { value: 'palladium-silver-pearl',  label: 'Palladium Silver Pearl',   limited: false },
] as const;
```

### 7.2 System Types

```typescript
export const SYSTEM_TYPES = [
  { value: 'QSHS', label: 'QSHS — Horizontal Slat Screen', description: 'Standard horizontal system' },
  { value: 'VS',   label: 'VS — Vertical Slat Screen',      description: 'Vertical slat orientation' },
  { value: 'XPL',  label: 'XPL — XPress Plus Premium',       description: '65mm only, insert/clip system' },
  { value: 'BAYG', label: 'BAYG — Buy As You Go',            description: 'Spacers sold separately' },
] as const;
```

### 7.3 Gate Hardware Options

```typescript
export const HINGE_TYPES = [
  { value: 'dd-kwik-fit-fixed',       label: 'D&D Kwik Fit — Fixed Tension' },
  { value: 'dd-kwik-fit-adjustable',  label: 'D&D Kwik Fit — Adjustable' },
  { value: 'heavy-duty-weld-on',      label: 'Heavy Duty (weld-on)' },
] as const;

export const LATCH_TYPES = [
  { value: 'dd-magna-latch-top-pull', label: 'D&D Magna Latch — Top Pull' },
  { value: 'dd-magna-latch-lock-box', label: 'D&D Magna Latch + Lock Box' },
  { value: 'drop-bolt',               label: 'Drop Bolt only' },
  { value: 'none',                    label: 'No Latch' },
] as const;

export const GATE_POST_SIZES = [
  { value: '50x50',  label: '50×50mm post',     warning: null },
  { value: '65x65',  label: '65×65mm HD post',   warning: null },
  { value: '75x75',  label: '75×75mm post',      warning: 'Confirm stock' },
  { value: '100x100', label: '100×100mm post',   warning: 'Confirm stock' },
] as const;
```

### 7.4 Validation Rules

```typescript
export const VALIDATION_RULES = {
  // XPL system forces 65mm slats
  xplForces65mmSlats: true,

  // Swing gates always use 65mm blades
  swingGateForces65mm: true,

  // 90mm slats only available for sliding gates
  slat90mmSlidingOnly: true,

  // Max recommended swing gate width
  maxSwingGateWidth: 1200,

  // Standard gate heights
  gateHeights: [900, 1050, 1200, 1500, 1800, 1950, 2100],

  // Panel width options
  panelWidths: { standard: 2600, windy: 2000 },

  // Stock lengths for cutting calculations
  stockLengths: {
    slat: 5800,   // mm
    rail: 5800,   // mm
    post: 3000,   // mm (typical, varies by height)
  },
} as const;
```

---

## 8. Context & State Management

### 8.1 FenceConfigContext

```typescript
// src/context/FenceConfigContext.tsx
type FenceAction =
  | { type: 'SET_FIELD'; field: keyof FenceConfig; value: any }
  | { type: 'SET_CONFIG'; config: Partial<FenceConfig> }  // for AI parse bulk update
  | { type: 'RESET' }
  | { type: 'LOAD_FROM_QUOTE'; config: FenceConfig };

// Reducer enforces business rules:
// - If systemType changes to 'XPL', force slatSize to '65'
// - If slatSize changes to '90' and systemType is 'XPL', reject or revert

function fenceReducer(state: FenceConfig, action: FenceAction): FenceConfig {
  switch (action.type) {
    case 'SET_FIELD': {
      const next = { ...state, [action.field]: action.value };
      // Enforce XPL → 65mm constraint
      if (next.systemType === 'XPL') next.slatSize = '65';
      return next;
    }
    // ...
  }
}
```

### 8.2 GateContext

```typescript
type GateAction =
  | { type: 'ADD_GATE'; gate: GateConfig }
  | { type: 'UPDATE_GATE'; id: string; updates: Partial<GateConfig> }
  | { type: 'REMOVE_GATE'; id: string }
  | { type: 'SET_GATES'; gates: GateConfig[] }  // for AI parse or quote load
  | { type: 'CLEAR_ALL' };
```

### 8.3 UIContext

```typescript
interface UIState {
  activeSection: 'layout' | 'config' | 'gates' | 'contact' | 'bom';
  expandedAccordions: Set<string>;
  canvasTool: 'draw' | 'gate' | 'move';
  showMapOverlay: boolean;
  showSavedQuotes: boolean;
  bomViewFilter: 'all' | 'fence' | 'gates';
  pricingTier: 'tier1' | 'tier2' | 'tier3';
}
```

---

## 9. TanStack Query Hooks

### 9.1 useBOM

```typescript
// src/hooks/useBOM.ts
export function useBOM() {
  const supabase = useSupabase();

  return useMutation({
    mutationFn: async (params: {
      fenceConfig: FenceConfig;
      gates: GateConfig[];
      pricingTier: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('calculate-bom', {
        body: params,
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (response.error) throw response.error;
      return response.data as BOMResult;
    },
  });
}
```

### 9.2 useQuotes

```typescript
// src/hooks/useQuotes.ts
export function useQuotes() {
  const supabase = useSupabase();

  const quotesQuery = useQuery({
    queryKey: ['quotes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as SavedQuote[];
    },
  });

  const saveQuote = useMutation({
    mutationFn: async (quote: Omit<SavedQuote, 'id' | 'orgId' | 'userId' | 'createdAt' | 'updatedAt'>) => {
      // org_id is set by a DB trigger or must be fetched from the user's profile
      // and included in the insert. The client does NOT decide which org to write to.
      const { data, error } = await supabase
        .from('quotes')
        .insert(quote)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  return { quotesQuery, saveQuote };
}
```

---

## 10. Canvas / Layout Tool (Vanilla JS Port)

The fence layout canvas is the most complex UI component. It allows users to:

1. **Click to place fence run start points**
2. **Click again to extend** — each segment becomes a separate run
3. **Double-click or Enter** to finish a polyline
4. **Click a segment label** to edit the real-world length
5. **Place gates** on segments
6. **Snap to grid** (toggleable)
7. **Pan and zoom** (scroll = zoom, right-drag = pan)
8. **Undo** last action
9. **Load Google Maps** satellite imagery as an underlay (with opacity control)
10. **"Use This Layout"** button transfers drawn lengths + gate positions into the form

### Implementation Strategy: Port, Don't Rewrite

The existing HTML app has a fully working canvas drawing tool. **Do NOT rewrite this in react-konva or any React canvas library.** Instead, port the vanilla JS canvas code directly and wrap it in a React component.

#### File: `src/components/canvas/canvasEngine.ts`

This file contains ALL the ported vanilla JS logic from the existing app's canvas/drawing code. It should be a pure TypeScript module that:
- Accepts a `<canvas>` element and a config object
- Sets up all event listeners (mousedown, mousemove, mouseup, wheel, contextmenu, dblclick, keydown)
- Manages its own internal state (segments, points, gates, undo stack, zoom, pan offset)
- Handles drawing, snapping, grid rendering, label rendering
- Handles Google Maps tile loading and underlay rendering
- Exposes a cleanup function to remove event listeners
- Exposes a `getLayout()` method that returns the structured layout data

```typescript
// src/components/canvas/canvasEngine.ts

export interface CanvasSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  lengthMM: number;       // real-world length in mm
  angleDeg: number;        // angle from horizontal
}

export interface CanvasGate {
  segmentIndex: number;
  positionOnSegment: number;  // 0-1 fraction along segment
  widthMM: number;
}

export interface CanvasLayout {
  segments: CanvasSegment[];
  gates: CanvasGate[];
  totalLengthM: number;
  cornerCount: number;      // count of ~90° angles between adjacent segments
}

export interface CanvasEngineConfig {
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;
  onLayoutChange?: (layout: CanvasLayout) => void;
}

export function initCanvasEngine(
  canvas: HTMLCanvasElement,
  config: CanvasEngineConfig
): {
  destroy: () => void;
  getLayout: () => CanvasLayout;
  setTool: (tool: 'draw' | 'gate' | 'move') => void;
  undo: () => void;
  clear: () => void;
  resetView: () => void;
  setSnapToGrid: (snap: boolean) => void;
  setShowGrid: (show: boolean) => void;
  loadMapTile: (imageUrl: string, opacity: number) => void;
} {
  // Port ALL existing canvas JS here.
  // This is vanilla JS/TS — no React, no JSX, no hooks.
  // Manage canvas 2D context, event listeners, redraw loop internally.
  
  // ... ported code ...

  return { destroy, getLayout, setTool, undo, clear, resetView, setSnapToGrid, setShowGrid, loadMapTile };
}
```

#### File: `src/components/canvas/FenceLayoutCanvas.tsx`

The React wrapper is thin — just a ref, an effect, and a callback bridge:

```typescript
// src/components/canvas/FenceLayoutCanvas.tsx
import { useRef, useEffect, useCallback } from 'react';
import { initCanvasEngine, CanvasLayout } from './canvasEngine';
import { CanvasToolbar } from './CanvasToolbar';
import { MapControls } from './MapControls';
import { useFenceConfig } from '../../context/FenceConfigContext';
import { useGates } from '../../context/GateContext';

export function FenceLayoutCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ReturnType<typeof initCanvasEngine> | null>(null);
  const { dispatch: fenceDispatch } = useFenceConfig();
  const { dispatch: gateDispatch } = useGates();

  useEffect(() => {
    if (!canvasRef.current) return;

    engineRef.current = initCanvasEngine(canvasRef.current, {
      snapToGrid: true,
      gridSize: 20,
      showGrid: true,
    });

    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleUseLayout = useCallback(() => {
    const layout = engineRef.current?.getLayout();
    if (!layout) return;

    fenceDispatch({
      type: 'SET_CONFIG',
      config: {
        totalRunLength: layout.totalLengthM,
        corners: layout.cornerCount,
      },
    });

    // Create gate entries from canvas gate markers
    if (layout.gates.length > 0) {
      const gateConfigs = layout.gates.map(g => ({
        id: crypto.randomUUID(),
        gateType: 'single-swing' as const,
        openingWidth: g.widthMM,
        // ... defaults for other fields
      }));
      gateDispatch({ type: 'SET_GATES', gates: gateConfigs });
    }
  }, [fenceDispatch, gateDispatch]);

  return (
    <div>
      <CanvasToolbar engineRef={engineRef} />
      <canvas
        ref={canvasRef}
        className="w-full border border-brand-border rounded"
        style={{ height: '400px' }}
      />
      <MapControls engineRef={engineRef} />
      <button onClick={handleUseLayout}>Use This Layout →</button>
    </div>
  );
}
```

#### Key principle: The canvas engine is a black box to React

React controls:
- Mounting/unmounting the canvas element
- Toolbar button clicks (which call `engineRef.current?.setTool('draw')` etc.)
- The "Use This Layout →" button (which reads from `engineRef.current?.getLayout()`)
- Map control inputs (which call `engineRef.current?.loadMapTile(url, opacity)`)

The canvas engine controls:
- All drawing, all mouse/touch events, all internal state
- It never imports React, never uses hooks, never causes re-renders

#### Google Maps Integration

Google Maps JS API is loaded via a `<script>` tag in `index.html` (or dynamically in the canvas engine). The engine uses it to:
- Geocode an address or use browser geolocation
- Fetch a static map tile at the correct zoom level
- Draw it as a background image on the canvas with configurable opacity

This is exactly how the existing app does it — no React wrapper needed.

### Data flow: Canvas → Form

When user clicks "Use This Layout →":
1. `getLayout()` returns `CanvasLayout` with segments, gates, total length, corner count
2. Sum all segment lengths → populate `totalRunLength` via `FenceConfigContext`
3. Count segment angles that are ~90° → populate `corners`
4. Count gate markers → create `GateConfig` entries via `GateContext`

---

## 11. Deferred Features (v2)

The following features exist in the current app but are **deferred to v2**. Do NOT build these in v1:

1. **AI Job Description Parsing** — "Describe the Job" panel where users type natural language and Claude API extracts fence config. Requires a `parse-job-description` Supabase Edge Function that proxies the Anthropic API. The UI component, hook, and edge function should all be built in v2.

2. **AI BOM Review** — "Ask Claude to review" button that sends the generated BOM to Claude for a sanity check. Requires a `review-bom` Supabase Edge Function. Build in v2.

When v2 is ready, these will need:
- Two new edge functions (`parse-job-description`, `review-bom`) with `ANTHROPIC_API_KEY` as a Supabase secret
- Two new hooks (`useAIParse`, `useAIReview`)
- Two new components (`JobDescriptionParser`, `BOMReviewer`)
- A `SET_CONFIG` action on FenceConfigContext to bulk-update from parsed AI output

---

## 12. UI / UX Notes

### Existing Design Language

The current app uses a **dark theme** with:
- Dark background (`#1a1a2e` or similar deep navy/charcoal)
- Card-style sections with subtle borders
- Teal/cyan accent colour for interactive elements
- Accordion sections for progressive disclosure (Layout → Config → Gates → Contact → BOM)
- SkybrookAI branding top-left, Glass Outlet logo top-right

### Tailwind Theme Config

```typescript
// tailwind.config.ts
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f1117',
          card: '#1a1d2e',
          border: '#2a2d3e',
          accent: '#3b82f6',    // blue
          'accent-hover': '#2563eb',
          muted: '#6b7280',
          text: '#e5e7eb',
        },
      },
    },
  },
};
```

### Responsive Behaviour

The existing app is primarily **desktop-focused** but should work on tablets. The canvas tool is not practical on mobile phones. Consider:
- Hide canvas section on mobile, show form-only mode
- Stack BOM table horizontally scrollable on mobile
- Accordion sections work well on all sizes

---

## 13. Security & IP Protection Checklist

- [ ] **Move repo to private** on GitHub
- [ ] **All BOM calculation logic** in Supabase Edge Functions (never in client bundle)
- [ ] **All pricing data** in Supabase Postgres, accessed only via service role key in edge functions
- [ ] **Product pricing table** has no RLS — revoke all access from `anon` and `authenticated` roles
- [ ] **Google Maps API key** restricted to your domain(s) in Google Cloud Console
- [ ] **Supabase anon key** only grants access to auth + quotes table (via RLS)
- [ ] **No sensitive constants** in client-side code (no margin percentages, no wholesale prices)
- [ ] **Rate limiting** on edge functions to prevent abuse
- [ ] **CORS** configured to allow only your deployment domain(s)
- [ ] **Every RLS policy** scopes by `org_id = auth.user_org_id()` — no cross-org data leakage
- [ ] **Edge functions** resolve `org_id` server-side from the JWT user's profile — never trust client-sent `org_id`
- [ ] **The `auth.user_org_id()` function** is `SECURITY DEFINER` and `STABLE` — verified working
- [ ] **Quote inserts** include the correct `org_id` from the user's profile, not from client input

---

## 14. Development Phases

### Phase 0 — Cypress Test Suite (DO THIS FIRST)

**This phase must be completed before writing any application code.**

Read `CYPRESS_TEST_SPEC.md` and create the complete Cypress test suite:

1. Install Cypress and TypeScript support
2. Create `cypress/support/selectors.ts` — the selector abstraction layer using `data-testid` attributes
3. Create `cypress/support/helpers.ts` — `fillFenceConfig()`, `addGate()`, `generateBom()`, `assertBomLine()`, `assertGrandTotal()`, etc.
4. Create all 23 test files (TC1-TC19, TC24-TC26) across the section folders
5. Create pricing fixture files (`tier1.json`, `tier2.json`, `tier3.json`)
6. Add `data-testid` attributes to the existing HTML app (non-destructive)
7. Run the suite against the existing HTML app — TC1 and TC5 (VERIFIED) should pass
8. Document any failures — these are either test bugs or existing app bugs to investigate

**Why this comes first**: The tests ARE the acceptance criteria. They define exactly what the React app must do to achieve feature parity. Building without them means you're guessing whether the BOM calculation is correct.

Every subsequent phase should end with running the relevant test subset to verify correctness.

### Phase 1 — Foundation
1. Scaffold Vite + React + Tailwind + React Router
2. Set up Supabase project (local dev with `supabase init` + `supabase start`)
3. Implement auth (login, signup, session management, AuthGuard)
4. Create database migrations
5. Build `AppShell`, `Header`, basic routing

### Phase 2 — Fence Configuration
1. Build `FenceConfigContext` with reducer
2. Build `FenceConfigForm` with React Hook Form + Zod
3. Build all select components (colour, slat size, gap, system type, etc.)
4. Wire up conditional validation (XPL → 65mm, etc.)

### Phase 3 — Gate Configuration
1. Build `GateContext` with reducer
2. Build `GateForm`, `GateList`, `GateConfigPanel`
3. Implement "Match Gate to Fence" toggle
4. Implement add/edit/remove gate flow

### Phase 4 — BOM Engine (Edge Functions)
1. Implement `calculate-bom` edge function with all business logic
2. Seed `product_pricing` and `products` tables
3. Implement `calculate-pricing` edge function
4. Build `useBOM` hook + Generate BOM button
5. Build `BOMDisplay`, `BOMLineItem`, `BOMSummary`

### Phase 5 — Quotes & Export
1. Implement save/load quotes (Supabase DB + TanStack Query)
2. Build `SavedQuotesList`
3. Implement CSV export (Papaparse)
4. Implement PDF export (@react-pdf/renderer)
5. Implement clipboard copy
6. Build print stylesheet

### Phase 6 — Canvas Layout Tool (Vanilla JS Port)
1. Port existing canvas JS into `canvasEngine.ts`
2. Build `FenceLayoutCanvas.tsx` React wrapper with useRef+useEffect
3. Build `CanvasToolbar.tsx` (React buttons calling engine methods)
4. Port Google Maps underlay logic into engine
5. Build `MapControls.tsx` (load map, opacity, map type)
6. Wire "Use This Layout →" to dispatch to FenceConfigContext + GateContext

### Phase 7 — Polish
1. Dark theme refinement
2. Loading states, error boundaries, toast notifications
3. Responsive adjustments
4. Performance testing (canvas)
5. E2E testing of BOM calculation accuracy

---

## 15. Environment Variables

```env
# .env.local
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=your-local-anon-key

# Supabase secrets (set via `supabase secrets set`)
# These are NOT in .env — they live in Supabase's secret store
# ANTHROPIC_API_KEY=sk-ant-...
# GOOGLE_MAPS_API_KEY=AIza...
```

---

## 16. Key Decisions & Tradeoffs

| Decision | Rationale |
|----------|-----------|
| Context+useReducer over Zustand | Simpler dependency footprint. Canvas can upgrade to Zustand later if re-renders are a problem. |
| Separate `calculate-bom` and `calculate-pricing` functions | Allows re-pricing without recalculating materials. Tier switching is instant on the client if BOM is cached. |
| Vanilla JS canvas port over react-konva | The existing canvas tool works. Porting vanilla JS into a useRef+useEffect wrapper avoids rewriting ~500 lines of working code and removes a dependency. |
| Zod schemas shared between client and edge functions | Single source of truth for validation. Copy schemas into `supabase/functions/_shared/` for Deno compatibility. |
| @react-pdf/renderer over jsPDF | JSX-based PDF templates are more maintainable. Matches the React mental model. |
| All pricing server-side | Non-negotiable for IP protection. The client never knows wholesale costs or margin formulas. |
| Multi-tenant schema now, hardcoded UI later | Adding `org_id` columns and RLS policies later requires rewriting every migration and query. Adding it now costs ~30 min. Data-driven forms (v2) are a frontend refactor that doesn't touch the schema. |
| `auth.user_org_id()` helper function | Centralises the org lookup. Every RLS policy calls this function instead of duplicating a JOIN to profiles. If the lookup logic changes, you update one function. |

---

## 17. Testing Strategy

### Primary: Cypress E2E (see `CYPRESS_TEST_SPEC.md`)

The Cypress test suite is the primary quality gate. It contains 23 test cases (TC1-TC19, TC24-TC26) derived from the `Glass_Outlet_Master_Test_Plan.docx`. These tests:

- Use a **selector abstraction layer** (`data-testid` attributes) so the same tests run against both the existing HTML app and the new React app
- Verify **exact BOM line items** — product codes, quantities, unit prices, line totals
- Verify **accessory quantity formulas** — spacer packs, screw packs, caps, plates (extracted from Excel order form formulas)
- Verify **grand totals** across all 3 pricing tiers
- Verify **colour code switching**, **system type switching**, **post count logic**, and **edge cases**

All expected values come from verified Excel formulas and the master price file.

### Secondary

- **Unit tests** (Vitest): Zod schemas, reducer logic, utility functions
- **Component tests** (Vitest + React Testing Library): Form components, conditional rendering
- **Edge function tests** (Deno test): BOM calculation accuracy with known inputs → expected outputs
- **BOM accuracy tests**: The Cypress suite IS the BOM accuracy test suite. TC1 and TC5 are already VERIFIED against the source of truth.

---

## 18. Notes for Claude Code

- **Do not put any pricing numbers, margin percentages, or wholesale costs in client-side code.** If you need placeholder prices for development, use obviously fake values (e.g., $1.00 per item) and add a `// TODO: real pricing in edge function` comment.
- **The existing HTML file is the functional specification.** Every dropdown option, every validation rule, every form field in that file must exist in the React version. Do not omit features (except the two explicitly deferred AI features).
- **The canvas tool is a vanilla JS port, not a rewrite.** Extract the drawing/interaction code from the existing HTML file's `<script>` tags and put it in `canvasEngine.ts`. The React wrapper (`FenceLayoutCanvas.tsx`) only manages the canvas DOM element and bridges callbacks to React context. Do NOT rewrite the canvas logic using react-konva or any React canvas library.
- **Australian context**: Currency is AUD, GST is 10%, measurements are metric (mm for heights/widths, m for run lengths). Postcodes are 4 digits.
- **Colour names are Colorbond brand names** (Australian steel/aluminium colour standard). They must be spelled exactly as listed.
- **Multi-tenancy: every table has `org_id`.** When inserting quotes, resolve the user's `org_id` from their profile — never accept it from the client. Edge functions must always scope queries by `org_id`. For v1, there is only one org ("The Glass Outlet") but the schema must support multiple.
- **Never trust client-sent `org_id`.** The client should not even know what an org_id is. Edge functions resolve it from the authenticated user's profile. RLS policies use `auth.user_org_id()`.
- **The `organisations` table seed data** must be created in the migration. For local dev, the seed inserts one org (`glass-outlet`). The signup trigger defaults new users to this org.
