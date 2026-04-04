/**
 * TC25 — 17m Run (Not Evenly Divisible by Max Panel Width)
 * 17000mm / 2600mm = 6.54 → rounds UP to 7 panels (evenly distributed ~2429mm each)
 * Posts = 7 + 1 = 8
 * No negative quantities or errors.
 */
import { fillFenceConfig, generateBom, assertBomLine } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC25 — 17m Run (Uneven Panel Distribution)', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should handle uneven panel distribution correctly', () => {
    fillFenceConfig({
      systemType:       'QSHS',
      runLength:        17000,
      targetHeight:     1800,
      slatSize:         '65',
      slatGap:          '9',
      colour:           'Black Satin',
      maxPanelWidth:    '2600',
      postMounting:     'Concreted in ground',
      leftTermination:  'Post',
      rightTermination: 'Post',
      corners:          0,
      pricingTier:      'Tier 1',
    });

    generateBom();

    // 7 panels → 7 + 1 = 8 posts
    assertBomLine('XP-2400-FP-B', { qty: 8 });

    // No negative quantities
    cy.get(`${SEL.bomTable} ${SEL.bomRowQty}`).each(($el) => {
      const qty = parseInt($el.text());
      expect(qty).to.be.greaterThan(0);
    });
  });
});
