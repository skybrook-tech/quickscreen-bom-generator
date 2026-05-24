import { describe, expect, it } from "vitest";
import indexHtml from "../../index.html?raw";
import manifestText from "../../public/manifest.webmanifest?raw";

describe("PWA icon assets", () => {
  it("references the Glass Outlet symbol icons from the manifest and document head", () => {
    const manifest = JSON.parse(manifestText) as {
      icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
    };

    expect(manifest.icons).toEqual([
      {
        src: "/icons/glass-outlet-symbol-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icons/glass-outlet-symbol-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ]);
    expect(indexHtml).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />');
    expect(indexHtml).toContain('<link rel="icon" type="image/png" href="/icons/glass-outlet-symbol-192.png" />');
  });
});
