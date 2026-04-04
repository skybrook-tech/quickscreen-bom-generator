import './commands';

// Suppress uncaught exception errors from the existing HTML app's JS
// (e.g. auth-related errors when running without a backend).
Cypress.on('uncaught:exception', (err) => {
  // Return false to prevent the error from failing the test.
  // Remove this if testing the React app with a real backend.
  if (err.message.includes('supabase') || err.message.includes('auth')) {
    return false;
  }
  // Let other unexpected errors still fail tests.
  return true;
});
