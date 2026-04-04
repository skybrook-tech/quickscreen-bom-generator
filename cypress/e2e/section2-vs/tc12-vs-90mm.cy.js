/**
 * TC12 — VS 90mm Slat in Black Satin
 * Verifies colour code switching works for VS system with 90mm slats.
 * All colour-dependent codes must end in -B.
 */
import { fillFenceConfig, generateBom, assertAllColouredCodesEndWith, signin } from '../../support/helpers';

describe('TC12 — VS 90mm Slat in Black Satin', () => {
  beforeEach(() => {
    cy.visit('/');
    signin();
  });

  it('should use 90mm vertical slat code with Black Satin colour codes', () => {
    fillFenceConfig({
      systemType:       'VS',
      runLength:        10000,
      targetHeight:     1800,
      slatSize:         '90',
      slatGap:          '9',
      colour:           'Black Satin',
      maxPanelWidth:    '1200',
      postMounting:     'Concreted in ground',
      leftTermination:  'Post',
      rightTermination: 'Post',
      corners:          0,
      pricingTier:      'Tier 1',
    });

    generateBom();

    // All colour-dependent codes should end in -B
    assertAllColouredCodesEndWith('-B');
  });
});
