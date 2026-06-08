#!/usr/bin/env python3
"""
Concrete BOM helper — shared concrete-bag math across fence archetypes.

The amount of concrete needed per fence post is a function of the post-hole
volume (~300mm dia × 600mm deep, minus the post itself), not the bag size the
supplier happens to stock. Industry rule of thumb: 30kg of concrete per post.

This module translates that target-per-post into a bag count for whichever
bag size the supplier's price book uses. Suppliers typically stock either
20kg (Bunnings, retail) or 30kg (trade — Amazing Fencing, e.g.).

Used by:
  • treated-pine-paling-fence-calculator (reference implementation)
  • (planned) aluminium-slat-fence-calculator
  • (planned) colorbond-fence-calculator
  • (planned) composite-retaining-wall-calculator

Canonical names emitted (versioned contract — see canonical-name-contract.md):
  • Rapid Set Concrete 20kg
  • Rapid Set Concrete 30kg
  • Post Mix Concrete 30kg          (alternative product type)

DO NOT rename canonical names without an explicit version bump.
"""

import math
from typing import Tuple


# ─── Constants ───────────────────────────────────────────────────────────────

# Industry standard: ~30kg of concrete per post (300mm × 600mm hole, minus post).
# Was previously expressed as `CONCRETE_BAGS_PER_POST = 1.5` × `CONCRETE_BAG_SIZE_KG = 20`.
# Refactored to express the underlying weight, not the bag count.
CONCRETE_TARGET_PER_POST_KG = 30

# Allowed bag sizes — must match the canonical-name contract.
# Adding a new size requires:
#   1. Adding the canonical name to the contract
#   2. Adding the size here
#   3. Bumping the version of the contract
ALLOWED_BAG_SIZES_KG: Tuple[int, ...] = (20, 30)

# Default — Bunnings retail / Liam's existing baseline.
# Backward-compatible: existing callers that don't pass `bag_size_kg` get 20kg
# and produce byte-identical output to the pre-refactor calculator.
DEFAULT_BAG_SIZE_KG: int = 20

# Allowed product types — coil-fed vs hand-batched concrete products.
# Default: Rapid Set (the most common for fence posts).
ALLOWED_PRODUCT_TYPES: Tuple[str, ...] = ("Rapid Set", "Post Mix")
DEFAULT_PRODUCT_TYPE: str = "Rapid Set"


# ─── Validation ──────────────────────────────────────────────────────────────

def validate_bag_size(bag_size_kg: int) -> None:
    """Raise ValueError if bag_size_kg is not in the allowed set."""
    if bag_size_kg not in ALLOWED_BAG_SIZES_KG:
        raise ValueError(
            f"concrete_bag_size_kg must be one of {ALLOWED_BAG_SIZES_KG}, "
            f"got {bag_size_kg!r}. (Adding a new bag size requires a "
            f"canonical-name contract version bump — surface to Fence Forge.)"
        )


def validate_product_type(product_type: str) -> None:
    """Raise ValueError if product_type is not in the allowed set."""
    if product_type not in ALLOWED_PRODUCT_TYPES:
        raise ValueError(
            f"concrete_product_type must be one of {ALLOWED_PRODUCT_TYPES}, "
            f"got {product_type!r}."
        )


# ─── Core helpers ────────────────────────────────────────────────────────────

def bags_per_post(bag_size_kg: int = DEFAULT_BAG_SIZE_KG) -> float:
    """
    Bags of concrete needed per post, as a float (for use with ceil()).

    Backward-compatibility check:
      bag_size_kg=20 → 30/20 = 1.5  (matches old CONCRETE_BAGS_PER_POST = 1.5)
      bag_size_kg=30 → 30/30 = 1.0  (new — for trade suppliers like Amazing Fencing)

    Args:
        bag_size_kg: Bag size in kg. Must be in ALLOWED_BAG_SIZES_KG.

    Returns:
        Float bags-per-post (typically 1.0 to 1.5).

    Raises:
        ValueError if bag_size_kg is not allowed.
    """
    validate_bag_size(bag_size_kg)
    return CONCRETE_TARGET_PER_POST_KG / bag_size_kg


def total_concrete_bags(
    post_count: int,
    bag_size_kg: int = DEFAULT_BAG_SIZE_KG,
) -> int:
    """
    Total whole bags of concrete for the whole job, rounded up.

    Worked examples:
      14 posts × 20kg bags → ceil(14 × 1.5) = 21 bags
      14 posts × 30kg bags → ceil(14 × 1.0) = 14 bags
       7 posts × 20kg bags → ceil(7 × 1.5)  = 11 bags  (7 × 1.5 = 10.5)
       7 posts × 30kg bags → ceil(7 × 1.0)  = 7 bags

    Args:
        post_count: Total fence posts (>= 1).
        bag_size_kg: Bag size in kg. Defaults to DEFAULT_BAG_SIZE_KG (20).

    Returns:
        Integer total bags, rounded up.

    Raises:
        ValueError if bag_size_kg is not allowed or post_count < 1.
    """
    if post_count < 1:
        raise ValueError(f"post_count must be >= 1, got {post_count}")
    return math.ceil(post_count * bags_per_post(bag_size_kg))


def canonical_concrete_name(
    bag_size_kg: int = DEFAULT_BAG_SIZE_KG,
    product_type: str = DEFAULT_PRODUCT_TYPE,
) -> str:
    """
    Canonical product name for the chosen concrete bag size + product type.

    Examples:
      canonical_concrete_name()              → "Rapid Set Concrete 20kg"
      canonical_concrete_name(30)            → "Rapid Set Concrete 30kg"
      canonical_concrete_name(30, "Post Mix") → "Post Mix Concrete 30kg"

    Args:
        bag_size_kg: Bag size in kg. Must be in ALLOWED_BAG_SIZES_KG.
        product_type: Product type. Must be in ALLOWED_PRODUCT_TYPES.

    Returns:
        Canonical name string matching the contract format.

    Raises:
        ValueError if bag_size_kg or product_type is not allowed.
    """
    validate_bag_size(bag_size_kg)
    validate_product_type(product_type)
    return f"{product_type} Concrete {bag_size_kg}kg"


# ─── Self-test ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    # Quick smoke tests on import / standalone execution.
    print("concrete_helpers self-test")
    print("─" * 50)

    # Backward-compatibility: 20kg default
    assert bags_per_post() == 1.5, "Default 20kg should give 1.5 bags/post"
    assert total_concrete_bags(14) == 21, "14 posts × 20kg should give 21 bags"
    assert total_concrete_bags(7) == 11, "7 posts × 20kg should give 11 bags"
    assert canonical_concrete_name() == "Rapid Set Concrete 20kg"
    print("✓ 20kg defaults match pre-refactor behaviour")

    # 30kg path
    assert bags_per_post(30) == 1.0, "30kg should give 1.0 bags/post"
    assert total_concrete_bags(14, 30) == 14, "14 posts × 30kg should give 14 bags"
    assert total_concrete_bags(7, 30) == 7, "7 posts × 30kg should give 7 bags"
    assert canonical_concrete_name(30) == "Rapid Set Concrete 30kg"
    assert canonical_concrete_name(30, "Post Mix") == "Post Mix Concrete 30kg"
    print("✓ 30kg path computes correctly")

    # Validation
    try:
        total_concrete_bags(14, 25)
        assert False, "Should have raised ValueError for bag_size_kg=25"
    except ValueError as e:
        print(f"✓ Rejects unsupported bag size: {e}")

    try:
        canonical_concrete_name(20, "Cement Mix")
        assert False, "Should have raised ValueError for invalid product type"
    except ValueError as e:
        print(f"✓ Rejects unsupported product type: {e}")

    print("─" * 50)
    print("All concrete_helpers self-tests passed.")
