/**
 * Hex colour values for Colorbond brand colours used in the BOM calculator.
 * Keys match the `colour_code` values stored in the database and canonical payload.
 */
export const COLOUR_HEX: Record<string, string> = {
  "black-satin": "#1a1a1a",
  B: "#1a1a1a",
  "monument-matt": "#4a4a48",
  MN: "#4a4a48",
  "woodland-grey-matt": "#585c54",
  G: "#585c54",
  "surfmist-matt": "#e6e4df",
  SM: "#e6e4df",
  "pearl-white-gloss": "#f0ede8",
  W: "#f0ede8",
  "basalt-satin": "#3a3d3c",
  BS: "#3a3d3c",
  "dune-satin": "#c4b99a",
  D: "#c4b99a",
  "mill": "#c0bab4",
  M: "#c0bab4",
  "primrose": "#e8d89a",
  P: "#e8d89a",
  "paperbark": "#c8b89c",
  PB: "#c8b89c",
  "palladium-silver-pearl": "#9ea0a0",
  S: "#9ea0a0",
  kwila: "#7a4a2c",
  KWI: "#7a4a2c",
  "western-red-cedar": "#965a2f",
  WRC: "#965a2f",
  "island-grey": "#85806f",
  IG: "#85806f",
};

/** Returns true for colours with limited availability (visible warning dot). */
export const LIMITED_COLOURS = new Set(["primrose", "paperbark", "P", "PB"]);

/**
 * Returns white or near-black text colour for a given background hex,
 * using a simple luminance check.
 */
export function getSwatchTextColour(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#111111" : "#ffffff";
}
