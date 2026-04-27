import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { localFenceProducts } from "../../lib/localSeedData";
import { initialVariablesForSystem } from "../../lib/productOptionRules";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalPayload } from "../../types/canonical.types";

interface FenceProduct {
  id: string;
  name: string;
  system_type: string;
  description: string | null;
}

function shortLabel(product: FenceProduct): string {
  if (product.system_type === "QSHS") return "QSHS - Horizontal Slat";
  if (product.system_type === "VS") return "VS - Vertical Slat";
  if (product.system_type === "XPL") return "XPL - Premium";
  return `${product.system_type} - ${product.name}`;
}

export function ProductSelectV3() {
  const { state, dispatch } = useCalculator();

  const { data: products = [] } = useQuery<FenceProduct[]>({
    queryKey: ["v3FenceProducts"],
    queryFn: async () => {
      if (!isSupabaseConfigured) return localFenceProducts;

      const { data, error } = await supabase
        .from("products")
        .select("id, name, system_type, description")
        .eq("product_type", "fence")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FenceProduct[];
    },
  });

  const currentCode = state.payload?.productCode ?? null;
  const selectedProduct = products.find((p) => p.system_type === currentCode);

  function selectProduct(p: FenceProduct) {
    const initialPayload: CanonicalPayload = {
      productCode: p.system_type,
      schemaVersion: "v1",
      variables: initialVariablesForSystem(p.system_type),
      runs: [
        {
          runId: crypto.randomUUID(),
          productCode: p.system_type,
          variables: initialVariablesForSystem(p.system_type),
          leftBoundary: { type: "product_post" },
          rightBoundary: { type: "product_post" },
          segments: [],
          corners: [],
        },
      ],
    };
    dispatch({ type: "SET_PAYLOAD", payload: initialPayload });
  }

  return (
    <div data-testid="product-select">
      <div className="flex flex-wrap gap-2">
        {products.map((product) => {
          const selected = product.system_type === currentCode;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => selectProduct(product)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                selected
                  ? "border-blue-800 bg-blue-800 text-white shadow-sm"
                  : "border-brand-border bg-slate-50 text-brand-text hover:border-blue-800 hover:text-blue-800"
              }`}
              data-testid={`product-option-${product.system_type}`}
              title={product.description ?? product.name}
            >
              {shortLabel(product)}
            </button>
          );
        })}
      </div>
      {selectedProduct?.description && (
        <p className="mt-2 text-xs leading-relaxed text-brand-muted">
          {selectedProduct.description}
        </p>
      )}
    </div>
  );
}
