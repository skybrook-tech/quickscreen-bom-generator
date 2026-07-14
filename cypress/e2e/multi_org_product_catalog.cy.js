// Regression: cross-org product-catalogue leak (2026-07-08).
//
// Switching tenants in the SAME browser session must never show the previous
// org's products: the TanStack cache is cleared on auth change
// (src/lib/queryClient.ts) and the Glass Outlet build-time fixtures are no
// longer used as a fallback when a backend is configured (useProducts).
//
// Requires the local stack seeded with BOTH orgs (npm run db:reset):
//   admin@glass-outlet.com / 123456   and   admin@amazing-fencing.com / 123456

function signIn(email) {
  cy.get('[data-testid="email-input"]').clear().type(email);
  cy.get('[data-testid="password-input"]').clear().type("123456");
  cy.get('[data-testid="sign-in-btn"]').click();
}

function enterCalculatorIfGated() {
  // The landing screen shows an "Enter" button on first visit.
  cy.get("body").then(($body) => {
    const enter = [...$body.find("button")].find((b) => b.textContent.trim() === "Enter");
    if (enter) cy.wrap(enter).click();
  });
}

describe("Multi-org product catalogue isolation", () => {
  it("shows each org only its own products when switching logins in one session", () => {
    // ── Glass Outlet ──────────────────────────────────────────────────────
    cy.visit("/fence-calculator");
    signIn("admin@glass-outlet.com");
    enterCalculatorIfGated();

    cy.contains("Start a new quote", { timeout: 15000 }).should("be.visible");
    cy.contains("Horizontal Slat").should("exist");
    cy.contains("Colorbond").should("exist");
    cy.screenshot("catalog-glass-outlet");

    // ── Sign out, sign in as Amazing Fencing IN THE SAME SESSION ─────────
    cy.get('button[title="Sign out"]').click();
    cy.get('[data-testid="email-input"]', { timeout: 15000 }).should("be.visible");
    signIn("admin@amazing-fencing.com");
    enterCalculatorIfGated();

    cy.contains("Start a new quote", { timeout: 15000 }).should("be.visible");
    // AF's own two fence products…
    cy.contains("Colorbond").should("exist");
    cy.contains("Timber Paling").should("exist");
    // …and NONE of Glass Outlet's (the pre-fix bug: cached/fixture GO list)
    cy.contains("Horizontal Slat").should("not.exist");
    cy.contains("Vertical Slat").should("not.exist");
    cy.contains("XPress").should("not.exist");
    cy.screenshot("catalog-amazing-fencing");
  });
});
