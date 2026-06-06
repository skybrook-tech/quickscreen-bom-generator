#!/usr/bin/env python3
"""
Validates an Anyfence supplier seed JSON file against the canonical shape.

Canonical seed JSON shape (matches Glass Outlet's qshs.json / vs.json patterns
in the quickscreen-colorbond-generator repo):

{
  "org_slug": "<existing-org-slug>",          # e.g. "glass-outlet"
  "supplier_slug": "<new-supplier-slug>",     # e.g. "discount-fencing", "amazing-fencing"
  "system_instance_slug": "<instance-slug>",  # e.g. "dfsau-cca-pine-paling"
  "_format_note": "...",                       # optional, audit string
  "_source": "...",                            # optional, URL/citation for pricing
  "products": [
    {
      "system_type": "DF_CCA_PAL",            # XX_CATEGORY pattern, UNIQUE per org_id
      "product_type": "fence" | "gate" | "other",
      "name": "...",
      "description": "...",
      "active": true,
      "sort_order": 100,
      "metadata": {...}
    }
  ],
  "product_components": [
    {
      "sku": "DF-PAL-100x16-1200",
      "name": "...",
      "description": "...",
      "category": "paling" | "post" | "rail" | "panel" | "gate" | "sleeper" | "accessory" | ...,
      "unit": "each" | "length" | "metre" | "bag" | "kg" | ...,
      "default_price": 1.74,                  # NUMERIC dollars, NOT cents
      "system_types": ["DF_CCA_PAL"],         # array; one component may belong to multiple
      "metadata": {...},
      "active": true,
      "subCategory": "palings",
      "sortPriority": 10
    }
  ]
}

Usage:
    python3 validate_seed.py path/to/seed.json [path/to/another.json ...]
"""
import json
import sys
from pathlib import Path

CANONICAL_ARCHETYPES = {
    "slat-fence", "panel-fence", "mesh-fence", "timber-fence",
    "glass-pool-fence", "aluminium-pool-fence", "balustrade",
    "swing-gate", "sliding-gate", "equipment-enclosure", "screen", "shower",
}

CANONICAL_PRODUCT_TYPES = {"fence", "gate", "other"}

CANONICAL_COMPONENT_CATEGORIES = {
    # Common fence components
    "paling", "post", "rail", "panel", "gate", "sleeper", "accessory",
    "screw", "fixing", "bracket", "hardware", "cap", "shroud", "lattice",
    "pickets", "screening", "sheet", "rail-cap", "infill",
    # Special-purpose
    "consumable", "concrete", "membrane",
}

CANONICAL_UNITS = {"each", "length", "metre", "linear-metre", "bag", "kg", "pack", "roll"}

errors = []
warnings = []

def check(seed_path):
    """Validate a single seed JSON file. Returns (errors, warnings)."""
    p = Path(seed_path)
    if not p.exists():
        return [f"{p}: file not found"], []

    try:
        data = json.loads(p.read_text())
    except json.JSONDecodeError as e:
        return [f"{p}: JSON parse error: {e}"], []

    file_errors = []
    file_warnings = []

    # Top-level required fields
    for required in ("org_slug", "supplier_slug", "system_instance_slug"):
        if required not in data:
            file_errors.append(f"{p}: missing required top-level field '{required}'")

    if "products" not in data or not isinstance(data["products"], list):
        file_errors.append(f"{p}: 'products' must be a list")
    if "product_components" not in data or not isinstance(data["product_components"], list):
        file_errors.append(f"{p}: 'product_components' must be a list")

    # If we can't proceed, return early
    if file_errors:
        return file_errors, file_warnings

    # Products validation
    system_types = set()
    for i, prod in enumerate(data["products"]):
        prefix = f"{p}: products[{i}]"

        for required in ("system_type", "product_type", "name"):
            if required not in prod:
                file_errors.append(f"{prefix}: missing required field '{required}'")

        if "system_type" in prod:
            system_types.add(prod["system_type"])
            # System type should follow XX_CATEGORY pattern (uppercase + underscore)
            if not prod["system_type"].replace("_", "").isalnum():
                file_warnings.append(f"{prefix}: system_type '{prod['system_type']}' should be uppercase + underscore (e.g. DF_CCA_PAL)")
            if "_" not in prod["system_type"]:
                file_warnings.append(f"{prefix}: system_type '{prod['system_type']}' has no supplier prefix; recommend XX_CATEGORY pattern")

        if "product_type" in prod and prod["product_type"] not in CANONICAL_PRODUCT_TYPES:
            file_errors.append(f"{prefix}: product_type '{prod['product_type']}' must be one of {CANONICAL_PRODUCT_TYPES}")

        if "active" not in prod:
            file_warnings.append(f"{prefix}: missing 'active' field (defaults to true if absent)")

    # Product components validation
    skus_seen = set()
    for i, comp in enumerate(data["product_components"]):
        prefix = f"{p}: product_components[{i}]"

        for required in ("sku", "name", "category", "unit", "system_types"):
            if required not in comp:
                file_errors.append(f"{prefix}: missing required field '{required}'")

        if "sku" in comp:
            if comp["sku"] in skus_seen:
                file_errors.append(f"{prefix}: duplicate SKU '{comp['sku']}'")
            skus_seen.add(comp["sku"])

        if "category" in comp and comp["category"] not in CANONICAL_COMPONENT_CATEGORIES:
            file_warnings.append(f"{prefix}: category '{comp['category']}' not in canonical set {sorted(CANONICAL_COMPONENT_CATEGORIES)}; check if intentional")

        if "unit" in comp and comp["unit"] not in CANONICAL_UNITS:
            file_warnings.append(f"{prefix}: unit '{comp['unit']}' not in canonical set {sorted(CANONICAL_UNITS)}")

        if "default_price" in comp and comp["default_price"] is not None:
            if not isinstance(comp["default_price"], (int, float)):
                file_errors.append(f"{prefix}: default_price must be numeric dollars (e.g. 1.74), got {type(comp['default_price']).__name__}")
            elif comp["default_price"] > 10000:
                file_warnings.append(f"{prefix}: default_price ${comp['default_price']} seems very high; confirm this isn't cents")
            elif comp["default_price"] < 0:
                file_errors.append(f"{prefix}: default_price cannot be negative")

        if "system_types" in comp:
            if not isinstance(comp["system_types"], list):
                file_errors.append(f"{prefix}: system_types must be an array (one component may belong to multiple system_types)")
            else:
                for st in comp["system_types"]:
                    if st not in system_types:
                        file_warnings.append(f"{prefix}: system_type '{st}' not declared in the top-level 'products' list")

        if "active" not in comp:
            file_warnings.append(f"{prefix}: missing 'active' field (defaults to true if absent)")

    return file_errors, file_warnings


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 validate_seed.py <seed.json> [<seed.json> ...]", file=sys.stderr)
        sys.exit(2)

    all_errors = []
    all_warnings = []
    for path in sys.argv[1:]:
        errs, warns = check(path)
        all_errors.extend(errs)
        all_warnings.extend(warns)

    if all_warnings:
        print(f"\n--- {len(all_warnings)} WARNING(S) ---", file=sys.stderr)
        for w in all_warnings:
            print(f"  ⚠ {w}", file=sys.stderr)

    if all_errors:
        print(f"\n--- {len(all_errors)} ERROR(S) ---", file=sys.stderr)
        for e in all_errors:
            print(f"  ✗ {e}", file=sys.stderr)
        sys.exit(1)

    print(f"\n✓ All {len(sys.argv) - 1} seed file(s) validated successfully", file=sys.stderr)
    sys.exit(0)


if __name__ == "__main__":
    main()