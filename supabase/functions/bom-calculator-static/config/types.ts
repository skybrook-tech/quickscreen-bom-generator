// config/types.ts — CalculatorConfig type and CalcContext
//
// CalculatorConfig: everything that varies between suppliers/products.
//   The base config (Glass Outlet defaults) lives in config/base.ts.
//   Supplier overrides are sparse JSONB patches deep-merged over the base.
//
// CalcContext: per-request context carrying components, pricing, and resolved
//   configs. Passed explicitly to calculateLocalBom and all calculators.
//   No module-level globals.

export type PricingTier = "tier1" | "tier2" | "tier3";

// Template string where {colour}, {slatSize}, {gapCode} etc are substituted by
// the calculator before emission. Result is the INTERNAL SKU.
export type SkuTemplate = string;

export type CalculatorConfig = {
  productCode: string;
  configVersion: string;

  // Which calculation strategy to use for fence panels and gates.
  // Controls dispatch inside the QuickScreen calculator.
  strategy: {
    // "colorbond_sheet" is a non-slat, bay-based steel-fence strategy handled by
    // its own registered calculator (calculators/colorbond.ts) — it never enters
    // quickScreenCalculator's slat branches. "timber_paling" is likewise its own
    // calculator (calculators/timber-paling.ts) reading the timberPaling block.
    fence: "horizontal_slat" | "vertical_slat" | "panel" | "colorbond_sheet" | "timber_paling";
  };

  // Colour availability & fallback. Currently in code; will move to a DB table
  // in Phase 5. Kept here so supplier overrides can restrict/extend colours.
  colours: {
    standard: string[];  // full Colorbond set (code shortcuts like "B", "MN")
    economy: string[];   // economy finish subset (e.g. ["B","MN","SM"])
    alumawood: string[]; // finish-specific (KWI, WRC)
    gate: string[];      // allowed on gate components
    fallback: string;    // e.g. "MN" — used when colour not in set
    names: Record<string, string>; // display names: { B: "Black Satin", ... }
    swatches: Record<string, string>; // hex values: { B: "#1a1a1a", ... }
  };

  // Display metadata for landing/selector/run-header surfaces. Replaces the
  // client-side `systemDisplayName` fallback maps and the hardcoded name
  // ternaries in RunListV3 / ProductSelectV3 / calculatorV3Helpers.
  display: {
    name: string;        // long form, e.g. "QuickScreen Horizontal Slat"
    shortName: string;   // chip/selector label, e.g. "Horizontal Slats"
    description: string; // landing-card copy, e.g. "Quick Screen Horizontal Slats"
  };

  // Finish families this product offers (drives the `finish_family` field's
  // option list). Replaces client `finishOptionsForSystem`.
  finishFamilies: string[];

  // Height picker UI mode. Replaces `productCode === "VS"` branches across
  // SegmentRow / InlineHeightEditor. Aligns with the v4 `target_height_ui`
  // concept (src/lib/targetHeightOptions.ts).
  heightUi: {
    // "options" = a fixed discrete list of achievable heights (heightOptions),
    // for products whose heights are manufactured, not slat-derived (Colorbond).
    mode: "ladder" | "freeform" | "options";
    freeformMinMm?: number;
    freeformMaxMm?: number;
    freeformStepMm?: number;
    heightOptions?: number[]; // used when mode === "options"
  };

  panelRules: {
    maxPanelWidthMm: number;
    minPostSpacingMm: number;
    maxPostSpacingMm: number;
  };

  // Post-fixing/grout material catalogue offered by the post_fixing_select
  // control (in-ground mounting only). UI-safe — sku/label/description, no
  // pricing. Overridable per supplier if their grout range differs.
  postFixingMaterials: Array<{ sku: string; label: string; description: string }>;

  // QS_GATE opening-width/height bounds enforced client-side in
  // src/lib/gateConstraints.ts (v3). Only meaningful on the QS_GATE config
  // (fence configs carry the same default values but never read them).
  // src/lib/gateFenceResolve.ts carries an unwired duplicate of the height
  // bounds but is v4-only (calculator-v4 is slated for removal) — not
  // pointed at this config. No live server-side enforcement of these
  // bounds yet — see AGENTS.md business rules / phase-6 plan notes.
  gateRules: {
    maxWidthMm: {
      pedestrianHorizontal: number;
      pedestrianVertical: number;
      slidingHorizontal: number;
      slidingVertical: number;
    };
    doubleSwingMaxLeafWidthMm: number;
    // Whether gates can be added to runs of this product (BAYG → false).
    // Replaces the `!isBayg` gate-exclusion checks in RunCard/RunCardSettings.
    supported: boolean;
    // Default gate infill orientation for this fence system (VS → vertical).
    // Replaces the `isVS` arg to `defaultGateBuildForMovement`.
    defaultInfill: "horizontal" | "vertical";
    // Product code used when creating/loading gate segments for this fence system.
    gateProductCode: string;
  };

  // Cross-product defaults actually read by calculators (colorbond reads
  // targetHeightMm + mountingType; colour is the generic seed). Slat-specific
  // defaults flow through fields[].default_value_json, not here.
  defaults: {
    targetHeightMm: number;
    colour: string;
    mountingType: string;
  };

  // Form field definitions for the v3 run/section/gate UI. Single source of
  // truth for what the client renders — see config/products/<code>/fields.json
  // for the actual field array. The engine itself ignores this section
  // entirely. Each field carries a `settings_for` list declaring which UI
  // surfaces it renders on: "run" (Run Settings, also seeds run.variables
  // defaults) and/or "segment" (per-segment override UI). Segments inherit
  // run values unless they carry their own override — `settings_for` only
  // governs visibility, not merge semantics.
  fields: FormFieldDef[];

  // Non-collapsible group headings the client renders above buckets of fields
  // (see SchemaSettingsForm). A field's `group` key must match one of these.
  // Fields without a group are schema-only (declared but not rendered).
  formGroups: Array<{ key: string; label: string; sort_order: number }>;

  // Typed extension rules that suppliers can parameterise.
  // New rule TYPES are added in code + tested; suppliers only supply values.
  extraRules?: Array<
    | {
        id: string;
        type: "extra_component_above_height";
        internalSku: string;
        aboveHeightMm: number;
        qtyPerPanel: number;
        notes?: string;
      }
    | {
        id: string;
        type: "warning";
        when: { field: "panelWidthMm" | "gateWidthMm"; op: ">" | ">=" | "<"; value: number };
        message: string;
      }
    | {
        id: string;
        // Fires when a run/segment variable matches one of the listed values
        // (string-coerced). e.g. depot-availability notes keyed on `profile`.
        type: "variable_warning";
        when: { variable: string; in: Array<string | number | boolean> };
        message: string;
      }
  >;

  // Per-strategy blocks — exactly one should be present per product.
  // Slat screening (QSHS/VS/XPL/BAYG + the shared QS gate path):
  slat?: SlatConfig;

  // Colorbond steel-fencing data (bay-based, non-slat). Only present on the
  // COLORBOND config; read exclusively by calculators/colorbond.ts. Slat products
  // leave this undefined. See docs / the catalogue recipe for the source rules.
  colorbond?: ColorbondConfig;

  // Timber paling fencing data (posts + rails + palings, butted or
  // lapped-and-capped). Only present on the TIMBER_PALING config; read
  // exclusively by calculators/timber-paling.ts.
  timberPaling?: TimberPalingConfig;
};

// Slat-screening strategy block — everything only the QuickScreen calculator
// (calculators/quickscreen.ts, including its gate path) reads. Products that
// are not slat systems (e.g. Colorbond) simply omit this block.
export type SlatConfig = {
  // Slat-only colour subsets.
  colours: {
    csrPlate: string[];            // subset available for CSR plate SKUs (XP-BTP-{c})
    louvreBracketFallback: string; // colour used when louvre bracket SKU absent
  };

  // Slatted-gap capability. Replaces `supportsCustomGap` /
  // `CUSTOM_GAP_MIN_MM` / `CUSTOM_GAP_MAX_MM` in src/lib/gapChoices.ts.
  gapRules: {
    allowCustom: boolean;
    customMinMm: number;
    customMaxMm: number;
  };

  // Internal SKU templates. The calculator substitutes {colour}, {slatSize},
  // {gapCode}, etc., and the result is the internal SKU (e.g. "SLAT.STD.65.B").
  // These canonical names are SHARED across suppliers — only the resolution
  // mapping (DEFAULT_INTERNAL_SKU_MAP or DB rows) differs per supplier.
  internalSkus: {
    slat: {
      standard: SkuTemplate;   // "SLAT.STD.{slatSize}.{colour}"
      economy: SkuTemplate;    // "SLAT.ECO.{slatSize}.{colour}"
      awood65: SkuTemplate;    // "SLAT.AW.65.{colour}"
      awood90: SkuTemplate;    // "SLAT.AW.90.{colour}"
    };
    frame: {
      sideFrame: SkuTemplate;   // "FRAME.SF.STD.{colour}"
      sideFrameAW: SkuTemplate; // "FRAME.SF.AW.{colour}"
      cfc: SkuTemplate;         // "FRAME.CFC.STD.{colour}"
      cfcAW: SkuTemplate;       // "FRAME.CFC.AW.{colour}"
      fSection: SkuTemplate;    // "FRAME.F.STD.{colour}"
      fSectionAW: SkuTemplate;  // "FRAME.F.AW.{colour}"
      csr: SkuTemplate;         // "FRAME.CSR.STD.{colour}"
      csrAW: SkuTemplate;       // "FRAME.CSR.AW.{colour}"
      csrCap: SkuTemplate;      // "FRAME.CSRCAP.{colour}"
      csrPlate: SkuTemplate;    // "FRAME.CSRPLATE.{colour}" (XP-BTP, companion of CSR)
      vertRail: SkuTemplate;    // "FRAME.RAIL.VERT.STD.{colour}" (VS U-channel)
    };
    post: {
      fullShort: SkuTemplate;   // "POST.FULL.SHORT.{colour}" (1800mm in-ground)
      fullStd: SkuTemplate;     // "POST.FULL.STD.{colour}"
      fullTall: SkuTemplate;    // "POST.FULL.TALL.{colour}"
      hd65Std: SkuTemplate;     // "POST.HD65.STD.{colour}"
      hd65Tall: SkuTemplate;    // "POST.HD65.TALL.{colour}"
      awFullStd: SkuTemplate;   // "POST.AW.FULL.STD.{colour}"
      awFullTall: SkuTemplate;  // "POST.AW.FULL.TALL.{colour}"
      awHd65Std: SkuTemplate;   // "POST.AW.HD65.STD.{colour}"
      awHd65Tall: SkuTemplate;  // "POST.AW.HD65.TALL.{colour}"
    };
    postAcc: {
      topPlate50: SkuTemplate;  // "POST.ACC.TP.50.{colour}"
      topPlate65: SkuTemplate;  // "POST.ACC.TP.65.{colour}"
      basePlate50: SkuTemplate;
      basePlate65: SkuTemplate;
      domical50: SkuTemplate;
      domical65: SkuTemplate;
      dressRing50: SkuTemplate;
      dressRing65: SkuTemplate;
      awTopPlate50: SkuTemplate; // Alumawood — no colour param (terrain finish only)
      awTopPlate65: SkuTemplate;
      awBasePlate50: SkuTemplate;
      awBasePlate65: SkuTemplate;
      awDomical50: SkuTemplate;
      awDomical65: SkuTemplate;
      awDressRing50: SkuTemplate;
      awDressRing65: SkuTemplate;
    };
    gate: {
      rail65: SkuTemplate;
      rail90: SkuTemplate;
      slideTopRail65: SkuTemplate;
      slideTopRail90: SkuTemplate;
      slideBotRail: SkuTemplate;
      sideFrame: SkuTemplate;
      infillHoriz: SkuTemplate;
      infillVert: SkuTemplate;
      cover: SkuTemplate;
      cap: SkuTemplate;
    };
    angleAdapter: { std: SkuTemplate; awood: SkuTemplate };
    screws: { slatFixing: SkuTemplate; xpFixing: SkuTemplate; gateRail: SkuTemplate };
    spacer: SkuTemplate;     // "SPACER.{gapCode}" → QS-SPACER-{gapCode}-50PK (pack)
    spacerEach: SkuTemplate; // "SPACER.EACH.{gapCode}" → QS-SPACER-{gapCode} (BAYG per-each)
    louvreBracket: SkuTemplate;
    customCorner: string; // constant, no substitution
    sideFameCap: string;  // QS-SFC-B — currently single colour; kept as direct string
  };

  // All stock lengths in mm. Overridable per supplier.
  // (e.g. Supplier B ships slats in 4000mm lengths → stockLengths.slat.standard = 4000)
  stockLengths: {
    slat: { standard: number; economy: number; awood: number };
    rail: { fence: number; gateHoriz: number; gateSliding: number };
    frame: {
      sideFrame: number; gateFrame: number;
      vsRail: number;         // VS U-channel rail (5000mm)
      vsRailInsert: number;   // VS SF insert inside rail (5800mm)
      vsFSection: number;     // VS F-section (5800mm)
    };
    track: number; // sliding gate track (may vary 3000/6000 per sku)
  };

  // Geometry constants — deductions applied to fence/gate dimensions.
  // These encode how the products physically fit together. Overridable if a
  // supplier's system uses different cut tolerances.
  geometry: {
    // Fence
    slatHeightDeduction: number;  // (targetH + gap - N) / (design + gap)
    slatCutDeduction: number;     // panelWidth - N (slat horizontal cut)
    sideFrameCutDeduction: number; // actualHeight - N
    csrCutDeduction: number;      // actualHeight - N

    // Gate — swing
    swingBladeCutHorizDeduction: number; // leafWidth - N
    swingBladeCutVertDeduction: number;  // gateHeight - N
    swingRailCutDeduction: number;       // leafWidth - N

    // Gate — sliding
    slidingBladeCutHorizDeduction: number;  // openingWidth - N
    slidingBladeCutVertDeduction: number;   // gateHeight - N
    slidingRailCutDeduction: number;        // openingWidth - N
    slidingFrameCutDeduction: number;       // gateHeight - N
    slidingBladeVertWidthDeduction: number; // floor((openingW - N + gap)/...)
    slidingCsrAboveMm: number;             // require CSR rail above this gate width
    slidingCsrCutDeduction: number;         // frameCut - N (CSR cut within gate)

    // F-section screw spacing formula: max(minScrews, ceil((cut - offset)/spacing) + 1) * 2 per piece
    fSectionScrewMinPerPiece: number;
    fSectionScrewSpacing: number;
    fSectionScrewStartOffset: number;
  };

  packSizes: {
    slatScrews: number;    // units per pack (50)
    xpScrews: number;      // units per bag (100)
    spacers: number;       // units per pack (50)
    economySlat: number;   // units per pack (96)
    gateRailScrews: number; // units per pack (50)
    gateSlatScrews: number; // units per pack (50)
    screwWasteFactor: number; // e.g. 1.01
  };

  // csrPerPanel thresholds: [{underMm: 2000, count:0}, {underMm:4000, count:1}, ...]
  csrThresholds: Array<{ underMm: number; count: number }>;

  // Supplier-SKU prefix identifying economy slats sold in fixed packs
  // (pack size = packSizes.economySlat). Drives applyEconomySlatPackRule.
  economySlatSkuPrefix: string;

  postRules: {
    longPostThresholdMm: number;       // above this height → use "tall" stock
    inGroundShortPostMaxHeightMm: number; // at or below this → try short stock
    shortPostColours: string[];           // colours for which short post stock exists
  };

  mountingRules: {
    inGround: {
      defaultGroutSku: string; // direct supplier SKU (grout is generic)
      bagsPerPost: number;
    };
    basePlate: {
      timberKitSku: string;   // S-110LAG-4PK
      concreteKitSku: string; // S-120ROD-4PK
    };
  };

  // The achieved-height ladder deduction ((slat + gap) * N - gap + this).
  // Projected to the client inside the flat `heightLadder` UI slice.
  slatHeightDeductionMm: number;
};

// Colorbond steel fencing — SKU templates + quantity rules for the bay-based
// calculator. Placeholders substituted by calculators/colorbond.ts:
// {profile} (SKU token e.g. GLINE), {sheetHeight}, {bayWidth}, {postHeight}, {colour}.
export type ColorbondConfig = {
  bayWidths: number[];                       // e.g. [2365, 3125]
  sheetsPerBay: Record<string, number>;      // { "2365": 3, "3125": 4 }
  railsPerBay: number;                       // 2 (top + bottom)
  // Channel posts per bay (catalogue p6 recipe: 2 — each bay's sheets slot into
  // its own C-channel each side; interior joins are back-to-back pairs, run
  // ends are one-way posts affixed to the 65×65 terminal post — p14 configs).
  channelPostsPerBay: number;
  tekPacksPerBay: number;                    // 1 pack of 15 per bay
  bagsPerInGroundPost: number;               // concrete bags per in-ground post
  sheetHeightOffsetMm: number;               // sheetHeight = finishedHeight - offset (10)
  postSpacingExtraMm: number;                // post centres = bayWidth + this (10)
  profiles: Array<{
    code: string;      // "GO-LINE"
    skuToken: string;  // "GLINE" (used in the sheet SKU)
    heights: number[]; // allowed FINISHED heights, e.g. [1500, 1800, 2100]
  }>;
  // Post-cap counting rule (typed vendor knob — docs/vendor-model-plan.md §4a).
  // "single_double" (default, Glass Outlet): double-sided caps on interior
  // back-to-back joins + 2 single-sided caps per segment.
  // "half_posts" (Amazing Fencing): one cap per channel-post pair —
  // ceil(channelPosts / 2) of skus.capDouble; capSingle unused.
  capRule?: "single_double" | "half_posts";
  // Finished height → channel-post stock height, per mounting method.
  postHeightByFinished: Record<string, { in_ground: number; sharkfin_baseplate?: number }>;
  // Finished height → on-site cut-down note appended to the channel-post line
  // (e.g. AF 1200mm: the 2100mm C-post is cut down 300mm). Keeps quotes honest
  // about stock lengths that need cutting.
  cutDownNoteByFinished?: Record<string, string>;
  // BOM-line note for the terminal-post line. Defaults to the Glass Outlet
  // wording (65×65 steel post, free top cap); vendors whose terminal post
  // differs override it.
  terminalPostNote?: string;
  // Colorbond gate support. Absent → gate segments emit nothing + a loud
  // warning (set gateRules.supported accordingly). Two typed modes:
  // "kit"    — gate fabricated from parts (GO catalogue p7/p17: 2× stiles per
  //            leaf via a 2-pack, 2× gate rails, 1× infill sheet, tek pack,
  //            plus hinge/latch/drop-bolt hardware from the gate fields).
  // "bundle" — pre-built gate SKU snapped to the nearest catalogue width,
  //            plus hardware kits (Amazing Fencing GP bundles).
  // Placeholders: {stileHeight}, {sheetHeight}, {profile}, {colour} (kit);
  // {leaf} (SGL|DBL), {gateWidth}, {gateHeight}, {kitCode} (bundle).
  gates?: {
    mode: "kit" | "bundle";
    kit?: {
      nominalLeafWidthMm: number;   // 900 — assembled kit-gate leaf width
      leafWidthToleranceMm: number; // warn when the opening deviates further
      stileHeights: number[];       // available stile-pack heights (snap + warn)
      railsPerLeaf: number;         // 2 (top + bottom)
      sheetsPerLeaf: number;        // 1 infill sheet per leaf
      tekPacksPerLeaf: number;      // 1
      skus: {
        stilePack: SkuTemplate;     // "CB-{stileHeight}GS-{colour}-2PK"
        gateRail: SkuTemplate;      // "CB-GATE-R-830-{colour}"
        infillSheet: SkuTemplate;   // "CB-{profile}-{sheetHeight}-{colour}"
        tekScrewPack: SkuTemplate;  // "CB-TS-{colour}-15PK"
      };
    };
    bundle?: {
      widthsMm: number[];           // catalogue gate widths, e.g. [900..2100]
      // Hardware kit codes offered for each movement; every listed code must
      // interpolate into skus.hardwareKit as {kitCode}.
      singleHardwareKitCodes: string[]; // e.g. ["BUTT-HINGE", "D-LATCH"]
      doubleHardwareKitCodes: string[]; // e.g. ["DOUBLE-SET"]
      skus: {
        gate: SkuTemplate;          // "AF-CBD-GATE-STD-{leaf}-{gateWidth}"
        hardwareKit: SkuTemplate;   // "AF-CBD-GATEHW-{kitCode}"
      };
    };
  };
  skus: {
    sheet: SkuTemplate;        // "CB-{profile}-{sheetHeight}-{colour}"
    rail: SkuTemplate;         // "CB-RAIL-{bayWidth}-{colour}"
    channelPost: SkuTemplate;  // "CB-CPOST-{postHeight}-{colour}"
    terminalPost: SkuTemplate; // "XPSG-2700-ST65-{colour}"
    capSingle: SkuTemplate;    // "CB-POSTCAP-SGL"
    capDouble: SkuTemplate;    // "CB-POSTCAP-DBL"
    tekScrewPack: SkuTemplate; // "CB-TS-{colour}-15PK"
    sharkfin: SkuTemplate;     // "CB-SHARKFIN-{colour}"
    concrete: SkuTemplate;     // "GROUT-CONCRETE"
  };
};

// Timber paling fencing — quantity rules + SKU templates for the post/rail/
// paling calculator (calculators/timber-paling.ts). Placeholders:
// {palingLength} (= fence height), {species} (PINE | HWD), {postLength},
// {railLength}, {cappingLength}. Source: the supplier's BOM-by-height doc
// (catalogues/amazing-fencing/) — layer paling counts are the supplier's
// PUBLISHED per-bay numbers (butted 27 already includes their 5% wastage);
// extraWastageFactor exists so an overlay can add margin without re-deriving.
export type TimberPalingConfig = {
  bayWidthMm: number;          // 2400 (post centres)
  railStockLengthMm: number;   // 4800
  railSpanBays: number;        // 2 — one 4.8m rail piece spans 2 bays per row
  // Rail rows by fence height: first entry with maxHeightMm >= height wins.
  // No matching entry = unmapped height → the calculator warns and skips
  // (never silently defaults).
  railsByHeight: Array<{ maxHeightMm: number; rails: number }>;
  extraWastageFactor: number;  // multiplier on paling totals before ceil (1.0)
  styles: {
    butted: {
      layers: Array<{
        palingsPerBay: number;          // 27 (incl. published 5% wastage)
        nailsPerPalingPerRail: number;  // 2
        nailSkuKey: "nails45Pack" | "nails57Pack";
      }>;
    };
    lapped_capped: {
      layers: Array<{
        palingsPerBay: number;          // back 19 / front 19
        nailsPerPalingPerRail: number;  // back 1 / front 2
        nailSkuKey: "nails45Pack" | "nails57Pack";
      }>;
      capping: { stockLengthMm: number; lengthsPerBay: number }; // 4800, 0.5
    };
  };
  battenScrewsPerRailPiece: number; // 2 (rail-to-post batten screws)
  packSizes: { nails45: number; nails57: number; battenScrews: number }; // 250/250/500
  // Fence height (mm, string key) → post stock length per species. Pine comes
  // in fewer stock lengths, so some heights use a longer post cut down on site
  // (note it in cutDownNotes).
  postStockByFenceHeight: Record<string, { pine: number; hardwood: number }>;
  // Fence height → species → on-site cut-down note for the post line.
  postCutDownNotes?: Record<string, Partial<Record<"pine" | "hardwood", string>>>;
  // Fence height → paling stock length when it differs from the fence height
  // (e.g. 2100mm fences use 2400mm palings cut down — there is no 2100 paling
  // stock). Missing key = paling length equals fence height.
  palingLengthByFenceHeight?: Record<string, number>;
  // Fence height → note for the paling line (e.g. 2100 palings cut from 2400).
  palingCutDownNotes?: Record<string, string>;
  concrete: {
    pineSku: SkuTemplate;     // "AF-CON-RAPID-30" (rapid set for pine)
    hardwoodSku: SkuTemplate; // "AF-CON-POSTMIX-30" (post mix for hardwood)
    bagsPerPost: number;      // 1
  };
  skus: {
    paling: SkuTemplate;          // "AF-PAL-100x16-{palingLength}"
    post: SkuTemplate;            // "AF-POST-{species}-100x75-{postLength}"
    rail: SkuTemplate;            // "AF-RAIL-{species}-75x38-{railLength}"
    cappingRail: SkuTemplate;     // "AF-CAP-75x50-{cappingLength}"
    nails45Pack: SkuTemplate;     // "AF-NAIL-COIL-45-250"
    nails57Pack: SkuTemplate;     // "AF-NAIL-COIL-57-250"
    battenScrewPack: SkuTemplate; // "AF-SCR-BB-14g-100-500"
  };
};

// Mirrors the client `SchemaField` shape (src/components/calculator-v3/SchemaDrivenForm.tsx)
// so the UI-projection endpoint can hand these straight to the form with no remapping.
export type FormFieldDef = {
  id?: string;
  field_key: string;
  label: string;
  control_type: string; // select | number | toggle | text | combined_gap | hardware_ranked | ...
  data_type: "enum" | "number" | "integer" | "boolean" | "string" | "boolean_string";
  options_json?: unknown[];
  default_value_json?: unknown;
  visible_when_json?: Record<string, unknown>;
  unit?: string;
  required?: boolean;
  sort_order: number;
  options_group?: string;
  // Groups this field under one of the config's formGroups headings. Fields
  // without a group are schema-only (declared but not rendered by
  // SchemaSettingsForm).
  group?: string;
  // Which UI surfaces this field renders on. "run" = Run Settings (and the
  // source of run.variables defaults); "segment" = per-segment override UI.
  // Defaults to ["run","segment"] when omitted. Visibility only — merge
  // semantics (run -> segment inheritance) are unchanged.
  settings_for?: ("run" | "segment")[];
  // Show this run field as an always-visible chip in the run header strip
  // (RunCard.tsx), instead of only inside the Run Settings drawer.
  show_in_run_summary?: boolean;
  /** Conditional options list — first matching entry wins. When absent,
   *  options_json is used as-is (unchanged behaviour). */
  options_when_json?: OptionsWhenEntry[];
  /** Whether invalid values are snapped into the resolved options.
   *  Defaults to true for enum/number fields with non-empty resolved options. */
  snap_to_options?: boolean;
  /** Skip snapping when this condition matches (matchesWhen semantics). */
  snap_unless_json?: Record<string, unknown>;
  /** This field mirrors another field's value until explicitly diverged. */
  follows_field?: string;
  /** Legacy variable keys that read/write alongside this field. */
  aliases?: string[];
  /** Hint to the form renderer for non-generic presentation (e.g. "colour").
   *  Replaces field_key branches in SchemaDrivenForm — add here, check there. */
  render_hint?: string;
};

/** One conditional-options entry for options_when_json. First matching entry wins. */
export type OptionsWhenEntry = {
  /** Same semantics as visible_when_json: {k:v} exact, {k:[..]} in-array,
   *  {k:{not:v}}, {k:{not_in:[...]}}, all AND-ed. String-coerced comparison
   *  on the server (unlike client isVisible which is strict-equality). */
  when?: Record<string, unknown>;
  /** Inline literal options — takes priority over options_ref. */
  options?: unknown[];
  /** Dotted path(s) into the UI-safe config slice (colours.*, finishFamilies,
   *  postFixingMaterials). Array = concatenation. Invalid path → []. */
  options_ref?: string | string[];
  /** Keep only options whose resolved value is in this list. */
  intersect?: unknown[];
  /** Same as intersect, but values sourced from a config ref. */
  intersect_ref?: string;
  /** Field-level overrides applied when this entry matches. */
  set?: Partial<Pick<FormFieldDef, "label" | "default_value_json" | "unit">>;
};

// ─── Canonical payload types (shared by engine, calculator, and canvas adapter) ──

export interface CanonicalBoundary {
  type: "product_post" | "brick_post" | "existing_post" | "wall" | "corner_90";
}

export interface CanonicalSegment {
  segmentId: string;
  segmentKind?: "panel" | "bay_group" | "gate_opening" | "corner";
  segmentWidthMm?: number;
  targetHeightMm?: number;
  variables?: Record<string, string | number | boolean>;
}

export interface CanonicalRun {
  runId: string;
  productCode: string;
  segments: CanonicalSegment[];
  corners?: unknown[];
  leftBoundary?: CanonicalBoundary;
  rightBoundary?: CanonicalBoundary;
  variables?: Record<string, unknown>;
}

export interface CanonicalPayload {
  runs: CanonicalRun[];
  variables: Record<string, unknown>;
}

// Internal SKU line emitted by calculators (resolved to supplier SKU by orchestrator).
export type QtyLine = {
  sku: string;
  category: string;
  quantity: number;
  unit?: string;
  notes?: string;
  runId: string;
  segmentId: string;
};

export type BOMSourceKind = "fence_run" | "gate" | "enclosure" | "global";

export type ScopeInfo = {
  scopeKind: BOMSourceKind;
  scopeId: string;
  scopeLabel: string;
  productCode?: string;
};

// ─── Per-request calculation context. Replaces the old module-level mutable
// globals (_components, _pricingRules) with an explicit, immutable snapshot.
export type SeedComponent = {
  sku: string;
  internal_sku?: string;
  name?: string;
  description?: string;
  category?: string;
  subCategory?: string;
  companionOf?: string;
  sortPriority?: number;
  isOptionalAccessory?: boolean;
  optionalChildOf?: string[];
  qtyPerParent?: number;
  unit?: string;
  default_price?: number;
  system_types?: string[];
  metadata?: Record<string, unknown>;
  active?: boolean;
};

export type LocalPricingRule = {
  sku: string;
  tier_code: "tier1" | "tier2" | "tier3";
  rule?: string | null;
  price: number;
  priority?: number;
  active?: boolean;
};

export type CalcContext = {
  components: SeedComponent[];
  pricingRules: LocalPricingRule[];
  // Resolved config per productCode (base deep-merged with any supplier override).
  configs: Map<string, CalculatorConfig>;
  // Maps internal SKU → supplier SKU. First checks DB component rows
  // (internal_sku column), then falls back to DEFAULT_INTERNAL_SKU_MAP.
  resolveInternalSku: (internalSku: string) => string;
};
