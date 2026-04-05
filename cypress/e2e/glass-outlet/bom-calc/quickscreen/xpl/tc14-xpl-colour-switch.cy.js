/**
 * TC14 — XPL Colour Switch to Black Satin
 * All XPL colour-dependent codes must switch to -B suffix.
 */
import { fillFenceConfig, generateBom, assertAllColouredCodesEndWith, signInAsGlasshouseTestUser } from '../../../../../support/helpers';

describe('TC14 — XPL Colour Switch to Black Satin', () => {
  beforeEach(() => {
    signInAsGlasshouseTestUser();
  });

  it('should switch all XPL colour-dependent codes to -B', () => {
    fillFenceConfig({
      systemType:       'XPL',
      runLength:        10000,
      targetHeight:     1800,
      // slatSize omitted — XPL disables the entire select and forces 65mm automatically
      slatGap:          '9',
      colour:           'Black Satin',
      maxPanelWidth:    '2600',
      postMounting:     'Concreted in ground',
      leftTermination:  'Post',
      rightTermination: 'Post',
      corners:          0,
    });

    generateBom();
    assertAllColouredCodesEndWith('-B');
  });
});
