# 03 — BOM & Cut Math

This is the arithmetic the engine performs. The **golden `fixtures/`** are generated from the reference calculator and enforce these — make the build pass them, then keep them as regression tests.

## Quantities per run

Each component defines a `cuts_per_run_fn` — a **safe string expression** (whitelisted vars + `ceil/floor/round` + arithmetic; never live `eval`).

### Default (stock-length items: rails, capping, top rail, mesh roll)
```
cuts_per_run = ceil(run_length_mm / stock_length_mm)
```

### Palings — the 6mm overlap convention (the classic gotcha)
Palings overlap their neighbour by **6mm**, so effective coverage = `paling_width_mm − 6`:
```
palings_per_run = ceil(run_length_mm / (paling_width_mm − 6))
```
**Worked example:** a 30m run with 150mm palings →
`ceil(30000 / (150 − 6)) = ceil(30000 / 144) = ceil(208.33) = 209 palings.`

> Note: 6mm is the single-lap convention used by the generic formula. The treated-pine reference calculator exposes **paling_style** with documented per-metre rates (below) — always defer to the actual engine output (the fixtures), not a hand calculation, when they differ.

### Posts
```
posts = floor(run_length_mm / post_spacing_mm) + 1     // per straight run; corners add posts
```
Typical `post_spacing_mm` = 2400 (timber). Each direction change / corner / end adds a post.

### Rails
Rails run horizontally; quantity = `rails_per_height_band × ceil(run_length_mm / stock_length_mm)`. Standard paling fences use 2 rails (≤1500mm) or 3 rails (>1500mm height).

## Reference calculator: treated-pine paling rates (CANONICAL)

The `treated-pine-paling-fence-calculator` skill (engine + script in `skills/calculator-engine/treated-pine-paling-fence-calculator/`) is the proven reference:

| Style | Palings / linear metre | BOM lines | Notes |
|---|---|---|---|
| **butted** (default) | **10 / m** | 6-line BOM | Edge-to-edge palings, single-sided. Default for backward compatibility. |
| **lapped_capped** | **15 / m** | 8-line BOM | Overlapping palings + a `75x50 Treated Pine Capping Rail 4800mm` top cap. |

Backward-compat rule: `butted` is the default when `paling_style` is omitted, so existing calls produce byte-identical BOMs.

## Stock-length cut optimisation

For `unit:"length"` items, don't just divide — pack cuts into stock lengths to minimise waste:
1. Determine the cut lengths needed for the run.
2. Bin-pack cuts into pieces of `stock_length_mm`.
3. Quantity = number of stock pieces consumed; report offcut/waste.

Stock lengths are real-world (e.g. timber rails 5.4m; posts 2.4/2.7m; mesh rolls 15m). The QuickScreen engine uses a `stocks()` helper — mirror it.

## Quantity-break pricing

When a component's total quantity crosses a `min_qty` threshold, price **all** units at that tier's `unit_price` (volume break), unless a config flags marginal tiering. Choose the best (lowest total) tier the quantity qualifies for.

## GST (always)

- Every line and total carries **ex-GST and inc-GST** separately. `inc = ex × 1.10` (10% AU GST).
- Display both; CSV export includes both columns.

## Gates

Gates are **separate line items**, not derived from run length. A `gate_kit` bundles the AS1926-compliant hardware (MagnaLatch + TruClose) for pool gates. A gate segment interrupts the fence section it sits in (it consumes run length but emits gate components instead of panels/palings for that span).

## Footings (advisory output)

Minimum post-hole depth **600mm** (deeper in expansive clay / high-wind zones). Concrete per post is a quantity the BOM should surface (e.g. Rapid Set 20kg bags) when posts are in-ground.

## Where exact rates live

Generic formulas live here; **exact per-fence rates live in each `fence_system_config` + its `cuts_per_run_fn` + the reference calculator script.** When in doubt, run the reference script and treat its output as truth — that's exactly how the `fixtures/` were produced.
