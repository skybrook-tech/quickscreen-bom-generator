import { Fragment, useMemo } from "react";
import { isVisible } from "../../calculator-v3/SchemaDrivenForm";
import type { SchemaField } from "../../calculator-v3/SchemaDrivenForm";
import { useProductVariables } from "../../../hooks/useProductVariables";
import { COLOUR_HEX } from "../../../lib/colourHex";
import { formatVariableValueForChip } from "../../../lib/segmentCollapsedSpecs";
import Separator from "../shared/Separator";

/** Fields that show a Colorbond swatch when we have a hex for the stored code. */
const COLOUR_SWATCH_KEYS = new Set(["colour_code", "post_colour_code"]);

function mergeJobRunFields(
  job: SchemaField[],
  run: SchemaField[],
): SchemaField[] {
  const byKey = new Map<string, SchemaField>();
  for (const f of job) byKey.set(f.field_key, f);
  for (const f of run) byKey.set(f.field_key, f);
  return [...byKey.values()].sort((a, b) => a.sort_order - b.sort_order);
}

interface Props {
  effectiveVars: Record<string, string | number | boolean>;
  /** Active fence `system_type` for schema-driven field list. */
  productCode: string | null;
}

/** Read-only strip of master fence specs — job + run variables from product_variables. */
export function RunSubHeader({ effectiveVars, productCode }: Props) {
  const { data: jobFields = [], isPending: jobPending } = useProductVariables(
    productCode,
    "job",
  );
  const { data: runFields = [], isPending: runPending } = useProductVariables(
    productCode,
    "run",
  );

  const fields = useMemo(
    () => mergeJobRunFields(jobFields, runFields),
    [jobFields, runFields],
  );

  const visibleFields = useMemo(
    () =>
      fields.filter((f) =>
        isVisible(
          f.visible_when_json ?? {},
          effectiveVars as Record<string, unknown>,
        ),
      ),
    [fields, effectiveVars],
  );

  const loading = Boolean(productCode) && (jobPending || runPending);

  const placeholder = (
    <div className="flex items-center min-h-[40px]">
      <div className="flex-1 px-4 py-2 text-xs text-brand-muted font-mono tabular-nums">
        —
      </div>
    </div>
  );

  if (!productCode || loading) return placeholder;

  if (visibleFields.length === 0) return placeholder;

  return (
    <div className="flex items-center min-h-[40px]">
      <div className="flex-1 overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-xs font-mono tabular-nums">
          {visibleFields.map((field, i) => {
            const raw = effectiveVars[field.field_key];
            const valueText = formatVariableValueForChip(field, raw);
            const showSwatch = COLOUR_SWATCH_KEYS.has(field.field_key);
            const hex =
              showSwatch && raw != null && raw !== ""
                ? COLOUR_HEX[String(raw)]
                : undefined;

            return (
              <Fragment key={field.id}>
                {i > 0 ? <Separator /> : null}
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  {hex ? (
                    <span
                      className="w-2.5 h-2.5 shrink-0 rounded-sm ring-1 ring-brand-border"
                      style={{ backgroundColor: hex }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="text-brand-muted truncate">
                    {field.label}
                  </span>
                  <Separator character="=" />
                  <span className="text-brand-text shrink-0">{valueText}</span>
                </span>
              </Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
