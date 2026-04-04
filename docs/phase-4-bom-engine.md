# Phase 4 — BOM Engine (Edge Functions)

## Goal

Implement the core BOM calculation and pricing logic in Supabase Edge Functions, seed the product and pricing tables, and wire up the React front-end to display the generated BOM.

## Steps

1. Implement `calculate-bom` edge function with all business logic
2. Seed `product_pricing` and `product_components` tables
3. Implement `calculate-pricing` edge function
4. Build `useBOM` hook + Generate BOM button
5. Build `BOMDisplay`, `BOMLineItem`, `BOMSummary`

## Edge Functions

### `calculate-bom` — CORE IP

**Endpoint**: `POST /functions/v1/calculate-bom`
**Auth**: Requires valid JWT

**Request body**:
```json
{
  "fenceConfig": { },
  "gates": [ ],
  "layoutSegments": [ ]
}
```

**Response**:
```json
{
  "fenceItems": [ ],
  "gateItems": [ ],
  "total": 1234.56,
  "pricingTier": "tier1"
}
```

### Org Scoping Pattern (required in every edge function)

```typescript
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

**Never trust a client-sent `org_id`.** Always resolve from the authenticated user's profile.

### `calculate-bom` Business Logic

#### 1. Panel Layout Algorithm
- Total run length divided into panels of max width (2600mm or 2000mm)
- Panels are **distributed evenly** — NOT max panels + one short panel
- Example: 10m run with 2600mm max = 4 panels of 2500mm each
- Each panel boundary = 1 intermediate post

#### 2. Post Calculation
- Posts = panels + 1 (straight run, post terminations both ends)
- Subtract 1 for each end that is wall-terminated (F-section instead of post)
- Add 1 for each 90° corner
- Gate posts are additional to fence posts (added separately)

#### 3. Slat Calculation
- Slats per panel = `floor((target_height - top_gap - bottom_gap) / (slat_height + slat_gap))`
- Total slats = slats_per_panel × number_of_panels
- Slats come in 5800mm lengths; calculate how many can be cut per length based on panel width
- Account for offcuts / waste

#### 4. Rail Calculation
- 2 rails per panel (top + bottom)
- Rails are cut to panel width
- Rails come in 5800mm stock lengths — calculate number of cuts

#### 5. Bracket / Fixing Calculation
- Post brackets: 2 per post (top + bottom)
- End caps, screws, rivets based on system type

#### 6. System-Specific Rules

| System | Rule |
|--------|------|
| **QSHS** | Standard. Slats run horizontally, inserted into slotted posts |
| **VS** | Slats run vertically, inserted into top and bottom rails |
| **XPL** | 65mm slats only (forced). Insert/clip system — different bracket/fixing requirements |
| **BAYG** | Spacers are separate line items. Customer assembles themselves |

#### 7. Gate BOM (separate from fence)
| Item | Rule |
|------|------|
| Gate frame | Welded or knock-down depending on type |
| Gate slats | Always 65mm for swing gates; 65 or 90 for sliding |
| Gate posts | Sized per config (50×50, 65×65, 75×75, 100×100) |
| Hinges | 2 per single swing, 4 per double swing, track for sliding |
| Latch hardware | Per latch type selection |
| Drop bolts | For double swing gates |
| Guide rollers | For sliding gates |
| Gate track | For sliding gates |

### `calculate-pricing`

**Endpoint**: `POST /functions/v1/calculate-pricing`

**Request body**:
```json
{
  "bomItems": [ ],
  "pricingTier": "tier1"
}
```

**Logic**:
- Resolves user's `org_id` from profile (same pattern as calculate-bom)
- Reads `product_pricing` table via service role key, filtered by `org_id`
- Matches SKUs to pricing tier
- Returns priced BOM items
- All prices are **ex-GST**
- GST = 10% (Australian GST) on the total

> Keeping `calculate-bom` and `calculate-pricing` separate allows re-pricing across tiers without recalculating materials. Tier switching is instant on the client if the BOM is cached.

## React Hook

```typescript
// src/hooks/useBOM.ts
export function useBOM() {
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

## Components to Build

| Component | Description |
|-----------|-------------|
| `BOMDisplay.tsx` | Generated BOM table |
| `BOMLineItem.tsx` | Individual BOM row |
| `BOMSummary.tsx` | Total, pricing tier, filters |
| `ExtraItemsAdder.tsx` | Manual BOM additions |
| `PricingTierSelect.tsx` | Tier 1 / 2 / 3 selector |

## BOM Line Item Type

```typescript
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
```

## Security Rules

- **Never put pricing numbers, margin percentages, or wholesale costs in client-side code**
- Development placeholder prices should be obviously fake (e.g. $1.00) with `// TODO: real pricing in edge function`
- `product_pricing` and `product_components` tables have no RLS — accessed only via service role key in edge functions
- The client never knows wholesale costs or margin formulas

## Completion Criteria

- `calculate-bom` edge function returns correct BOM for TC1 and TC5 test cases
- `calculate-pricing` applies correct tier pricing from the DB
- `useBOM` mutation calls the edge function and returns typed `BOMResult`
- BOM table renders all line items grouped by category
- Pricing tier selector re-prices without recalculating BOM
- GST and grand total are displayed correctly
- Cypress TC1 and TC5 pass against the new React app
