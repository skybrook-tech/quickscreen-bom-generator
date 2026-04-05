/**
 * TC5 — QSHS 90mm Slat (VERIFIED)
 * STATUS: VERIFIED — all values confirmed against price file and Excel formulas.
 *
 * 18 slats per panel (90mm + 9mm gap = 99mm per slat, ~1770mm actual height)
 * 72 stock lengths: 18 slats × 8 panels = 144 pieces; 2 cuts per 6100mm length → 72 lengths
 */
import { fillFenceConfig, generateBom, assertBomLine, assertGrandTotal, signInAsGlasshouseTestUser } from '../../../../../support/helpers';

describe('TC5 — QSHS 90mm Slat', () => {
  beforeEach(() => {
    signInAsGlasshouseTestUser();
  });

  it('should switch to 90mm slat codes and recalculate quantities', () => {
    fillFenceConfig({
      systemType:       'QSHS',
      runLength:        20000,
      targetHeight:     1800,
      slatSize:         '90',           // Changed from 65mm
      slatGap:          '9',
      colour:           'Surfmist Matt',
      maxPanelWidth:    '2600',
      postMounting:     'Concreted in ground',
      leftTermination:  'Post',
      rightTermination: 'Post',
      corners:          0,
      pricingTier:      'Tier 1',
    });

    generateBom();

    assertBomLine('QS-6100-S90-SM',    { qty: 72, unitPrice: 50.49, lineTotal: 3635.28 });
    assertBomLine('QS-5800-SF-SM',     { qty: 6,  unitPrice: 24.35, lineTotal: 146.10  });
    assertBomLine('QS-5800-CFC-SM',    { qty: 6,  unitPrice: 16.92, lineTotal: 101.52  });
    assertBomLine('XP-5800-CSR-SM',    { qty: 3,  unitPrice: 43.48, lineTotal: 130.44  });
    assertBomLine('XP-2400-FP-SM',     { qty: 9,  unitPrice: 38.55, lineTotal: 346.95  });
    assertBomLine('QS-SFC-B',          { qty: 32, unitPrice: 0.86,  lineTotal: 27.52   });
    assertBomLine('XP-CSRC-SM',        { qty: 8,  unitPrice: 1.03,  lineTotal: 8.24    });
    assertBomLine('XP-BTP-SM',         { qty: 16, unitPrice: 4.64,  lineTotal: 74.24   });
    // Spacer blocks: ROUNDUP(2×19×8/50) = 7 packs (19 slats per panel + 1 = 20 spacer positions)
    assertBomLine('XPL-SB-50PK-09MM',  { qty: 7,  unitPrice: 3.01,  lineTotal: 21.07   });
    // Screws: ROUNDUP((144×2×1.01 + 144×8/8)/100) = ROUNDUP(435/100) = 5 packs
    assertBomLine('XP-SCREWS-SM',      { qty: 5,  unitPrice: 6.06,  lineTotal: 30.30   });

    assertGrandTotal(4521.66);
  });
});
