import dotenv from 'dotenv';
dotenv.config();

import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    // Default to the existing HTML app for Phase 0 verification.
    // Override with CYPRESS_BASE_URL env var when testing the React app.
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    fixturesFolder: 'cypress/fixtures',
    defaultCommandTimeout: 8000,
    viewportWidth: 1440,
    viewportHeight: 900,
    env: {
      // Per-client credentials, keyed by directory segment in the spec path.
      // signInForSpec() matches the first key found in Cypress.spec.relative.
      isHtmlApp: process.env.CYPRESS_IS_HTML_APP || false,
      clients: {
        'glass-outlet': {
          htmlUser:      'test@cy.com',
          htmlPassword:  '123456',
          reactUser:     'test@glasshouse.com',
          reactPassword: '123456',
        },
        // Future clients:
        // 'acme-fencing': {
        //   htmlUser: 'test@acme.com', htmlPassword: '123456',
        //   reactUser: 'test@acme.com', reactPassword: '123456',
        // },
      },
    },
  },
});
