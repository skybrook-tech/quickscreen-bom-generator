import type { BOMLineItem } from "../../types/bom.types";

const CUTTABLE_CATEGORIES = new Set([
  "post",
  "slat",
  "side_frame",
  "cfc_cover",
  "centre_support_rail",
  "f_section",
  "rail",
  "rail_insert",
]);

function cutSummary(item: BOMLineItem) {
  const notes = item.notes ?? "";
  const cutMatch = notes.match(/(\d+)\s*mm cuts?/i);
  const atMatch = notes.match(/(?:pieces?|CSR\/panel)\s+at\s+(\d+)\s*mm/i);
  const length = cutMatch?.[1] ?? atMatch?.[1];
  if (length) return `Cut to: ${length}mm`;
  if (item.unit === "length" && CUTTABLE_CATEGORIES.has(item.category)) {
    return notes || "Full stock length / site cut";
  }
  return notes || "No cuts required";
}

function packFor(item: BOMLineItem) {
  if (item.category === "slat") return "slats";
  if (item.unit === "length" && CUTTABLE_CATEGORIES.has(item.category)) return "long";
  return "hardware";
}

const PACK_META = {
  long: {
    title: "Pack 1 - Long lengths",
    description: "Posts, side frames, rails, covers, F-sections, and support lengths.",
  },
  slats: {
    title: "Pack 2 - Slats",
    description: "Slat stock lengths grouped separately for cutting.",
  },
  hardware: {
    title: "Pack 3 - Hardware & accessories",
    description: "Caps, screws, spacers, brackets, hinges, latches, fixings, and extras.",
  },
} as const;

interface BomCutListProps {
  items: BOMLineItem[];
}

export function BomCutList({ items }: BomCutListProps) {
  const packs = {
    long: items.filter((item) => packFor(item) === "long"),
    slats: items.filter((item) => packFor(item) === "slats"),
    hardware: items.filter((item) => packFor(item) === "hardware"),
  };

  return (
    <div className="grid gap-3">
      {(Object.keys(PACK_META) as Array<keyof typeof PACK_META>).map((packKey) => {
        const packItems = packs[packKey];
        const pieceCount = packItems.reduce((sum, item) => sum + item.quantity, 0);
        const meta = PACK_META[packKey];
        return (
          <section
            key={packKey}
            className="rounded-2xl border border-brand-border bg-brand-bg/50 p-4"
          >
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-brand-text">
                  {meta.title} ({pieceCount} {pieceCount === 1 ? "piece" : "pieces"})
                </h4>
                <p className="text-xs font-semibold text-brand-muted">
                  {meta.description}
                </p>
              </div>
            </div>
            {packItems.length === 0 ? (
              <p className="text-sm font-semibold text-brand-muted">
                No items in this pack.
              </p>
            ) : (
              <div className="grid gap-2">
                {packItems.map((item) => (
                  <div
                    key={`${packKey}-${item.sku}-${item.description}`}
                    className="rounded-xl border border-brand-border/60 bg-brand-card px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-brand-primary">
                        {item.sku}
                      </span>
                      <span className="text-sm font-bold text-brand-text">
                        x {item.quantity} {item.unit}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold text-brand-muted">
                      {cutSummary(item)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

