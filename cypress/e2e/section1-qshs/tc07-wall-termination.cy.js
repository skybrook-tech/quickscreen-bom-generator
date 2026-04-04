/**
 * TC7 — QSHS Wall Termination Both Ends
 * Posts = panels + 1 - 2 (both ends wall-terminated) = 8 + 1 - 2 = 7
 * Grand total must be less than TC1 ($4,475.29) because there are fewer posts.
 */
import { fillFenceConfig, generateBom, assertBomLine, signin } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC7 — QSHS Wall Termination Both Ends', () => {
  beforeEach(() => {
    cy.visit('/');
    signin();
  });

  it('should reduce post count when both ends are wall-terminated', () => {
    fillFenceConfig({
      systemType:       'QSHS',
      runLength:        20000,
      targetHeight:     1800,
      slatSize:         '65',
      slatGap:          '9',
      colour:           'Surfmist Matt',
      maxPanelWidth:    '2600',
      postMounting:     'Concreted in ground',
      leftTermination:  'Wall',   // Changed
      rightTermination: 'Wall',   // Changed
      corners:          0,
      pricingTier:      'Tier 1',
    });

    generateBom();

    // Posts = 8 + 1 - 2 = 7
    assertBomLine('XP-2400-FP-SM', { qty: 7 });
  });

  it('should have a lower grand total than TC1 (fewer posts)', () => {
    fillFenceConfig({
      systemType:       'QSHS',
      runLength:        20000,
      targetHeight:     1800,
      slatSize:         '65',
      slatGap:          '9',
      colour:           'Surfmist Matt',
      maxPanelWidth:    '2600',
      postMounting:     'Concreted in ground',
      leftTermination:  'Wall',
      rightTermination: 'Wall',
      corners:          0,
      pricingTier:      'Tier 1',
    });

    generateBom();

    cy.get(SEL.bomGrandTotal).invoke('text').then((text) => {
      const total = parseFloat(text.replace(/[$,]/g, ''));
      expect(total).to.be.lessThan(4475.29);
    });
  });
});
