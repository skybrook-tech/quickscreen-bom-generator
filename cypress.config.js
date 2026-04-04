const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    // Default to the existing HTML app for Phase 0 verification.
    // Override with CYPRESS_BASE_URL env var when testing the React app.
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.js',
    supportFile: 'cypress/support/e2e.js',
    fixturesFolder: 'cypress/fixtures',
    // Give BOM generation time to compute
    defaultCommandTimeout: 8000,
    viewportWidth: 1440,
    viewportHeight: 900,
  },
});
