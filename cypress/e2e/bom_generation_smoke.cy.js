const session = {
  access_token: "bom-smoke-token",
  refresh_token: "bom-smoke-refresh",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  expires_in: 3600,
  token_type: "bearer",
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    aud: "authenticated",
    role: "authenticated",
    email: "admin@glass-outlet.com",
    app_metadata: {},
    user_metadata: {},
  },
};

describe("BOM generation", () => {
  it("shows BOM line items after selecting QSHS and entering a run length", () => {
    cy.visit("/fence-calculator", {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem("sb-localhost-auth-token", JSON.stringify(session));
      },
    });

    cy.get('[data-testid="landing-system-QSHS"]').click();
    cy.contains("button", "Section Settings").click();

    cy.contains("span", "Length (m)")
      .parents("label")
      .first()
      .find('input[type="number"]')
      .clear()
      .type("2.4")
      .blur();

    cy.get('[data-testid="bom-desktop-table"]', { timeout: 10000 })
      .contains("XP-6100-S65-B")
      .should("be.visible");
    cy.get('[data-testid="bom-desktop-table"]')
      .contains("QS-5800-SF-B")
      .should("exist");
    cy.contains("Total (inc. GST)").should("exist");
  });
});
