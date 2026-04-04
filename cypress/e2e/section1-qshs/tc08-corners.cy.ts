/**
 * TC8 — QSHS with 2 Corners
 * Each 90° corner adds 1 post.
 * Posts = TC1 posts (9) + 2 corner posts = 11
 */
import { fillFenceConfig, generateBom, assertBomLine } from '../../support/helpers';

describe('TC8 — QSHS with 2 Corners', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('should add 1 post per corner', () => {
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
      corners:          2,              // Changed from 0
      pricingTier:      'Tier 1',
    });

    generateBom();

    // Posts = 9 (TC1) + 2 corner posts = 11
    assertBomLine('XP-2400-FP-SM', { qty: 11 });
  });
});
