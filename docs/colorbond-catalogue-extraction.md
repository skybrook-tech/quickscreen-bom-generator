# ColorBond Catalogue Extraction

Source: `Glass Outlet Catalogues/GO_colorbond_V2B_lowres.pdf`.

This extraction backs the `COLORBOND` seed in `supabase/seeds/glass-outlet/products/colorbond.json`. Existing ColorBond prices were reused from `price_catalogue.json` when a matching SKU was already present. Catalogue-only SKUs that were not in the price catalogue were seeded with `default_price: 0` so the BOM can return a line with a missing-price assumption instead of inventing pricing.

## System Options

| Option | Catalogue values | Seed field |
|---|---|---|
| Profiles | GO-Line (`GLINE`), GO-Zag (`GZAG`), GO-Trim (`GTRIM`) | `profile_code` |
| Finished heights | 1500, 1800, 2100mm | `target_height_mm` |
| Infill sheet heights | 1490, 1790, 2090mm | derived as `target_height_mm - 10` |
| Bay/rail widths | 2365, 3125mm | `max_panel_width_mm` |
| Infill colours | BS, G, MN, PB, P, SM | `colour_code` |
| Rail/post colours | B, BS, G, MN, PB, P, SM | `post_colour_code` |
| Mounting | In-ground channel post, base-plated shark fin | `mounting_type` |
| Optional items | 65mm support posts, channel post caps, timber sleepers | run-level booleans/enums |

## BOM Rules

| Family | SKU pattern | Quantity rule | Notes |
|---|---|---|---|
| GO-Line sheets | `CB-GLINE-{1490/1790/2090}-{colour}` | 3 sheets per 2365 bay, 4 sheets per 3125 bay | Brisbane and Gold Coast depot listing |
| GO-Zag sheets | `CB-GZAG-{1490/1790/2090}-{colour}` | 3 sheets per 2365 bay, 4 sheets per 3125 bay | Brisbane, Gold Coast, Newcastle depot listing |
| GO-Trim sheets | `CB-GTRIM-{1790/2090}-{colour}` | 3 sheets per 2365 bay, 4 sheets per 3125 bay | Newcastle only; 1500mm finished height is not catalogue-listed |
| Rails | `CB-RAIL-{2365/3125}-{post_colour_code}` | 2 per bay | Post centres are rail length + 10mm |
| Channel posts | `CB-CPOST-{1800/2400/3000}-{post_colour_code}` | run ends + internal bay joins + corners | 1800 for 1500mm base plate, 2400 for 1500/1800 in-ground, 3000 for 2100 |
| Tek screws | `CB-TS-{post_colour_code}-15PK` | 1 pack per bay | Catalogue example shows one 15-pack per 2365 panel |
| Shark fin base plate | `CB-SHARKFIN-{post_colour_code}` | one per post when base-plated | Optional mounting path |
| 65mm steel support post | `XPSG-2700-ST65-{post_colour_code}` | optional run boundary/corner support count | Used where extra structural support is selected |
| Timber sleeper | `CB-SLEEPER-{2365/3125}` | optional one per bay | Seeded as a selectable run option |
| Post caps | `CB-POSTCAP-SGL`, `CB-POSTCAP-DBL` | optional one per channel post | Catalogue lists black caps |

## Extracted Extras

| Catalogue family | Seed status |
|---|---|
| ColorBond gate stile, gate rail, hinges, latch, caps | Catalogue extracted, components retained where present in `price_catalogue.json`; ColorBond gate BOM is not wired into the UI yet |
| Alumawall sleepers/top plates/posts | Missing catalogue SKUs added at zero price for later retaining-wall quoting |
| Lattice/top-slat add-ons | Missing catalogue SKUs added at zero price for future topper options |

## Warnings

- Do not use ColorBond steel fencing within 1km of the ocean or in saltwater/chlorine splash zones.
- Night Sky/black is available for rails and posts only, not as an infill sheet colour.
- GO-Trim is limited to 1800mm and 2100mm finished heights in the catalogue.
- 3125mm bays use four overlapping infill sheets and should be checked against site handling and wind/design requirements.
