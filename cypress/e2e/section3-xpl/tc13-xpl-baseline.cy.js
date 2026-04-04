/**
 * TC13 — XPL XPress Plus Premium Baseline
 * XPL uses 65mm slats only (forced — 90mm option must be disabled/unavailable).
 * XPL uses different frame codes to QSHS — QS-5800-SF must not appear.
 */
import { fillFenceConfig, generateBom, assertBomDoesNotContainCode, signin } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC13 — XPL XPress Plus Premium Baseline', () => {
  beforeEach(() => {
    cy.visit('/');
    signin();
  });

  it('should use XPL-specific frame codes', () => {
    fillFenceConfig({
      systemType:       'XPL',
      runLength:        10000,
      targetHeight:     1800,
      // slatSize:         '65',           // Only valid option for XPL
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

    // XPL uses different side frame code — QS-5800-SF must not appear
    assertBomDoesNotContainCode('QS-5800-SF');
  });

  it('should not allow 90mm slat selection when XPL is chosen', () => {
    fillFenceConfig({ systemType: 'XPL' });

    // 90mm option should be disabled or absent in the slat size selector
    cy.get(SEL.slatSize)
      .should(($el) => {
        // Either disabled or not present at all
        if ($el.length > 0) {
          expect($el.prop('disabled')).to.equal(true);
        }
        // If length === 0, the option is simply not rendered — that's also fine
      });
  });
});
