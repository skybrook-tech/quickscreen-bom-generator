let browserErrors = [];

const session = {
  access_token: "anyfence-smoke-token",
  refresh_token: "anyfence-smoke-refresh",
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
  // Mock Google Maps JS SDK script load
  cy.intercept("GET", "https://maps.googleapis.com/maps/api/js*", (req) => {
    const url = new URL(req.url);
    const callbackName = url.searchParams.get("callback") || "";
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
          class LatLngBounds {
            constructor(sw, ne) { this._sw = sw; this._ne = ne; }
            getSouthWest() { return this._sw; }
            getNorthEast() { return this._ne; }
          }
          class Map {
            constructor(el, opts) {
              this.el = el;
              this.center = opts.center;
              this.zoom = opts.zoom;
              this.mapTypeId = opts.mapTypeId;
              this.options = opts;
              this.render();
            }
            render() {
              this.el.innerHTML =
                '<div style="height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1f3b32,#6f875d 45%,#223048);color:white;font:700 18px system-ui;text-align:center;">' +
                '<div><div>Mock satellite imagery</div><div style="font-size:12px;margin-top:8px;">' +
                this.mapTypeId + ' · zoom ' + this.zoom + '</div></div></div>';
            }
            panTo(position) { this.center = position; this.render(); }
            setCenter(position) { this.center = position; this.render(); }
            setZoom(zoom) { this.zoom = zoom; this.render(); }
            getZoom() { return this.zoom; }
            getCenter() {
              if (this.center && typeof this.center.lat === 'function') return this.center;
              const c = this.center || { lat: -25, lng: 133 };
              return new LatLng(c.lat, c.lng);
            }
            setMapTypeId(mapTypeId) { this.mapTypeId = mapTypeId; this.render(); }
            setOptions(opts) { this.options = { ...this.options, ...opts }; }
            fitBounds() {}
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
          class AutocompleteSessionToken {}
          class AutocompleteSuggestion {
            static fetchAutocompleteSuggestions() {
              return Promise.resolve({ suggestions: [] });
            }
          }

          // Safety merge to preserve loader properties (like callback targets)
          window.google = window.google || {};
          window.google.maps = window.google.maps || {};
          window.google.maps.LatLng = LatLng;
          window.google.maps.LatLngBounds = LatLngBounds;
          window.google.maps.Map = Map;
          window.google.maps.Marker = Marker;
          window.google.maps.event = {
            addListener(instance, eventName, handler) {
              return { remove() {} };
            },
            addListenerOnce(instance, eventName, handler) {
              return { remove() {} };
            },
            removeListener(listener) {}
          };
          window.google.maps.importLibrary = (name) => {
            if (name === 'places') {
              return Promise.resolve({ AutocompleteSuggestion, AutocompleteSessionToken });
            }
            return Promise.resolve({});
          };

          const callbackName = "${callbackName}";
          if (callbackName) {
            const parts = callbackName.split(".");
            let obj = window;
            for (let i = 0; i < parts.length - 1; i++) {
              if (obj) obj = obj[parts[i]];
            }
            const lastPart = parts[parts.length - 1];
            if (obj && typeof obj[lastPart] === "function") {
              obj[lastPart]();
            }
          }
        })();
      `,
    });
  });

  // Mock Google Geocoding API response
  cy.intercept("GET", "https://maps.googleapis.com/maps/api/geocode/json*", (req) => {
    req.reply({
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

  cy.intercept("GET", /staticmap/, (req) => {
    req.reply({
      statusCode: 200,
      headers: {
        "content-type": "image/png",
        "access-control-allow-origin": "*",
      },
      body: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      encoding: "base64",
    });
  });
}

describe("Anyfence entry page — Stages 1-3", () => {
  beforeEach(() => {
    browserErrors = [];
    mockGoogleMaps();
    cy.on("window:before:load", (win) => {
      // Mock Image constructor to bypass Google Static Maps loading & CORS issues
      const OriginalImage = win.Image;
      win.Image = function() {
        const img = new OriginalImage();
        Object.defineProperty(img, "naturalWidth", { get: () => 640 });
        Object.defineProperty(img, "naturalHeight", { get: () => 480 });
        Object.defineProperty(img, "src", {
          set(val) {
            if (typeof val === "string" && val.includes("staticmap")) {
              img.setAttribute("src", "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==");
              setTimeout(() => {
                if (img.onload) img.onload();
              }, 5);
            } else {
              img.setAttribute("src", val);
            }
          },
          get() {
            return img.getAttribute("src") || "";
          }
        });
        return img;
      };

      win.console.error = (...args) => {
        const msg = args.map(a => {
          if (!a) return String(a);
          if (a.stack) return String(a.stack);
          if (a.message) return String(a.message);
          return typeof a === 'object' ? JSON.stringify(a) : String(a);
        }).join(" ");
        browserErrors.push("Console Error: " + msg);
      };
      win.addEventListener("error", (event) => {
        browserErrors.push(event.error ? event.error.stack || event.error.message : event.message);
      });
      win.addEventListener("unhandledrejection", (event) => {
        browserErrors.push(event.reason ? event.reason.stack || event.reason.message || event.reason : "Unhandled Promise Rejection");
      });
    });
    cy.visit("/fence-calculator", {
      onBeforeLoad(win) {
        win.localStorage.setItem("sb-localhost-auth-token", JSON.stringify(session));
      },
    });
  });

  afterEach(() => {
    cy.window().then((win) => {
      const routeErr = win.__route_error;
      if (routeErr) {
        browserErrors.push("Route Error: " + (routeErr.stack || routeErr.message || routeErr));
      }
      if (browserErrors.length > 0) {
        throw new Error("Browser error detected:\n" + browserErrors.join("\n\n"));
      }
    });
  });

  it("shows Amazing Fencing brand, not Glass Outlet", () => {
    cy.contains("Amazing Fencing").should("be.visible");
    cy.contains("Glass Outlet").should("not.exist");
    cy.contains("Powered by Anyfence").should("be.visible");
  });

  it("shows skip-link under the address input", () => {
    cy.contains("Skip the map").should("be.visible");
  });

  it("lights up the drawing toolbar after Use this view", () => {
    cy.get('input[placeholder="Start with an Australian street address"]').type("Sydney NSW{enter}");
    cy.wait("@geocode");

    cy.contains("Live Google Maps").should("be.visible");
    cy.contains("Use this view").click();

    // Check if there are any browser errors or exceptions
    cy.wrap(browserErrors).should("be.empty");

    // Verify drawing toolbar tools are visible
    cy.contains("Draw Fence").should("be.visible");
    cy.contains("Photo pin").should("be.visible"); // new tool
    cy.contains("Tree").should("be.visible");      // new tool
    cy.contains("North").should("be.visible");     // new tool

    // Verify Stage 3 "🔒 Captured · drawing-ready" pill is present
    cy.contains("Captured · drawing-ready").should("be.visible");

    // Verify Sidebar availability states
    cy.contains("Timber Paling").should("be.visible");
    cy.contains("Colorbond").should("be.visible");
    cy.contains("SOON").should("be.visible");
  });
});
