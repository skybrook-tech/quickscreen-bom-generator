/*!
 * QuickScreen / Skybrook embeddable calculator loader.
 * Dependency-free. A supplier drops ONE tag on their page:
 *
 *   <script src="https://app.skybrook.com.au/embed.js" data-org="glass-outlet" defer></script>
 *
 * It injects an auto-resizing, chromeless iframe of the calculator for that org.
 * No bundler, no framework — keep it tiny and side-effect-free.
 */
(function () {
  "use strict";

  // The currently-executing <script> tag. document.currentScript works for a
  // normal (defer/sync) include; fall back to scanning for our own src.
  var self =
    document.currentScript ||
    (function () {
      var scripts = document.getElementsByTagName("script");
      for (var i = scripts.length - 1; i >= 0; i--) {
        if (/\/embed\.js(\?|$)/.test(scripts[i].src)) return scripts[i];
      }
      return null;
    })();

  if (!self) return;

  var org = self.getAttribute("data-org");
  if (!org) {
    // eslint-disable-next-line no-console
    console.error("[quickscreen] embed.js: missing required data-org attribute");
    return;
  }

  // APP_ORIGIN is derived from this script's own src — never hardcoded — so the
  // same file works on localhost, staging, and production.
  var APP_ORIGIN = new URL(self.src, window.location.href).origin;
  var src = APP_ORIGIN + "/embed/" + encodeURIComponent(org);

  var INITIAL_HEIGHT = 700;
  var heightMode = self.getAttribute("data-height-mode") || "auto"; // 'auto' | 'fixed'

  var iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.title = "Quote calculator";
  iframe.loading = "lazy";
  iframe.setAttribute("allow", "geolocation"); // the layout map may request it
  iframe.style.width = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.height = INITIAL_HEIGHT + "px";
  iframe.style.minHeight = "480px";

  // Insert the iframe where the script tag sits.
  self.parentNode.insertBefore(iframe, self.nextSibling);

  // Auto-resize: the embed posts { type: 'quickscreen:resize', height } as its
  // content grows/shrinks. Only trust messages from our own iframe + origin.
  window.addEventListener("message", function (event) {
    if (event.source !== iframe.contentWindow) return;
    if (event.origin !== APP_ORIGIN) return;
    var data = event.data;
    if (!data || typeof data !== "object") return;

    if (data.type === "quickscreen:resize" && heightMode === "auto") {
      var h = parseInt(data.height, 10);
      if (h > 0 && h < 20000) iframe.style.height = h + "px";
    }
    // quickscreen:ready and quickscreen:quote-created are forwarded to the host
    // page as a CustomEvent so suppliers can hook analytics / lead capture.
    if (data.type === "quickscreen:ready" || data.type === "quickscreen:quote-created") {
      try {
        window.dispatchEvent(new CustomEvent(data.type, { detail: data }));
      } catch (e) {
        /* older browsers — non-fatal */
      }
    }
  });
})();
