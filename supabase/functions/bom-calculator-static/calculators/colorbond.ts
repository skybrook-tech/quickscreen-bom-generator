// calculators/colorbond.ts — Colorbond steel-fencing BOM calculator.
//
// A bay-based (non-slat) fence: each bay = 2 rails (top + bottom) + N infill
// sheets, joined by shared channel posts, with 65×65 steel posts at run
// terminals/corners, tek-screw packs, caps, and mounting (in-ground concrete or
// shark-fin base plate). Reads its rules from `cfg.colorbond`. Emits SUPPLIER
// SKUs directly (Colorbond has clean order codes; the orchestrator's
// resolveInternalSku returns unmapped SKUs unchanged).
//
// Gates: `cfg.colorbond.gates` selects "kit" (fabricated from stiles + rails +
// infill sheet + tek pack, GO catalogue p7/p17) or "bundle" (pre-built gate
// SKU + hardware kits, Amazing Fencing). No gates config → loud warning.

import type {
  CalcContext, CanonicalRun, CanonicalPayload, CanonicalSegment, QtyLine,
} from "../config/types.ts";
import {
  GATE_SEGMENT_STUB_KEYS, gateMovementOrDefault, isku, knownSelectedSku, toNumber,
} from "../engine-utils.ts";
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

function nearest(options: number[], value: number): number {
  return options.reduce(
    (best, o) => (Math.abs(o - value) < Math.abs(best - value) ? o : best),
    options[0],
  );
}

// Colorbond gate segment (kit or bundle mode — see cfg.colorbond.gates).
// Gates hang off the run's channel/terminal posts: no extra gate posts in v1.
function calculateColorbondGateSegment(
  run: CanonicalRun,
  segment: CanonicalSegment,
  runVars: Record<string, unknown>,
  cfg: NonNullable<ReturnType<CalcContext["configs"]["get"]>>,
  sink: Sink,
): QtyLine[] {
  const lines: QtyLine[] = [];
  const cb = cfg.colorbond!;
  const gates = cb.gates;
  const base = { runId: run.runId, segmentId: segment.segmentId };
  if (!gates || !cfg.gateRules.supported) {
    sink.warnings.push(
      `Gates are not configured for this Colorbond catalogue — the gate opening was NOT included in the BOM.`,
    );
    return lines;
  }

  const vars = { ...runVars, ...(segment.variables ?? {}) };
  const movement = gateMovementOrDefault(vars[GATE_SEGMENT_STUB_KEYS.gateMovement]);
  if (movement === "sliding") {
    sink.warnings.push(
      "Sliding gates are not available for Colorbond fencing — the gate opening was NOT included in the BOM.",
    );
    return lines;
  }
  const leafCount = movement === "double_swing" ? 2 : 1;
  const colour = String(vars[GATE_SEGMENT_STUB_KEYS.colourCode] ?? vars.colour_code ?? cfg.colours.fallback);
  const openingWidthMm = toNumber(segment.segmentWidthMm, 900);
  const gateHeightMm = Math.round(toNumber(
    segment.targetHeightMm ?? vars[GATE_SEGMENT_STUB_KEYS.gateHeightMm],
    toNumber(runVars.target_height_mm, cfg.defaults.targetHeightMm),
  ));

  sink.computed[run.runId] = sink.computed[run.runId] ?? {};
  sink.computed[run.runId][segment.segmentId] = {
    ...(sink.computed[run.runId][segment.segmentId] ?? {}),
    gate_movement: movement, gate_leaf_count: leafCount, gate_mode: gates.mode,
    gate_opening_width_mm: Math.round(openingWidthMm), gate_height_mm: gateHeightMm,
  };

  if (gates.mode === "bundle") {
    const bundle = gates.bundle;
    if (!bundle) {
      sink.warnings.push("Colorbond gate config is set to bundle mode but has no bundle catalogue — gate NOT included in the BOM.");
      return lines;
    }
    const leaf = leafCount === 2 ? "DBL" : "SGL";
    const snappedWidth = nearest(bundle.widthsMm, openingWidthMm);
    if (snappedWidth !== Math.round(openingWidthMm)) {
      sink.warnings.push(
        `Gate opening ${Math.round(openingWidthMm)}mm snapped to the nearest ${snappedWidth}mm pre-built gate bundle.`,
      );
    }
    emit(lines, {
      ...base,
      sku: isku(bundle.skus.gate, { leaf, gateWidth: snappedWidth, gateHeight: gateHeightMm, colour }),
      category: "gate", quantity: 1, unit: "each",
      notes: `pre-built ${leafCount === 2 ? "double" : "single"} gate bundle, ${snappedWidth}mm opening (hangs off run posts — no extra gate posts)`,
    });
    const kitCodes = leafCount === 2 ? bundle.doubleHardwareKitCodes : bundle.singleHardwareKitCodes;
    for (const kitCode of kitCodes) {
      emit(lines, {
        ...base,
        sku: isku(bundle.skus.hardwareKit, { kitCode, colour }),
        category: "hardware", quantity: 1, unit: "each",
        notes: `${kitCode} gate hardware kit`,
      });
    }
    const dropBoltSku = knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.dropBoltType]);
    if (dropBoltSku) {
      emit(lines, { ...base, sku: dropBoltSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected drop bolt" });
    }
    return lines;
  }

  // ── Kit mode (fabricated gate) ──────────────────────────────────────────────
  const kit = gates.kit;
  if (!kit) {
    sink.warnings.push("Colorbond gate config is set to kit mode but has no kit rules — gate NOT included in the BOM.");
    return lines;
  }
  const stileHeight = nearest(kit.stileHeights, gateHeightMm);
  if (stileHeight !== gateHeightMm) {
    sink.warnings.push(
      `Colorbond gate stiles come in ${kit.stileHeights.join("/")}mm — ${gateHeightMm}mm gate snapped to ${stileHeight}mm.`,
    );
  }
  const leafWidthMm = openingWidthMm / leafCount;
  if (Math.abs(leafWidthMm - kit.nominalLeafWidthMm) > kit.leafWidthToleranceMm) {
    sink.warnings.push(
      `Assembled Colorbond kit gates are ~${kit.nominalLeafWidthMm}mm per leaf — this opening gives ${Math.round(leafWidthMm)}mm per leaf. Confirm the opening or use a custom gate.`,
    );
  }

  const profileCode = String(vars.profile ?? cb.profiles[0]?.code ?? "GO-LINE");
  const profile = cb.profiles.find((p) => p.code === profileCode) ?? cb.profiles[0];
  const sheetHeight = stileHeight - cb.sheetHeightOffsetMm;

  emit(lines, {
    ...base,
    sku: isku(kit.skus.stilePack, { stileHeight, colour }),
    category: "gate", quantity: leafCount, unit: "pack",
    notes: `gate stile pack (left + right stile) per leaf × ${leafCount} (hangs off run posts — no extra gate posts)`,
  });
  emit(lines, {
    ...base,
    sku: isku(kit.skus.gateRail, { colour }),
    category: "gate_rail", quantity: kit.railsPerLeaf * leafCount, unit: "each",
    notes: `top + bottom gate rails per leaf × ${leafCount}`,
  });
  emit(lines, {
    ...base,
    sku: isku(kit.skus.infillSheet, { profile: profile?.skuToken ?? "GLINE", sheetHeight, colour }),
    category: "accessory", quantity: kit.sheetsPerLeaf * leafCount, unit: "each",
    notes: `infill sheet per leaf × ${leafCount}`,
  });
  emit(lines, {
    ...base,
    sku: isku(kit.skus.tekScrewPack, { colour }),
    category: "fixing", quantity: kit.tekPacksPerLeaf * leafCount, unit: "pack",
    notes: `tek-screw pack per leaf × ${leafCount}`,
  });

  const hingeSku = knownSelectedSku(isku(String(vars[GATE_SEGMENT_STUB_KEYS.hingeType] ?? ""), { colour }));
  const latchSku = knownSelectedSku(isku(String(vars[GATE_SEGMENT_STUB_KEYS.latchType] ?? ""), { colour }));
  if (hingeSku) {
    emit(lines, { ...base, sku: hingeSku, category: "hardware", quantity: leafCount, unit: "each", notes: "Selected hinge hardware (per leaf)" });
  } else {
    sink.warnings.push("No hinge selected for the Colorbond gate — hinges are NOT included in the BOM.");
  }
  if (latchSku) {
    emit(lines, { ...base, sku: latchSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected latch / lock hardware" });
  } else {
    sink.warnings.push("No latch selected for the Colorbond gate — a latch is NOT included in the BOM.");
  }
  // Drop bolts secure the standing leaf — double gates only.
  const dropBoltSku = movement === "double_swing"
    ? knownSelectedSku(vars[GATE_SEGMENT_STUB_KEYS.dropBoltType])
    : undefined;
  if (dropBoltSku) {
    emit(lines, { ...base, sku: dropBoltSku, category: "hardware", quantity: 1, unit: "each", notes: "Selected drop bolt" });
  }

  return lines;
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
    if (segment.segmentKind === "gate_opening") {
      lines.push(...calculateColorbondGateSegment(run, segment, runVars, cfg, sink));
      continue;
    }
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
    const cutDownNote = cb.cutDownNoteByFinished?.[String(finished)];
    emit(lines, {
      runId: run.runId, segmentId: segId,
      sku: isku(cb.skus.channelPost, { postHeight, colour }),
      category: "post", quantity: channelPosts, unit: "each",
      notes: `${cb.channelPostsPerBay} channel posts per bay × ${numBays} bay(s) at ${postHeight}mm for ${finished}mm ${mounting}`
        + (cutDownNote ? ` — ${cutDownNote}` : ""),
    });
    if (includeCaps) {
      if ((cb.capRule ?? "single_double") === "half_posts") {
        // One cap covers each back-to-back channel-post pair (vendor rule:
        // ceil(posts / 2), odd post out still gets a cap).
        emit(lines, {
          runId: run.runId, segmentId: segId,
          sku: cb.skus.capDouble, category: "cap",
          quantity: Math.ceil(channelPosts / 2), unit: "each",
          notes: "post caps at one per channel-post pair (ceil(posts/2))",
        });
      } else {
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
    // {postHeight} is available to vendor templates whose terminal post is a
    // height-dependent stock item (e.g. AF terminates runs in C-posts);
    // templates without the token (GO's fixed 65×65) ignore it.
    const runFinished = Math.round(
      toNumber(runVars.target_height_mm, cfg.defaults.targetHeightMm),
    );
    const terminalPostHeight =
      cb.postHeightByFinished[String(runFinished)]?.[runMounting as "in_ground" | "sharkfin_baseplate"]
      ?? cb.postHeightByFinished[String(runFinished)]?.in_ground
      ?? 2400;
    emit(lines, {
      runId: run.runId, segmentId: anchorSegId,
      sku: isku(cb.skus.terminalPost, { colour: runColour, postHeight: terminalPostHeight }),
      category: "post", quantity: terminalPosts, unit: "each",
      notes: cb.terminalPostNote ?? "65×65 steel posts at run ends/corners (free top cap included)",
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
