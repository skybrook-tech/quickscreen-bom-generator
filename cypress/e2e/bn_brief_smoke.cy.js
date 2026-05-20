describe("Brief BN calculator smoke", () => {
  it("keeps BN sidebar, BOM, gate, and header behaviours intact", () => {
    const session = {
      access_token: "bn-smoke-token",
      refresh_token: "bn-smoke-refresh",
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
    cy.visit("/fence-calculator", {
      onBeforeLoad(win) {
        win.localStorage.setItem("sb-localhost-auth-token", JSON.stringify(session));
      },
    });

    cy.contains("button", "Enter").click();
    cy.contains("(Click to describe)").should("be.visible");
    cy.contains("button", "Quick Screen Horizontal Slats").click();
    cy.contains("(Click to describe)").should("not.exist");

    cy.contains("button", "BOM").should("be.visible");
    cy.contains("button", "Map").should("be.visible");
    cy.contains("button", "Generate BOM").should("not.exist");
    cy.contains("button", "Clear BOM").should("not.exist");
    cy.contains("label", "Include map").should("be.visible");
    cy.contains("button", "Print BOM").should("be.visible");

    cy.contains("button", "Map").click();
    cy.contains("label", "Include map").should("not.exist");
    cy.contains("button", "BOM").click();

    cy.contains("button", "Add gate").click();
    cy.contains("Gate Type & Direction").scrollIntoView().should("be.visible");
    cy.contains("Slat, Post & Colour").should("exist");
    cy.contains("Hardware & Weight").should("exist");
    cy.contains("Gate Components").should("exist");
    cy.contains("Hardware & Weight").scrollIntoView().click();
    cy.contains("Estimated leaf weight").scrollIntoView().should("be.visible");

    cy.get('[aria-label="Collapse gate settings"]').click();
    cy.contains("Swing in").should("not.exist");
    cy.contains("Swing out").should("not.exist");
    cy.contains("Hinge:").should("be.visible");
    cy.get("body").should("not.contain", "TC-H-AT-HD-B");
  });
});
