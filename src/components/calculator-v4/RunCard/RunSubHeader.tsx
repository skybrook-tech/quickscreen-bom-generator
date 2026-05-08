import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { isVisible } from "../../calculator-v3/SchemaDrivenForm";
import type { SchemaField } from "../../calculator-v3/SchemaDrivenForm";
import { useProductVariables } from "../../../hooks/useProductVariables";
import { COLOUR_HEX } from "../../../lib/colourHex";
import { formatVariableValueForChip } from "../../../lib/segmentCollapsedSpecs";

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

  const [expanded, setExpanded] = useState(false);
  // null = measurement pending; number = pills that fit on the first row
  const [firstRowCount, setFirstRowCount] = useState<number | null>(null);
  const pillContainerRef = useRef<HTMLDivElement>(null);

  // When visible fields change identity, reset so we re-measure
  useLayoutEffect(() => {
    setFirstRowCount(null);
  }, [visibleFields]);

  // When firstRowCount is null (measurement pending) and not expanded, measure row height
  useLayoutEffect(() => {
    if (firstRowCount !== null || expanded || !pillContainerRef.current) return;

    const container = pillContainerRef.current;
    const pills = Array.from(
      container.querySelectorAll<HTMLElement>("[data-pill-item]"),
    );

    if (pills.length === 0) {
      setFirstRowCount(0);
      return;
    }

    const firstTop = pills[0].getBoundingClientRect().top;
    let count = pills.length; // assume all fit until proven otherwise

    for (let i = 1; i < pills.length; i++) {
      if (pills[i].getBoundingClientRect().top > firstTop + 2) {
        count = i;
        break;
      }
    }

    setFirstRowCount(count);
  }, [firstRowCount, expanded, visibleFields]);

  const placeholder = (
    <div className="flex items-center min-h-[40px]">
      <div className="flex-1 px-4 py-2 text-xs text-brand-muted font-mono tabular-nums">
        —
      </div>
    </div>
  );

  if (!productCode || loading) return placeholder;
  if (visibleFields.length === 0) return placeholder;

  // During measurement: show all pills so we can read their row positions.
  // Collapsed: show only first-row pills. Expanded: show all.
  const displayedFields =
    expanded || firstRowCount === null
      ? visibleFields
      : visibleFields.slice(0, firstRowCount);

  const hiddenCount =
    !expanded && firstRowCount !== null
      ? Math.max(0, visibleFields.length - firstRowCount)
      : 0;

  return (
    <div className="flex items-center min-h-[40px] dark:bg-slate-100/10 bg-slate-100/60 border-t border-brand-border">
      <div className="flex-1 overflow-hidden">
        <div
          ref={pillContainerRef}
          className="flex flex-wrap items-center gap-x-1 gap-y-1 px-4 py-2 text-xs font-mono tabular-nums"
        >
          {displayedFields.map((field) => {
            const raw = effectiveVars[field.field_key];
            const valueText = formatVariableValueForChip(field, raw);
            const showSwatch = COLOUR_SWATCH_KEYS.has(field.field_key);
            const hex =
              showSwatch && raw != null && raw !== ""
                ? COLOUR_HEX[String(raw)]
                : undefined;

            return (
              <span
                key={field.id}
                data-pill-item
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-[var(--brand-radius-sm)] bg-brand-card border border-brand-border text-brand-bg font-medium cursor-default"
              >
                {hex ? (
                  <span
                    className="w-2.5 h-2.5 shrink-0 rounded-sm ring-1 ring-brand-border"
                    style={{ backgroundColor: hex }}
                    aria-hidden
                  />
                ) : null}
                <span className="text-brand-muted truncate">{field.label}</span>
                <span className="text-brand-text shrink-0">{valueText}</span>
              </span>
            );
          })}

          {hiddenCount > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-[var(--brand-radius-sm)] bg-brand-card border border-brand-border text-brand-muted font-medium cursor-pointer hover:text-brand-text transition-colors"
            >
              +{hiddenCount} more
            </button>
          )}

          {expanded && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-[var(--brand-radius-sm)] bg-brand-card border border-brand-border text-brand-muted font-medium cursor-pointer hover:text-brand-text transition-colors"
            >
              show less
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
