/**
 * TC18 — Gate Different Colour to Fence
 * Fence: Surfmist Matt (-SM codes)
 * Gate: Black Satin (-B codes)
 * Uses BOM view toggle to verify fence and gate sections independently.
 */
import { fillFenceConfig, addGate, generateBom } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC18 — Gate Different Colour to Fence', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should use Black Satin codes for gate while fence stays Surfmist Matt', () => {
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

    addGate({
      gateType:    'Single Swing',
      openingWidth: 1000,
      matchFence:  false,
      colour:      'Black Satin',
      height:      'Match fence',
    });

    generateBom();

    // Fence section must contain -SM codes
    cy.get(SEL.bomViewFence).click();
    cy.get(SEL.bomTable).should('contain', '-SM');

    // Gate section must contain -B codes
    cy.get(SEL.bomViewGates).click();
    cy.get(SEL.bomTable).should('contain', '-B');
  });
});
