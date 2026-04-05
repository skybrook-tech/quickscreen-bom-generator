/**
 * TC17 — Single Swing Pedestrian Gate (Match Fence)
 * TC1 baseline fence + 1 single swing gate (1000mm wide, match fence colour/height).
 * Gate-specific codes must appear. Grand total must exceed TC1's $4,475.29.
 */
import { fillFenceConfig, addGate, generateBom, assertBomContainsCode, signInAsGlasshouseTestUser } from '../../../../../support/helpers';
import { SEL } from '../../../../../support/selectors'; 

describe('TC17 — Single Swing Pedestrian Gate (Match Fence)', () => {
  beforeEach(() => {
    signInAsGlasshouseTestUser();
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

    // Gate-specific codes must appear (actual codes from app's swing gate BOM logic)
    assertBomContainsCode('XP-GKIT-LSET09-SM');  // Gate side frame kit (Surfmist Matt)
    assertBomContainsCode('XP-6100-GB65-SM');    // Gate blade 65mm (Surfmist Matt)
    assertBomContainsCode('XP-6100-S65-SM');     // Slats appear (shared fence colour)

    // Grand total must be greater than TC1's $4,475.29
    cy.get(SEL.bomGrandTotal).invoke('text').then((text) => {
      const total = parseFloat(text.replace(/[$,]/g, ''));
      expect(total).to.be.greaterThan(4475.29);
    });
  });
});
