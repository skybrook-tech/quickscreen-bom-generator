export function stripParentheticalDispatchCode(value: unknown) {
  return String(value ?? "").replace(/\s*\(([A-Z]{1,4})\)(?=\s|$)/g, "");
}
