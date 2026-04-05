/**
 * TC3 — QSHS Tier 2 Pricing
 * Identical config to TC1 but pricing tier changed to Tier 2.
 * Quantities are identical to TC1; unit prices are lower.
 */
import { fillFenceConfig, generateBom, assertBomLine, assertGrandTotal, signInAsGlasshouseTestUser } from '../../../../../support/helpers';
import { SEL } from '../../../../../support/selectors';

describe('TC3 — QSHS Tier 2 Pricing', () => {
  beforeEach(() => {
    signInAsGlasshouseTestUser();
  });

  it('should apply Tier 2 unit prices to all items', () => {
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
    });

    generateBom();

    // Switch to Tier 2 AFTER BOM is generated — pricing tier tabs are only active post-generation
    cy.get(SEL.pricingTier).select('Tier 2');

    // Quantities identical to TC1, prices different
    assertBomLine('XP-6100-S65-SM',    { qty: 96, unitPrice: 34.65, lineTotal: 3326.40 });
    assertBomLine('QS-5800-SF-SM',     { qty: 6,  unitPrice: 23.16, lineTotal: 138.96  });
    assertBomLine('QS-5800-CFC-SM',    { qty: 6,  unitPrice: 15.94, lineTotal: 95.64   });
    assertBomLine('XP-5800-CSR-SM',    { qty: 3,  unitPrice: 39.56, lineTotal: 118.68  });
    assertBomLine('XP-2400-FP-SM',     { qty: 9,  unitPrice: 36.25, lineTotal: 326.25  });
    assertBomLine('QS-SFC-B',          { qty: 32, unitPrice: 0.81,  lineTotal: 25.92   });
    assertBomLine('XP-CSRC-SM',        { qty: 8,  unitPrice: 0.92,  lineTotal: 7.36    });
    assertBomLine('XP-BTP-SM',         { qty: 16, unitPrice: 4.13,  lineTotal: 66.08   });
    assertBomLine('XPL-SB-50PK-09MM',  { qty: 8,  unitPrice: 2.90,  lineTotal: 23.20   });
    assertBomLine('XP-SCREWS-SM',      { qty: 6,  unitPrice: 5.70,  lineTotal: 34.20   });

    assertGrandTotal(4162.69);
  });
});
