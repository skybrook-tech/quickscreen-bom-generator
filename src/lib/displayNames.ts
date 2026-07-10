export const SYSTEM_NAMES: Record<string, string> = {
  QSHS: "QuickScreen Horizontal Slat",
  VS: "Vertical Slat",
  XPL: "XPress Plus",
  BAYG: "BAY-G Infill Panels",
  QS_GATE: "QuickScreen Gate",
  COLORBOND: "Colorbond Steel Fence",
  CB_GATE: "Colorbond Gate",
  TIMBER_PALING: "Timber Paling Fence",
};

export const COLOUR_DISPLAY_NAMES: Record<string, string> = {
  B: "Black",
  MN: "Monument",
  G: "Woodland Grey",
  SM: "Surfmist",
  W: "Pearl White",
  BS: "Basalt",
  D: "Dune",
  M: "Mill",
  P: "Primrose",
  PB: "Paperbark",
  S: "Palladium Silver Pearl",
  KWI: "Kwila",
  WRC: "Western Red Cedar",
};

export const MOUNTING_DISPLAY_NAMES: Record<string, string> = {
  in_ground: "Concreted in ground",
  base_plate: "Base-plated to slab",
  core_drill: "Core-drilled",
  core_drilled: "Core-drilled",
};

export const TERMINATION_DISPLAY_NAMES: Record<string, string> = {
  product_post: "Post",
  system_post: "Post",
  wall: "Wall",
  existing_post: "Existing post",
  brick_post: "Brick pillar",
  corner: "Corner post",
};

export const GATE_MOVEMENT_DISPLAY_NAMES: Record<string, string> = {
  single_swing: "Single swing gate",
  double_swing: "Double swing gate",
  sliding: "Sliding gate",
};

export const GATE_DIRECTION_DISPLAY_NAMES: Record<string, string> = {
  in: "swing in",
  out: "swing out",
  left: "slide left",
  right: "slide right",
};

export function displayName(map: Record<string, string>, value: unknown, fallback = "Default") {
  const key = String(value ?? "");
  if (!key) return fallback;
  return map[key] ?? key;
}
