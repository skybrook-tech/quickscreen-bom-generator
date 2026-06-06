"""
pipeline.py

Orchestrator that takes ExaSearch JSON output and writes a complete
fence_system_config.json.

Two execution modes:

1) Standalone — feed it a JSON file of ExaSearch results saved from outside:
       python3 pipeline.py \\
           --search-json colorbond_search.json \\
           --system-id colorbond_classic \\
           --display-name "Colorbond Classic Fence" \\
           --output configs/colorbond_classic.json

2) Library — import build_pipeline() from another script.

The Exa fetching itself is performed by the agent driving this skill (via
the ExaSearch / ExaContents MCP tools). This file just consumes the JSON.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Use absolute imports relative to this file's location
sys.path.insert(0, str(Path(__file__).parent))

from bunnings_parser import parse_search_results, to_jsonable
from fence_config_mapper import build_fence_system_config


def build_pipeline(
    exa_results: list[dict],
    *,
    system_id: str,
    display_name: str,
    manufacturer: str = "BlueScope",
    post_spacing_mm: int = 2400,
    compliance: list[dict] | None = None,
    gate_options: list[dict] | None = None,
    post_mounting_options: list[str] | None = None,
    visual_assets: dict | None = None,
) -> dict:
    """
    Run the full pipeline: parse search results -> build config.

    Returns the fence_system_config dict (ready to be json.dump'd).
    """
    products = parse_search_results(exa_results)
    products_jsonable = [to_jsonable(p) for p in products]

    config = build_fence_system_config(
        products_jsonable,
        system_id=system_id,
        display_name=display_name,
        manufacturer=manufacturer,
        post_spacing_mm=post_spacing_mm,
        post_mounting_options=post_mounting_options,
        compliance=compliance,
        gate_options=gate_options,
        visual_assets=visual_assets,
    )

    # Stash the raw parsed products inside the config metadata for traceability
    config["metadata"]["raw_products"] = products_jsonable
    return config


def main():
    p = argparse.ArgumentParser(
        description="Build fence_system_config.json from saved ExaSearch results"
    )
    p.add_argument("--search-json", required=True,
                   help="Path to ExaSearch result JSON (must contain a 'results' array)")
    p.add_argument("--system-id", required=True)
    p.add_argument("--display-name", required=True)
    p.add_argument("--manufacturer", default="BlueScope")
    p.add_argument("--post-spacing-mm", type=int, default=2400)
    p.add_argument("--output", default="-")
    p.add_argument("--compliance-json", default=None,
                   help="Optional path to compliance rules JSON")
    p.add_argument("--gate-options-json", default=None,
                   help="Optional path to gate options JSON")
    args = p.parse_args()

    with open(args.search_json) as f:
        data = json.load(f)
    results = data.get("results", data) if isinstance(data, dict) else data

    compliance = None
    if args.compliance_json:
        with open(args.compliance_json) as f:
            compliance = json.load(f)

    gate_options = None
    if args.gate_options_json:
        with open(args.gate_options_json) as f:
            gate_options = json.load(f)

    config = build_pipeline(
        results,
        system_id=args.system_id,
        display_name=args.display_name,
        manufacturer=args.manufacturer,
        post_spacing_mm=args.post_spacing_mm,
        compliance=compliance,
        gate_options=gate_options,
    )

    out = json.dumps(config, indent=2)
    if args.output == "-":
        print(out)
    else:
        with open(args.output, "w") as f:
            f.write(out)
        print(
            f"Wrote {args.output} — {config['metadata']['product_count']} products, "
            f"{len(config['components'])} components, "
            f"{len(config['colours'])} colours.",
            file=sys.stderr,
        )


if __name__ == "__main__":
    main()
