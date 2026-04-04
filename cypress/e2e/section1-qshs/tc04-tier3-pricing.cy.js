/**
 * TC4 — QSHS Tier 3 Pricing
 * Identical config to TC1 but pricing tier changed to Tier 3 (lowest price point).
 * Quantities are identical to TC1; unit prices are the lowest tier.
 */
import { fillFenceConfig, generateBom, assertBomLine, assertGrandTotal, signin } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC4 — QSHS Tier 3 Pricing', () => {
  beforeEach(() => {
    cy.visit('/');
    signin();
  });

  it('should apply Tier 3 unit prices — lowest price point', () => {
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

    // Switch to Tier 3 AFTER BOM is generated — pricing tier tabs are only active post-generation
    cy.get(SEL.pricingTier).select('Tier 3');

    assertBomLine('XP-6100-S65-SM',    { qty: 96, unitPrice: 32.95, lineTotal: 3163.20 });
    assertBomLine('QS-5800-SF-SM',     { qty: 6,  unitPrice: 21.80, lineTotal: 130.80  });
    assertBomLine('QS-5800-CFC-SM',    { qty: 6,  unitPrice: 14.92, lineTotal: 89.52   });
    assertBomLine('XP-5800-CSR-SM',    { qty: 3,  unitPrice: 34.79, lineTotal: 104.37  });
    assertBomLine('XP-2400-FP-SM',     { qty: 9,  unitPrice: 34.32, lineTotal: 308.88  });
    assertBomLine('QS-SFC-B',          { qty: 32, unitPrice: 0.74,  lineTotal: 23.68   });
    assertBomLine('XP-CSRC-SM',        { qty: 8,  unitPrice: 0.82,  lineTotal: 6.56    });
    assertBomLine('XP-BTP-SM',         { qty: 16, unitPrice: 3.71,  lineTotal: 59.36   });
    assertBomLine('XPL-SB-50PK-09MM',  { qty: 8,  unitPrice: 2.41,  lineTotal: 19.28   });
    assertBomLine('XP-SCREWS-SM',      { qty: 6,  unitPrice: 4.91,  lineTotal: 29.46   });

    assertGrandTotal(3935.11);
  });
});
