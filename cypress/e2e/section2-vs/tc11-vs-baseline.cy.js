/**
 * TC11 — VS Vertical Slat Screen Baseline
 * Verifies that VS-specific product codes appear (horizontal rails, F-section)
 * and that QSHS side frame codes do NOT appear.
 *
 * Note: Exact prices for VS system are pending confirmation — this test is structural.
 */
import { fillFenceConfig, generateBom, assertBomContainsCode, assertBomDoesNotContainCode, signin } from '../../support/helpers';

describe('TC11 — VS Vertical Slat Screen Baseline', () => {
  beforeEach(() => {
    cy.visit('/');
    signin();
  });

  it('should produce VS-specific product codes', () => {
    fillFenceConfig({
      systemType:       'VS',
      runLength:        10000,
      targetHeight:     1800,
      slatSize:         '65',
      slatGap:          '9',
      colour:           'Surfmist Matt',
      maxPanelWidth:    '1200',         // VS max recommended panel width
      postMounting:     'Concreted in ground',
      leftTermination:  'Post',
      rightTermination: 'Post',
      corners:          0,
      pricingTier:      'Tier 1',
    });

    generateBom();

    // VS uses horizontal rails
    assertBomContainsCode('QS-5000-HORIZ');
    // VS uses F-section channel
    assertBomContainsCode('QS-5800-F');
    // Must NOT contain QSHS side frame code
    assertBomDoesNotContainCode('QS-5800-SF');
  });
});
