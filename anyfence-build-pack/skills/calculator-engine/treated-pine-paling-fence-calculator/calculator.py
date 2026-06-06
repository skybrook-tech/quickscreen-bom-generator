#!/usr/bin/env python3
"""
Treated Pine Paling Fence — BOM Calculator
═══════════════════════════════════════════
Canonical calculator skill — supplier-agnostic.
Uses canonical product names that can be mapped to specific
supplier SKUs via a separate supplier-mapper skill.

Part of the Fence Calculator Skill Library.

Supports two paling styles:
  • butted          — standard 100mm butted palings (10/m), 6-line BOM
  • lapped_capped   — overlapping front+back layers (15/m) with capping rail, 8-line BOM
"""

import json
import math
import sys


# ─── Constants ───────────────────────────────────────────────────────────────

PALING_FACE_MM          = 100
PALING_THICKNESS_MM     = 16
POST_SIZE               = "100x75"        # upgrade option: 100x100
RAIL_SIZE               = "75x38"         # upgrade option: 100x38
RAIL_STOCK_LENGTH_MM    = 4800
RAIL_PIECES_PER_STOCK   = 2
POST_IN_GROUND_MM       = 600
CONCRETE_BAGS_PER_POST  = 1.5
CONCRETE_BAG_SIZE_KG    = 20

# Front-layer (butted: only layer / lapped: outer layer)
NAILS_PER_PALING_PER_RAIL = 2
NAIL_SIZE_MM            = 57

# Back-layer (lapped & capped only)
BACK_NAIL_SIZE_MM       = 45
NAILS_PER_BACK_PALING_PER_RAIL = 1

NAIL_PACK_SIZE          = 250
BATTEN_SCREW_LEN_MM     = 100
WASTAGE_PALINGS         = 0.05
WASTAGE_NAILS           = 0.05
WASTAGE_RAILS           = 0.05            # declared, not currently applied
WASTAGE_POSTS           = 0
WASTAGE_CONCRETE        = 0
DEFAULT_PALINGS_PER_M   = 10              # 100mm butted
LAPPED_PALINGS_PER_M    = 15              # lap & cap style (front + back total)

# Capping rail (lapped & capped only)
CAPPING_SIZE            = "75x50"         # overhangs 75x38 rails; common AU cap size
CAPPING_STOCK_LENGTH_MM = 4800
CAPPING_PIECES_PER_STOCK = 2              # same conversion as rails

# Height → auto rail count
HEIGHT_RAIL_MAP = {
    1200: 2,
    1500: 3,
    1800: 3,
    2100: 3,
    2400: 4,
}

VALID_HEIGHTS = sorted(HEIGHT_RAIL_MAP.keys())

VALID_STYLES = ("butted", "lapped_capped")

# Nail description by timber type
NAIL_TYPE = {
    "treated_pine": f"{NAIL_SIZE_MM}mm Ring Shank Gal Nail",
    "hardwood":     f"{NAIL_SIZE_MM}mm Smooth Shank Gal Nail",
}

BACK_NAIL_TYPE = {
    "treated_pine": f"{BACK_NAIL_SIZE_MM}mm Ring Shank Gal Nail",
    "hardwood":     f"{BACK_NAIL_SIZE_MM}mm Smooth Shank Gal Nail",
}

TIMBER_LABEL = {
    "treated_pine": "Treated Pine",
    "hardwood":     "Hardwood",
}


# ─── Validation ──────────────────────────────────────────────────────────────

def validate_inputs(inputs: dict) -> tuple[list[str], list[str]]:
    """Return (errors, warnings). Errors are fatal; warnings are advisory."""
    errors = []
    warnings = []

    # Required field
    length = inputs.get("fence_length_m")
    if length is None:
        errors.append("fence_length_m is required")
    elif length <= 0:
        errors.append("fence_length_m must be greater than 0")

    # Height validation (warn, don't reject)
    height = inputs.get("fence_height_mm")
    if height is None:
        errors.append("fence_height_mm is required")
    elif height not in VALID_HEIGHTS:
        warnings.append(
            f"fence_height_mm={height} is non-standard. "
            f"Standard heights: {VALID_HEIGHTS}. "
            f"Rail count must be provided manually via rail_count."
        )

    # Post spacing cap
    spacing = inputs.get("post_spacing_mm", 2400)
    if spacing > 2400:
        errors.append("post_spacing_mm must not exceed 2400")
    if spacing <= 0:
        errors.append("post_spacing_mm must be greater than 0")

    # Timber type
    timber = inputs.get("timber_type", "treated_pine")
    if timber not in ("treated_pine", "hardwood"):
        errors.append(
            f"timber_type must be 'treated_pine' or 'hardwood', got '{timber}'"
        )

    # Paling style
    style = inputs.get("paling_style", "butted")
    if style not in VALID_STYLES:
        errors.append(
            f"paling_style must be one of {VALID_STYLES}, got '{style}'"
        )

    # Paling gap
    gap = inputs.get("paling_gap_mm", 0)
    if gap < 0:
        errors.append("paling_gap_mm must be >= 0")

    # Gap is meaningless in lapped style — warn if set
    if style == "lapped_capped" and gap > 0:
        warnings.append(
            f"paling_gap_mm={gap} is ignored in 'lapped_capped' style "
            f"(palings overlap; spacing is governed by LAPPED_PALINGS_PER_M={LAPPED_PALINGS_PER_M})"
        )

    return errors, warnings


# ─── Core Calculator ─────────────────────────────────────────────────────────

def calculate_bom(inputs: dict) -> dict:
    """
    Calculate BOM for a treated pine (or hardwood) paling fence.

    Inputs
    ------
    fence_length_m   : float  — total fence run in metres (required, > 0)
    fence_height_mm  : int    — paling height in mm (1200/1500/1800/2100/2400)
    timber_type      : str    — 'treated_pine' | 'hardwood' (default: treated_pine)
    post_spacing_mm  : int    — max bay width in mm (default: 2400, max: 2400)
    rail_count       : int|None — override auto rail count (default: auto from height)
    paling_gap_mm    : int    — gap between palings, 0 = butted (default: 0)
    paling_style     : str    — 'butted' | 'lapped_capped' (default: 'butted')

    Returns
    -------
    dict with: inputs, derived, bom, warnings, constants
    """
    # ── Extract inputs with defaults ──
    fence_length_m  = inputs["fence_length_m"]
    fence_height_mm = inputs["fence_height_mm"]
    timber_type     = inputs.get("timber_type", "treated_pine")
    post_spacing_mm = inputs.get("post_spacing_mm", 2400)
    paling_gap_mm   = inputs.get("paling_gap_mm", 0)
    paling_style    = inputs.get("paling_style", "butted")

    # ── Validate ──
    errors, warnings = validate_inputs(inputs)
    if errors:
        return {"ok": False, "errors": errors, "warnings": warnings}

    # ── Auto rail count from height (or manual override) ──
    rail_count_override = inputs.get("rail_count")
    if rail_count_override is not None:
        rail_count = int(rail_count_override)
    else:
        rail_count = HEIGHT_RAIL_MAP.get(fence_height_mm)
        if rail_count is None:
            # Non-standard height: interpolate sensibly
            if fence_height_mm < 1500:
                rail_count = 2
            elif fence_height_mm < 2400:
                rail_count = 3
            else:
                rail_count = 4

    # ── Common derived quantities ──
    length_mm           = fence_length_m * 1000
    post_count          = math.ceil(length_mm / post_spacing_mm) + 1
    bay_count           = post_count - 1
    rail_pieces         = bay_count * rail_count
    rail_stock_lengths  = math.ceil(rail_pieces / RAIL_PIECES_PER_STOCK)
    concrete_bags       = math.ceil(post_count * CONCRETE_BAGS_PER_POST)
    batten_screws       = rail_pieces * 2
    post_height_mm      = fence_height_mm + POST_IN_GROUND_MM

    # ── Labels ──
    label     = TIMBER_LABEL[timber_type]
    nail_desc = NAIL_TYPE[timber_type]

    # ── Style-specific quantities + BOM ──
    if paling_style == "butted":
        paling_count        = math.ceil(length_mm / (PALING_FACE_MM + paling_gap_mm))
        palings_with_wastage = math.ceil(paling_count * (1 + WASTAGE_PALINGS))

        nails_count        = paling_count * rail_count * NAILS_PER_PALING_PER_RAIL
        nails_with_wastage = math.ceil(nails_count * (1 + WASTAGE_NAILS))
        nails_rounded      = math.ceil(nails_with_wastage / NAIL_PACK_SIZE) * NAIL_PACK_SIZE

        derived = {
            "length_mm":            length_mm,
            "post_count":           post_count,
            "bay_count":            bay_count,
            "rail_count":           rail_count,
            "rail_pieces":          rail_pieces,
            "rail_stock_lengths":   rail_stock_lengths,
            "paling_count":         paling_count,
            "palings_with_wastage": palings_with_wastage,
            "concrete_bags":        concrete_bags,
            "nails_count":          nails_count,
            "nails_with_wastage":   nails_with_wastage,
            "nails_rounded":        nails_rounded,
            "batten_screws":        batten_screws,
            "post_height_mm":       post_height_mm,
        }

        bom = [
            {
                "line": 1,
                "category": "Posts",
                "canonical_name": f"{POST_SIZE} {label} Post",
                "description": f"{POST_SIZE} {label} Post ({post_height_mm}mm)",
                "qty": post_count,
                "unit": "ea",
                "notes": (
                    f"{post_height_mm}mm total "
                    f"({fence_height_mm}mm fence + {POST_IN_GROUND_MM}mm in-ground)"
                ),
            },
            {
                "line": 2,
                "category": "Rails",
                "canonical_name": f"{RAIL_SIZE} {label} Rail {RAIL_STOCK_LENGTH_MM}mm",
                "description": f"{RAIL_SIZE} {label} Rail {RAIL_STOCK_LENGTH_MM}mm",
                "qty": rail_stock_lengths,
                "unit": "length",
                "notes": (
                    f"{rail_count} rails/bay × {bay_count} bays "
                    f"= {rail_pieces} pieces → {rail_stock_lengths} stock lengths"
                ),
            },
            {
                "line": 3,
                "category": "Palings",
                "canonical_name": (
                    f"{PALING_FACE_MM}x{PALING_THICKNESS_MM} "
                    f"Rough Sawn {label} Paling"
                ),
                "description": (
                    f"{PALING_FACE_MM}x{PALING_THICKNESS_MM} "
                    f"Rough Sawn {label} Paling ({fence_height_mm}mm)"
                ),
                "qty": palings_with_wastage,
                "unit": "ea",
                "notes": f"H: {fence_height_mm}mm (+{int(WASTAGE_PALINGS * 100)}% wastage)",
            },
            {
                "line": 4,
                "category": "Concrete",
                "canonical_name": f"Rapid Set Concrete {CONCRETE_BAG_SIZE_KG}kg",
                "description": f"Rapid Set Concrete {CONCRETE_BAG_SIZE_KG}kg",
                "qty": concrete_bags,
                "unit": "bag",
                "notes": f"{CONCRETE_BAGS_PER_POST} bags/post",
            },
            {
                "line": 5,
                "category": "Fasteners",
                "canonical_name": nail_desc,
                "description": nail_desc,
                "qty": nails_rounded,
                "unit": "ea",
                "notes": f"Rounded to nearest {NAIL_PACK_SIZE}-pack",
            },
            {
                "line": 6,
                "category": "Fasteners",
                "canonical_name": f"{BATTEN_SCREW_LEN_MM}mm Galvanised Batten Screw",
                "description": f"{BATTEN_SCREW_LEN_MM}mm Galvanised Batten Screw",
                "qty": batten_screws,
                "unit": "ea",
                "notes": "2 per rail piece",
            },
        ]

    else:  # paling_style == "lapped_capped"
        # 15 palings/m total across both layers
        paling_count        = math.ceil(fence_length_m * LAPPED_PALINGS_PER_M)
        palings_with_wastage = math.ceil(paling_count * (1 + WASTAGE_PALINGS))

        # Split 50/50 (back gets the ceiling on odd totals)
        back_palings  = math.ceil(paling_count / 2)
        front_palings = paling_count - back_palings

        # Front-layer nails: 57mm × 2 per rail per front paling
        nails_front_count        = front_palings * rail_count * NAILS_PER_PALING_PER_RAIL
        nails_front_with_wastage = math.ceil(nails_front_count * (1 + WASTAGE_NAILS))
        nails_front_rounded      = math.ceil(nails_front_with_wastage / NAIL_PACK_SIZE) * NAIL_PACK_SIZE

        # Back-layer nails: 45mm × 1 per rail per back paling
        nails_back_count         = back_palings * rail_count * NAILS_PER_BACK_PALING_PER_RAIL
        nails_back_with_wastage  = math.ceil(nails_back_count * (1 + WASTAGE_NAILS))
        nails_back_rounded       = math.ceil(nails_back_with_wastage / NAIL_PACK_SIZE) * NAIL_PACK_SIZE

        # Capping rail: 1 piece per bay, 2 pieces per 4800mm stock
        capping_pieces        = bay_count
        capping_stock_lengths = math.ceil(capping_pieces / CAPPING_PIECES_PER_STOCK)

        back_nail_desc = BACK_NAIL_TYPE[timber_type]

        derived = {
            "length_mm":                length_mm,
            "post_count":               post_count,
            "bay_count":                bay_count,
            "rail_count":               rail_count,
            "rail_pieces":              rail_pieces,
            "rail_stock_lengths":       rail_stock_lengths,
            "paling_count":             paling_count,
            "back_palings":             back_palings,
            "front_palings":            front_palings,
            "palings_with_wastage":     palings_with_wastage,
            "concrete_bags":            concrete_bags,
            "nails_front_count":        nails_front_count,
            "nails_front_with_wastage": nails_front_with_wastage,
            "nails_front_rounded":      nails_front_rounded,
            "nails_back_count":         nails_back_count,
            "nails_back_with_wastage":  nails_back_with_wastage,
            "nails_back_rounded":       nails_back_rounded,
            "batten_screws":            batten_screws,
            "capping_pieces":           capping_pieces,
            "capping_stock_lengths":    capping_stock_lengths,
            "post_height_mm":           post_height_mm,
        }

        bom = [
            {
                "line": 1,
                "category": "Posts",
                "canonical_name": f"{POST_SIZE} {label} Post",
                "description": f"{POST_SIZE} {label} Post ({post_height_mm}mm)",
                "qty": post_count,
                "unit": "ea",
                "notes": (
                    f"{post_height_mm}mm total "
                    f"({fence_height_mm}mm fence + {POST_IN_GROUND_MM}mm in-ground)"
                ),
            },
            {
                "line": 2,
                "category": "Rails",
                "canonical_name": f"{RAIL_SIZE} {label} Rail {RAIL_STOCK_LENGTH_MM}mm",
                "description": f"{RAIL_SIZE} {label} Rail {RAIL_STOCK_LENGTH_MM}mm",
                "qty": rail_stock_lengths,
                "unit": "length",
                "notes": (
                    f"{rail_count} rails/bay × {bay_count} bays "
                    f"= {rail_pieces} pieces → {rail_stock_lengths} stock lengths"
                ),
            },
            {
                "line": 3,
                "category": "Palings",
                "canonical_name": (
                    f"{PALING_FACE_MM}x{PALING_THICKNESS_MM} "
                    f"Rough Sawn {label} Paling"
                ),
                "description": (
                    f"{PALING_FACE_MM}x{PALING_THICKNESS_MM} "
                    f"Rough Sawn {label} Paling ({fence_height_mm}mm)"
                ),
                "qty": palings_with_wastage,
                "unit": "ea",
                "notes": (
                    f"{LAPPED_PALINGS_PER_M}/m total — "
                    f"{back_palings} back layer + {front_palings} front layer "
                    f"(+{int(WASTAGE_PALINGS * 100)}% wastage applied to total)"
                ),
            },
            {
                "line": 4,
                "category": "Concrete",
                "canonical_name": f"Rapid Set Concrete {CONCRETE_BAG_SIZE_KG}kg",
                "description": f"Rapid Set Concrete {CONCRETE_BAG_SIZE_KG}kg",
                "qty": concrete_bags,
                "unit": "bag",
                "notes": f"{CONCRETE_BAGS_PER_POST} bags/post",
            },
            {
                "line": 5,
                "category": "Fasteners",
                "canonical_name": nail_desc,
                "description": nail_desc,
                "qty": nails_front_rounded,
                "unit": "ea",
                "notes": (
                    f"Front layer: 2 per rail per paling — "
                    f"rounded to nearest {NAIL_PACK_SIZE}-pack"
                ),
            },
            {
                "line": 6,
                "category": "Fasteners",
                "canonical_name": back_nail_desc,
                "description": back_nail_desc,
                "qty": nails_back_rounded,
                "unit": "ea",
                "notes": (
                    f"Back layer: 1 per rail per paling — "
                    f"rounded to nearest {NAIL_PACK_SIZE}-pack"
                ),
            },
            {
                "line": 7,
                "category": "Fasteners",
                "canonical_name": f"{BATTEN_SCREW_LEN_MM}mm Galvanised Batten Screw",
                "description": f"{BATTEN_SCREW_LEN_MM}mm Galvanised Batten Screw",
                "qty": batten_screws,
                "unit": "ea",
                "notes": "2 per rail piece",
            },
            {
                "line": 8,
                "category": "Capping",
                "canonical_name": f"{CAPPING_SIZE} {label} Capping Rail {CAPPING_STOCK_LENGTH_MM}mm",
                "description": f"{CAPPING_SIZE} {label} Capping Rail {CAPPING_STOCK_LENGTH_MM}mm",
                "qty": capping_stock_lengths,
                "unit": "length",
                "notes": (
                    f"1 piece per bay × {bay_count} bays = {capping_pieces} pieces "
                    f"→ {capping_stock_lengths} stock lengths "
                    f"({CAPPING_PIECES_PER_STOCK} pieces per {CAPPING_STOCK_LENGTH_MM}mm length)"
                ),
            },
        ]

    return {
        "ok": True,
        "inputs": {
            "fence_length_m":  fence_length_m,
            "fence_height_mm": fence_height_mm,
            "timber_type":     timber_type,
            "post_spacing_mm": post_spacing_mm,
            "rail_count":      rail_count,
            "paling_gap_mm":   paling_gap_mm,
            "paling_style":    paling_style,
        },
        "derived": derived,
        "bom": bom,
        "warnings": warnings,
        "constants": {
            "PALING_FACE_MM":          PALING_FACE_MM,
            "PALING_THICKNESS_MM":     PALING_THICKNESS_MM,
            "POST_SIZE":               POST_SIZE,
            "RAIL_SIZE":               RAIL_SIZE,
            "RAIL_STOCK_LENGTH_MM":    RAIL_STOCK_LENGTH_MM,
            "RAIL_PIECES_PER_STOCK":   RAIL_PIECES_PER_STOCK,
            "POST_IN_GROUND_MM":       POST_IN_GROUND_MM,
            "CONCRETE_BAGS_PER_POST":  CONCRETE_BAGS_PER_POST,
            "CONCRETE_BAG_SIZE_KG":    CONCRETE_BAG_SIZE_KG,
            "NAILS_PER_PALING_PER_RAIL": NAILS_PER_PALING_PER_RAIL,
            "NAIL_SIZE_MM":            NAIL_SIZE_MM,
            "BACK_NAIL_SIZE_MM":       BACK_NAIL_SIZE_MM,
            "NAILS_PER_BACK_PALING_PER_RAIL": NAILS_PER_BACK_PALING_PER_RAIL,
            "NAIL_PACK_SIZE":          NAIL_PACK_SIZE,
            "BATTEN_SCREW_LEN_MM":     BATTEN_SCREW_LEN_MM,
            "WASTAGE_PALINGS":         WASTAGE_PALINGS,
            "WASTAGE_NAILS":           WASTAGE_NAILS,
            "DEFAULT_PALINGS_PER_M":   DEFAULT_PALINGS_PER_M,
            "LAPPED_PALINGS_PER_M":    LAPPED_PALINGS_PER_M,
            "CAPPING_SIZE":            CAPPING_SIZE,
            "CAPPING_STOCK_LENGTH_MM": CAPPING_STOCK_LENGTH_MM,
            "CAPPING_PIECES_PER_STOCK": CAPPING_PIECES_PER_STOCK,
        },
    }


# ─── CLI entry point ─────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) > 1:
        raw = sys.argv[1]
    else:
        raw = sys.stdin.read()

    inputs = json.loads(raw)
    result = calculate_bom(inputs)
    print(json.dumps(result, indent=2))
