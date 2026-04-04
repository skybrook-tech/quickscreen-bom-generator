/**
 * TC17 — Single Swing Pedestrian Gate (Match Fence)
 * TC1 baseline fence + 1 single swing gate (1000mm wide, match fence colour/height).
 * Gate-specific codes must appear. Grand total must exceed TC1's $4,475.29.
 */
import { fillFenceConfig, addGate, generateBom, assertBomContainsCode } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC17 — Single Swing Pedestrian Gate (Match Fence)', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should add gate-specific items to BOM separate from fence', () => {
    // TC1 baseline fence
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

    // Add gate
    addGate({
      gateType:    'Single Swing',
      openingWidth: 1000,
      postSize:    '65x65',
      height:      'Match fence',
      matchFence:  true,
    });

    generateBom();

    // Gate-specific codes must appear
    assertBomContainsCode('QSG-4200-GSF50');     // Gate side frame
    assertBomContainsCode('QSG-4800-RAIL65');    // Gate rail
    assertBomContainsCode('XP-6100-S65-SM');     // Gate slats (same as fence colour)

    // Grand total must be greater than TC1's $4,475.29
    cy.get(SEL.bomGrandTotal).invoke('text').then((text) => {
      const total = parseFloat(text.replace(/[$,]/g, ''));
      expect(total).to.be.greaterThan(4475.29);
    });
  });
});
