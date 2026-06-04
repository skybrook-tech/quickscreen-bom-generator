---
skill: anyfence-supplier-wireframe-pattern
id: cmpnfy7mc00jg07adzn8vcpng
description: Single-page HTML wireframe pattern for showing fence suppliers what their branded Anyfence calculator would look like — supplier's product codes prominent on every BOM line, supplier's brand at top, contractor-view layout. Send this when a Tier A supplier says "show me what you mean" during outreach. Drives "I get it" conversion within 10 seconds of opening.
whenToUse: 
tags: 
---

# Anyfence Supplier Calculator Wireframe Pattern

The HTML wireframe you send when a supplier asks "show me what you mean". Optimised to convert in under 10 seconds — the supplier should immediately see THEIR product codes on the BOM and understand the pitch.

## What it's for

When a Tier A supplier replies positively to outreach, the next move is almost always: "Send me an example of what this would look like." A pre-built wireframe with their brand and product codes embedded gives you 1-hour turnaround on a credible demo without engineering work.

## Critical design rules

1. **Supplier's product codes appear in BOLD on every BOM line.** This is the pitch — every other AU calculator strips supplier SKUs. Anyfence preserves them. Make the SKU column visually heavier than the description.
2. **Supplier brand at top, Anyfence brand at footer.** The contractor view should feel like the supplier's calculator. Anyfence is the infrastructure, not the brand.
3. **Real product codes from their actual range.** Pull 6-10 SKUs from their website. Don't use placeholder codes — credibility matters and they'll spot fake codes immediately.
4. **Contractor view, not consumer view.** Show trade pricing toggle (with "ex GST / inc GST"), bulk-discount tiers, PDF export, supplier-branded quote header. This is the version contractors use, not the consumer marketplace UI.
5. **One realistic worked example.** A typical residential job — 30m of 1800mm fence with 1 gate. Show the full BOM with quantities, line totals, GST math, grand total.

## Skeleton HTML structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>{Supplier_Name} Fence Calculator — Powered by Anyfence</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Clean editorial — white canvas, supplier accent colour, restrained */
    /* Tabular nums on every numeric cell */
    /* SKU column heavier weight than description column */
  </style>
</head>
<body>
  <header>
    <img src="{supplier_logo}" alt="{supplier}">
    <span class="tag">Calculator powered by Anyfence</span>
  </header>

  <section class="job-spec">
    <h1>Job: 30m × 1800mm Residential Fence</h1>
    <div class="spec-grid">
      <!-- Run length, height, style, gate count -->
    </div>
  </section>

  <section class="bom">
    <h2>Bill of Materials</h2>
    <table>
      <thead>
        <tr>
          <th>SKU</th>          <!-- BOLD WEIGHT -->
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Line Total</th>
        </tr>
      </thead>
      <tbody>
        <!-- 6-10 lines using real SKUs from supplier's range -->
      </tbody>
      <tfoot>
        <tr><td colspan="4">Subtotal (ex GST)</td><td>$X,XXX.XX</td></tr>
        <tr><td colspan="4">GST</td><td>$XXX.XX</td></tr>
        <tr class="grand"><td colspan="4">Total (inc GST)</td><td>$X,XXX.XX</td></tr>
      </tfoot>
    </table>
  </section>

  <section class="actions">
    <button>Email this quote</button>
    <button>Download PDF</button>
    <button>Order direct from {Supplier}</button>
  </section>

  <footer>
    <small>Anyfence connects contractors with local material suppliers.
           Calculator built around {Supplier}'s product codes — no re-mapping.</small>
  </footer>
</body>
</html>
```

## Pricing/quantity rule of thumb for a credible BOM

For a 30m × 1800mm boundary fence (the standard worked example):

| Line | Qty | Unit |
|------|-----|------|
| Posts (e.g. Stratco DOUBLE-200 / 100×100×2.4m) | 14 | each |
| Rails (e.g. 72×47×5.4m) | 20 | each |
| Palings or panels (depending on system) | 209 or 14 | each |
| Concrete bags | 21 | each |
| Nails or screws | 1000+ | each (bag) |
| Post caps | 14 | each |
| Capping rail (if applicable) | 7 | length |
| 1 × gate kit | 1 | kit |

Use the supplier's actual product codes for each line. If they're a multi-category supplier, mix systems (e.g. Colorbond panels + their pool fence gate kit) to demonstrate cross-category quoting.

## Visual register

- White canvas, single supplier-colour accent (use the colour from their actual logo)
- Inter or Geist sans-serif
- `tabular-nums` on every numeric cell so columns align
- SKU column in `font-weight: 600` and the SKU description in `font-weight: 400`
- Subtle row hover state (not flashy)
- One restrained call-to-action button colour, not three competing CTAs
- NO stock photos, NO icons, NO illustrations — this is a quote document, not a landing page

## What NOT to include

- "Anyfence" branding above the fold (the supplier's brand is the hero)
- Anyfence pricing/subscription information (that's a separate conversation)
- Multiple supplier examples on the same page (one focused demo > a comparison grid)
- Marketing copy ("revolutionary platform", "AI-powered", "next-generation") — supplier is evaluating a trade tool, not a startup
- Animations, transitions, or scroll-triggered effects

## Turnaround target

1 hour from supplier's positive reply to wireframe in their inbox. Pre-build a template HTML file with `{SUPPLIER_NAME}`, `{SUPPLIER_LOGO}`, `{ACCENT_COLOUR}` placeholders and a script to drop in real SKUs from their website. That makes 1-hour turnaround actually achievable.

## After sending

Don't follow up immediately. The wireframe should do its work — most suppliers either reply same-day with "let's talk" or ghost. Wait 3 business days before any follow-up; otherwise you signal desperation.
