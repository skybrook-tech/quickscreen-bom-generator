/**
 * compare-calculators.ts
 *
 * Runs every fixture in supabase/seeds/glass-outlet/tests/comparison/ against
 * BOTH edge functions and writes a side-by-side comparison to
 * scripts/comparison-output.md.
 *
 * Usage (from project root, with local Supabase running):
 *   deno run --allow-all --env-file=.env.local scripts/compare-calculators.ts
 *
 * Prerequisites:
 *   supabase start
 *   npm run db:reset          ← seeds product rules, pricing, components
 */

// ---------------------------------------------------------------------------
// Env / config
// ---------------------------------------------------------------------------

function loadEnv(key: string, fallback = ""): string {
  return Deno.env.get(key) ?? Deno.env.get(`VITE_${key}`) ?? fallback;
}

const SUPABASE_URL = loadEnv("SUPABASE_URL", "http://localhost:54321");
const SUPABASE_ANON_KEY = loadEnv("SUPABASE_ANON_KEY");
const EMAIL = "test@glass-outlet.com";
const PASSWORD = "123456";

const STATIC_FN = "bom-calculator-static";
const DATA_FN = "bom-calculator";

const FIXTURE_DIR = new URL(
  "../supabase/seeds/glass-outlet/tests/comparison",
  import.meta.url,
).pathname;
const OUTPUT_FILE = new URL("../scripts/comparison-output.md", import.meta.url)
  .pathname;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Fixture {
  name: string;
  description: string;
  payload: Record<string, unknown>;
}

interface LineItem {
  sku: string;
  name?: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  category?: string;
}

interface Totals {
  subtotal?: number;
  gst?: number;
  grandTotal?: number;
}

interface BomResponse {
  lines?: LineItem[];
  gateItems?: LineItem[];
  totals?: Totals;
  warnings?: string[];
  errors?: string[];
  error?: string;
}

interface SkuRow {
  sku: string;
  name: string;
  staticQty: number;
  dataQty: number;
  staticPrice: number;
  dataPrice: number;
  status: string;
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function signIn(): Promise<string> {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  if (!data.access_token) throw new Error(`No access_token in auth response`);
  return data.access_token as string;
}

// ---------------------------------------------------------------------------
// Edge function invocation
// ---------------------------------------------------------------------------

async function invokeFn(
  fnName: string,
  payload: Record<string, unknown>,
  jwt: string,
): Promise<BomResponse> {
  const url = `${SUPABASE_URL}/functions/v1/${fnName}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${jwt}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ payload }),
  });

  const text = await res.text();
  try {
    return JSON.parse(text) as BomResponse;
  } catch {
    return { error: `Non-JSON response (${res.status}): ${text.slice(0, 200)}` };
  }
}

// ---------------------------------------------------------------------------
// Comparison helpers
// ---------------------------------------------------------------------------

function extractLines(result: BomResponse): LineItem[] {
  const out: LineItem[] = [];
  if (Array.isArray(result.lines)) out.push(...result.lines);
  if (Array.isArray(result.gateItems)) out.push(...result.gateItems);
  return out;
}

function groupBySku(
  lines: LineItem[],
): Map<string, { qty: number; name: string; lineTotal: number }> {
  const map = new Map<string, { qty: number; name: string; lineTotal: number }>();
  for (const line of lines) {
    const existing = map.get(line.sku);
    if (existing) {
      existing.qty += line.quantity ?? 0;
      existing.lineTotal += line.lineTotal ?? 0;
    } else {
      map.set(line.sku, {
        qty: line.quantity ?? 0,
        name: line.name ?? "",
        lineTotal: line.lineTotal ?? 0,
      });
    }
  }
  return map;
}

function getGrandTotal(result: BomResponse): number {
  if (result.totals?.grandTotal != null) return result.totals.grandTotal;
  const lines = extractLines(result);
  const subtotal = lines.reduce((s, l) => s + (l.lineTotal ?? 0), 0);
  return parseFloat((subtotal * 1.1).toFixed(2));
}

function compareResults(
  staticResult: BomResponse,
  dataResult: BomResponse,
): { rows: SkuRow[]; matches: number; mismatches: number; staticOnly: number; dataOnly: number } {
  const staticMap = groupBySku(extractLines(staticResult));
  const dataMap = groupBySku(extractLines(dataResult));

  const allSkus = new Set([...staticMap.keys(), ...dataMap.keys()]);
  const rows: SkuRow[] = [];
  let matches = 0, mismatches = 0, staticOnly = 0, dataOnly = 0;

  for (const sku of [...allSkus].sort()) {
    const s = staticMap.get(sku);
    const d = dataMap.get(sku);

    const sQty = s?.qty ?? 0;
    const dQty = d?.qty ?? 0;
    const sTotal = s?.lineTotal ?? 0;
    const dTotal = d?.lineTotal ?? 0;
    const name = s?.name || d?.name || "";

    let status: string;
    if (s && !d) { status = "❌ static only"; staticOnly++; }
    else if (!s && d) { status = "❌ data only"; dataOnly++; }
    else if (sQty === dQty) { status = "✅"; matches++; }
    else { status = "⚠️ qty differs"; mismatches++; }

    rows.push({ sku, name, staticQty: sQty, dataQty: dQty, staticPrice: sTotal, dataPrice: dTotal, status });
  }

  return { rows, matches, mismatches, staticOnly, dataOnly };
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

function pad(s: string | number, width: number): string {
  return String(s).padEnd(width);
}

function renderScenario(
  fixture: Fixture,
  staticResult: BomResponse,
  dataResult: BomResponse,
): string {
  const lines: string[] = [];

  lines.push(`## ${fixture.name}`);
  lines.push(`_${fixture.description}_`);
  lines.push("");

  // Error short-circuit
  const staticErr = staticResult.error ?? (staticResult.errors?.length ? staticResult.errors.join("; ") : null);
  const dataErr = dataResult.error ?? (dataResult.errors?.length ? dataResult.errors.join("; ") : null);

  if (staticErr) lines.push(`> **static error:** ${staticErr}`);
  if (dataErr) lines.push(`> **data-driven error:** ${dataErr}`);
  if (staticErr || dataErr) {
    lines.push("");
    return lines.join("\n");
  }

  const { rows, matches, mismatches, staticOnly, dataOnly } = compareResults(staticResult, dataResult);
  const staticTotal = getGrandTotal(staticResult);
  const dataTotal = getGrandTotal(dataResult);
  const totalMatch = Math.abs(staticTotal - dataTotal) < 0.02;

  // Summary line
  const summary: string[] = [];
  if (matches > 0) summary.push(`✅ ${matches} match`);
  if (mismatches > 0) summary.push(`⚠️ ${mismatches} qty differ`);
  if (staticOnly > 0) summary.push(`❌ ${staticOnly} static-only`);
  if (dataOnly > 0) summary.push(`❌ ${dataOnly} data-only`);
  summary.push(
    totalMatch
      ? `💰 totals match ($${staticTotal.toFixed(2)})`
      : `💰 totals differ — static $${staticTotal.toFixed(2)} vs data $${dataTotal.toFixed(2)}`,
  );
  lines.push(summary.join(" | "));
  lines.push("");

  // Table
  const cols = [
    ["SKU", 30],
    ["Name", 36],
    ["Static qty", 10],
    ["Data qty", 10],
    ["Static $", 10],
    ["Data $", 10],
    ["Status", 20],
  ] as [string, number][];

  const header = cols.map(([h, w]) => pad(h, w)).join(" | ");
  const divider = cols.map(([, w]) => "-".repeat(w)).join(" | ");
  lines.push(header);
  lines.push(divider);

  for (const row of rows) {
    lines.push([
      pad(row.sku, 30),
      pad(row.name.slice(0, 35), 36),
      pad(row.staticQty || "-", 10),
      pad(row.dataQty || "-", 10),
      pad(row.staticPrice ? `$${row.staticPrice.toFixed(2)}` : "-", 10),
      pad(row.dataPrice ? `$${row.dataPrice.toFixed(2)}` : "-", 10),
      pad(row.status, 20),
    ].join(" | "));
  }

  lines.push("");

  // Warnings
  if (staticResult.warnings?.length || dataResult.warnings?.length) {
    lines.push("**Warnings**");
    const staticWarn = staticResult.warnings ?? [];
    const dataWarn = dataResult.warnings ?? [];
    const allWarn = [...new Set([...staticWarn, ...dataWarn])];
    for (const w of allWarn) lines.push(`- ${w}`);
    lines.push("");
  }

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  if (!SUPABASE_ANON_KEY) {
    console.error("Missing SUPABASE_ANON_KEY / VITE_SUPABASE_ANON_KEY. Run with --env-file=.env.local");
    Deno.exit(1);
  }

  console.log(`Authenticating as ${EMAIL}...`);
  const jwt = await signIn();
  console.log("Auth OK.");

  // Load fixtures (sorted by filename)
  const entries: { name: string }[] = [];
  for await (const entry of Deno.readDir(FIXTURE_DIR)) {
    if (entry.isFile && entry.name.endsWith(".json")) entries.push(entry);
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));

  const fixtures: Fixture[] = [];
  for (const entry of entries) {
    const text = await Deno.readTextFile(`${FIXTURE_DIR}/${entry.name}`);
    fixtures.push(JSON.parse(text) as Fixture);
  }

  console.log(`\nRunning ${fixtures.length} scenarios against ${STATIC_FN} and ${DATA_FN}...\n`);

  const reportSections: string[] = [
    "# Calculator Comparison Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Static function: \`${STATIC_FN}\``,
    `Data-driven function: \`${DATA_FN}\``,
    `Supabase URL: ${SUPABASE_URL}`,
    "",
    "---",
    "",
  ];

  let totalMatches = 0, totalMismatches = 0, totalStaticOnly = 0, totalDataOnly = 0;

  for (const fixture of fixtures) {
    await Deno.stdout.write(new TextEncoder().encode(`  ${fixture.name}...`));

    const [staticResult, dataResult] = await Promise.all([
      invokeFn(STATIC_FN, fixture.payload, jwt),
      invokeFn(DATA_FN, fixture.payload, jwt),
    ]);

    const { matches, mismatches, staticOnly, dataOnly } = compareResults(staticResult, dataResult);
    totalMatches += matches;
    totalMismatches += mismatches;
    totalStaticOnly += staticOnly;
    totalDataOnly += dataOnly;

    const allOk = mismatches === 0 && staticOnly === 0 && dataOnly === 0;
    console.log(allOk ? " ✅" : " ⚠️");

    reportSections.push(renderScenario(fixture, staticResult, dataResult));
    reportSections.push("---\n");
  }

  // Overall summary
  const summaryLines = [
    "## Overall Summary",
    "",
    `| Metric | Count |`,
    `|---|---|`,
    `| SKUs matching exactly | **${totalMatches}** |`,
    `| SKUs with qty mismatch | **${totalMismatches}** |`,
    `| SKUs only in static | **${totalStaticOnly}** |`,
    `| SKUs only in data-driven | **${totalDataOnly}** |`,
    "",
  ];

  const report = [...summaryLines, "---", "", ...reportSections].join("\n");
  await Deno.writeTextFile(OUTPUT_FILE, report);

  console.log(`\nReport written to scripts/comparison-output.md`);
  console.log(
    `Summary: ✅ ${totalMatches} match, ⚠️ ${totalMismatches} differ, ❌ ${totalStaticOnly} static-only, ❌ ${totalDataOnly} data-only`,
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  Deno.exit(1);
});
