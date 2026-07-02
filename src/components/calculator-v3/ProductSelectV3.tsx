import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { localFenceProducts } from "../../lib/localSeedData";
import {
  initialVariablesForSystem,
  isPanelStrategyCode,
} from "../../lib/productOptionRules";
import { useCalculator } from "../../context/CalculatorContext";
import type { CanonicalPayload } from "../../types/canonical.types";
import type { ReactNode } from "react";
import { Check } from "lucide-react";

interface FenceProduct {
  id: string;
  name: string;
  system_type: string;
  description: string | null;
}

function shortLabel(product: FenceProduct): string {
  return `${product.system_type} - ${product.name}`;
}

function mergeFenceProducts(products: FenceProduct[]): FenceProduct[] {
  const bySystem = new Map(products.map((product) => [product.system_type, product]));
  for (const localProduct of localFenceProducts) {
    if (!bySystem.has(localProduct.system_type)) {
      bySystem.set(localProduct.system_type, localProduct);
    }
  }
  return [...bySystem.values()].sort((a, b) => {
    const aOrder = localFenceProducts.findIndex((p) => p.system_type === a.system_type);
    const bOrder = localFenceProducts.findIndex((p) => p.system_type === b.system_type);
    return (aOrder === -1 ? 999 : aOrder) - (bOrder === -1 ? 999 : bOrder);
  });
}

export function ProductSelectV3({
  mapAction,
  onProductSelected,
}: {
  mapAction?: (selectDefaultProduct: () => void) => ReactNode;
  onProductSelected?: (payload: CanonicalPayload) => void;
}) {
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
      if (error) return localFenceProducts;
      return data && data.length > 0
        ? mergeFenceProducts(data as FenceProduct[])
        : localFenceProducts;
    },
  });

  const currentCode = state.payload?.productCode ?? null;
  const selectedProduct = products.find((p) => p.system_type === currentCode);
  const selectDefaultProduct = () => {
    if (!currentCode && products[0]) selectProduct(products[0]);
  };

  function selectProduct(p: FenceProduct) {
    const initialVariables = initialVariablesForSystem(p.system_type);
    const initialHeight = Number(initialVariables.target_height_mm ?? 1800);
    const initialPayload: CanonicalPayload = {
      productCode: p.system_type,
      schemaVersion: "v1",
      variables: initialVariables,
      ...(state.payload?.propertyAnchor
        ? { propertyAnchor: state.payload.propertyAnchor }
        : {}),
      ...(state.payload?.snapshot ? { snapshot: state.payload.snapshot } : {}),
      runs: [
        {
          runId: crypto.randomUUID(),
          productCode: p.system_type,
          variables: initialVariables,
          leftBoundary: { type: "product_post" },
          rightBoundary: { type: "product_post" },
          segments: [
            {
              segmentId: crypto.randomUUID(),
              sortOrder: 1,
              segmentKind: "panel",
              segmentWidthMm: 0,
              targetHeightMm: initialHeight,
              variables: isPanelStrategyCode(p.system_type) ? { panel_quantity: 1 } : undefined,
            },
          ],
          corners: [],
        },
      ],
    };
    dispatch({ type: "SET_PAYLOAD", payload: initialPayload });
    onProductSelected?.(initialPayload);
  }

  return (
    <div data-testid="product-select">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="grid grid-cols-2 gap-2">
          {products.map((product) => {
            const selected = product.system_type === currentCode;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => selectProduct(product)}
                aria-pressed={selected}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border px-3 py-2 text-center text-sm font-bold transition-all ${
                  selected
                    ? "border-brand-primary bg-brand-primary text-white shadow-sm"
                    : "border-brand-border bg-brand-card text-brand-text hover:border-brand-primary hover:text-brand-primary hover:shadow-sm"
                }`}
                data-testid={`product-option-${product.system_type}`}
                title={product.description ?? product.name}
              >
                {selected && <Check size={16} aria-hidden />}
                {shortLabel(product)}
              </button>
            );
          })}
        </div>
        {mapAction && <div className="justify-self-start sm:justify-self-end">{mapAction(selectDefaultProduct)}</div>}
      </div>
      {selectedProduct?.description && (
        <p className="mt-2 text-xs leading-relaxed text-brand-muted">
          {selectedProduct.description}
        </p>
      )}
    </div>
  );
}
