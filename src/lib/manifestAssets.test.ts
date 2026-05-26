import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";
import indexHtml from "../../index.html?raw";
import manifestText from "../../public/manifest.webmanifest?raw";

function pngDimensions(path: string): { width: number; height: number; bytes: number } {
  const buffer = readFileSync(path);
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bytes: buffer.length,
  };
}

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

  it("ships valid PNG icon dimensions", () => {
    expect(pngDimensions("public/icons/glass-outlet-symbol-192.png")).toEqual({
      width: 192,
      height: 192,
      bytes: expect.any(Number),
    });
    expect(pngDimensions("public/icons/glass-outlet-symbol-512.png")).toEqual({
      width: 512,
      height: 512,
      bytes: expect.any(Number),
    });
    expect(pngDimensions("public/icons/apple-touch-icon.png")).toEqual({
      width: 180,
      height: 180,
      bytes: expect.any(Number),
    });
  });

  it("keeps generated icon file sizes in the expected simple-asset range", () => {
    for (const path of [
      "public/icons/glass-outlet-symbol-192.png",
      "public/icons/glass-outlet-symbol-512.png",
      "public/icons/apple-touch-icon.png",
    ]) {
      const { bytes } = pngDimensions(path);
      expect(bytes).toBeGreaterThanOrEqual(500);
      expect(bytes).toBeLessThanOrEqual(50_000);
    }
  });
});
