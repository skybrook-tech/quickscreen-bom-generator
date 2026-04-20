// ─── System Types ────────────────────────────────────────────────────────────

export const SYSTEM_TYPES = [
  {
    value: "QSHS",
    label: "QSHS — Horizontal Slat Screen",
    description: "Horizontal slat, post-mounted",
  },
  {
    value: "VS",
    label: "VS — Vertical Slat Screen",
    description: "Vertical slat screen",
  },
  {
    value: "XPL",
    label: "XPL — XPress Plus Premium",
    description: "Premium XPress Plus",
  },
  {
    value: "BAYG",
    label: "BAYG — Buy As You Go",
    description: "Self-assembly kit",
  },
] as const;

// ─── Colours (Colorbond — exact names) ───────────────────────────────────────

export const COLOURS = [
  { value: "black-satin", label: "Black Satin", limited: false },
  { value: "monument-matt", label: "Monument Matt", limited: false },
  { value: "woodland-grey-matt", label: "Woodland Grey Matt", limited: false },
  { value: "surfmist-matt", label: "Surfmist Matt", limited: false },
  { value: "pearl-white-gloss", label: "Pearl White Gloss", limited: false },
  { value: "basalt-satin", label: "Basalt Satin", limited: false },
  { value: "dune-satin", label: "Dune Satin", limited: false },
  { value: "mill", label: "Mill (raw aluminium)", limited: false },
  { value: "primrose", label: "Primrose", limited: true },
  { value: "paperbark", label: "Paperbark", limited: true },
  {
    value: "palladium-silver-pearl",
    label: "Palladium Silver Pearl",
    limited: false,
  },
] as const;

// ─── Slat Sizes ───────────────────────────────────────────────────────────────

export const SLAT_SIZES = [
  { value: "65", label: "65mm (denser)" },
  { value: "90", label: "90mm (more open)" },
] as const;

// ─── Slat Gaps ────────────────────────────────────────────────────────────────

export const SLAT_GAPS = [
  { value: "0", label: "0mm — no gap" },
  { value: "5", label: "5mm — near-privacy" },
  { value: "9", label: "9mm — standard" },
  { value: "20", label: "20mm — open/decorative" },
] as const;

// ─── Max Panel Width ──────────────────────────────────────────────────────────

export const PANEL_WIDTHS = [
  { value: "2600", label: "2600mm (standard)" },
  { value: "2000", label: "2000mm (windy area)" },
] as const;

// ─── Post Mounting ────────────────────────────────────────────────────────────

export const POST_MOUNTINGS = [
  { value: "concreted-in-ground", label: "Concreted in ground" },
  { value: "base-plated-to-slab", label: "Base-plated to slab" },
  { value: "core-drilled-into-concrete", label: "Core-drilled into concrete" },
] as const;

// ─── Terminations ─────────────────────────────────────────────────────────────

export const TERMINATIONS = [
  { value: "post", label: "Post" },
  { value: "wall", label: "Wall" },
] as const;

// ─── Gate Types ───────────────────────────────────────────────────────────────

export const GATE_TYPES = [
  { value: "single-swing", label: "Single Swing" },
  { value: "double-swing", label: "Double Swing" },
  { value: "sliding", label: "Sliding" },
] as const;

// ─── Gate Post Sizes ──────────────────────────────────────────────────────────

export const GATE_POST_SIZES = [
  { value: "50x50", label: "50×50mm post", warning: null },
  { value: "65x65", label: "65×65mm HD post", warning: null },
  { value: "75x75", label: "75×75mm post", warning: "Confirm stock" },
  { value: "100x100", label: "100×100mm post", warning: "Confirm stock" },
] as const;

// ─── Hinge Types ──────────────────────────────────────────────────────────────

export const HINGE_TYPES = [
  { value: "dd-kwik-fit-fixed", label: "D&D Kwik Fit — Fixed Tension" },
  { value: "dd-kwik-fit-adjustable", label: "D&D Kwik Fit — Adjustable" },
  { value: "heavy-duty-weld-on", label: "Heavy Duty (weld-on)" },
] as const;

// ─── Latch Types ──────────────────────────────────────────────────────────────

export const LATCH_TYPES = [
  { value: "dd-magna-latch-top-pull", label: "D&D Magna Latch — Top Pull" },
  { value: "dd-magna-latch-lock-box", label: "D&D Magna Latch + Lock Box" },
  { value: "drop-bolt", label: "Drop Bolt only" },
  { value: "none", label: "No Latch" },
] as const;

// ─── Validation constants ─────────────────────────────────────────────────────

export const VALIDATION = {
  targetHeightMin: 300,
  targetHeightMax: 2400,
  runLengthMin: 0.5, // metres
  cornersMax: 10,
  maxSwingGateWidth: 1200, // mm
} as const;
