/**
 * TC14 — XPL Colour Switch to Black Satin
 * All XPL colour-dependent codes must switch to -B suffix.
 */
import { fillFenceConfig, generateBom, assertAllColouredCodesEndWith } from '../../support/helpers';

describe('TC14 — XPL Colour Switch to Black Satin', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should switch all XPL colour-dependent codes to -B', () => {
    fillFenceConfig({
      systemType:       'XPL',
      runLength:        10000,
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
    assertAllColouredCodesEndWith('-B');
  });
});
