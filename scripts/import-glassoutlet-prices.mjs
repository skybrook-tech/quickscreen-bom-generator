import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const repoRoot = process.cwd();
const seedDir = path.join(repoRoot, "supabase", "seeds", "glass-outlet", "products");
const csvDir =
  process.env.GLASS_OUTLET_PRICE_CSV_DIR ??
  path.resolve(repoRoot, "..", "Glass Outlet csv pricelist");
const verifiedDate = process.env.GLASS_OUTLET_PRICE_VERIFIED_DATE ?? "2026-05-09";

function isSku(value) {
  return (
    typeof value === "string" &&
    /^[A-Z0-9]+(?:-[A-Z0-9.]+)+$/.test(value.trim()) &&
    !value.trim().startsWith("http")
  );
}

function parseMoney(value) {
  const n = Number(String(value ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? Number(n.toFixed(2)) : null;
}

function parseMinQty(range) {
  const text = String(range ?? "").trim();
  const match = text.match(/^(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const min = Number(match[1]);
  return Number.isFinite(min) && min > 0 ? min : null;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function extractCsvPrices() {
  const prices = new Map();
  const csvFiles = fs
    .readdirSync(csvDir)
    .filter((file) => file.toLowerCase().endsWith(".csv"))
    .sort();

  for (const file of csvFiles) {
    const filePath = path.join(csvDir, file);
    const parsed = Papa.parse(fs.readFileSync(filePath, "utf8"), {
      skipEmptyLines: false,
    });

    for (const row of parsed.data) {
      if (!Array.isArray(row)) continue;
      for (let i = 0; i < row.length; i++) {
        const sku = String(row[i] ?? "").trim();
        if (!isSku(sku)) continue;

        const tiers = [];
        for (const [rangeIdx, priceIdx] of [
          [i + 1, i + 2],
          [i + 3, i + 4],
          [i + 5, i + 6],
        ]) {
          const minQty = parseMinQty(row[rangeIdx]);
          const unitPrice = parseMoney(row[priceIdx]);
          if (minQty !== null && unitPrice !== null) {
            tiers.push({ minQty, unitPrice });
          }
        }

        if (tiers.length === 0) continue;

        const unique = Array.from(
          new Map(tiers.map((tier) => [tier.minQty, tier])).values(),
        ).sort((a, b) => a.minQty - b.minQty);

        const existing = prices.get(sku);
        if (!existing || unique.length > existing.tiers.length) {
          prices.set(sku, {
            sku,
            name: String(row[i - 1] ?? sku).replace(/\s+/g, " ").trim() || sku,
            tiers: unique,
            sourceFile: file,
          });
        }
      }
    }
  }

  return prices;
}

function inferCategory(sku, name) {
  const haystack = `${sku} ${name}`.toLowerCase();
  if (haystack.includes("sliding gate motor") || haystack.includes("filo")) return "automation";
  if (haystack.includes("hinge") || haystack.includes("latch") || haystack.includes("drop bolt")) return "hardware";
  if (haystack.includes("screw")) return "screw";
  if (haystack.includes("spacer")) return "accessory";
  if (haystack.includes("side frame")) return "side_frame";
  if (haystack.includes("concealed fixing cover") || haystack.includes("cfc")) return "cfc_cover";
  if (haystack.includes("f section")) return "f_section";
  if (haystack.includes("centre support rail") || haystack.includes("center support rail")) return "centre_support_rail";
  if (haystack.includes("rail")) return "rail";
  if (haystack.includes("post")) return "post";
  if (haystack.includes("slat")) return "slat";
  if (haystack.includes("track") || haystack.includes("wheel") || haystack.includes("catch")) return "gate";
  if (haystack.includes("grout") || haystack.includes("silicone") || haystack.includes("epoxy")) return "accessory";
  return "accessory";
}

function inferUnit(sku, name) {
  const haystack = `${sku} ${name}`.toLowerCase();
  if (/\b\d+\s*(?:mm|m)\s*long\b/.test(haystack)) return "length";
  if (haystack.includes(" slat") || haystack.includes(" rail") || haystack.includes(" frame")) return "length";
  if (/\b\d+pk\b/i.test(sku) || haystack.includes(" pack") || haystack.includes("pair of")) return "pack";
  return "each";
}

function pricingRowsFor(sku, priceInfo) {
  // tier1 only: the CSV carries a single price column, and seeds store sparse
  // tiers (tier1 base + tier2/3 rows only where a tier's price differs — the
  // engine overlays at price time). Do NOT triplicate across tierCodes; that
  // was the pre-2026-07 pattern the pricing-rules slim removed.
  return priceInfo.tiers.map((tier) => ({
    sku,
    tier_code: "tier1",
    rule: `qty >= ${tier.minQty}`,
    price: tier.unitPrice,
    priority: tier.minQty,
    valid_from: null,
    valid_to: null,
    notes: `Glass Outlet CSV ${priceInfo.sourceFile}; verified ${verifiedDate}`,
    active: true,
  }));
}

function updateLocalPriceBreaks(priceRulesBySku) {
  const entries = [...priceRulesBySku.entries()]
    .map(([sku, rows]) => {
      const breaks = Array.from(
        new Set(
          rows
            .map((row) => String(row.rule ?? "").match(/qty\s*>=\s*(\d+(?:\.\d+)?)/)?.[1])
            .filter(Boolean)
            .map(Number),
        ),
      ).sort((a, b) => a - b);
      return [sku, breaks];
    })
    .filter(([, breaks]) => breaks.length > 0)
    .sort(([a], [b]) => a.localeCompare(b));

  const lines = [
    "// Generated from Glass Outlet CSV price-list quantity break columns.",
    "// Each array is the minimum quantity for each available supplier quantity break.",
    "export const localPriceBreaks = {",
    ...entries.map(
      ([sku, breaks]) => `  ${JSON.stringify(sku)}: [${breaks.join(", ")}],`,
    ),
    "} as const;",
    "",
    "export function tierForSkuQuantity(sku: string, qty: number): \"tier1\" | \"tier2\" | \"tier3\" {",
    "  const breaks = (localPriceBreaks as Record<string, readonly number[] | undefined>)[sku];",
    "  if (!breaks || breaks.length <= 1) return \"tier1\";",
    "  let index = 0;",
    "  for (let i = 0; i < breaks.length; i += 1) {",
    "    if (qty >= breaks[i]) index = i;",
    "  }",
    "  return (`tier${Math.min(index + 1, 3)}` as \"tier1\" | \"tier2\" | \"tier3\");",
    "}",
    "",
  ];

  fs.writeFileSync(path.join(repoRoot, "src", "lib", "localPriceBreaks.ts"), lines.join("\n"));
}

const csvPrices = extractCsvPrices();
const seedFiles = fs
  .readdirSync(seedDir)
  .filter((file) => file.endsWith(".json") && file !== "price_catalogue.json")
  .sort();

let componentMatches = 0;
let pricingRows = 0;
const importedPricingBySku = new Map();
const existingSeedSkus = new Set();

for (const file of seedFiles) {
  const filePath = path.join(seedDir, file);
  const data = readJson(filePath);
  const components = data.product_components ?? [];
  const skusInFile = new Set(components.map((component) => component.sku));
  for (const sku of skusInFile) existingSeedSkus.add(sku);
  const matchedSkus = [...skusInFile].filter((sku) => csvPrices.has(sku));

  if (matchedSkus.length === 0) continue;

  for (const component of components) {
    const priceInfo = csvPrices.get(component.sku);
    if (!priceInfo) continue;
    component.default_price = priceInfo.tiers[0].unitPrice;
    component.metadata = {
      ...(component.metadata ?? {}),
      price_source: "glassoutletonline.com.au CSV export",
      price_verified_date: verifiedDate,
      price_source_file: priceInfo.sourceFile,
    };
    componentMatches++;
  }

  const replacementRows = matchedSkus.flatMap((sku) => {
    const rows = pricingRowsFor(sku, csvPrices.get(sku));
    importedPricingBySku.set(sku, rows);
    return rows;
  });
  pricingRows += replacementRows.length;

  data.pricing_rules = [
    ...(data.pricing_rules ?? []).filter((row) => !skusInFile.has(row.sku) || !csvPrices.has(row.sku)),
    ...replacementRows,
  ].sort((a, b) => {
    const skuCompare = a.sku.localeCompare(b.sku);
    if (skuCompare !== 0) return skuCompare;
    const tierCompare = a.tier_code.localeCompare(b.tier_code);
    if (tierCompare !== 0) return tierCompare;
    return (b.priority ?? 0) - (a.priority ?? 0);
  });

  writeJson(filePath, data);
}

const catalogueOnlySkus = [...csvPrices.keys()]
  .filter((sku) => !existingSeedSkus.has(sku))
  .sort();
const priceCatalogue = {
  org_slug: "glass-outlet",
  product_components: catalogueOnlySkus.map((sku) => {
    const priceInfo = csvPrices.get(sku);
    return {
      sku,
      name: priceInfo.name,
      description: priceInfo.name,
      category: inferCategory(sku, priceInfo.name),
      unit: inferUnit(sku, priceInfo.name),
      default_price: priceInfo.tiers[0].unitPrice,
      system_types: ["QSHS", "VS", "XPL", "BAYG", "GATE"],
      metadata: {
        price_source: "glassoutletonline.com.au CSV export",
        price_verified_date: verifiedDate,
        price_source_file: priceInfo.sourceFile,
      },
      active: true,
    };
  }),
  pricing_rules: catalogueOnlySkus.flatMap((sku) => {
    const rows = pricingRowsFor(sku, csvPrices.get(sku));
    importedPricingBySku.set(sku, rows);
    return rows;
  }),
};

writeJson(path.join(seedDir, "price_catalogue.json"), priceCatalogue);
updateLocalPriceBreaks(importedPricingBySku);

console.log(
  JSON.stringify(
    {
      csvDir,
      verifiedDate,
      csvPriceSkus: csvPrices.size,
      componentMatches,
      catalogueOnlySkus: catalogueOnlySkus.length,
      pricingRows: pricingRows + priceCatalogue.pricing_rules.length,
      unmatchedSeedSkus:
        seedFiles
          .flatMap((file) => {
            const data = readJson(path.join(seedDir, file));
            return (data.product_components ?? []).map((component) => component.sku);
          })
          .filter((sku) => !csvPrices.has(sku)).length,
    },
    null,
    2,
  ),
);
