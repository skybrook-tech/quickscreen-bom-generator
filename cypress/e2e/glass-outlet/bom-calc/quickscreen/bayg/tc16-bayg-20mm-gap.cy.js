/**
 * TC16 — BAYG 20mm Slat Gap
 * Wider gap = fewer slats = lower grand total than TC15.
 */
import { fillFenceConfig, generateBom, signInAsGlasshouseTestUser } from '../../../../../support/helpers';
import { SEL } from '../../../../../support/selectors';

describe('TC16 — BAYG 20mm Slat Gap', () => {
  beforeEach(() => {
    signInAsGlasshouseTestUser();
  });

  it('should have fewer slats and lower total than TC15 (9mm gap)', () => {
    // First, capture TC15 total for comparison
    let tc15Total = 0;

    // TC15 config (9mm gap)
    fillFenceConfig({
      systemType:       'BAYG',
      runLength:        10000,
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
    cy.get(SEL.bomGrandTotal).invoke('text').then((text) => {
      tc15Total = parseFloat(text.replace(/[$,]/g, ''));
    });

    // TC16 config (20mm gap) — reload and reconfigure
    cy.visit('/');
    fillFenceConfig({
      systemType:       'BAYG',
      runLength:        10000,
      targetHeight:     1800,
      slatSize:         '65',
      slatGap:          '20',           // Changed
      colour:           'Surfmist Matt',
      maxPanelWidth:    '2600',
      postMounting:     'Concreted in ground',
      leftTermination:  'Post',
      rightTermination: 'Post',
      corners:          0,
      pricingTier:      'Tier 1',
    });
    generateBom();

    cy.get(SEL.bomGrandTotal).invoke('text').then((text) => {
      const tc16Total = parseFloat(text.replace(/[$,]/g, ''));
      expect(tc16Total).to.be.lessThan(tc15Total);
    });
  });
});
