// resolve.ts — Internal SKU → supplier SKU resolution
//
// Engine logic emits INTERNAL SKUs (semantic canonical names like "SLAT.STD.65.B").
// This module maps them to real supplier SKUs ("XP-6100-S65-B" for Glass Outlet).
//
// Resolution order:
//   1. DB component rows where internal_sku column matches (per-supplier override)
//   2. DEFAULT_INTERNAL_SKU_MAP (Glass Outlet defaults, code-generated)
//   3. Return the internal SKU itself (will price at 0 + add to assumptions)

import type { SeedComponent } from "./config/types.ts";

// ─── Default map (Glass Outlet) ───────────────────────────────────────────────

function buildDefaultSkuMap(): Record<string, string> {
  const m: Record<string, string> = {};

  const STD   = ["B", "MN", "G", "SM", "W", "BS", "D", "M", "P", "PB", "S"];
  const AW    = ["KWI", "WRC"];
  const GATE  = ["B", "BS", "D", "G", "M", "MN", "P", "PB", "S", "SM", "W"];
  const CSRCAP  = ["B", "G", "MN", "S", "SM", "W"];
  const CSRPLATE = ["B", "BS", "D", "G", "M", "MN", "S", "SM", "W"];
  const GAP_CODES = ["05", "09", "12", "15", "20", "30"];

  // Standard Colorbond colours
  for (const c of STD) {
    m[`SLAT.STD.65.${c}`]  = `XP-6100-S65-${c}`;
    m[`SLAT.STD.90.${c}`]  = `QS-6100-S90-${c}`;
    m[`SLAT.ECO.65.${c}`]  = `XP-6500-E65-${c}`;

    m[`FRAME.SF.STD.${c}`]   = `QS-5800-SF-${c}`;
    m[`FRAME.CFC.STD.${c}`]  = `QS-5800-CFC-${c}`;
    m[`FRAME.F.STD.${c}`]    = `QS-5800-F-${c}`;
    m[`FRAME.CSR.STD.${c}`]  = `XP-5800-CSR-${c}`;
    m[`FRAME.RAIL.VERT.STD.${c}`] = `QS-5000-HORIZ-${c}`;
    m[`ADAPTER.135.STD.${c}`] = `XP-6000-135-${c}`;

    m[`POST.FULL.STD.${c}`]  = `XP-2400-FP-${c}`;
    m[`POST.FULL.TALL.${c}`] = `XP-6000-FP-${c}`;
    m[`POST.HD65.STD.${c}`]  = `XP-2400-65HD-${c}`;
    m[`POST.HD65.TALL.${c}`] = `XP-6000-65HD-${c}`;

    m[`POST.ACC.TP.50.${c}`]  = `XP-TP-${c}`;
    m[`POST.ACC.TP.65.${c}`]  = `XP-65TP-${c}`;
    m[`POST.ACC.BP.50.${c}`]  = `XP-BP-SET-${c}`;
    m[`POST.ACC.BP.65.${c}`]  = `XP-65BP-SET-${c}`;
    m[`POST.ACC.DC.50.${c}`]  = `XP-DC-2P-${c}`;
    m[`POST.ACC.DC.65.${c}`]  = `XP-65DC-2P-${c}`;
    m[`POST.ACC.DR.50.${c}`]  = `XP-DR-${c}`;
    m[`POST.ACC.DR.65.${c}`]  = `XP-65DR-${c}`;

    m[`SCREW.XP.${c}`]         = `XP-SCREWS-${c}`;
    m[`LOUVRE.BRACKET.${c}`]   = `QS-LB-${c}`;
  }

  // Short post stock only exists for W and MN
  m["POST.FULL.SHORT.W"]  = "XP-1800-FP-W";
  m["POST.FULL.SHORT.MN"] = "XP-1800-FP-MN";

  // Alumawood
  for (const c of AW) {
    m[`SLAT.AW.65.${c}`]  = `AW-5800-S65-${c}`;
    m[`SLAT.AW.90.${c}`]  = `AWQS-5800-S90-${c}`;

    m[`FRAME.SF.AW.${c}`]  = `AWQS-5800-SF-${c}`;
    m[`FRAME.CFC.AW.${c}`] = `AWQS-5800-CFC-${c}`;
    m[`FRAME.F.AW.${c}`]   = `AWQS-5800-F-${c}`;
    m[`FRAME.CSR.AW.${c}`] = `AW-5800-CSR-${c}`;
    m[`ADAPTER.135.AW.${c}`] = `AW-5800-135-${c}`;

    m[`POST.AW.FULL.STD.${c}`]  = `AW-2400-FP-${c}`;
    m[`POST.AW.FULL.TALL.${c}`] = `AW-5800-FP-${c}`;
    m[`POST.AW.HD65.STD.${c}`]  = `AW-2400-65HD-${c}`;
    m[`POST.AW.HD65.TALL.${c}`] = `AW-5800-65HD-${c}`;
  }

  // Alumawood post accessories (terrain finish only — no colour variation)
  m["POST.AW.ACC.TP.50"]  = "AW-TP-TR";
  m["POST.AW.ACC.TP.65"]  = "AW-65TP-TR";
  m["POST.AW.ACC.BP.50"]  = "AW-BP-SET-TR";
  m["POST.AW.ACC.BP.65"]  = "AW-65BP-SET-TR";
  m["POST.AW.ACC.DC.50"]  = "AW-DC-2P-TR";
  m["POST.AW.ACC.DC.65"]  = "AW-65DC-2P-TR";
  m["POST.AW.ACC.DR.50"]  = "AW-DR-TR";
  m["POST.AW.ACC.DR.65"]  = "AW-65DR-TR";

  // CSR caps (limited colour set)
  for (const c of CSRCAP) m[`FRAME.CSRCAP.${c}`] = `XP-CSRC-${c}`;

  // CSR plates (XP-BTP; companion of the CSR rail)
  for (const c of CSRPLATE) m[`FRAME.CSRPLATE.${c}`] = `XP-BTP-${c}`;

  // Gate components
  for (const c of GATE) {
    m[`GATE.RAIL.65.${c}`]         = `QSG-4800-RAIL65-${c}`;
    m[`GATE.RAIL.90.${c}`]         = `QSG-4800-RAIL90-${c}`;
    m[`GATE.RAIL.SLIDE-TOP.65.${c}`] = `QSG-S-6100-TR65-${c}`;
    m[`GATE.RAIL.SLIDE-TOP.90.${c}`] = `QSG-S-6100-TR90-${c}`;
    m[`GATE.RAIL.SLIDE-BOT.${c}`]  = `QSG-S-6100-BR-${c}`;
    m[`GATE.SF.${c}`]              = `QSG-4200-GSF50-${c}`;
    m[`GATE.INFILL.HORIZ.${c}`]    = `QSG-4800-INF-${c}`;
    m[`GATE.INFILL.VERT.${c}`]     = `QSG-4200-CINF-${c}`;
    m[`GATE.COVER.${c}`]           = `QSG-4200-COVER-${c}`;
    m[`GATE.CAP.${c}`]             = `QSG-GFC-50X50-${c}`;
  }

  // Spacers — gapCode() returns "05","09",... without "MM" suffix; the value SKU has "MM".
  for (const code of GAP_CODES) {
    m[`SPACER.${code}`]      = `QS-SPACER-${code}MM-50PK`;
    m[`SPACER.EACH.${code}`] = `QS-SPACER-${code}MM`;
  }

  // Generic (no colour param)
  m["SCREW.SLAT"]     = "QS-SCREWS-50PK";
  m["SCREW.GATE-RAIL"] = "AR-SCR-BR-50PK";
  m["CORNER.CUSTOM"]  = "CUSTOM-ANGLE-CORNER";

  return m;
}

export const DEFAULT_INTERNAL_SKU_MAP: Record<string, string> = buildDefaultSkuMap();

// ─── Resolver ─────────────────────────────────────────────────────────────────

/**
 * Resolves an internal SKU to a supplier SKU.
 * DB component rows (internal_sku column) override the static map — that's how
 * Supplier B's catalogue is plugged in without code changes.
 */
export function resolveInternalSku(
  internalSku: string,
  components: SeedComponent[],
): string {
  const dbRow = components.find((c) => c.internal_sku === internalSku);
  if (dbRow) return dbRow.sku;
  return DEFAULT_INTERNAL_SKU_MAP[internalSku] ?? internalSku;
}

/** Factory: creates a resolver closure bound to a components array. */
export function makeInternalSkuResolver(
  components: SeedComponent[],
): (internalSku: string) => string {
  return (internalSku) => resolveInternalSku(internalSku, components);
}
