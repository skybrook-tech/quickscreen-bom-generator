# 07 — Australian Pricing Reference Data (Seed Defaults)

> **Status: REFERENCE DATA — Bunnings catalogue snapshot, May 2026.** Use as realistic RRP seed defaults for configs and demos. **Re-scrape before production** (`skills/data-ingestion/bunnings-fence-scraper`). All prices AUD, typically inc-GST at Bunnings retail. ProtectorAl, SpecRite, STS Timber, PEAK are the dominant Bunnings fencing brands.

## Bunnings ingestion gotcha
- Direct HTTP scraping is **blocked by Cloudflare**. Exa search infrastructure handles the JS challenge and returns clean structured text — that's the working path (the scraper skill uses it).
- Bunnings **Item Numbers (I/N)** are 6–8 digit, format-stable → use as `external_sku`.

---

## Colorbond / steel sheet
- Posts $15–$22.76 · panels ~$135 · rails $15–$16.08 · infill sheets ~$25 · post caps ~$2.65 · ProtectorAl gate kits $116–$157.
- Standard panel: **1800mm H × 2360mm W** = 3 infill sheets + 2 posts + 2 rails. Post lengths 2400 & 2700mm.
- Colours (10+): Monument, Woodland Grey, Domain, Wilderness, Ironstone, Basalt, Evening Haze, Pale Eucalypt, Night Sky, Riversand.

## Treated pine paling (all H3 CCA)
- **Palings:** 100/125/150mm widths × 1.5/1.65/1.8/2.1m. $1.32–$3.14 each; **$0.88–$1.50 per linear metre** (capture both).
- **Posts:** 88/90/100/112/125mm square × 1.8–6.0m. $22 (100×100×2.4m H4) → $127.69 (112×112×2.4m H3 LOSP primed laminated).
- **Rails:** 72×47mm or 90×45mm, 5.4m stock, ~$22 ($4.07/m).
- **Plinths:** 150×25mm, 2.4–6.0m, $7.33–$16.50 ($3.05/m).
- **Capping rail:** 90×45mm rebated, 5.4m, ~$39 ($7.22/m).
- Brands: STS Timber Wholesale, Australian Treated Pine, Kaituna/TasmanKB (premium F7), Woodhouse Weatherproof.

## Pool fencing (ProtectorAl dominant)
- **Glass panels:** 12mm Grade A toughened, **1200mm fixed height**, widths 250–2000mm. **$56.70 (250mm) → $332.84 (2000mm)** — width-by-width pricing.
- **Aluminium panels:** 2400mm standard width, 1200/1500/1800mm heights, $109–$391. Colours: Black, Pearl White, Monument, Pale Eucalypt, Deep Ocean, Primrose, Woodland Grey.
- **Spigots:** 95×95 chisel ($169 SS / $199 black), 60×128 slimline ($189), wall-to-glass clamp ($59.50), flanged white matt ($126.14).
- **Gate hardware:** MagnaLatch + TruClose kit **$99.55** (AS1926 default) · TruClose hinges $38.60 (30kg) / $60.77 (70kg HD) · MagnaLatch+KwikFit $84 · glass-to-glass latch $103.

## Chain wire / chainlink (PEAK dominant)
- Mesh: PEAK 15m roll, 50×50mm aperture, 2.37mm wire, vinyl-coated. $92 (900mm) / $115 (1200mm).
- Hardware: top rail, tension band, rail end, post cap, fence ties, bracing wire.

## Picket
- Hardwood (SpecRite Merbau): 70×19mm × 0.9/1.2/1.5/1.8m, $5.20–$8.12 each.
- Cypress Pine (Mr Pickets): 66×19mm × 0.9/1.2/1.5/1.8m, $3.50–$5.50 each.
- PVC picket panels: Think Fencing Wren $189; RapidFence Hampton $249.

## Hardwood
- Merbau fence panels (SpecRite, pre-oiled, FSC): $129–$229.
- Spotted Gum decking: $13.20/m (86×19mm).
- Hardwood posts: Spotted Gum GL18 laminated 90×90×2.7m $168; 115×115×2.4m $220.

---

## Supplier database (for the supplier backend)
61 national AU fencing suppliers catalogued, tier-tagged (15 A / 31 B / 15 C) across 12 categories. HQ skew: NSW 28, VIC 16, QLD 15, WA 4, SA 3. Mix: 33 manufacturers, 14 distributors, 10 retailers, 9 combination. Manufacturers are the best calculator-pilot targets (they own the pricing logic). Tier-A names include Stratco, BlueScope, Bunnings Trade, Oxworks, Mitre 10, Steeline, Waratah. See `skills/gtm-ops/au-fencing-supplier-tier-tagger.md`.
