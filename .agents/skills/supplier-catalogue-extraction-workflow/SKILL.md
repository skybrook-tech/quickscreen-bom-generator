---
name: supplier-catalogue-extraction-workflow
description: Systematic procedure for extracting structured product data (SKUs, pricing, specifications) from supplier web portals. Covers portal walking, data structuring, price-tier mapping, and seed JSON generation.
---

# Supplier Catalogue Extraction Workflow

## The Problem

Trade-industry SaaS tools need product data from suppliers: SKUs, names, specifications, pricing with quantity breaks, colour options, size variants. This data lives on supplier web portals — often behind logins, in inconsistent formats, across multiple pages.

## The Extraction Procedure

### Step 1: Portal reconnaissance
Before extracting, map the portal's structure:
- What product categories exist? (slats, posts, rails, brackets, gates, hardware)
- How is pricing displayed? (per-unit, per-length, tiered)
- Are there quantity breaks? Where are they shown?
- Is there a wholesale/trade pricing tier?
- Are bulk-buy variants separate SKUs or pricing flags?

### Step 2: Systematic walk
Walk each product category page by page:
1. Open the category page
2. For each product: extract SKU, name, description, unit price, quantity breaks, specifications
3. Screenshot each page for reference
4. Note any inconsistencies or missing data
5. Move to next category

### Step 3: Structure the data

```typescript
interface ExtractedProduct {
  sku: string;              // Supplier's SKU code
  name: string;             // Full product name
  category: string;         // "slat" | "post" | "rail" | "bracket" | "gate_hardware" | etc.
  subCategory?: string;     // "65mm_slat" | "50mm_post" | etc.
  specifications: {
    length_mm?: number;     // Stock length
    width_mm?: number;      // Width/size
    height_mm?: number;     // Height if applicable
    colour?: string;        // Colour name
    colour_code?: string;   // Colour abbreviation
    material?: string;      // "aluminium" | "steel" | "stainless"
  };
  pricing: {
    tiers: Array<{
      min_qty: number;      // Minimum quantity for this price
      unit_price: number;   // Price per unit (ex-GST)
    }>;
    gst_inclusive: boolean;  // Whether displayed prices include GST
    currency: string;       // "AUD" | "NZD" | etc.
  };
  bulk_buy?: {
    is_bulk_variant: boolean;
    base_sku?: string;      // The non-bulk SKU this is a variant of
    pack_qty?: number;      // Number of units in the bulk pack
    savings_pct?: number;   // Percentage savings vs base SKU
  };
  notes?: string;           // Any extracted notes or warnings
}
```

### Step 4: Generate seed JSON
Transform extracted products into the configurator's seed format:

```typescript
interface SeedData {
  supplier: string;
  system: string;
  last_updated: string;
  products: ExtractedProduct[];
  colours: Array<{
    code: string;
    name: string;
    hex: string;
  }>;
  option_lists: {
    slat_sizes: number[];
    gap_sizes: number[];
    post_sizes: number[];
    mounting_types: string[];
    max_post_spacings: number[];
  };
}
```

### Step 5: Verify and correct
- Cross-reference extracted prices against at least 3 known products (manually check the portal)
- Verify quantity break thresholds are correct
- Check that colour codes map to correct colour names
- Confirm GST treatment (ex-GST vs inc-GST) — most trade portals show ex-GST

## Common Extraction Pitfalls

### 1. Price display inconsistency
Some portals show per-metre pricing for slats but per-unit for posts. Normalize everything to per-unit (per-piece) pricing in the seed data.

### 2. Quantity tier confusion
Some portals show "1+" and "50+" as tier labels, meaning the 50+ price applies from 50 units onward. Others show "1-49" and "50-99", which is the same thing. Normalize to `min_qty` format.

### 3. Bulk-buy variants
Some suppliers offer "BB-" prefixed SKUs at 10-32% discounts. These are SEPARATE SKUs with their own tier arrays, not a pricing flag on the base SKU. Extract them as distinct products with `is_bulk_variant: true` and a `base_sku` reference.

### 4. Colour-specific pricing
Some colours are premium (e.g. "Terrain" colours in fencing). These may have different pricing from standard colours. Extract per-colour pricing when it differs.

### 5. Stock length vs cut length
Suppliers list stock lengths (e.g. 5800mm for slats). The BOM engine calculates how many stock lengths are needed and what the wastage is. Don't confuse stock length with installed length.

## Output Format for Seed Files

Save the seed data as JSON files named by supplier and system:
- `glass-outlet-qshs-seed.json` — Glass Outlet, QuickScreen Horizontal Slats
- `glass-outlet-vs-seed.json` — Glass Outlet, Vertical Slats
- etc.

Include a metadata block at the top:
```json
{
  "_meta": {
    "supplier": "The Glass Outlet",
    "system": "QSHS",
    "extracted_date": "2026-05-10",
    "extracted_by": "Hyperagent catalogue walk",
    "portal_url": "https://theglassoutlet.com.au/quickscreen",
    "product_count": 217,
    "price_verified": true,
    "notes": "Prices ex-GST. Bulk-buy variants extracted as separate SKUs."
  }
}
```

## Maintenance Cadence

Supplier pricing changes. Re-walk the portal:
- **Monthly** for actively-used suppliers
- **Quarterly** for secondary suppliers
- **Immediately** when a customer reports a pricing discrepancy

When re-walking, diff against the previous seed file to identify changes (new SKUs, price changes, discontinued products).
