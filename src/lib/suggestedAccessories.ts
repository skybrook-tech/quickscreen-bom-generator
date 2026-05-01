import type { CanonicalPayload, CanonicalRun } from "../types/canonical.types";
import type { BOMLineItem } from "../types/bom.types";

type Variables = Record<string, string | number | boolean | undefined>;

/** Matches v4 SuggestedAccessoriesPanel row shape */
export interface AccessorySuggestionRow {
  sku: string;
  name: string;
  desc: string;
  qty: number;
  unitPrice: number;
}

const POST_COLOURS = new Set([
  "B",
  "MN",
  "G",
  "SM",
  "W",
  "BS",
  "D",
  "M",
  "P",
  "PB",
  "S",
]);

function mergedVars(
  payload: CanonicalPayload,
  run: CanonicalRun,
): Variables {
  return { ...payload.variables, ...(run.variables ?? {}) };
}

function maxPanelWidthMm(vars: Variables): number {
  const v = Number(vars.max_panel_width_mm ?? 2600);
  return Math.max(300, v);
}

/** Rough post count for accessory qty hints (fence segments only). */
function estimatePostCount(run: CanonicalRun, jobVars: Variables): number {
  const baseMax = maxPanelWidthMm({ ...jobVars, ...(run.variables ?? {}) });
  let internal = 0;
  for (const seg of run.segments) {
    if (seg.kind === "gate") continue;
    const w = Number(seg.segmentWidthMm ?? 0);
    const segVars = seg.variables ?? {};
    const mw = Math.min(
      baseMax,
      Math.max(300, Number(segVars.max_panel_width_mm ?? baseMax)),
    );
    if (mw <= 0 || w <= 0) continue;
    const panels = Math.max(1, Math.ceil(w / mw));
    internal += Math.max(0, panels - 1);
  }
  return internal + 2;
}

function postColourFromVars(vars: Variables) {
  const explicitPostColour = String(vars.post_colour_code ?? "");
  if (POST_COLOURS.has(explicitPostColour)) return explicitPostColour;
  const fenceColour = String(vars.colour_code ?? "B");
  return POST_COLOURS.has(fenceColour) ? fenceColour : "MN";
}

function hasBomSku(bomSkus: Set<string>, sku: string) {
  return bomSkus.has(sku);
}

/**
 * Heuristic suggested add-ons after a BOM is generated. Prices are indicative
 * placeholders — engine BOM lines remain authoritative; user qty edits apply after add.
 */
export function buildAccessorySuggestions(
  payload: CanonicalPayload,
  bomLines: BOMLineItem[],
): AccessorySuggestionRow[] {
  const out: AccessorySuggestionRow[] = [];
  const bomSkus = new Set(bomLines.map((l) => l.sku));

  for (const run of payload.runs) {
    const vars = mergedVars(payload, run);
    const postCount = estimatePostCount(run, payload.variables);
    if (postCount <= 0) continue;

    const mountingType = String(
      vars.mounting_type ?? vars.mounting_method ?? "concreted-in-ground",
    );
    const postSize = Number(vars.post_size ?? vars.post_size_mm ?? 50);
    const postColour = postColourFromVars(vars);

    if (
      mountingType === "concreted-in-ground" ||
      mountingType === "in_ground"
    ) {
      out.push({
        sku: "RAPIDSET-20KG",
        name: "Rapid-set concrete bag (20kg)",
        desc: "Suggested for concreted-in-ground posts.",
        qty: Math.max(1, Math.ceil(postCount * 1.5)),
        unitPrice: 12.5,
      });
    }

    if (mountingType === "core-drilled" || mountingType === "core_drill") {
      const dressRingSku =
        postSize === 65 ? `XP-65DR-${postColour}` : `XP-DR-${postColour}`;
      if (!hasBomSku(bomSkus, dressRingSku)) {
        out.push({
          sku: dressRingSku,
          name: "Core-drill dress ring",
          desc: "Dress rings suit core-drilled posts.",
          qty: postCount,
          unitPrice: 0,
        });
      }
      out.push({
        sku: `CORE-GROUT-HINT-${run.runId.slice(0, 8)}`,
        name: "Core-drill / non-shrink grout",
        desc: "Select grout to suit substrate and hole size.",
        qty: postCount,
        unitPrice: 0,
      });
    }

    if (mountingType === "base-plated" || mountingType === "base_plate") {
      const basePlateSku =
        postSize === 65
          ? `XP-65BP-SET-${postColour}`
          : `XP-BP-SET-${postColour}`;
      const coverSku =
        postSize === 65
          ? `XP-65DC-2P-${postColour}`
          : `XP-DC-2P-${postColour}`;

      if (!hasBomSku(bomSkus, basePlateSku)) {
        out.push({
          sku: basePlateSku,
          name: "Base plate set",
          desc: "Base plate sets for plated posts.",
          qty: postCount,
          unitPrice: 0,
        });
      }
      if (!hasBomSku(bomSkus, coverSku)) {
        out.push({
          sku: coverSku,
          name: "Base plate cover ring",
          desc: "Covers for base-plated posts.",
          qty: postCount,
          unitPrice: 0,
        });
      }
    }
  }

  const fenceColour = String(payload.variables.colour_code ?? "B");
  out.push({
    sku: `PAINT-${fenceColour}`,
    name: `Touch-up paint — ${fenceColour}`,
    desc: "Colour-matched touch-ups after cutting.",
    qty: 1,
    unitPrice: 0,
  });

  const dedup = new Map<string, AccessorySuggestionRow>();
  for (const row of out) {
    const prev = dedup.get(row.sku);
    if (prev) {
      dedup.set(row.sku, {
        ...prev,
        qty: prev.qty + row.qty,
      });
    } else {
      dedup.set(row.sku, row);
    }
  }

  return [...dedup.values()];
}
