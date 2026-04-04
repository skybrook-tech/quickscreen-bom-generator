/**
 * TC15 — BAYG Buy As You Go Baseline
 * BAYG uses different frame codes — QS-5800-SF must not appear.
 * Spacers appear as separate line items in BAYG.
 *
 * Note: Exact prices for BAYG system are pending confirmation — this test is structural.
 */
import { fillFenceConfig, generateBom, assertBomDoesNotContainCode, signin } from '../../support/helpers';

describe('TC15 — BAYG Buy As You Go Baseline', () => {
  beforeEach(() => {
    cy.visit('/');
    signin();
  });

  it('should produce BAYG-specific product codes', () => {
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

    // BAYG uses different frame code — QS-5800-SF must not appear
    assertBomDoesNotContainCode('QS-5800-SF');
  });
});
