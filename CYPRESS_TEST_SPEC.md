# Cypress Test Suite — QuickScreen BOM Generator

> **Purpose**: Claude Code must create this Cypress test suite FIRST, before writing any application code. The tests are the acceptance criteria. They define what "done" looks like.
>
> **Source of truth**: `Glass_Outlet_Master_Test_Plan.docx` (v1.0, 2026-03-31). All expected values come from verified Excel order form formulas and the `Glass_Outlet_Slat_Screening_Raw__5_.xlsx` price file.

---

## 0. Test Architecture

### Dual-target design

These tests must work against TWO targets:

1. **The existing HTML app** (`QuickScreen-BOM-Generator.html`) — to verify tests are correct before any code is written
2. **The new React app** — to verify the React app matches the existing app's behaviour

To achieve this, all DOM interactions go through a **selector abstraction layer**. Every test uses `data-testid` attributes, not CSS classes or element IDs.

### File structure

```
cypress/
├── e2e/
│   ├── section1-qshs/
│   │   ├── tc01-baseline.cy.ts
│   │   ├── tc02-colour-switch.cy.ts
│   │   ├── tc03-tier2-pricing.cy.ts
│   │   ├── tc04-tier3-pricing.cy.ts
│   │   ├── tc05-90mm-slat.cy.ts
│   │   ├── tc06-20mm-gap.cy.ts
│   │   ├── tc07-wall-termination.cy.ts
│   │   ├── tc08-corners.cy.ts
│   │   ├── tc09-2000mm-panel.cy.ts
│   │   └── tc10-single-panel.cy.ts
│   ├── section2-vs/
│   │   ├── tc11-vs-baseline.cy.ts
│   │   └── tc12-vs-90mm.cy.ts
│   ├── section3-xpl/
│   │   ├── tc13-xpl-baseline.cy.ts
│   │   └── tc14-xpl-colour-switch.cy.ts
│   ├── section4-bayg/
│   │   ├── tc15-bayg-baseline.cy.ts
│   │   └── tc16-bayg-20mm-gap.cy.ts
│   ├── section5-gates/
│   │   ├── tc17-single-swing-gate.cy.ts
│   │   ├── tc18-gate-diff-colour.cy.ts
│   │   └── tc19-two-gates.cy.ts
│   └── section7-edge-cases/
│       ├── tc24-very-tall-fence.cy.ts
│       ├── tc25-uneven-panels.cy.ts
│       └── tc26-surface-mount.cy.ts
├── support/
│   ├── commands.ts                    # Custom Cypress commands
│   ├── selectors.ts                   # Selector abstraction layer
│   ├── helpers.ts                     # Input helpers, BOM assertion helpers
│   └── e2e.ts                         # Global setup
└── fixtures/
    └── pricing/
        ├── tier1.json                 # Expected prices for Tier 1
        ├── tier2.json                 # Expected prices for Tier 2
        └── tier3.json                 # Expected prices for Tier 3
```

> **NOTE**: Section 6 (Natural Language Input / TC20-TC23) is deferred to v2. Do NOT create tests for TC20-TC23. They test AI parsing which is not in scope for v1.

---

## 1. Selector Abstraction Layer

Create `cypress/support/selectors.ts`. This maps logical names to `data-testid` selectors. When porting the existing HTML app, add `data-testid` attributes to the HTML. The React app must use the same `data-testid` values.

```typescript
// cypress/support/selectors.ts
export const SEL = {
  // Fence config inputs
  systemType:       '[data-testid="system-type"]',
  runLength:        '[data-testid="run-length"]',
  targetHeight:     '[data-testid="target-height"]',
  slatSize:         '[data-testid="slat-size"]',
  slatGap:          '[data-testid="slat-gap"]',
  colour:           '[data-testid="colour"]',
  maxPanelWidth:    '[data-testid="max-panel-width"]',
  postMounting:     '[data-testid="post-mounting"]',
  leftTermination:  '[data-testid="left-termination"]',
  rightTermination: '[data-testid="right-termination"]',
  corners:          '[data-testid="corners"]',
  pricingTier:      '[data-testid="pricing-tier"]',

  // Gate config inputs
  addGateBtn:       '[data-testid="add-gate-btn"]',
  matchGateToFence: '[data-testid="match-gate-to-fence"]',
  gateType:         '[data-testid="gate-type"]',
  gateOpeningWidth: '[data-testid="gate-opening-width"]',
  gatePostSize:     '[data-testid="gate-post-size"]',
  gateHeight:       '[data-testid="gate-height"]',
  gateColour:       '[data-testid="gate-colour"]',
  gateSlatGap:      '[data-testid="gate-slat-gap"]',
  gateSlatSize:     '[data-testid="gate-slat-size"]',
  saveGateBtn:      '[data-testid="save-gate-btn"]',

  // Actions
  generateBomBtn:   '[data-testid="generate-bom-btn"]',

  // BOM output
  bomTable:         '[data-testid="bom-table"]',
  bomRow:           '[data-testid="bom-row"]',
  bomRowCode:       '[data-testid="bom-row-code"]',
  bomRowQty:        '[data-testid="bom-row-qty"]',
  bomRowUnitPrice:  '[data-testid="bom-row-unit-price"]',
  bomRowLineTotal:  '[data-testid="bom-row-line-total"]',
  bomGrandTotal:    '[data-testid="bom-grand-total"]',

  // BOM section filters
  bomViewAll:       '[data-testid="bom-view-all"]',
  bomViewFence:     '[data-testid="bom-view-fence"]',
  bomViewGates:     '[data-testid="bom-view-gates"]',
} as const;
```

---

## 2. Custom Commands & Helpers

### `cypress/support/helpers.ts`

```typescript
// cypress/support/helpers.ts
import { SEL } from './selectors';

/**
 * Fill the fence configuration form with the given values.
 * Only sets fields that are provided — leaves others at their current/default value.
 */
export function fillFenceConfig(config: {
  systemType?: string;
  runLength?: number;
  targetHeight?: number;
  slatSize?: string;
  slatGap?: string;
  colour?: string;
  maxPanelWidth?: string;
  postMounting?: string;
  leftTermination?: string;
  rightTermination?: string;
  corners?: number;
  pricingTier?: string;
}) {
  if (config.systemType)       cy.get(SEL.systemType).select(config.systemType);
  if (config.runLength)        cy.get(SEL.runLength).clear().type(String(config.runLength));
  if (config.targetHeight)     cy.get(SEL.targetHeight).clear().type(String(config.targetHeight));
  if (config.slatSize)         cy.get(SEL.slatSize).select(config.slatSize);
  if (config.slatGap)          cy.get(SEL.slatGap).select(config.slatGap);
  if (config.colour)           cy.get(SEL.colour).select(config.colour);
  if (config.maxPanelWidth)    cy.get(SEL.maxPanelWidth).select(config.maxPanelWidth);
  if (config.postMounting)     cy.get(SEL.postMounting).select(config.postMounting);
  if (config.leftTermination)  cy.get(SEL.leftTermination).select(config.leftTermination);
  if (config.rightTermination) cy.get(SEL.rightTermination).select(config.rightTermination);
  if (config.corners != null)  cy.get(SEL.corners).clear().type(String(config.corners));
  if (config.pricingTier)      cy.get(SEL.pricingTier).select(config.pricingTier);
}

/**
 * Add a gate to the configuration.
 */
export function addGate(gate: {
  gateType?: string;
  openingWidth?: number;
  postSize?: string;
  height?: string;
  colour?: string;
  slatGap?: string;
  slatSize?: string;
  matchFence?: boolean;
}) {
  cy.get(SEL.addGateBtn).click();
  if (gate.matchFence != null && !gate.matchFence) {
    cy.get(SEL.matchGateToFence).uncheck();
  }
  if (gate.gateType)     cy.get(SEL.gateType).select(gate.gateType);
  if (gate.openingWidth) cy.get(SEL.gateOpeningWidth).clear().type(String(gate.openingWidth));
  if (gate.postSize)     cy.get(SEL.gatePostSize).select(gate.postSize);
  if (gate.height)       cy.get(SEL.gateHeight).select(gate.height);
  if (gate.colour)       cy.get(SEL.gateColour).select(gate.colour);
  if (gate.slatGap)      cy.get(SEL.gateSlatGap).select(gate.slatGap);
  if (gate.slatSize)     cy.get(SEL.gateSlatSize).select(gate.slatSize);
  cy.get(SEL.saveGateBtn).click();
}

/**
 * Click Generate BOM and wait for the BOM table to appear.
 */
export function generateBom() {
  cy.get(SEL.generateBomBtn).click();
  cy.get(SEL.bomTable).should('be.visible');
}

/**
 * Assert a specific BOM line item exists with the expected values.
 * Uses product code as the lookup key.
 */
export function assertBomLine(
  code: string,
  expected: {
    qty?: number;
    unitPrice?: number;
    lineTotal?: number;
  }
) {
  cy.get(SEL.bomTable)
    .contains(SEL.bomRow, code)
    .within(() => {
      if (expected.qty != null) {
        cy.get(SEL.bomRowQty).should('contain', String(expected.qty));
      }
      if (expected.unitPrice != null) {
        cy.get(SEL.bomRowUnitPrice).should('contain', expected.unitPrice.toFixed(2));
      }
      if (expected.lineTotal != null) {
        cy.get(SEL.bomRowLineTotal).should('contain', expected.lineTotal.toFixed(2));
      }
    });
}

/**
 * Assert a specific product code appears in the BOM (without checking values).
 */
export function assertBomContainsCode(code: string) {
  cy.get(SEL.bomTable).should('contain', code);
}

/**
 * Assert a product code does NOT appear in the BOM.
 */
export function assertBomDoesNotContainCode(code: string) {
  cy.get(SEL.bomTable).should('not.contain', code);
}

/**
 * Assert the grand total matches the expected value.
 * Tolerance of ±$0.02 for rounding differences.
 */
export function assertGrandTotal(expected: number) {
  cy.get(SEL.bomGrandTotal).invoke('text').then((text) => {
    const actual = parseFloat(text.replace(/[$,]/g, ''));
    expect(actual).to.be.closeTo(expected, 0.02);
  });
}

/**
 * Assert that ALL colour-dependent product codes in the BOM end with the given suffix.
 * Used by colour switch tests. Pass the suffix like '-B' or '-SM'.
 * Excludes colour-agnostic items (e.g. spacer blocks XPL-SB-50PK-09MM).
 */
export function assertAllColouredCodesEndWith(suffix: string) {
  // Colour-agnostic code patterns that should be skipped
  const agnosticPatterns = ['XPL-SB-', 'QS-SFC-B']; // SFC caps are always black nylon

  cy.get(`${SEL.bomTable} ${SEL.bomRowCode}`).each(($el) => {
    const code = $el.text().trim();
    const isAgnostic = agnosticPatterns.some(p => code.startsWith(p)) || code === 'QS-SFC-B';
    if (!isAgnostic && code.length > 0) {
      expect(code, `Code ${code} should end with ${suffix}`).to.match(new RegExp(`${suffix.replace('-', '\\-')}$`));
    }
  });
}
```

---

## 3. Shared Test Configs (fixtures)

### `cypress/fixtures/pricing/tier1.json`

```json
{
  "XP-6100-S65-SM":   { "unitPrice": 37.29 },
  "QS-5800-SF-SM":    { "unitPrice": 24.35 },
  "QS-5800-CFC-SM":   { "unitPrice": 16.92 },
  "XP-5800-CSR-SM":   { "unitPrice": 43.48 },
  "XP-2400-FP-SM":    { "unitPrice": 38.55 },
  "QS-SFC-B":         { "unitPrice": 0.86  },
  "XP-CSRC-SM":       { "unitPrice": 1.03  },
  "XP-BTP-SM":        { "unitPrice": 4.64  },
  "XPL-SB-50PK-09MM": { "unitPrice": 3.01  },
  "XP-SCREWS-SM":     { "unitPrice": 6.06  },
  "QS-6100-S90-SM":   { "unitPrice": 50.49 }
}
```

### `cypress/fixtures/pricing/tier2.json`

```json
{
  "XP-6100-S65-SM":   { "unitPrice": 34.65 },
  "QS-5800-SF-SM":    { "unitPrice": 23.16 },
  "QS-5800-CFC-SM":   { "unitPrice": 15.94 },
  "XP-5800-CSR-SM":   { "unitPrice": 39.56 },
  "XP-2400-FP-SM":    { "unitPrice": 36.25 },
  "QS-SFC-B":         { "unitPrice": 0.81  },
  "XP-CSRC-SM":       { "unitPrice": 0.92  },
  "XP-BTP-SM":        { "unitPrice": 4.13  },
  "XPL-SB-50PK-09MM": { "unitPrice": 2.90  },
  "XP-SCREWS-SM":     { "unitPrice": 5.70  }
}
```

### `cypress/fixtures/pricing/tier3.json`

```json
{
  "XP-6100-S65-SM":   { "unitPrice": 32.95 },
  "QS-5800-SF-SM":    { "unitPrice": 21.80 },
  "QS-5800-CFC-SM":   { "unitPrice": 14.92 },
  "XP-5800-CSR-SM":   { "unitPrice": 34.79 },
  "XP-2400-FP-SM":    { "unitPrice": 34.32 },
  "QS-SFC-B":         { "unitPrice": 0.74  },
  "XP-CSRC-SM":       { "unitPrice": 0.82  },
  "XP-BTP-SM":        { "unitPrice": 3.71  },
  "XPL-SB-50PK-09MM": { "unitPrice": 2.41  },
  "XP-SCREWS-SM":     { "unitPrice": 4.91  }
}
```

---

## 4. Test Case Specifications

### Important: Accessory Quantity Rules

These formulas are extracted from the Excel order form. Tests MUST verify quantities, not just prices.

| Accessory | Code Pattern | Formula |
|-----------|-------------|---------|
| Side Frame Caps | `QS-SFC-B` | 2 caps × 2 frames per panel × panels |
| CSR Caps | `XP-CSRC-[col]` | 1 cap per CSR |
| Spacer Blocks | `XPL-SB-50PK-[gap]MM` | ROUNDUP(2 × (slats_per_panel + 1) × panels / 50) |
| Screws | `XP-SCREWS-[col]` | ROUNDUP(((slats×2×1.01) + (slats×CSRs÷panels)) / 100) |
| CSR Top/Base Plates | `XP-BTP-[col]` | 2 plates per CSR |

---

### TC1 — Baseline QSHS (VERIFIED)

**Status**: VERIFIED — all values confirmed against price file and Excel formulas.

```typescript
// cypress/e2e/section1-qshs/tc01-baseline.cy.ts
import { fillFenceConfig, generateBom, assertBomLine, assertGrandTotal } from '../../support/helpers';

describe('TC1 — QSHS Baseline (Surfmist 65mm 9mm Tier 1)', () => {
  beforeEach(() => {
    cy.visit('/'); // Adjust to target URL
    // Handle auth if needed
  });

  it('should generate correct BOM for 20m QSHS baseline config', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // Expected layout: 8 panels × 2500mm | Actual height: 1770mm (24 slats)
    assertBomLine('XP-6100-S65-SM',    { qty: 96,  unitPrice: 37.29, lineTotal: 3579.84 });
    assertBomLine('QS-5800-SF-SM',     { qty: 6,   unitPrice: 24.35, lineTotal: 146.10  });
    assertBomLine('QS-5800-CFC-SM',    { qty: 6,   unitPrice: 16.92, lineTotal: 101.52  });
    assertBomLine('XP-5800-CSR-SM',    { qty: 3,   unitPrice: 43.48, lineTotal: 130.44  });
    assertBomLine('XP-2400-FP-SM',     { qty: 9,   unitPrice: 38.55, lineTotal: 346.95  });
    assertBomLine('QS-SFC-B',          { qty: 32,  unitPrice: 0.86,  lineTotal: 27.52   });
    assertBomLine('XP-CSRC-SM',        { qty: 8,   unitPrice: 1.03,  lineTotal: 8.24    });
    assertBomLine('XP-BTP-SM',         { qty: 16,  unitPrice: 4.64,  lineTotal: 74.24   });
    assertBomLine('XPL-SB-50PK-09MM',  { qty: 8,   unitPrice: 3.01,  lineTotal: 24.08   });
    assertBomLine('XP-SCREWS-SM',      { qty: 6,   unitPrice: 6.06,  lineTotal: 36.36   });

    assertGrandTotal(4475.29);
  });

  it('should produce 8 panels of 2500mm each', () => {
    // Verify panel layout description if shown in UI
    // 20000mm / 2600mm max = 8 panels × 2500mm (evenly distributed)
  });

  it('should calculate correct accessory quantities per Excel formulas', () => {
    // Side Frame Caps: 16 frames × 2 caps = 32
    // CSR Caps: 8 CSRs = 8 caps
    // Spacer Blocks: ROUNDUP(2×25×8/50) = 8 packs
    // Screws: ROUNDUP((192×2×1.01 + 192×8/8)/100) = ROUNDUP(580/100) = 6 packs
    // CSR Top/Base Plates: 8 CSRs × 2 = 16
    // These are already checked in the main test via qty assertions
  });
});
```

### TC2 — Colour Switch to Black

```typescript
// cypress/e2e/section1-qshs/tc02-colour-switch.cy.ts
import { fillFenceConfig, generateBom, assertBomLine, assertGrandTotal, assertAllColouredCodesEndWith } from '../../support/helpers';

describe('TC2 — QSHS Colour Switch to Black', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should switch all colour-dependent codes to -B suffix', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Black',       // Changed from Surfmist
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // All colour-dependent codes must end in -B
    assertAllColouredCodesEndWith('-B');

    // Specific code checks
    assertBomLine('XP-6100-S65-B',    { qty: 96,  unitPrice: 37.29, lineTotal: 3579.84 });
    assertBomLine('QS-5800-SF-B',     { qty: 6,   unitPrice: 24.35, lineTotal: 146.10  });
    assertBomLine('QS-5800-CFC-B',    { qty: 6,   unitPrice: 16.92, lineTotal: 101.52  });
    assertBomLine('XP-5800-CSR-B',    { qty: 3,   unitPrice: 43.48, lineTotal: 130.44  });
    assertBomLine('XP-2400-FP-B',     { qty: 9,   unitPrice: 38.55, lineTotal: 346.95  });
    assertBomLine('QS-SFC-B',         { qty: 32,  unitPrice: 0.86,  lineTotal: 27.52   }); // Caps always black
    assertBomLine('XP-CSRC-B',        { qty: 8,   unitPrice: 1.03,  lineTotal: 8.24    });
    assertBomLine('XP-BTP-B',         { qty: 16,  unitPrice: 4.64,  lineTotal: 74.24   });
    assertBomLine('XPL-SB-50PK-09MM', { qty: 8,   unitPrice: 3.01,  lineTotal: 24.08   }); // Spacers colour-agnostic
    assertBomLine('XP-SCREWS-B',      { qty: 6,   unitPrice: 6.06,  lineTotal: 36.36   });

    // Total identical to TC1 — colour doesn't affect pricing
    assertGrandTotal(4475.29);
  });
});
```

### TC3 — Tier 2 Pricing

```typescript
// cypress/e2e/section1-qshs/tc03-tier2-pricing.cy.ts
import { fillFenceConfig, generateBom, assertBomLine, assertGrandTotal } from '../../support/helpers';

describe('TC3 — QSHS Tier 2 Pricing', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should apply Tier 2 unit prices to all items', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 2',    // Changed
    });

    generateBom();

    // Quantities identical to TC1, prices different
    assertBomLine('XP-6100-S65-SM',    { qty: 96,  unitPrice: 34.65, lineTotal: 3326.40 });
    assertBomLine('QS-5800-SF-SM',     { qty: 6,   unitPrice: 23.16, lineTotal: 138.96  });
    assertBomLine('QS-5800-CFC-SM',    { qty: 6,   unitPrice: 15.94, lineTotal: 95.64   });
    assertBomLine('XP-5800-CSR-SM',    { qty: 3,   unitPrice: 39.56, lineTotal: 118.68  });
    assertBomLine('XP-2400-FP-SM',     { qty: 9,   unitPrice: 36.25, lineTotal: 326.25  });
    assertBomLine('QS-SFC-B',          { qty: 32,  unitPrice: 0.81,  lineTotal: 25.92   });
    assertBomLine('XP-CSRC-SM',        { qty: 8,   unitPrice: 0.92,  lineTotal: 7.36    });
    assertBomLine('XP-BTP-SM',         { qty: 16,  unitPrice: 4.13,  lineTotal: 66.08   });
    assertBomLine('XPL-SB-50PK-09MM',  { qty: 8,   unitPrice: 2.90,  lineTotal: 23.20   });
    assertBomLine('XP-SCREWS-SM',      { qty: 6,   unitPrice: 5.70,  lineTotal: 34.20   });

    assertGrandTotal(4162.69);
  });
});
```

### TC4 — Tier 3 Pricing

```typescript
// cypress/e2e/section1-qshs/tc04-tier3-pricing.cy.ts
import { fillFenceConfig, generateBom, assertBomLine, assertGrandTotal } from '../../support/helpers';

describe('TC4 — QSHS Tier 3 Pricing', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should apply Tier 3 unit prices — lowest price point', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 3',    // Changed
    });

    generateBom();

    assertBomLine('XP-6100-S65-SM',    { qty: 96,  unitPrice: 32.95, lineTotal: 3163.20 });
    assertBomLine('QS-5800-SF-SM',     { qty: 6,   unitPrice: 21.80, lineTotal: 130.80  });
    assertBomLine('QS-5800-CFC-SM',    { qty: 6,   unitPrice: 14.92, lineTotal: 89.52   });
    assertBomLine('XP-5800-CSR-SM',    { qty: 3,   unitPrice: 34.79, lineTotal: 104.37  });
    assertBomLine('XP-2400-FP-SM',     { qty: 9,   unitPrice: 34.32, lineTotal: 308.88  });
    assertBomLine('QS-SFC-B',          { qty: 32,  unitPrice: 0.74,  lineTotal: 23.68   });
    assertBomLine('XP-CSRC-SM',        { qty: 8,   unitPrice: 0.82,  lineTotal: 6.56    });
    assertBomLine('XP-BTP-SM',         { qty: 16,  unitPrice: 3.71,  lineTotal: 59.36   });
    assertBomLine('XPL-SB-50PK-09MM',  { qty: 8,   unitPrice: 2.41,  lineTotal: 19.28   });
    assertBomLine('XP-SCREWS-SM',      { qty: 6,   unitPrice: 4.91,  lineTotal: 29.46   });

    assertGrandTotal(3935.11);
  });
});
```

### TC5 — 90mm Slat (VERIFIED)

```typescript
// cypress/e2e/section1-qshs/tc05-90mm-slat.cy.ts
import { fillFenceConfig, generateBom, assertBomLine, assertGrandTotal } from '../../support/helpers';

describe('TC5 — QSHS 90mm Slat', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should switch to 90mm slat codes and recalculate quantities', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '90',           // Changed
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // 18 slats per panel (90mm+9mm=99mm per slat, ~1776mm actual height)
    // 72 stock lengths (18 slats × 8 panels / 2 cuts per length)
    assertBomLine('QS-6100-S90-SM',    { qty: 72,  unitPrice: 50.49, lineTotal: 3635.28 });
    assertBomLine('QS-5800-SF-SM',     { qty: 6,   unitPrice: 24.35, lineTotal: 146.10  });
    assertBomLine('QS-5800-CFC-SM',    { qty: 6,   unitPrice: 16.92, lineTotal: 101.52  });
    assertBomLine('XP-5800-CSR-SM',    { qty: 3,   unitPrice: 43.48, lineTotal: 130.44  });
    assertBomLine('XP-2400-FP-SM',     { qty: 9,   unitPrice: 38.55, lineTotal: 346.95  });
    assertBomLine('QS-SFC-B',          { qty: 32,  unitPrice: 0.86,  lineTotal: 27.52   });
    assertBomLine('XP-CSRC-SM',        { qty: 8,   unitPrice: 1.03,  lineTotal: 8.24    });
    assertBomLine('XP-BTP-SM',         { qty: 16,  unitPrice: 4.64,  lineTotal: 74.24   });
    // Spacer blocks: ROUNDUP(2×19×8/50) = 7 packs (304 spacers)
    assertBomLine('XPL-SB-50PK-09MM',  { qty: 7,   unitPrice: 3.01,  lineTotal: 21.07   });
    // Screws: ROUNDUP((144×2×1.01 + 144×8/8)/100) = ROUNDUP(435/100) = 5 packs
    assertBomLine('XP-SCREWS-SM',      { qty: 5,   unitPrice: 6.06,  lineTotal: 30.30   });

    assertGrandTotal(4521.66);
  });
});
```

### TC6 — 20mm Slat Gap

```typescript
// cypress/e2e/section1-qshs/tc06-20mm-gap.cy.ts
import { fillFenceConfig, generateBom, assertBomLine, assertBomContainsCode } from '../../support/helpers';

describe('TC6 — QSHS 20mm Slat Gap', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should switch spacer code to 20mm and reduce slat count', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '20',            // Changed
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // Spacer code must switch to 20MM variant
    assertBomContainsCode('XPL-SB-50PK-20MM');

    // ~21 slats per panel at 20mm gap (65+20=85mm, 1800/85≈21, actual height ~1785mm)
    // Slat qty should be ~84 (21 slats × 8 panels / 2 cuts per length)
    // Exact qty depends on implementation — verify it is LESS than TC1's 96
    cy.get('[data-testid="bom-table"]').contains('XP-6100-S65-SM').parent()
      .find(('[data-testid="bom-row-qty"]')).invoke('text').then(text => {
        const qty = parseInt(text);
        expect(qty).to.be.lessThan(96); // Must be fewer than TC1
        expect(qty).to.be.greaterThan(60); // Sanity check
      });

    // 20mm spacer pack price is $3.56 at Tier 1
    assertBomLine('XPL-SB-50PK-20MM', { unitPrice: 3.56 });
  });
});
```

### TC7 — Wall Termination (Both Ends)

```typescript
// cypress/e2e/section1-qshs/tc07-wall-termination.cy.ts
import { fillFenceConfig, generateBom, assertBomLine } from '../../support/helpers';

describe('TC7 — QSHS Wall Termination Both Ends', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should reduce post count when both ends are wall-terminated', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Wall',   // Changed
      rightTermination: 'Wall',  // Changed
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // Posts = panels + 1 - 2 (both ends wall) = 8 + 1 - 2 = 7
    assertBomLine('XP-2400-FP-SM', { qty: 7 });
  });

  it('should have a lower grand total than TC1 (fewer posts)', () => {
    // Grand total must be less than $4,475.29 (TC1 with 9 posts)
  });
});
```

### TC8 — 90° Corners

```typescript
// cypress/e2e/section1-qshs/tc08-corners.cy.ts
import { fillFenceConfig, generateBom, assertBomLine } from '../../support/helpers';

describe('TC8 — QSHS with 2 Corners', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should add 1 post per corner', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 2,              // Changed
      pricingTier: 'Tier 1',
    });

    generateBom();

    // Posts = TC1 posts (9) + 2 corner posts = 11
    assertBomLine('XP-2400-FP-SM', { qty: 11 });
  });
});
```

### TC9 — 2000mm Max Panel Width

```typescript
// cypress/e2e/section1-qshs/tc09-2000mm-panel.cy.ts
import { fillFenceConfig, generateBom, assertBomLine } from '../../support/helpers';

describe('TC9 — QSHS 2000mm Max Panel Width (Windy Site)', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should produce more panels and posts with narrower max width', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2000',    // Changed — windy/exposed
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // 20000mm / 2000mm = 10 panels × 2000mm
    // Posts = 10 + 1 = 11
    assertBomLine('XP-2400-FP-SM', { qty: 11 });
  });
});
```

### TC10 — Short Single-Panel Run

```typescript
// cypress/e2e/section1-qshs/tc10-single-panel.cy.ts
import { fillFenceConfig, generateBom, assertBomLine } from '../../support/helpers';

describe('TC10 — QSHS Short Single-Panel Run (2500mm)', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should produce minimum quantities for a single panel', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 2500,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // 1 panel × 2500mm, 2 posts, 1 CSR
    assertBomLine('XP-2400-FP-SM', { qty: 2 });

    // Slat lengths: 24 slats / 2 cuts per length = 12 stock lengths
    assertBomLine('XP-6100-S65-SM', { qty: 12 });

    // Spacer blocks: ROUNDUP(2×25×1/50) = 1 pack
    assertBomLine('XPL-SB-50PK-09MM', { qty: 1 });

    // Screws: ROUNDUP((24×2×1.01 + 24×1/1)/100) = 1 pack
    assertBomLine('XP-SCREWS-SM', { qty: 1 });
  });
});
```

### TC11 — VS Baseline

```typescript
// cypress/e2e/section2-vs/tc11-vs-baseline.cy.ts
import { fillFenceConfig, generateBom, assertBomContainsCode, assertBomDoesNotContainCode } from '../../support/helpers';

describe('TC11 — VS Vertical Slat Screen Baseline', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should produce VS-specific product codes', () => {
    fillFenceConfig({
      systemType: 'VS',
      runLength: 10000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '1200',    // VS max recommended
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // VS uses horizontal rails, not side frames
    assertBomContainsCode('QS-5000-HORIZ');
    // VS uses F-section
    assertBomContainsCode('QS-5800-F');
    // Should NOT contain QSHS side frame code
    assertBomDoesNotContainCode('QS-5800-SF');
  });
});
```

### TC12 — VS 90mm Slat

```typescript
// cypress/e2e/section2-vs/tc12-vs-90mm.cy.ts
import { fillFenceConfig, generateBom, assertAllColouredCodesEndWith } from '../../support/helpers';

describe('TC12 — VS 90mm Slat in Black', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should use 90mm vertical slat code with Black colour codes', () => {
    fillFenceConfig({
      systemType: 'VS',
      runLength: 10000,
      targetHeight: 1800,
      slatSize: '90',
      slatGap: '9',
      colour: 'Black',
      maxPanelWidth: '1200',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // All colour-dependent codes should end in -B
    assertAllColouredCodesEndWith('-B');
  });
});
```

### TC13 — XPL Baseline

```typescript
// cypress/e2e/section3-xpl/tc13-xpl-baseline.cy.ts
import { fillFenceConfig, generateBom, assertBomDoesNotContainCode } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC13 — XPL XPress Plus Premium Baseline', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should use XPL-specific frame codes and force 65mm slats', () => {
    fillFenceConfig({
      systemType: 'XPL',
      runLength: 10000,
      targetHeight: 1800,
      slatSize: '65',           // Only option for XPL
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // XPL uses different side frame code — NOT QS-5800-SF
    assertBomDoesNotContainCode('QS-5800-SF');
  });

  it('should not allow 90mm slat selection when XPL is chosen', () => {
    fillFenceConfig({ systemType: 'XPL' });
    // 90mm option should be disabled or not present
    cy.get(SEL.slatSize).find('option[value="90"]').should('be.disabled').or('not.exist');
    // OR: verify it auto-resets to 65mm if previously set to 90mm
  });
});
```

### TC14 — XPL Colour Switch

```typescript
// cypress/e2e/section3-xpl/tc14-xpl-colour-switch.cy.ts
import { fillFenceConfig, generateBom, assertAllColouredCodesEndWith } from '../../support/helpers';

describe('TC14 — XPL Colour Switch to Black', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should switch all XPL colour-dependent codes to -B', () => {
    fillFenceConfig({
      systemType: 'XPL',
      runLength: 10000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Black',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();
    assertAllColouredCodesEndWith('-B');
  });
});
```

### TC15 — BAYG Baseline

```typescript
// cypress/e2e/section4-bayg/tc15-bayg-baseline.cy.ts
import { fillFenceConfig, generateBom, assertBomDoesNotContainCode } from '../../support/helpers';

describe('TC15 — BAYG Buy As You Go Baseline', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should produce BAYG-specific product codes', () => {
    fillFenceConfig({
      systemType: 'BAYG',
      runLength: 10000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // BAYG uses different frame code — NOT QS-5800-SF
    assertBomDoesNotContainCode('QS-5800-SF');
    // Spacers should appear as integral part of BAYG system
  });
});
```

### TC16 — BAYG 20mm Gap

```typescript
// cypress/e2e/section4-bayg/tc16-bayg-20mm-gap.cy.ts
import { fillFenceConfig, generateBom } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC16 — BAYG 20mm Slat Gap', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should have fewer slats and lower total than TC15', () => {
    fillFenceConfig({
      systemType: 'BAYG',
      runLength: 10000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '20',             // Changed
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // Grand total should be lower than TC15 (fewer slats with wider gap)
    // Spacer type should reflect 20mm variant
  });
});
```

### TC17 — Single Swing Gate (Match Fence)

```typescript
// cypress/e2e/section5-gates/tc17-single-swing-gate.cy.ts
import { fillFenceConfig, addGate, generateBom, assertBomContainsCode, assertGrandTotal } from '../../support/helpers';

describe('TC17 — Single Swing Pedestrian Gate (Match Fence)', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should add gate-specific items to BOM separate from fence', () => {
    // Set up TC1 baseline fence first
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    // Add gate
    addGate({
      gateType: 'Single Swing',
      openingWidth: 1000,
      postSize: '65x65',
      height: 'Match fence',
      matchFence: true,
    });

    generateBom();

    // Gate-specific codes must appear
    assertBomContainsCode('QSG-4200-GSF50');     // Gate side frame
    assertBomContainsCode('QSG-4800-RAIL65');    // Gate rail
    assertBomContainsCode('XP-6100-S65-SM');     // Gate slats (same as fence)

    // Fence total should be unchanged from TC1
    // Grand total should be higher than $4,475.29
    cy.get('[data-testid="bom-grand-total"]').invoke('text').then(text => {
      const total = parseFloat(text.replace(/[$,]/g, ''));
      expect(total).to.be.greaterThan(4475.29);
    });
  });
});
```

### TC18 — Gate Different Colour to Fence

```typescript
// cypress/e2e/section5-gates/tc18-gate-diff-colour.cy.ts
import { fillFenceConfig, addGate, generateBom } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC18 — Gate Different Colour to Fence', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should use Black codes for gate while fence stays Surfmist', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    addGate({
      gateType: 'Single Swing',
      openingWidth: 1000,
      matchFence: false,
      colour: 'Black',
      height: 'Match fence',
    });

    generateBom();

    // Gate slat code should be Black variant
    // Fence slat codes should remain -SM
    // This test verifies the gate section and fence section use independent colour codes
    cy.get(SEL.bomViewFence).click();
    cy.get(SEL.bomTable).should('contain', '-SM');

    cy.get(SEL.bomViewGates).click();
    cy.get(SEL.bomTable).should('contain', '-B');
  });
});
```

### TC19 — Two Gates

```typescript
// cypress/e2e/section5-gates/tc19-two-gates.cy.ts
import { fillFenceConfig, addGate, generateBom } from '../../support/helpers';

describe('TC19 — Two Gates', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should double all gate quantities when 2 gates are added', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 20000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    // Add two identical gates
    addGate({
      gateType: 'Single Swing',
      openingWidth: 1000,
      matchFence: true,
      height: 'Match fence',
    });
    addGate({
      gateType: 'Single Swing',
      openingWidth: 1000,
      matchFence: true,
      height: 'Match fence',
    });

    generateBom();

    // Gate quantities should be exactly double TC17
    // Grand total should be fence total + 2 × gate total
  });
});
```

### TC24 — Very Tall Fence (2400mm)

```typescript
// cypress/e2e/section7-edge-cases/tc24-very-tall-fence.cy.ts
import { fillFenceConfig, generateBom } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC24 — Very Tall Fence (2400mm)', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should generate BOM without errors for maximum height', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 10000,
      targetHeight: 2400,       // Max height
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // BOM should generate without errors
    cy.get(SEL.bomTable).should('be.visible');

    // ~32 slats for 2400mm at 65mm + 9mm gap
    // No negative quantities
    cy.get(SEL.bomRowQty).each(($el) => {
      const qty = parseInt($el.text());
      expect(qty).to.be.greaterThan(0);
    });
  });
});
```

### TC25 — Run Length Not Evenly Divisible

```typescript
// cypress/e2e/section7-edge-cases/tc25-uneven-panels.cy.ts
import { fillFenceConfig, generateBom, assertBomLine } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC25 — 17m Run (Not Evenly Divisible by Panel Width)', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should handle uneven panel distribution correctly', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 17000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Black',
      maxPanelWidth: '2600',
      postMounting: 'Concreted in ground',
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // 17000 / 2600 = 6.54 → 7 panels (evenly distributed ~2429mm each)
    // Posts = 7 + 1 = 8
    assertBomLine('XP-2400-FP-B', { qty: 8 });

    // No negative quantities or errors
    cy.get(SEL.bomRowQty).each(($el) => {
      const qty = parseInt($el.text());
      expect(qty).to.be.greaterThan(0);
    });
  });
});
```

### TC26 — Surface Mount Posts (Base Plate)

```typescript
// cypress/e2e/section7-edge-cases/tc26-surface-mount.cy.ts
import { fillFenceConfig, generateBom } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC26 — Surface Mount Posts (Base Plate)', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should use base-plate post product code instead of concreted', () => {
    fillFenceConfig({
      systemType: 'QSHS',
      runLength: 10000,
      targetHeight: 1800,
      slatSize: '65',
      slatGap: '9',
      colour: 'Surfmist Matt',
      maxPanelWidth: '2600',
      postMounting: 'Base-plated to slab',   // Changed
      leftTermination: 'Post',
      rightTermination: 'Post',
      corners: 0,
      pricingTier: 'Tier 1',
    });

    generateBom();

    // Post product code should be different from concreted variant (XP-2400-FP-SM)
    // Base plate product may appear as separate line item
    cy.get(SEL.bomTable).should('be.visible');
  });
});
```

---

## 5. Implementation Instructions for Claude Code

### Step 1: Before writing ANY application code

1. Initialize the project with Cypress: `npm install -D cypress @types/cypress typescript`
2. Create the complete file structure above
3. Create `selectors.ts`, `helpers.ts`, and all test files
4. Create the pricing fixture files

### Step 2: Add `data-testid` attributes to the existing HTML app

Before running tests against the existing HTML app, add `data-testid` attributes to every input, button, and output element referenced in `selectors.ts`. This is a non-destructive change — it doesn't alter any behaviour.

### Step 3: Verify tests pass against the existing HTML app

Run the Cypress suite against the existing `QuickScreen-BOM-Generator.html`. The VERIFIED tests (TC1, TC5) should pass. PENDING tests should either pass or reveal bugs in the existing app — document any discrepancies.

### Step 4: Build the React app

With tests in place, build the React app component by component. After each phase, run the relevant test subset. The same `data-testid` attributes must be used in React components.

### Step 5: All tests green = feature parity achieved

When all 23 tests pass against the React app (TC1-TC19, TC24-TC26), the migration is functionally complete for v1.

---

## 6. Notes

- **TC20-TC23 (Natural Language Input) are excluded** — these test AI parsing which is deferred to v2
- **All prices are ex-GST** — tests compare pre-GST values
- **Tolerance**: Use ±$0.02 for grand totals to account for floating-point rounding
- **The selector abstraction layer is critical** — it's the only thing that makes dual-target testing possible
- **Gate tests (TC17-TC19) depend on TC1 fence config** — they build on the baseline
- **VS/XPL/BAYG tests (TC11-TC16) are structural** — they verify correct product codes appear, not exact prices (which need to be populated when those systems' pricing is confirmed)
