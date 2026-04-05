/**
 * TC2 — QSHS Colour Switch to Black Satin
 * Identical config to TC1 but colour changed to Black Satin.
 * Verifies all colour-dependent SKU suffixes switch from -SM to -B.
 * Grand total is identical to TC1 — colour does not affect pricing.
 */
import { fillFenceConfig, generateBom, assertBomLine, assertGrandTotal, assertAllColouredCodesEndWith, signInAsGlasshouseTestUser } from '../../../../../support/helpers';

describe('TC2 — QSHS Colour Switch to Black Satin', () => {
  beforeEach(() => {
    signInAsGlasshouseTestUser();
  });

  it('should switch all colour-dependent codes to -B suffix', () => {
    fillFenceConfig({
      systemType:       'QSHS',
      runLength:        20000,
      targetHeight:     1800,
      slatSize:         '65',
      slatGap:          '9',
      colour:           'Black Satin',   // Changed from Surfmist Matt
      maxPanelWidth:    '2600',
      postMounting:     'Concreted in ground',
      leftTermination:  'Post',
      rightTermination: 'Post',
      corners:          0,
      pricingTier:      'Tier 1',
    });

    generateBom();

    // All colour-dependent codes must end in -B
    assertAllColouredCodesEndWith('-B');

    // Specific code checks — same quantities as TC1, different suffix
    assertBomLine('XP-6100-S65-B',    { qty: 96, unitPrice: 37.29, lineTotal: 3579.84 });
    assertBomLine('QS-5800-SF-B',     { qty: 6,  unitPrice: 24.35, lineTotal: 146.10  });
    assertBomLine('QS-5800-CFC-B',    { qty: 6,  unitPrice: 16.92, lineTotal: 101.52  });
    assertBomLine('XP-5800-CSR-B',    { qty: 3,  unitPrice: 43.48, lineTotal: 130.44  });
    assertBomLine('XP-2400-FP-B',     { qty: 9,  unitPrice: 38.55, lineTotal: 346.95  });
    assertBomLine('QS-SFC-B',         { qty: 32, unitPrice: 0.86,  lineTotal: 27.52   }); // Always black nylon
    assertBomLine('XP-CSRC-B',        { qty: 8,  unitPrice: 1.03,  lineTotal: 8.24    });
    assertBomLine('XP-BTP-B',         { qty: 16, unitPrice: 4.64,  lineTotal: 74.24   });
    assertBomLine('XPL-SB-50PK-09MM', { qty: 8,  unitPrice: 3.01,  lineTotal: 24.08   }); // Colour-agnostic
    assertBomLine('XP-SCREWS-B',      { qty: 6,  unitPrice: 6.06,  lineTotal: 36.36   });

    // Total identical to TC1 — colour doesn't affect pricing
    assertGrandTotal(4475.29);
  });
});
