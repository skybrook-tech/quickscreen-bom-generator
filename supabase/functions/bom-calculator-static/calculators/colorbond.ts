// calculators/colorbond.ts — Colorbond steel-fencing BOM calculator.
//
// A bay-based (non-slat) fence: each bay = 2 rails (top + bottom) + N infill
// sheets, joined by shared channel posts, with 65×65 steel posts at run
// terminals/corners, tek-screw packs, caps, and mounting (in-ground concrete or
// shark-fin base plate). Reads its rules from `cfg.colorbond`. Emits SUPPLIER
// SKUs directly (Colorbond has clean order codes; the orchestrator's
// resolveInternalSku returns unmapped SKUs unchanged). MVP: fence only, no gates.

import type {
  CalcContext, CanonicalRun, CanonicalPayload, QtyLine,
} from "../config/types.ts";
import { isku, toNumber } from "../engine-utils.ts";
import { applyExtraRules } from "./shared.ts";

type Sink = {
  warnings: string[];
  computed: Record<string, Record<string, Record<string, unknown>>>;
};

function emit(lines: QtyLine[], line: QtyLine): void {
  if (!Number.isFinite(line.quantity) || line.quantity <= 0) return;
  lines.push({ ...line, quantity: Math.ceil(line.quantity) });
}

// 65×65 terminal posts: one per post-typed run boundary + one per corner.
function terminalPostCount(run: CanonicalRun): number {
  return (run.leftBoundary?.type === "product_post" ? 1 : 0)
    + (run.rightBoundary?.type === "product_post" ? 1 : 0)
    + (run.corners?.length ?? 0);
}

export function colorbondCalculator(
  ctx: CalcContext,
  run: CanonicalRun,
  _payload: CanonicalPayload,
  sink: Sink,
): QtyLine[] {
  const lines: QtyLine[] = [];
  const cfg = ctx.configs.get(run.productCode) ?? ctx.configs.get("COLORBOND");
  const cb = cfg?.colorbond;
  if (!cfg || !cb) {
    sink.warnings.push(`Colorbond config missing for "${run.productCode}"; BOM for this run is empty.`);
    return [];
  }

  const runVars = run.variables ?? {};
  const runColour = String(runVars.colour_code ?? cfg.colours.fallback);
  const runMounting = String(runVars.mounting_type ?? cfg.defaults.mountingType);

  // Interior bay-to-bay joins (back-to-back channel-post pairs). Each join is
  // one footing and — under shark-fin mounting — one fin shared by the pair.
  let totalInteriorJoins = 0;

  for (const segment of run.segments) {
    if (segment.segmentKind === "gate_opening") continue; // no Colorbond gate in MVP
    const segId = segment.segmentId;
    const vars = { ...runVars, ...(segment.variables ?? {}) };

    const segWidth = toNumber(segment.segmentWidthMm, 0);
    if (segWidth <= 0) continue;

    const colour = String(vars.colour_code ?? cfg.colours.fallback);
    const profileCode = String(vars.profile ?? cb.profiles[0]?.code ?? "GO-LINE");
    const profile = cb.profiles.find((p) => p.code === profileCode) ?? cb.profiles[0];
    const bayWidth = Math.round(toNumber(vars.max_panel_width_mm, cb.bayWidths[0]));
    const finished = Math.round(
      toNumber(segment.targetHeightMm ?? vars.target_height_mm, cfg.defaults.targetHeightMm),
    );
    const mounting = String(vars.mounting_type ?? runMounting);
    const includeCaps = vars.post_cap !== false;

    const numBays = Math.max(1, Math.ceil(segWidth / bayWidth));

    if (profile && !profile.heights.includes(finished)) {
      sink.warnings.push(
        `${profile.code} sheets are not available at ${finished}mm finished height — verify sheet availability with the depot.`,
      );
    }
    const sheetHeight = finished - cb.sheetHeightOffsetMm;
    const sheetsPerBay = cb.sheetsPerBay[String(bayWidth)] ?? Math.ceil(bayWidth / 770);

    // Infill sheets
    emit(lines, {
      runId: run.runId, segmentId: segId,
      sku: isku(cb.skus.sheet, { profile: profile?.skuToken ?? "GLINE", sheetHeight, colour }),
      category: "sheet", quantity: sheetsPerBay * numBays, unit: "each",
      notes: `${sheetsPerBay} infill sheets per ${bayWidth}mm bay × ${numBays} bay(s)`,
    });

    // Top + bottom rails
    emit(lines, {
      runId: run.runId, segmentId: segId,
      sku: isku(cb.skus.rail, { bayWidth, colour }),
      category: "rail", quantity: cb.railsPerBay * numBays, unit: "each",
      notes: `top + bottom rail per bay × ${numBays} bay(s)`,
    });

    // Channel posts: 2 per bay (catalogue p6 recipe). Each bay's sheets slot
    // into its own C-channel on each side — interior joins are back-to-back
    // pairs (p14 "two-way" config); segment-end posts are one-way (affixed to
    // the 65×65 terminal post at run ends/corners, since rails can only
    // terminate into a C-channel).
    const interiorJoins = Math.max(0, numBays - 1);
    totalInteriorJoins += interiorJoins;
    const channelPosts = cb.channelPostsPerBay * numBays;
    const postHeight =
      cb.postHeightByFinished[String(finished)]?.[mounting as "in_ground" | "sharkfin_baseplate"]
      ?? cb.postHeightByFinished[String(finished)]?.in_ground
      ?? 2400;
    emit(lines, {
      runId: run.runId, segmentId: segId,
      sku: isku(cb.skus.channelPost, { postHeight, colour }),
      category: "post", quantity: channelPosts, unit: "each",
      notes: `${cb.channelPostsPerBay} channel posts per bay × ${numBays} bay(s) at ${postHeight}mm for ${finished}mm ${mounting}`,
    });
    if (includeCaps) {
      // Double-sided caps cover the back-to-back pairs at interior joins;
      // single-sided caps cover the one-way posts at the segment ends.
      emit(lines, {
        runId: run.runId, segmentId: segId,
        sku: cb.skus.capDouble, category: "cap", quantity: interiorJoins, unit: "each",
        notes: "double-sided caps for back-to-back channel-post joins",
      });
      emit(lines, {
        runId: run.runId, segmentId: segId,
        sku: cb.skus.capSingle, category: "cap", quantity: 2, unit: "each",
        notes: "single-sided caps for one-way channel posts at segment ends",
      });
    }

    // Tek-screw pack per bay
    emit(lines, {
      runId: run.runId, segmentId: segId,
      sku: isku(cb.skus.tekScrewPack, { colour }),
      category: "fixing", quantity: cb.tekPacksPerBay * numBays, unit: "pack",
      notes: `tek-screw pack (15) per bay × ${numBays} bay(s)`,
    });

    // Extra rules (typed extension hook — depot-availability warnings etc.)
    applyExtraRules(cfg.extraRules, {
      runId: run.runId,
      segmentId: segId,
      actualHeightMm: finished,
      numPanels: numBays,
      panelWidthMm: bayWidth,
      variables: vars,
    }, lines, sink.warnings);
  }

  // Terminal 65×65 steel posts (run ends + corners) — carry the run colour.
  const anchorSegId =
    run.segments.find((s) => s.segmentKind !== "gate_opening")?.segmentId
    ?? run.segments[0]?.segmentId
    ?? run.runId;
  const terminalPosts = terminalPostCount(run);
  if (terminalPosts > 0) {
    emit(lines, {
      runId: run.runId, segmentId: anchorSegId,
      sku: isku(cb.skus.terminalPost, { colour: runColour }),
      category: "post", quantity: terminalPosts, unit: "each",
      notes: "65×65 steel posts at run ends/corners (free top cap included)",
    });
  }

  // Mounting — counted per FOOTING (post position), not per post: an interior
  // join's back-to-back pair shares one footing/fin, and a terminal 65×65 and
  // its affixed one-way channel post share one footing (the 65×65's welded
  // base plate handles bolt-down under shark-fin mounting).
  const footings = totalInteriorJoins + terminalPosts;
  if (footings > 0) {
    if (runMounting === "sharkfin_baseplate") {
      // One fin per interior join — channel posts fix back-to-back against the
      // vertical fin (catalogue p15); terminals use the 65×65's welded plate.
      if (totalInteriorJoins > 0) {
        emit(lines, {
          runId: run.runId, segmentId: anchorSegId,
          sku: isku(cb.skus.sharkfin, { colour: runColour }),
          category: "fixing", quantity: totalInteriorJoins, unit: "each",
          notes: "shark-fin base plate per channel-post join",
        });
      }
    } else {
      emit(lines, {
        runId: run.runId, segmentId: anchorSegId,
        sku: cb.skus.concrete,
        category: "fixing", quantity: footings * cb.bagsPerInGroundPost, unit: "bag",
        notes: `${cb.bagsPerInGroundPost} concrete bag(s) per post footing`,
      });
    }
  }

  return lines;
}
