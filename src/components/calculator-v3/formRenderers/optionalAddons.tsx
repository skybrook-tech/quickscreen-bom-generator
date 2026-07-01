import { OptionalAddOns } from "../gateHardwareControls";
import type { FieldRenderer } from "./types";

/**
 * control_type: "optional_addons" — offered accessories for the currently
 * selected hinge SKU. `OptionalAddOns` itself returns null when the parent
 * SKU has no accessories, so visibility is entirely data-driven — no
 * latch/hinge-prefix regex needed in `visible_when_json`.
 */
export const optionalAddonsRenderer: FieldRenderer = ({ extra }) => {
  const parentSku = String(extra.hingeParentSku ?? "");
  const selected = (extra.optionalAddOnsForHinge as string[]) ?? [];
  const onChangeAddOns = extra.onOptionalAddOnsChange as (parentSku: string, selected: string[]) => void;
  if (!parentSku) return null;
  return (
    <OptionalAddOns parentSku={parentSku} selected={selected} onChange={(next) => onChangeAddOns(parentSku, next)} />
  );
};
