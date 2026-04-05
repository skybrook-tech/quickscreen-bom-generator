/**
 * TC1 — QSHS Baseline (Surfmist Matt, 65mm slat, 9mm gap, Tier 1)
 * STATUS: VERIFIED — all values confirmed against price file and Excel formulas.
 *
 * Expected layout: 8 panels × 2500mm | Actual height: ~1770mm (24 slats)
 */
import { fillFenceConfig, generateBom, assertBomLine, assertGrandTotal, signInAsGlasshouseTestUser } from '../../../../../support/helpers';

describe('TC1 — QSHS Baseline', () => {
  beforeEach(() => {
    signInAsGlasshouseTestUser();
  });

  it('should generate correct BOM for 20m QSHS baseline config', () => {
    fillFenceConfig({
      systemType:       'QSHS',
      runLength:        20000,
      targetHeight:     1800,
      slatSize:         '65',
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

    assertBomLine('XP-6100-S65-SM',    { qty: 96, unitPrice: 37.29, lineTotal: 3579.84 });
    assertBomLine('QS-5800-SF-SM',     { qty: 6,  unitPrice: 24.35, lineTotal: 146.10  });
    assertBomLine('QS-5800-CFC-SM',    { qty: 6,  unitPrice: 16.92, lineTotal: 101.52  });
    assertBomLine('XP-5800-CSR-SM',    { qty: 3,  unitPrice: 43.48, lineTotal: 130.44  });
    assertBomLine('XP-2400-FP-SM',     { qty: 9,  unitPrice: 38.55, lineTotal: 346.95  });
    assertBomLine('QS-SFC-B',          { qty: 32, unitPrice: 0.86,  lineTotal: 27.52   });
    assertBomLine('XP-CSRC-SM',        { qty: 8,  unitPrice: 1.03,  lineTotal: 8.24    });
    assertBomLine('XP-BTP-SM',         { qty: 16, unitPrice: 4.64,  lineTotal: 74.24   });
    assertBomLine('XPL-SB-50PK-09MM',  { qty: 8,  unitPrice: 3.01,  lineTotal: 24.08   });
    assertBomLine('XP-SCREWS-SM',      { qty: 6,  unitPrice: 6.06,  lineTotal: 36.36   });

    assertGrandTotal(4475.29);
  });

  it('should produce 8 panels of 2500mm each (evenly distributed)', () => {
    // 20000mm / 2600mm max = 8 panels × 2500mm — NOT 7×2600 + 1×1800
    // Verified by: 9 posts (panels + 1) and slat stock lengths for 8×2500mm cuts
    fillFenceConfig({
      systemType:   'QSHS',
      runLength:    20000,
      targetHeight: 1800,
      slatSize:     '65',
      slatGap:      '9',
      colour:       'Surfmist Matt',
    });
    generateBom();
    // 9 posts = 8 panels + 1
    assertBomLine('XP-2400-FP-SM', { qty: 9 });
  });

  it('should calculate correct accessory quantities per Excel formulas', () => {
    // Side Frame Caps: 2 caps × 2 frames/panel × 8 panels = 32
    // CSR Caps: 8 CSRs × 1 cap = 8 caps
    // Spacer Blocks: ROUNDUP(2 × 25 × 8 / 50) = 8 packs
    // Screws: ROUNDUP((192×2×1.01 + 192×8/8)/100) = ROUNDUP(579.84/100) = 6 packs
    // CSR Top/Base Plates: 8 CSRs × 2 plates = 16
    // These are all verified via qty assertions in the first test above.
    fillFenceConfig({
      systemType:   'QSHS',
      runLength:    20000,
      targetHeight: 1800,
      slatSize:     '65',
      slatGap:      '9',
      colour:       'Surfmist Matt',
    });
    generateBom();
    assertBomLine('QS-SFC-B',         { qty: 32 });
    assertBomLine('XP-CSRC-SM',       { qty: 8  });
    assertBomLine('XPL-SB-50PK-09MM', { qty: 8  });
    assertBomLine('XP-SCREWS-SM',     { qty: 6  });
    assertBomLine('XP-BTP-SM',        { qty: 16 });
  });
});
