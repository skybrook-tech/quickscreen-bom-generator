/**
 * TC24 — Very Tall Fence (2400mm)
 * Maximum height should generate a valid BOM with no negative quantities.
 * ~32 slats per panel at 65mm + 9mm gap for 2400mm target height.
 */
import { fillFenceConfig, generateBom, signin } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC24 — Very Tall Fence (2400mm)', () => {
  beforeEach(() => {
    cy.visit('/');
    signin();
  });

  it('should generate BOM without errors for maximum height', () => {
    fillFenceConfig({
      systemType:       'QSHS',
      runLength:        10000,
      targetHeight:     2400,           // Maximum height
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

    // BOM must be visible
    cy.get(SEL.bomTable).should('be.visible');

    // No negative quantities anywhere in the BOM
    cy.get(`${SEL.bomTable} ${SEL.bomRowQty}`).each(($el) => {
      const qty = parseInt($el.text());
      expect(qty).to.be.greaterThan(0);
    });

    // Slat count should be higher than TC1's 96 (more slats per panel at 2400mm vs 1800mm)
    cy.get(SEL.bomTable).contains(SEL.bomRow, 'XP-6100-S65-SM')
      .find(SEL.bomRowQty).invoke('text').then((text) => {
        expect(parseInt(text)).to.be.greaterThan(96);
      });
  });
});
