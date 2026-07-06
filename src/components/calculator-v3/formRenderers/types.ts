import type { ReactNode } from "react";
import type { SchemaField } from "../SchemaDrivenForm";

/**
 * Context passed to a custom control-type renderer. `onPatch` exists
 * alongside `onChange` because some controls (combined_gap, leaf_width_pair,
 * hardware pickers) need to write several variable keys atomically.
 * `extra` is a free-form bag the caller populates with whatever the renderer
 * needs beyond `variables` — e.g. the productCode for combined_gap, or the
 * segment/leaves for leaf_width_pair.
 */
export interface FieldRendererContext {
  field: SchemaField;
  variables: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
  onPatch: (patch: Record<string, string | number | boolean | null | undefined>) => void;
  extra: Record<string, unknown>;
}

export type FieldRenderer = (ctx: FieldRendererContext) => ReactNode;
