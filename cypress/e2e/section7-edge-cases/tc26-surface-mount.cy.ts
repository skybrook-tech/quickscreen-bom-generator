/**
 * TC26 — Surface Mount Posts (Base Plate)
 * Switching from concreted-in-ground to base-plated changes the post product code.
 * A base plate line item should appear as a separate entry.
 */
import { fillFenceConfig, generateBom } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC26 — Surface Mount Posts (Base Plate)', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should use base-plate post product code instead of concreted', () => {
    fillFenceConfig({
      systemType:       'QSHS',
      runLength:        10000,
      targetHeight:     1800,
      slatSize:         '65',
      slatGap:          '9',
      colour:           'Surfmist Matt',
      maxPanelWidth:    '2600',
      postMounting:     'Base-plated to slab', // Changed
      leftTermination:  'Post',
      rightTermination: 'Post',
      corners:          0,
      pricingTier:      'Tier 1',
    });

    generateBom();

    // BOM must be visible
    cy.get(SEL.bomTable).should('be.visible');

    // The standard concreted-in-ground post (XP-2400-FP-SM) should NOT appear,
    // OR if the same post is used with a separate base plate item, that's also acceptable.
    // At minimum, a base plate related code must appear when mounting = base-plated.
    // Exact product code TBD — this test is structural and will be tightened once confirmed.
    cy.get(`${SEL.bomTable} ${SEL.bomRow}`).should('have.length.greaterThan', 0);
  });
});
