import type { ReactNode } from "react";
import {
  isVisible,
  SchemaDrivenForm,
  type SchemaField,
} from "./SchemaDrivenForm";

export type SettingsGroup = { key: string; label: string; sort_order: number };

interface Props {
  fields: SchemaField[];
  groups: SettingsGroup[];
  variables: Record<string, string | number | boolean>;
  onChange: (key: string, value: string | number | boolean) => void;
  onPatch?: (patch: Record<string, string | number | boolean | null | undefined>) => void;
  /** Free-form context bag consumed by custom control-type renderers. */
  extra?: Record<string, unknown>;
  /** Bespoke content injected at the end of a named group (e.g. the gate
   * leaf-geometry info box or the GateComponentList). */
  extraGroupContent?: Record<string, ReactNode>;
}

/**
 * Flat, config-driven settings form. Fields are bucketed by their `group` key
 * under non-collapsible group headings (sorted by `sort_order`); within each
 * group fields are sorted by `sort_order`. Fields without a group, or whose
 * group is not in `groups`, are schema-only and not rendered. Each group's
 * fields are rendered with the v3 `SchemaDrivenForm` so all custom
 * control-type renderers (colour_palette, combined_gap, hardware_ranked, …)
 * and styling are reused unchanged.
 */
export function SchemaSettingsForm({
  fields,
  groups,
  variables,
  onChange,
  onPatch,
  extra,
  extraGroupContent,
}: Props) {
  const groupByKey = new Map(groups.map((g) => [g.key, g]));
  const visibleFields = fields.filter((f) => isVisible(f.visible_when_json ?? {}, variables));

  const buckets = new Map<string, SchemaField[]>();
  for (const field of visibleFields) {
    if (!field.group || !groupByKey.has(field.group)) continue;
    const list = buckets.get(field.group) ?? [];
    list.push(field);
    buckets.set(field.group, list);
  }

  const orderedGroups = [...groups].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="space-y-5">
      {orderedGroups.map((group) => {
        const groupFields = (buckets.get(group.key) ?? []).sort(
          (a, b) => a.sort_order - b.sort_order,
        );
        if (groupFields.length === 0 && !extraGroupContent?.[group.key]) return null;
        return (
          <div key={group.key} className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-muted">
              {group.label}
            </h4>
            {groupFields.length > 0 && (
              <SchemaDrivenForm
                fields={groupFields}
                variables={variables}
                onChange={onChange}
                onPatch={onPatch}
                extra={extra}
              />
            )}
            {extraGroupContent?.[group.key]}
          </div>
        );
      })}
    </div>
  );
}
