import { useFenceProducts } from "../../../hooks/useProducts";
import { Button } from "../../ui/Button";
import { Check } from "lucide-react";

interface Props {
    onSystemTypeChange: (systemType: string) => void;
    value: string;
    disabled: boolean;
}

const ProductSelector = ({ onSystemTypeChange, value, disabled }: Props) => {
    const fenceProductsQuery = useFenceProducts();
    const fenceProducts = fenceProductsQuery.data ?? [];

    return (
        <div className="space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-[0.12em] text-brand-muted">
                System type
            </h4>
            <div className="flex flex-wrap gap-1">
                {fenceProducts.map((product) => (
                    <Button
                        key={product.system_type}
                        type="button"
                        onClick={() => onSystemTypeChange(product.system_type)}
                        disabled={disabled}
                        aria-pressed={product.system_type === value}
                        size="medium"
                        variant={product.system_type === value ? "primary" : "ghost"}
                    >
                        {product.system_type === value && <Check size={16} aria-hidden />}
                        {product.system_type}
                    </Button>
                ))}
            </div>
        </div>
    );
};

export default ProductSelector;