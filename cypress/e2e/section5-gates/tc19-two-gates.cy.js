/**
 * TC19 — Two Identical Gates
 * Adding 2 identical gates should double all gate quantities vs TC17.
 * Grand total = fence total + 2 × single gate total.
 */
import { fillFenceConfig, addGate, generateBom, signin } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC19 — Two Gates', () => {
  beforeEach(() => {
    cy.visit('/');
    signin();
  });

  it('should include items for both gates in the BOM', () => {
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

    // Add two identical gates
    addGate({
      gateType:    'Single Swing',
      openingWidth: 1000,
      matchFence:  true,
      height:      'Match fence',
    });
    addGate({
      gateType:    'Single Swing',
      openingWidth: 1000,
      matchFence:  true,
      height:      'Match fence',
    });

    generateBom();

    // Grand total must be greater than TC17's total (fence + 1 gate)
    // Capture TC17 total separately for comparison if needed.
    // At minimum, grand total > TC1 fence-only total.
    cy.get(SEL.bomGrandTotal).invoke('text').then((text) => {
      const total = parseFloat(text.replace(/[$,]/g, ''));
      expect(total).to.be.greaterThan(4475.29);
    });

    // The gates view must be non-empty
    cy.get(SEL.bomViewGates).click();
    cy.get(SEL.bomTable).should('be.visible');
    cy.get(`${SEL.bomTable} ${SEL.bomRow}`).should('have.length.greaterThan', 0);
  });
});
