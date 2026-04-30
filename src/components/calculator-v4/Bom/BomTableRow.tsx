import { X } from "lucide-react";
import type { BomViewLine } from "./useBomViewModel";

interface Props {
  line: BomViewLine;
  onRemove: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
  }).format(n);

export function BomTableRow({ line, onRemove }: Props) {
  return (
    <tr className="hover:bg-brand-border/15 transition-colors">
      <td className="text-brand-accent px-3 py-2 text-xs font-mono">
        {line.sku || "—"}
      </td>
      <td className="px-3 py-2 text-xs text-brand-text">
        <div className="font-medium">{line.name}</div>
        {line.description && line.description !== line.name && (
          <div className="text-[11px] text-brand-muted truncate max-w-md">
            {line.description}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-brand-muted">{line.unit}</td>
      <td className="px-3 py-2 text-xs font-mono tabular-nums text-right">
        {line.quantity}
      </td>
      <td className="px-3 py-2 text-xs font-mono tabular-nums text-right">
        {fmt(line.unitPrice)}
      </td>
      <td className="px-3 py-2 text-xs font-mono tabular-nums text-right font-semibold text-brand-text">
        {fmt(line.lineTotal)}
      </td>
      <td className="px-2 py-2 w-8">
        <button
          onClick={onRemove}
          aria-label="Remove line"
          className="p-1 text-red-500 hover:text-red-500 hover:bg-red-500/10 rounded"
        >
          <X size={12} />
        </button>
      </td>
    </tr>
  );
}
