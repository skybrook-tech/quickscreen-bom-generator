import { Fragment } from "react";
import { useCalculatorV4 } from "../../../context/CalculatorContextV4";
import { BomTableRow } from "./BomTableRow";
import { groupByCategory, type BomViewLine } from "./useBomViewModel";
interface Props {
  lines: BomViewLine[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(n);

const CATEGORY_LABEL: Record<string, string> = {
  post: "Posts",
  rail: "Rails",
  slat: "Slats",
  side_frame: "Side frames",
  centre_support_rail: "Centre support",
  bracket: "Brackets",
  fixing: "Fixings & screws",
  hardware: "Hardware",
  gate: "Gate hardware",
  accessory: "Accessories",
  suggested: "Suggested accessories (added)",
  extra: "Extra items",
};

function labelFor(category: string): string {
  return (
    CATEGORY_LABEL[category] ??
    category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
  );
}

/**
 * Main BOM table grouped by engine category. Section header rows
 * separate categories visually; each line gets a Remove button.
 */
export function BomTable({ lines }: Props) {
  const { dispatch } = useCalculatorV4();
  const groups = groupByCategory(lines);

  if (lines.length === 0) {
    return (
      <div className="bg-slate-200/10 text-center py-12 text-sm text-brand-muted h-full flex flex-col items-center justify-center gap-4">
        <p>Generate a BOM to see line items here.</p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead className="sticky top-0  bg-brand-card backdrop-blur-sm z-10">
        <tr className="border-b border-brand-border">
          <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
            Code
          </th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
            Description
          </th>
          <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
            Unit
          </th>
          <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
            Qty
          </th>
          <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
            Unit $
          </th>
          <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-brand-muted">
            Line $
          </th>
          <th />
        </tr>
      </thead>
      <tbody className="divide-y divide-brand-border/40">
        {groups.map((g) => (
          <Fragment key={`grp-${g.category}`}>
            <tr className="dark:bg-slate-100/10 bg-slate-100/60">
              <td
                colSpan={7}
                className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-brand-muted"
              >
                <div className="flex items-center justify-between">
                  <span>{labelFor(g.category)}</span>
                  <span className="font-mono tabular-nums">
                    {fmt(g.subtotal)}
                  </span>
                </div>
              </td>
            </tr>
            {g.items.map((line) => (
              <BomTableRow
                key={`${line.source}-${line.sku}-${line.extraId ?? ""}`}
                line={line}
                onRemove={() => {
                  if (line.source === "extra" && line.extraId) {
                    dispatch({ type: "REMOVE_EXTRA", id: line.extraId });
                  } else if (line.source === "suggestion") {
                    dispatch({
                      type: "REMOVE_ADDED_SUGGESTION",
                      sku: line.sku,
                    });
                  } else {
                    dispatch({ type: "REMOVE_BOM_LINE", sku: line.sku });
                  }
                }}
              />
            ))}
          </Fragment>
        ))}
      </tbody>
    </table>
  );
}
