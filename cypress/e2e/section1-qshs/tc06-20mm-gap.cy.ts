/**
 * TC6 — QSHS 20mm Slat Gap
 * Switching gap from 9mm to 20mm reduces slat count and switches spacer pack code.
 * ~21 slats per panel at 20mm gap (65+20=85mm, 1800/85≈21 slats, actual ~1785mm)
 */
import { fillFenceConfig, generateBom, assertBomLine, assertBomContainsCode } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC6 — QSHS 20mm Slat Gap', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should switch spacer code to 20mm and reduce slat count', () => {
    fillFenceConfig({
      systemType:       'QSHS',
      runLength:        20000,
      targetHeight:     1800,
      slatSize:         '65',
      slatGap:          '20',           // Changed from 9mm
      colour:           'Surfmist Matt',
      maxPanelWidth:    '2600',
      postMounting:     'Concreted in ground',
      leftTermination:  'Post',
      rightTermination: 'Post',
      corners:          0,
      pricingTier:      'Tier 1',
    });

    generateBom();

    // Spacer code must switch to 20MM variant
    assertBomContainsCode('XPL-SB-50PK-20MM');

    // Slat qty must be LESS than TC1's 96 (fewer slats fit with wider gap)
    cy.get(SEL.bomTable).contains(SEL.bomRow, 'XP-6100-S65-SM')
      .find(SEL.bomRowQty).invoke('text').then((text) => {
        const qty = parseInt(text);
        expect(qty).to.be.lessThan(96);   // Must be fewer than TC1
        expect(qty).to.be.greaterThan(60); // Sanity check
      });

    // 20mm spacer pack price at Tier 1
    assertBomLine('XPL-SB-50PK-20MM', { unitPrice: 3.56 });
  });
});
