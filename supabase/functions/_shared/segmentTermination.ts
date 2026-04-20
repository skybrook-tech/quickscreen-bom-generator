// Mirrors src/lib/segmentTermination.ts — keep in sync manually (Deno bundle).

export type LegacyBoundaryType =
  | "product_post"
  | "brick_post"
  | "existing_post"
  | "wall"
  | "corner_90";

export type TerminationKindUi =
  | "corner"
  | "system_post"
  | "non_system_termination";

export type NonSystemSubtypeUi = "wall" | "non_system_post";

const LEFT_KIND = "left_termination_kind";
const RIGHT_KIND = "right_termination_kind";
const LEFT_SUB = "left_non_system_subtype";
const RIGHT_SUB = "right_non_system_subtype";
const LEFT_DEG = "left_corner_degrees";
const RIGHT_DEG = "right_corner_degrees";

function parseKind(raw: unknown): TerminationKindUi | undefined {
  if (
    raw === "corner" ||
    raw === "system_post" ||
    raw === "non_system_termination"
  )
    return raw;
  return undefined;
}

function parseSub(raw: unknown): NonSystemSubtypeUi | undefined {
  if (raw === "wall" || raw === "non_system_post") return raw;
  return undefined;
}

export function effectiveLegacyBoundaryType(
  runBoundaryType: LegacyBoundaryType,
  vars: Record<string, string | number | boolean> | undefined,
  side: "left" | "right",
): LegacyBoundaryType {
  const kindKey = side === "left" ? LEFT_KIND : RIGHT_KIND;
  const kind = parseKind(vars?.[kindKey]);

  if (!kind) return runBoundaryType;

  if (kind === "system_post") return "product_post";
  if (kind === "corner") return "corner_90";

  const subKey = side === "left" ? LEFT_SUB : RIGHT_SUB;
  const sub = parseSub(vars?.[subKey]);
  if (sub === "wall") return "wall";
  return "brick_post";
}

export function cornerDegreesFromVars(
  vars: Record<string, string | number | boolean> | undefined,
  side: "left" | "right",
): number | undefined {
  const key = side === "left" ? LEFT_DEG : RIGHT_DEG;
  const raw = vars?.[key];
  if (raw === undefined || raw === null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(n) ? n : undefined;
}
