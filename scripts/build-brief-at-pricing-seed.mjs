import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const capturedDate = "2026-05-09";
const sourceHost = "https://glassoutletonline.com.au";
const defaultSourcePath = path.resolve(
  "C:/Users/bbfen/Downloads/fe8c4b63-9c6b-4948-9ae0-37146baefe4e.md",
);
const sourcePath =
  process.argv[2] ?? process.env.GLASS_OUTLET_PRICE_CATALOGUE_MD ?? defaultSourcePath;
const outputPath = path.join(
  repoRoot,
  "supabase",
  "seeds",
  "glass-outlet",
  `pricing-${capturedDate}.json`,
);
const migrationPath = path.join(
  repoRoot,
  "supabase",
  "migrations",
  "024_seed_supplier_prices_2026_05_09.sql",
);
const productCataloguePath = path.join(
  repoRoot,
  "supabase",
  "seeds",
  "glass-outlet",
  "products",
  "price_catalogue.json",
);
const productsDir = path.dirname(productCataloguePath);
const localPriceBreaksPath = path.join(repoRoot, "src", "lib", "localPriceBreaks.ts");

const POSTA_CHARS = [
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "A",
  "B",
  "C",
  "/",
];
const ANOMALY_SKUS = new Set([
  "TC-H-AT-B",
  "TC-H-AT-2L-B",
  "ENDURO-SSC-60",
  "ENDURO-SSRES",
  "MR-FLGG-S",
]);

function markdownCells(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function cleanCell(value) {
  return String(value ?? "")
    .replace(/^`|`$/g, "")
    .replace(/\*\*/g, "")
    .replace(/â€”|â€“|[–—]/g, "-")
    .replace(/â†’/g, "->")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoney(value) {
  const text = cleanCell(value);
  if (!text || text === "—" || text === "-") return null;
  const match = text.match(/\$([0-9][0-9,]*(?:\.\d{1,2})?)/);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : null;
}

function tierMinFromHeader(header) {
  const text = cleanCell(header);
  if (/^base$/i.test(text)) return 1;
  const match = text.match(/^(\d+)\+$/);
  return match ? Number(match[1]) : null;
}

function tierFromCell(header, cell) {
  const price = parseMoney(cell);
  if (price === null) return null;

  const text = cleanCell(cell);
  const cellMin = text.match(/(\d+)\+:/)?.[1];
  const headerMin = tierMinFromHeader(header);
  const minQty = cellMin ? Number(cellMin) : headerMin;
  if (!minQty) return null;

  return { min_qty: minQty, unit_price: price };
}

function inferCategory(sku, name, section) {
  const haystack = `${sku} ${name} ${section}`.toLowerCase();
  if (haystack.includes("hinge") || haystack.includes("latch") || haystack.includes("drop bolt")) return "hardware";
  if (haystack.includes("screw")) return "screw";
  if (haystack.includes("silicone") || haystack.includes("adhesive") || haystack.includes("grout") || haystack.includes("cement")) return "accessory";
  if (haystack.includes("core drill") || haystack.includes("tool") || haystack.includes("bit")) return "accessory";
  if (haystack.includes("posta")) return "accessory";
  return "accessory";
}

function inferUnit(sku, name) {
  const haystack = `${sku} ${name}`.toLowerCase();
  if (haystack.includes(" bag")) return "bag";
  if (haystack.includes(" cartridge") || haystack.includes(" tube")) return "each";
  if (haystack.includes(" pair") || /\b\d+pk\b/i.test(sku) || haystack.includes(" pack")) return "pack";
  return "each";
}

function parseTables(markdown) {
  const lines = markdown.split(/\r?\n/);
  const tables = [];
  let section = "";
  let sourceUrl = sourceHost;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith("## ")) {
      section = cleanCell(line.replace(/^##\s*/, ""));
    }
    const urlMatch = line.match(/^URL:\s*`([^`]+)`/);
    if (urlMatch) {
      sourceUrl = urlMatch[1].startsWith("http")
        ? urlMatch[1]
        : `${sourceHost}${urlMatch[1]}`;
    }
    if (
      line.startsWith("|") &&
      lines[i + 1]?.startsWith("|") &&
      lines[i + 1].includes("---")
    ) {
      const header = markdownCells(line).map(cleanCell);
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].startsWith("|")) {
        rows.push(markdownCells(lines[i]));
        i += 1;
      }
      i -= 1;
      tables.push({ section, sourceUrl, header, rows });
    }
  }

  return tables;
}

function rowsFromTable(table) {
  const skuIndex = table.header.findIndex((heading) => /^SKU(?: pattern)?$/i.test(heading));
  const nameIndex = table.header.findIndex((heading) => /^(Name|Family)$/i.test(heading));
  if (skuIndex === -1 || nameIndex === -1) return [];

  const result = [];
  for (const row of table.rows) {
    const skuOrPattern = cleanCell(row[skuIndex]);
    const name = cleanCell(row[nameIndex]);
    if (!skuOrPattern || !name) continue;

    const tiers = [];
    for (let column = 0; column < table.header.length; column += 1) {
      if (column === skuIndex || column === nameIndex) continue;
      const tier = tierFromCell(table.header[column], row[column]);
      if (tier) tiers.push(tier);
    }
    if (tiers.length === 0) continue;

    const uniqueTiers = [
      ...new Map(tiers.sort((a, b) => a.min_qty - b.min_qty).map((tier) => [tier.min_qty, tier])).values(),
    ];
    const skus = skuOrPattern.includes("{char}")
      ? POSTA_CHARS.map((char) => ({
          sku: skuOrPattern.replace("{char}", char),
          name: `${name.replace(/\s*\(14 chars\)/i, "")} - ${char === "/" ? "slash" : char}`,
        }))
      : [{ sku: skuOrPattern, name }];

    for (const { sku, name: expandedName } of skus) {
      if (ANOMALY_SKUS.has(sku)) continue;
      result.push({
        sku,
        name: expandedName,
        category: inferCategory(sku, expandedName, table.section),
        unit: inferUnit(sku, expandedName),
        system_types: ["QSHS", "VS", "XPL", "BAYG", "GATE"],
        tiers: uniqueTiers,
        captured_date: capturedDate,
        source_url: table.sourceUrl,
        source_section: table.section,
      });
    }
  }

  return result;
}

function pricingRowsFor(entry) {
  // tier1 only: seeds store sparse tiers (tier1 base + tier2/3 rows only where
  // a tier's price differs — the engine overlays at price time). Do NOT
  // triplicate across TIER_CODES; that was the pre-2026-07 pattern the
  // pricing-rules slim removed.
  return entry.tiers.map((tier) => ({
    sku: entry.sku,
    tier_code: "tier1",
    rule: `qty >= ${tier.min_qty}`,
    price: tier.unit_price,
    priority: tier.min_qty,
    valid_from: capturedDate,
    valid_to: null,
    notes: `Glass Outlet supplier portal; captured ${capturedDate}; ${entry.source_url}`,
    active: true,
  }));
}

function productComponentFor(entry) {
  return {
    sku: entry.sku,
    name: entry.name,
    description: entry.name,
    category: entry.category,
    unit: entry.unit,
    default_price: entry.tiers[0]?.unit_price ?? null,
    system_types: entry.system_types,
    metadata: {
      price_source: "glassoutletonline.com.au supplier portal",
      price_verified_date: capturedDate,
      source_url: entry.source_url,
      source_section: entry.source_section,
    },
    active: true,
  };
}

function mergeProductCatalogue(entries) {
  const existing = JSON.parse(fs.readFileSync(productCataloguePath, "utf8"));
  const componentsBySku = new Map(
    (existing.product_components ?? []).map((component) => [component.sku, component]),
  );
  const pricingByKey = new Map(
    (existing.pricing_rules ?? []).map((row) => [
      `${row.sku}|${row.tier_code}|${row.priority ?? 0}`,
      row,
    ]),
  );

  for (const entry of entries) {
    componentsBySku.set(entry.sku, {
      ...(componentsBySku.get(entry.sku) ?? {}),
      ...productComponentFor(entry),
      metadata: {
        ...(componentsBySku.get(entry.sku)?.metadata ?? {}),
        ...productComponentFor(entry).metadata,
      },
    });
    for (const row of pricingRowsFor(entry)) {
      pricingByKey.set(`${row.sku}|${row.tier_code}|${row.priority ?? 0}`, row);
    }
  }

  const merged = {
    org_slug: existing.org_slug ?? "glass-outlet",
    product_components: [...componentsBySku.values()].sort((a, b) => a.sku.localeCompare(b.sku)),
    pricing_rules: [...pricingByKey.values()].sort((a, b) => {
      const sku = a.sku.localeCompare(b.sku);
      if (sku !== 0) return sku;
      const tier = a.tier_code.localeCompare(b.tier_code);
      if (tier !== 0) return tier;
      return (b.priority ?? 0) - (a.priority ?? 0);
    }),
  };
  fs.writeFileSync(productCataloguePath, `${JSON.stringify(merged, null, 2)}\n`);
}

function updateLocalPriceBreaks() {
  const priceRulesBySku = new Map();
  for (const file of fs.readdirSync(productsDir).filter((name) => name.endsWith(".json"))) {
    const data = JSON.parse(fs.readFileSync(path.join(productsDir, file), "utf8"));
    for (const row of data.pricing_rules ?? []) {
      if (!row.active) continue;
      const match = String(row.rule ?? "").match(/qty\s*>=\s*(\d+(?:\.\d+)?)/);
      const minQty = match ? Number(match[1]) : Number(row.priority ?? 1);
      if (!Number.isFinite(minQty) || minQty <= 0) continue;
      const breaks = priceRulesBySku.get(row.sku) ?? new Set();
      breaks.add(minQty);
      priceRulesBySku.set(row.sku, breaks);
    }
  }

  const entries = [...priceRulesBySku.entries()]
    .map(([sku, breaks]) => [sku, [...breaks].sort((a, b) => a - b)])
    .sort(([a], [b]) => a.localeCompare(b));

  const lines = [
    "// Generated from Glass Outlet seed price quantity-break rules.",
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

  fs.writeFileSync(localPriceBreaksPath, lines.join("\n"));
}

function writeMigration(entries) {
  const json = JSON.stringify(entries, null, 2);
  const sql = `-- Brief AT supplier portal pricing seed.
-- Source of truth: supabase/seeds/glass-outlet/pricing-${capturedDate}.json
-- Captured from glassoutletonline.com.au on ${capturedDate}.
-- Known anomalies were intentionally excluded pending supplier verification:
-- TC-H-AT-B / TC-H-AT-2L-B same price, ENDURO-SSC-60 / ENDURO-SSRES same price,
-- and MR-FLGG-S cheaper than MR-FLGG-P.

BEGIN;

DO $$
DECLARE
  org_id_value uuid;
  item jsonb;
  tier jsonb;
  tier_code_value text;
  component_id_value uuid;
  priority_value int;
  price_catalogue jsonb := $json$${json}$json$::jsonb;
BEGIN
  SELECT id INTO org_id_value
  FROM organisations
  WHERE slug = 'glass-outlet';

  IF org_id_value IS NULL THEN
    RAISE EXCEPTION 'glass-outlet organisation not found';
  END IF;

  FOR item IN SELECT * FROM jsonb_array_elements(price_catalogue)
  LOOP
    INSERT INTO product_components (
      org_id,
      sku,
      name,
      description,
      category,
      unit,
      default_price,
      system_types,
      metadata,
      active
    )
    VALUES (
      org_id_value,
      item->>'sku',
      item->>'name',
      item->>'name',
      COALESCE(item->>'category', 'accessory'),
      COALESCE(item->>'unit', 'each'),
      ((item->'tiers'->0)->>'unit_price')::numeric,
      ARRAY['QSHS','VS','XPL','BAYG','GATE']::text[],
      jsonb_build_object(
        'price_source', 'glassoutletonline.com.au supplier portal',
        'price_verified_date', '${capturedDate}',
        'source_url', item->>'source_url',
        'source_section', item->>'source_section'
      ),
      true
    )
    ON CONFLICT (org_id, sku) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          unit = EXCLUDED.unit,
          default_price = EXCLUDED.default_price,
          system_types = EXCLUDED.system_types,
          metadata = COALESCE(product_components.metadata, '{}'::jsonb) || EXCLUDED.metadata,
          active = true,
          updated_at = now()
    RETURNING id INTO component_id_value;

    FOR tier IN SELECT * FROM jsonb_array_elements(item->'tiers')
    LOOP
      priority_value := (tier->>'min_qty')::int;

      -- tier1 only: seeds/DB store sparse tiers (tier1 base + overrides); the
      -- engine overlays at price time. Do not triplicate across tiers.
      FOREACH tier_code_value IN ARRAY ARRAY['tier1']
      LOOP
        UPDATE pricing_rules
        SET org_id = org_id_value,
            rule = 'qty >= ' || priority_value::text,
            price = (tier->>'unit_price')::numeric,
            valid_from = '${capturedDate}'::date,
            valid_to = NULL,
            notes = 'Glass Outlet supplier portal; captured ${capturedDate}; ' || COALESCE(item->>'source_url', ''),
            active = true,
            updated_at = now()
        WHERE component_id = component_id_value
          AND tier_code = tier_code_value
          AND priority = priority_value
          AND active = true;

        IF NOT FOUND THEN
          INSERT INTO pricing_rules (
            org_id,
            component_id,
            tier_code,
            rule,
            price,
            priority,
            valid_from,
            valid_to,
            notes,
            active
          )
          VALUES (
            org_id_value,
            component_id_value,
            tier_code_value,
            'qty >= ' || priority_value::text,
            (tier->>'unit_price')::numeric,
            priority_value,
            '${capturedDate}'::date,
            NULL,
            'Glass Outlet supplier portal; captured ${capturedDate}; ' || COALESCE(item->>'source_url', ''),
            true
          );
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;

COMMIT;
`;
  fs.writeFileSync(migrationPath, sql);
}

const markdown = fs.readFileSync(sourcePath, "utf8");
const entries = [
  ...new Map(
    parseTables(markdown)
      .flatMap(rowsFromTable)
      .map((entry) => [entry.sku, entry]),
  ).values(),
].sort((a, b) => a.sku.localeCompare(b.sku));

fs.writeFileSync(outputPath, `${JSON.stringify(entries, null, 2)}\n`);
mergeProductCatalogue(entries);
updateLocalPriceBreaks();
writeMigration(entries);

console.log(
  JSON.stringify(
    {
      sourcePath,
      outputPath,
      migrationPath,
      productCataloguePath,
      capturedDate,
      seededSkus: entries.length,
      anomalySkusExcluded: [...ANOMALY_SKUS],
    },
    null,
    2,
  ),
);
