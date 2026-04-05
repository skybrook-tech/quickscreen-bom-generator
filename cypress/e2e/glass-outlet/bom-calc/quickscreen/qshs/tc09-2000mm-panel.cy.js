/**
 * TC9 — QSHS 2000mm Max Panel Width (Windy Site)
 * 20000mm / 2000mm = 10 panels × 2000mm (evenly distributed)
 * Posts = 10 + 1 = 11
 */
import { fillFenceConfig, generateBom, assertBomLine, signInAsGlasshouseTestUser } from '../../../../../support/helpers';

describe('TC9 — QSHS 2000mm Max Panel Width', () => {
  beforeEach(() => {
    signInAsGlasshouseTestUser();
  });

  it('should produce more panels and posts with narrower max width', () => {
    fillFenceConfig({
      systemType:       'QSHS',
      runLength:        20000,
      targetHeight:     1800,
      slatSize:         '65',
      slatGap:          '9',
      colour:           'Surfmist Matt',
      maxPanelWidth:    '2000',         // Changed — windy/exposed site
      postMounting:     'Concreted in ground',
      leftTermination:  'Post',
      rightTermination: 'Post',
      corners:          0,
      pricingTier:      'Tier 1',
    });

    generateBom();

    // 10 panels × 2000mm → 10 + 1 = 11 posts
    assertBomLine('XP-2400-FP-SM', { qty: 11 });
  });
});
