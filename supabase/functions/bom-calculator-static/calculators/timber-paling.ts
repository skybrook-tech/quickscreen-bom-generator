// calculators/timber-paling.ts — Timber paling fence BOM calculator.
//
// Post-and-rail fencing with vertical palings, butted (single layer) or
// lapped-and-capped (two overlapping layers + capping rail). Reads its rules
// from `cfg.timberPaling` and emits SUPPLIER SKUs directly (like colorbond).
//
// Model: 2.4m bays between 100×75 posts; 4.8m rails span two bays per rail
// row; rail rows ladder by fence height; palings per bay are the supplier's
// published counts (wastage included); nails/batten screws pack-rounded per
// segment; concrete is species-conditional (rapid set for pine, post mix for
// hardwood). Fail-loud posture: unmapped heights and gate segments warn and
// emit nothing rather than silently defaulting.

import type {
  CalcContext, CanonicalRun, CanonicalPayload, QtyLine,
} from "../config/types.ts";
import { isku, toNumber } from "../engine-utils.ts";
import { applyExtraRules, terminalPostCount } from "./shared.ts";

type Sink = {
  warnings: string[];
  computed: Record<string, Record<string, Record<string, unknown>>>;
};

function emit(lines: QtyLine[], line: QtyLine): void {
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) return;
  lines.push({ ...line, quantity: Math.ceil(line.quantity) });
}

type Species = "pine" | "hardwood";

function speciesOrDefault(value: unknown): Species {
  return value === "hardwood" ? "hardwood" : "pine";
}

// SKU token for the species ({species} placeholder): PINE | HWD.
const SPECIES_TOKEN: Record<Species, string> = { pine: "PINE", hardwood: "HWD" };

export function timberPalingCalculator(
  ctx: CalcContext,
  run: CanonicalRun,
  _payload: CanonicalPayload,
  sink: Sink,
): QtyLine[] {
  const lines: QtyLine[] = [];
  const cfg = ctx.configs.get(run.productCode) ?? ctx.configs.get("TIMBER_PALING");
  const tp = cfg?.timberPaling;
  if (!cfg || !tp) {
    sink.warnings.push(`Timber paling config missing for "${run.productCode}"; BOM for this run is empty.`);
    return [];
  }

  const runVars = run.variables ?? {};
  const runSpecies = speciesOrDefault(runVars.species);
  // Posts accumulated per (species, stock length, cut-down note) so a 1500mm
  // section's cut-down 2400 pine posts stay a separate line from an 1800mm
  // section's uncut 2400 pine posts; terminal posts use the run-level species.
  const postAccumulator = new Map<string, { species: Species; postLength: string; note?: string; count: number }>();
  const addPosts = (species: Species, postLength: number, count: number, note?: string) => {
    const key = `${species}|${postLength}|${note ?? ""}`;
    const entry = postAccumulator.get(key) ?? { species, postLength: String(postLength), note, count: 0 };
    entry.count += count;
    postAccumulator.set(key, entry);
  };

  const anchorSegId =
    run.segments.find((s) => s.segmentKind !== "gate_opening")?.segmentId
    ?? run.segments[0]?.segmentId
    ?? run.runId;

  for (const segment of run.segments) {
    if (segment.segmentKind === "gate_opening") {
      sink.warnings.push("Timber paling gates are not supported yet — the gate opening was NOT included in the BOM.");
      continue;
    }
    const segId = segment.segmentId;
    const vars = { ...runVars, ...(segment.variables ?? {}) };

    const segWidth = toNumber(segment.segmentWidthMm, 0);
    if (segWidth <= 0) continue;

    const species = speciesOrDefault(vars.species);
    const speciesToken = SPECIES_TOKEN[species];
    const styleKey = vars.paling_style === "lapped_capped" ? "lapped_capped" : "butted";
    const style = tp.styles[styleKey];
    const finished = Math.round(
      toNumber(segment.targetHeightMm ?? vars.target_height_mm, cfg.defaults.targetHeightMm),
    );

    // Fail loud on unmapped heights: normaliseRunVariables snaps heights to the
    // options ladder upstream, so hitting this means config drift — never
    // silently substitute a default fence.
    const postStock = tp.postStockByFenceHeight[String(finished)];
    const railLadder = tp.railsByHeight.find((r) => finished <= r.maxHeightMm);
    if (!postStock || !railLadder) {
      sink.warnings.push(
        `${finished}mm is not an available timber paling height (${Object.keys(tp.postStockByFenceHeight).join("/")}mm) — this section was NOT included in the BOM.`,
      );
      continue;
    }

    const numBays = Math.max(1, Math.ceil(segWidth / tp.bayWidthMm));
    const railRows = railLadder.rails;
    const railPieces = railRows * Math.ceil(numBays / tp.railSpanBays);

    // Palings per layer (+ nails accumulated per nail SKU before pack-rounding)
    const palingLength = tp.palingLengthByFenceHeight?.[String(finished)] ?? finished;
    const palingCutNote = tp.palingCutDownNotes?.[String(finished)];
    const nailsBySku: Record<string, number> = {};
    const layerCounts: number[] = [];
    style.layers.forEach((layer, layerIndex) => {
      const palings = Math.ceil(layer.palingsPerBay * numBays * tp.extraWastageFactor);
      layerCounts.push(palings);
      const layerLabel = style.layers.length > 1 ? (layerIndex === 0 ? "back layer" : "front layer") : "single layer";
      emit(lines, {
        runId: run.runId, segmentId: segId,
        sku: isku(tp.skus.paling, { palingLength }),
        category: "paling", quantity: palings, unit: "each",
        notes: `${layer.palingsPerBay} palings per ${tp.bayWidthMm}mm bay × ${numBays} bay(s), ${layerLabel} (wastage included)`
          + (palingCutNote ? ` — ${palingCutNote}` : ""),
      });
      nailsBySku[layer.nailSkuKey] = (nailsBySku[layer.nailSkuKey] ?? 0)
        + palings * layer.nailsPerPalingPerRail * railRows;
    });
    for (const [skuKey, nails] of Object.entries(nailsBySku)) {
      const packSize = skuKey === "nails57Pack" ? tp.packSizes.nails57 : tp.packSizes.nails45;
      emit(lines, {
        runId: run.runId, segmentId: segId,
        sku: tp.skus[skuKey as "nails45Pack" | "nails57Pack"],
        category: "fixing", quantity: Math.ceil(nails / packSize), unit: "pack",
        notes: `${nails} × ${skuKey === "nails57Pack" ? "57mm" : "45mm"} ring-shank coil nails in packs of ${packSize}`,
      });
    }

    // Rails: 4.8m stock spanning railSpanBays bays, railRows rows
    emit(lines, {
      runId: run.runId, segmentId: segId,
      sku: isku(tp.skus.rail, { species: speciesToken, railLength: tp.railStockLengthMm }),
      category: "rail", quantity: railPieces, unit: "each",
      notes: `${railRows} rail row(s) for ${finished}mm, ${tp.railStockLengthMm}mm rails spanning ${tp.railSpanBays} bays × ${numBays} bay(s)`,
    });

    // Batten screws (rail-to-post), pack-rounded per segment
    emit(lines, {
      runId: run.runId, segmentId: segId,
      sku: tp.skus.battenScrewPack,
      category: "fixing",
      quantity: Math.ceil((railPieces * tp.battenScrewsPerRailPiece) / tp.packSizes.battenScrews),
      unit: "pack",
      notes: `${tp.battenScrewsPerRailPiece} batten screws per rail piece × ${railPieces} rail piece(s), packs of ${tp.packSizes.battenScrews}`,
    });

    // Capping rail (lapped-and-capped only)
    if (styleKey === "lapped_capped") {
      const capping = tp.styles.lapped_capped.capping;
      emit(lines, {
        runId: run.runId, segmentId: segId,
        sku: isku(tp.skus.cappingRail, { cappingLength: capping.stockLengthMm }),
        category: "rail", quantity: Math.ceil(numBays * capping.lengthsPerBay), unit: "length",
        notes: `capping rail, ${capping.lengthsPerBay} × ${capping.stockLengthMm}mm length per bay × ${numBays} bay(s)`,
      });
    }

    // Interior posts (bay joins within the segment)
    const interiorPosts = Math.max(0, numBays - 1);
    if (interiorPosts > 0) {
      addPosts(species, postStock[species], interiorPosts, tp.postCutDownNotes?.[String(finished)]?.[species]);
    }

    sink.computed[run.runId] = sink.computed[run.runId] ?? {};
    sink.computed[run.runId][segId] = {
      ...(sink.computed[run.runId][segId] ?? {}),
      num_bays: numBays,
      rail_rows: railRows,
      rail_pieces: railPieces,
      palings_per_layer: layerCounts,
      paling_style: styleKey,
      species,
      post_stock_mm: postStock[species],
    };

    applyExtraRules(cfg.extraRules, {
      runId: run.runId,
      segmentId: segId,
      actualHeightMm: finished,
      numPanels: numBays,
      panelWidthMm: tp.bayWidthMm,
      variables: vars,
    }, lines, sink.warnings);
  }

  // Terminal posts (run ends + corners) at the run-level species/height
  const runFinished = Math.round(
    toNumber(runVars.target_height_mm, cfg.defaults.targetHeightMm),
  );
  const runPostStock = tp.postStockByFenceHeight[String(runFinished)];
  const terminals = terminalPostCount(run);
  if (terminals > 0) {
    if (!runPostStock) {
      sink.warnings.push(
        `${runFinished}mm is not an available timber paling height — terminal posts were NOT included in the BOM.`,
      );
    } else {
      addPosts(
        runSpecies,
        runPostStock[runSpecies],
        terminals,
        tp.postCutDownNotes?.[String(runFinished)]?.[runSpecies],
      );
    }
  }

  // Posts + species-conditional concrete
  for (const { species, postLength, note, count } of postAccumulator.values()) {
    emit(lines, {
      runId: run.runId, segmentId: anchorSegId,
      sku: isku(tp.skus.post, { species: SPECIES_TOKEN[species], postLength }),
      category: "post", quantity: count, unit: "each",
      notes: `100×75mm ${species} posts, ${postLength}mm stock` + (note ? ` — ${note}` : ""),
    });
    emit(lines, {
      runId: run.runId, segmentId: anchorSegId,
      sku: species === "pine" ? tp.concrete.pineSku : tp.concrete.hardwoodSku,
      category: "mounting", quantity: count * tp.concrete.bagsPerPost, unit: "bag",
      notes: `${tp.concrete.bagsPerPost} bag(s) per post — ${species === "pine" ? "rapid set for pine" : "post mix for hardwood"} posts`,
    });
  }

  return lines;
}
