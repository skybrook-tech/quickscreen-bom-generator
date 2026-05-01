/**
 * Target height options for segment UI — driven by product metadata.target_height_ui (Tier A).
 * Horizontal-stack products: discrete H = n × pitch (pitch from slat + gap keys).
 * Vertical-cut / freeform (VS): bounds only; UI uses NumberInput (no pitch ladder).
 */

const DEFAULT_MIN_MM = 300;
const DEFAULT_MAX_MM = 2400;
/** VS engine supports 6000mm stock posts when height > 2400 (see vs.json post rules). */
const VS_ABSOLUTE_MAX_MM = 6000;

export type TargetHeightUiMode = "pitch_ladder" | "freeform_mm";

export interface TargetHeightUiMeta {
  mode: TargetHeightUiMode;
  /** Variable keys summed to pitch (horizontal stack). Defaults match engine ctx names. */
  pitch_var_keys: [string, string];
}

type Vars = Record<string, string | number | boolean | undefined>;

const DEFAULT_META: TargetHeightUiMeta = {
  mode: "pitch_ladder",
  pitch_var_keys: ["slat_size_mm", "slat_gap_mm"],
};

/**
 * Read Tier A config from products.metadata (seed JSON).
 * Missing metadata → pitch ladder (backward compatible).
 */
export function parseTargetHeightUi(metadata: unknown): TargetHeightUiMeta {
  if (!metadata || typeof metadata !== "object") return { ...DEFAULT_META };
  const m = metadata as Record<string, unknown>;
  const th = m.target_height_ui;
  if (!th || typeof th !== "object") return { ...DEFAULT_META };
  const t = th as Record<string, unknown>;
  const mode: TargetHeightUiMode =
    t.mode === "freeform_mm" ? "freeform_mm" : "pitch_ladder";
  const pk = t.pitch_var_keys;
  const pitch_var_keys: [string, string] =
    Array.isArray(pk) && pk.length >= 2
      ? [String(pk[0]), String(pk[1])]
      : [...DEFAULT_META.pitch_var_keys];
  return { mode, pitch_var_keys };
}

export function isFreeformHeightUi(meta: TargetHeightUiMeta): boolean {
  return meta.mode === "freeform_mm";
}

function resolveMinMm(mergedVars: Vars): number {
  for (const key of ["min_gate_height_mm", "min_target_height_mm"] as const) {
    const n = Number(mergedVars[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_MIN_MM;
}

function resolveMaxMmDefault(mergedVars: Vars): number {
  for (const key of ["max_gate_height_mm", "max_target_height_mm"] as const) {
    const n = Number(mergedVars[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return DEFAULT_MAX_MM;
}

/** VS: tighter UI cap until a system post size is chosen; then allow long-stock ceiling. */
function resolveVsFreeformMaxMm(mergedVars: Vars): number {
  const explicit = mergedVars.max_target_height_mm;
  if (explicit !== undefined && explicit !== null && explicit !== "") {
    const n = Number(explicit);
    if (Number.isFinite(n) && n > 0)
      return Math.min(n, VS_ABSOLUTE_MAX_MM);
  }
  const post = String(mergedVars.post_size ?? "").trim();
  if (post === "50" || post === "65") return VS_ABSOLUTE_MAX_MM;
  return 2400;
}

/** Bounds for metadata.mode === freeform_mm (VS). */
export function getFreeformHeightBounds(mergedVars: Vars): {
  minMm: number;
  maxMm: number;
} {
  const minMm = resolveMinMm(mergedVars);
  const maxMm = resolveVsFreeformMaxMm(mergedVars);
  return { minMm, maxMm: Math.max(minMm, maxMm) };
}

function pitchFromVars(mergedVars: Vars, pitchKeys: [string, string]): number {
  const [a, b] = pitchKeys;
  const slat = Number(mergedVars[a] ?? mergedVars.slat_size_mm ?? 65);
  const gap = Number(mergedVars[b] ?? mergedVars.slat_gap_mm ?? 5);
  return slat + gap;
}

/**
 * Discrete heights on stack pitch for horizontal systems (QSHS, XPL, QS_GATE, …).
 */
export function buildPitchLadderHeightOptions(
  mergedVars: Vars,
  meta: TargetHeightUiMeta,
): number[] {
  const pitch = pitchFromVars(mergedVars, meta.pitch_var_keys);
  if (!(pitch > 0)) return [];

  const minMm = resolveMinMm(mergedVars);
  const maxMm = resolveMaxMmDefault(mergedVars);

  const nMin = Math.ceil(minMm / pitch);
  const nMax = Math.floor(maxMm / pitch);
  if (nMin > nMax) return [];

  const list: number[] = [];
  for (let n = nMin; n <= nMax; n++) {
    list.push(n * pitch);
  }
  return list;
}

/**
 * When pitch changes, pick the ladder height closest to the previous mm (tie → lower mm).
 */
export function snapHeightToClosestPitchOption(
  currentMm: number | undefined,
  ladderOptions: number[],
): number | null {
  if (ladderOptions.length === 0) return null;
  const sorted = [...ladderOptions].sort((a, b) => a - b);
  const anchor =
    currentMm != null && Number.isFinite(currentMm)
      ? currentMm
      : sorted[Math.floor(sorted.length / 2)]!;
  if (sorted.includes(anchor)) return anchor;

  return sorted.reduce((best, h) => {
    const da = Math.abs(h - anchor);
    const db = Math.abs(best - anchor);
    if (da < db) return h;
    if (da > db) return best;
    return Math.min(h, best);
  });
}

/** Include current segment height so selects stay valid for legacy payloads. */
export function heightOptionsWithCurrent(
  options: number[],
  currentMm: number | undefined,
): number[] {
  const c = currentMm ?? 0;
  if (c <= 0 || options.includes(c)) return options;
  return [...options, c].sort((a, b) => a - b);
}

/** Clamp height for freeform numeric input. */
export function clampHeightMm(
  value: number,
  bounds: { minMm: number; maxMm: number },
): number {
  const rounded = Math.round(value);
  return Math.min(bounds.maxMm, Math.max(bounds.minMm, rounded));
}
