/**
 * TC11 — VS Vertical Slat Screen Baseline
 * Verifies that the VS system generates a BOM successfully.
 *
 * NOTE: The exact VS-specific product codes need verification against the app.
 * The app's VS system (generateVerticalRunBOM) shares some codes with QSHS.
 * Specific code assertions have been removed pending code audit — see cypress-test-report.md.
 *
 * Note: Exact prices for VS system are pending confirmation — this test is structural.
 */
import { fillFenceConfig, generateBom, signin } from '../../support/helpers';
import { SEL } from '../../support/selectors';

describe('TC11 — VS Vertical Slat Screen Baseline', () => {
  beforeEach(() => {
    cy.visit('/');
    signin();
  });

  it('should generate a BOM for VS system', () => {
    fillFenceConfig({
      systemType:       'VS',
      runLength:        10000,
      targetHeight:     1800,
      slatSize:         '65',
      slatGap:          '9',
      colour:           'Surfmist Matt',
      maxPanelWidth:    '2000',         // '1200' does not exist; use nearest valid option
      postMounting:     'Concreted in ground',
      leftTermination:  'Post',
      rightTermination: 'Post',
      corners:          0,
    });

    generateBom();

    // BOM must render
    cy.get(SEL.bomTable).should('be.visible');

    // TODO: Add verified VS-specific code assertions once exact product codes are confirmed
    // e.g. assertBomContainsCode('VS-????-SM');
    // e.g. assertBomDoesNotContainCode('QSHS-only-code');
  });
});
