const session = {
  access_token: "property-map-smoke-token",
  refresh_token: "property-map-smoke-refresh",
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

function mockGoogleMaps() {
  cy.intercept("GET", "https://maps.googleapis.com/maps/api/js*", (req) => {
    req.reply({
      statusCode: 200,
      headers: { "content-type": "application/javascript" },
      body: `
        (() => {
          class LatLng {
            constructor(lat, lng) { this._lat = lat; this._lng = lng; }
            lat() { return this._lat; }
            lng() { return this._lng; }
          }
          class Map {
            constructor(el, opts) {
              this.el = el;
              this.center = opts.center;
              this.zoom = opts.zoom;
              this.mapTypeId = opts.mapTypeId;
              this.render();
            }
            render() {
              this.el.innerHTML =
                '<div style="height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1f3b32,#6f875d 45%,#223048);color:white;font:700 18px system-ui;text-align:center;">' +
                '<div><div>Mock satellite imagery</div><div style="font-size:12px;margin-top:8px;">' +
                this.mapTypeId + ' · zoom ' + this.zoom + '</div></div></div>';
            }
            panTo(position) { this.center = position; this.render(); }
            setZoom(zoom) { this.zoom = zoom; this.render(); }
            setMapTypeId(mapTypeId) { this.mapTypeId = mapTypeId; this.render(); }
          }
          class Marker {
            constructor(opts) {
              this.map = opts.map;
              this.position = opts.position;
              this.listeners = {};
            }
            addListener(name, fn) { this.listeners[name] = fn; return { remove() {} }; }
            getPosition() { return this.position; }
            setPosition(position) { this.position = position; }
            setMap(map) { this.map = map; }
          }
          window.google = { maps: { Map, Marker, LatLng } };
          const callback = new URL(document.currentScript.src).searchParams.get("callback");
          if (callback && typeof window[callback] === "function") window[callback]();
        })();
      `,
    });
  });

  cy.intercept("GET", "https://maps.googleapis.com/maps/api/geocode/json*", (req) => {
    req.reply({
      delay: 800,
      statusCode: 200,
      body: {
        status: "OK",
        results: [
          {
            formatted_address: "1 Macquarie Street, Sydney NSW 2000, Australia",
            geometry: { location: { lat: -33.859972, lng: 151.213245 } },
          },
        ],
      },
    });
  }).as("geocode");
}

describe("Property map UI", () => {
  it("shows empty, geocoding, pin, confirmed, and existing run flow states", () => {
    mockGoogleMaps();
    cy.visit("/fence-calculator", {
      onBeforeLoad(win) {
        win.localStorage.setItem("sb-localhost-auth-token", JSON.stringify(session));
      },
    });

    cy.contains("button", "Enter").click();
    cy.contains("Property map").should("be.visible");
    cy.contains("Confirm property location to start drawing").should("be.visible");
    cy.screenshot("property-map-empty", { capture: "viewport" });

    cy.get('input[placeholder="Start with an Australian street address"]').type(
      "1 Macquarie Street Sydney NSW",
    );
    cy.contains("button", "Find property").click();
    cy.contains("button", "Find property").find("svg.animate-spin").should("exist");
    cy.screenshot("property-map-geocoding-loading", { capture: "viewport" });

    cy.wait("@geocode");
    cy.contains("1 Macquarie Street, Sydney NSW 2000, Australia").should("be.visible");
    cy.contains("Pin: -33.859972, 151.213245").should("be.visible");
    cy.screenshot("property-map-pin-drop", { capture: "viewport" });

    cy.contains("button", "Confirm property location").click();
    cy.contains("button", "Location confirmed").should("be.visible");
    cy.contains("Confirm property location to start drawing").should("not.exist");
    cy.contains("button", "Quick Screen Horizontal Slats").click();
    cy.contains("Run 1").should("be.visible");
    cy.screenshot("property-map-confirmed", { capture: "viewport" });
  });
});
