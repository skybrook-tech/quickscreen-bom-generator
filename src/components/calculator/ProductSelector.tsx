import { useProductChildren } from "../../hooks/useProductChildren";
import { useCalculator } from "../../context/CalculatorContext";
import type { ProductOptions } from "../../schemas/calculator.schema";

export function ProductSelector() {
  const { data: products, isLoading } = useProductChildren();
  const { state, dispatch } = useCalculator();

  const handleSelect = (productId: string) => {
    const product = products?.find((p) => p.id === productId);
    if (!product) return;

    const raw = product.metadata?.options;
    const options: ProductOptions = {
      slatSize: raw?.slatSize ?? ["65", "90"],
      slatGap: raw?.slatGap ?? ["5", "9", "20"],
      colour: raw?.colour ?? ["surfmist-matt"],
    };

    dispatch({
      type: "SET_PRODUCT",
      productId: product.id,
      systemType: product.system_type,
      productOptions: options,
    });
  };

  return (
    <div>
      <label className="block text-sm font-medium text-brand-muted mb-1.5">
        Product
      </label>
      <select
        value={state.productId ?? ""}
        onChange={(e) => handleSelect(e.target.value)}
        disabled={isLoading}
        className="w-full px-3 py-2 bg-brand-card border border-brand-border rounded-lg text-brand-text text-sm focus:ring-2 focus:ring-brand-accent/40 focus:border-brand-accent outline-none"
      >
        <option value="">Select a product…</option>
        {products?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </div>
  );
}
