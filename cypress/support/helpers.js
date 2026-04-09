import { SEL } from './selectors';

/**
 * Fill the fence configuration form with the given values.
 * Only sets fields that are provided — leaves others at their current/default value.
 *
 * runLength is always provided in millimetres (mm).
 * The existing HTML app uses metres — if the input has data-unit="m", the value
 * is automatically divided by 1000 before typing.
 */
export function fillFenceConfig(config) {
  // If neither the entry step button nor the form is visible yet (e.g. after a
  // cy.visit('/') that lands on the HomePage), navigate to the wizard first.
  const isHtmlApp = Cypress.env('isHtmlApp');
  if (!isHtmlApp) {
    cy.url().then((url) => {
      if (!url.includes('/new')) {
        cy.visit('/new');
      }
    });
  }

  // Wait for either the entry step button OR the fence config form to be present,
  // then click through the entry step if needed. This handles both the React app
  // (which starts at /new with an entry step) and the HTML app (form is immediate).
  cy.get('[data-testid="configure-manually-btn"], [data-testid="system-type"]').then(() => {
    cy.get('body').then(($body) => {
      if ($body.find('[data-testid="configure-manually-btn"]').length > 0) {
        cy.get('[data-testid="configure-manually-btn"]').click();
      }
    });
  });

  if (config.systemType != null) {
    cy.get(SEL.systemType).then($el => {
      if ($el.is('select')) {
        cy.wrap($el).select(config.systemType);
      } else {
        // ButtonGroup — click the matching option button
        cy.get(`[data-testid="system-type-option-${config.systemType}"]`).click();
      }
    });
  }
  if (config.runLength != null) {
    // Support both mm-native inputs and the existing HTML app's metre-based input.
    cy.get(SEL.runLength).then(($el) => {
      const unit = $el.attr('data-unit') || 'mm';
      const val = unit === 'm' ? config.runLength / 1000 : config.runLength;
      cy.wrap($el).clear().type(String(val));
    });
  }
  if (config.targetHeight != null) {
    cy.get(SEL.targetHeight).clear().type(String(config.targetHeight));
  }
  if (config.slatSize != null) {
    cy.get(SEL.slatSize).select(config.slatSize);
  }
  if (config.slatGap != null) {
    cy.get(SEL.slatGap).select(config.slatGap);
  }
  if (config.colour != null) {
    cy.get(SEL.colour).select(config.colour);
  }
  if (config.maxPanelWidth != null) {
    cy.get(SEL.maxPanelWidth)
      .select(config.maxPanelWidth)
      .should('have.value', config.maxPanelWidth);
  }
  if (config.postMounting != null) {
    cy.get(SEL.postMounting).select(config.postMounting);
  }
  if (config.leftTermination != null) {
    cy.get(SEL.leftTermination).select(config.leftTermination);
  }
  if (config.rightTermination != null) {
    cy.get(SEL.rightTermination).select(config.rightTermination);
  }
  if (config.corners != null) {
    cy.get(SEL.corners).clear().type(String(config.corners));
  }
  // if (config.pricingTier != null) {
  //   cy.get(SEL.pricingTier).select(config.pricingTier);
  // }
}

/**
 * Add a gate to the configuration.
 * Clicks the "Add Gate" button, fills the gate form, and saves it.
 */
export function addGate(gate) {
  cy.get(SEL.addGateBtn).click();

  // Handle match-fence toggle. Default is checked (match), so only uncheck if explicitly false.
  if (gate.matchFence === false) {
    cy.get(SEL.matchGateToFence).uncheck();
  }

  if (gate.gateType != null) {
    cy.get(SEL.gateType).select(gate.gateType);
  }
  if (gate.openingWidth != null) {
    cy.get(SEL.gateOpeningWidth).clear().type(String(gate.openingWidth));
  }
  if (gate.postSize != null) {
    cy.get(SEL.gatePostSize).select(gate.postSize);
  }
  if (gate.height != null) {
    cy.get(SEL.gateHeight).select(gate.height);
  }
  if (gate.colour != null) {
    cy.get(SEL.gateColour).select(gate.colour);
  }
  if (gate.slatGap != null) {
    cy.get(SEL.gateSlatGap).select(gate.slatGap);
  }
  if (gate.slatSize != null) {
    cy.get(SEL.gateSlatSize).select(gate.slatSize);
  }

  cy.get(SEL.saveGateBtn).click();
}

/**
 * Click Generate BOM and wait for the BOM table to appear.
 */
export function generateBom() {
  cy.get(SEL.generateBomBtn).click();
  cy.get(SEL.bomTable).should('be.visible');
}

/**
 * Assert a specific BOM line item exists with the expected values.
 * Uses product code as the lookup key.
 */
export function assertBomLine(
  code,
  expected
) {
  cy.get(SEL.bomTable)
    .contains(SEL.bomRow, code)
    .within(() => {
      if (expected.qty != null) {
        cy.get(SEL.bomRowQty).then(($el) => {
          const $input = $el.find('input');
          if ($input.length > 0) {
            cy.wrap($input).should('have.value', String(expected.qty));
          } else {
            cy.wrap($el).should('contain', String(expected.qty));
          }
        });
      }
      if (expected.unitPrice != null) {
        cy.get(SEL.bomRowUnitPrice).should('contain', expected.unitPrice.toFixed(2));
      }
      if (expected.lineTotal != null) {
        cy.get(SEL.bomRowLineTotal).should('contain', expected.lineTotal.toFixed(2));
      }
    });
}

/**
 * Assert a specific product code appears in the BOM (without checking values).
 */
export function assertBomContainsCode(code) {
  cy.get(SEL.bomTable).should('contain', code);
}

/**
 * Assert a product code does NOT appear in the BOM.
 */
export function assertBomDoesNotContainCode(code) {
  cy.get(SEL.bomTable).should('not.contain', code);
}

/**
 * Assert the grand total matches the expected value.
 * Tolerance of ±$0.02 for rounding differences.
 */
export function assertGrandTotal(expected) {
  cy.get(SEL.bomGrandTotal).invoke('text').then((text) => {
    const actual = parseFloat(text.replace(/[$,]/g, ''));
    expect(actual).to.be.closeTo(expected, 0.02);
  });
}

/**
 * Assert that ALL colour-dependent product codes in the BOM end with the given suffix.
 * Used by colour switch tests. Pass the suffix like '-B' or '-SM'.
 * Excludes colour-agnostic items (e.g. spacer blocks XPL-SB-50PK-09MM, black nylon caps QS-SFC-B).
 */
export function assertAllColouredCodesEndWith(suffix) {
  // Colour-agnostic code patterns that should be skipped
  const agnosticPatterns = ['XPL-SB-', 'QS-SFC-B'];

  cy.get(`${SEL.bomTable} ${SEL.bomRowCode}`).each(($el) => {
    const code = $el.text().trim();
    const isAgnostic = agnosticPatterns.some((p) => code.startsWith(p)) || code === 'QS-SFC-B';
    if (!isAgnostic && code.length > 0) {
      expect(code, `Code ${code} should end with ${suffix}`).to.match(
        new RegExp(`${suffix.replace('-', '\\-')}$`)
      );
    }
  });
}


export function signin(user = 'test@cy.com', password = '123456', path = '/') {
  cy.visit(path);
  cy.get(SEL.signInBtn).click();
  cy.get(SEL.emailInput).type(user);
  cy.get(SEL.passwordInput).type(password);
  cy.get(SEL.signInBtn).click();
}

/**
 * Sign in using credentials for the client inferred from the current spec path.
 * Matches the first key in Cypress.env('clients') found in Cypress.spec.relative.
 * Falls back to glass-outlet credentials if no match.
 */
export function signInForSpec() {
  const specPath = Cypress.spec.relative;
  const clients = Cypress.env('clients') || {};
  const isHtmlApp = Cypress.env('isHtmlApp');

  console.log('specPath', specPath);
  console.log('clients', clients);
  console.log('isHtmlApp', isHtmlApp);

  const clientKey = Object.keys(clients).find(key => specPath.includes(key));
  const client = clients[clientKey] || clients['glass-outlet'] || {};

  const user     = isHtmlApp ? (client.htmlUser     || 'test@cy.com')
                             : (client.reactUser     || 'test@bar.com');
  const password = isHtmlApp ? (client.htmlPassword  || '123456')
                             : (client.reactPassword || '123456');

  signin(user, password, '/');

  // For the React app, navigate to the wizard after sign-in.
  // The HTML app has everything on one page at /; the React wizard lives at /new.
  if (!isHtmlApp) {
    // Wait for the login redirect to complete before navigating.
    // The LoginPage navigates to '/' on success — wait for that before visiting /new,
    // otherwise cy.visit('/new') may run before the session is written and AuthGuard
    // redirects back to /login.
    cy.url().should('not.include', '/login');
    cy.visit('/new');
  }
}

// Backward-compat alias — existing tests keep working unchanged
export function signInAsGlasshouseTestUser() {
  signInForSpec();
}
