/**
 * TC10 — QSHS Short Single-Panel Run (2500mm)
 * 1 panel × 2500mm → 2 posts, 1 CSR, minimum accessory quantities.
 *
 * Slats: 24 per panel / 2 cuts per 6100mm = 12 stock lengths
 * Spacer blocks: ROUNDUP(2×25×1/50) = 1 pack
 * Screws: ROUNDUP((24×2×1.01 + 24×1/1)/100) = 1 pack
 */
import { fillFenceConfig, generateBom, assertBomLine, signin } from '../../support/helpers';

describe('TC10 — QSHS Short Single-Panel Run', () => {
  beforeEach(() => {
    cy.visit('/');  
    signin();
  });

  it('should produce minimum quantities for a single panel', () => {
    fillFenceConfig({
      systemType:       'QSHS',
      runLength:        2500,
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

    // 1 panel → 2 posts
    assertBomLine('XP-2400-FP-SM',    { qty: 2  });
    // 24 slats / 2 cuts per length = 12 stock lengths
    assertBomLine('XP-6100-S65-SM',   { qty: 12 });
    // 1 spacer pack
    assertBomLine('XPL-SB-50PK-09MM', { qty: 1  });
    // 1 screw pack
    assertBomLine('XP-SCREWS-SM',     { qty: 1  });
  });
});
