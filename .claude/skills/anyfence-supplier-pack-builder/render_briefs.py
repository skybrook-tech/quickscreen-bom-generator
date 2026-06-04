#!/usr/bin/env python3
"""
Renders the two-brief supplier-onboarding pack (supplier+instances brief +
seed-data+price-book brief) from a structured YAML spec.

Usage:
    python3 render_briefs.py spec.yaml --output-dir _briefs/00-inbox/ --asset-dir _briefs/assets/

Spec format (YAML):
    supplier:
      slug: amazing-fencing
      name: Amazing Fencing
      brand_colour: "#1a3a5c"
      contact_email: ~
      trust_tier: platform
      website: https://amazingfencing.com.au
      address: "Multi-state: Sydney, Melbourne, Brisbane, Gold Coast"
      region: "NSW, VIC, QLD"
      metadata:
        founded: ~30 years ago (~1995)
        services: install + supply (sister site: fencing-supplies.com.au)

    archetype_seed_required: false  # true if first instance of a new archetype

    instances:
      - slug: amazing-permasteel
        archetype: panel-fence
        name: "Amazing Fencing — Permasteel"
        status: active
        readiness_status: draft
        trust_tier: platform
        visibility: public
        description: "PermaSteel modular fencing system in 1.5/1.8/2.1/2.4m heights"
        metadata:
          source_page: https://amazingfencing.com.au/products/permasteel-fencing/
          available_heights_m: [1.5, 1.8, 2.1, 2.4]
          pricing_pending: "publicly unlisted; needs supply-side price PDF"

    seed_files:
      - filename: permasteel.json
        instance_slug: amazing-permasteel
        # ... (see canonical seed JSON shape)

    price_book:
      name: "Amazing Fencing 2026-05 Trade Pricing"
      source: "Internal trade pricing PDF (TODO: obtain)"
      effective_from: "2026-05-01"
      status: draft   # use 'published' once verified
      tier_code: tier1
      items: []      # populated when pricing PDF supplied

    brief_number_supplier_and_instances: 047
    brief_number_seed_and_price_book: 048

This script is the SECOND step of the workflow. The FIRST step is the human
authoring of the spec file based on supplier research. Use this to render
the boilerplate so each new supplier doesn't require copy-pasting from
brief 042 / 043.

Output files (when --output-dir and --asset-dir are set):
- {output_dir}/{N}-{supplier_slug}-supplier-and-instances.md
- {output_dir}/{N+1}-{supplier_slug}-seed-data-and-price-book.md
- {asset_dir}/{N+1}-{supplier_slug}-seeds/  (the seed JSON files referenced by the brief)
"""
import argparse
import sys
import json
from pathlib import Path

try:
    import yaml
except ImportError:
    print("Install pyyaml: pip install pyyaml", file=sys.stderr)
    sys.exit(2)

SUPPLIER_BRIEF_TEMPLATE = """# Brief {n_supplier} — {supplier_name}: Supplier + System Instances

**Status:** Ready for execution
**Repo:** `github.com/skybrookai-atlas/quickscreen-colorbond-generator`
**Default branch:** `main`
**Depends on:** brief 033 merged (Glass Outlet + the 12 archetypes exist)
**Estimated PR size:** small (one data migration; no schema; no UI; no code)
**Primary reference:** `docs/system-authoring-process.md` Section 7 (admin runbook) + `{website}` (source-of-truth product range)

---

## Goal

Add **{supplier_name}** as a supplier on the Anyfence platform. Create the supplier row + {n_instances} `system_instances` matching their public product categories. No products / prices / rules in this brief — that's brief {n_seed}.

**Strategic note:** {supplier_name} is being added as a `{trust_tier}`-tier supplier authored by SkyBrookAI (Liam), because Liam holds the source material and is responsible for the data quality. When {supplier_name} later signs the verified-supplier agreement (per brief 040's verification process), the trust_tier can be demoted to `verified` via the admin UI (brief 035) — that's a clean one-row update, no migration needed.

## Hard rules

- **`localBomCalculator.ts` unchanged.** Test suite UNCHANGED.
- **PR base branch is `main`.**
- **Draft PR only.**

## Files this brief touches

| File | Type of change |
|---|---|
| `supabase/migrations/{n_supplier}_{supplier_slug_underscore}_supplier_and_instances.sql` | NEW — data migration |
| `catalogues/{supplier_slug}/README.md` | NEW — pointer to source pages + downloadable PDFs |

**Explicitly NOT touched:** no code, no UI, no seed JSON yet (brief {n_seed}).

## Migration SQL

```sql
-- ============================================================================
-- {n_supplier}_{supplier_slug_underscore}_supplier_and_instances.sql
-- ============================================================================

-- ─── Supplier row ───────────────────────────────────────────────────────────
INSERT INTO suppliers (slug, name, brand_colour, contact_email, trust_tier, status, metadata)
VALUES (
  '{supplier_slug}',
  '{supplier_name}',
  {brand_colour_sql},
  {contact_email_sql},
  '{trust_tier}',
  'active',
  {metadata_sql}
)
ON CONFLICT (slug) DO NOTHING;

-- ─── System instances ───────────────────────────────────────────────────────
WITH s AS (SELECT id FROM suppliers WHERE slug = '{supplier_slug}')
INSERT INTO system_instances (
  supplier_id, archetype_id, slug, name, status, readiness_status,
  trust_tier, visibility, description, metadata
) VALUES
{instance_values}
ON CONFLICT (supplier_id, slug) DO NOTHING;

-- ─── Sanity log ─────────────────────────────────────────────────────────────
DO $$
DECLARE v_supplier UUID; v_instance_count INT;
BEGIN
  SELECT id INTO v_supplier FROM suppliers WHERE slug = '{supplier_slug}';
  IF v_supplier IS NULL THEN
    RAISE EXCEPTION '{supplier_name} supplier row not inserted';
  END IF;
  SELECT COUNT(*) INTO v_instance_count FROM system_instances WHERE supplier_id = v_supplier;
  RAISE NOTICE '{supplier_name} seeded: supplier %, % system_instances', v_supplier, v_instance_count;
END $$;
```

## Catalogue README

Create `catalogues/{supplier_slug}/README.md` with source pointers, brand partner details, and TODOs.

## PR description template

```markdown
## Brief {n_supplier} — {supplier_name}: Supplier + System Instances

Adds {supplier_name} as supplier on the Anyfence platform. Creates {n_instances} system_instances. No products / prices / rules in this brief — see brief {n_seed}.

### Verification

- [ ] typecheck / test / build passes; `localBomCalculator.test.ts` UNCHANGED
- [ ] Migration applies cleanly
- [ ] `NOTICE` message logs the supplier UUID + {n_instances} instances
- [ ] PR base branch is `main`
```

## After this PR merges

Brief {n_seed} ships the seed data (products + price book v1 + rules wiring) for the instances where pricing is available.
"""


def render_supplier_brief(spec):
    """Render the supplier+instances brief from spec."""
    s = spec["supplier"]
    instances = spec["instances"]

    n_supplier = spec.get("brief_number_supplier_and_instances", 47)
    n_seed = spec.get("brief_number_seed_and_price_book", 48)

    instance_values = []
    for inst in instances:
        meta = json.dumps(inst.get("metadata", {}), separators=(",", ":"))
        instance_values.append(
            f"  ((SELECT id FROM s), (SELECT id FROM system_archetypes WHERE slug='{inst['archetype']}'),\n"
            f"    '{inst['slug']}', '{inst['name']}',\n"
            f"    '{inst.get('status', 'active')}', '{inst.get('readiness_status', 'draft')}', "
            f"'{inst.get('trust_tier', 'platform')}', '{inst.get('visibility', 'public')}',\n"
            f"    '{inst['description'].replace(chr(39), chr(39)+chr(39))}',\n"
            f"    '{meta}'::jsonb)"
        )

    return SUPPLIER_BRIEF_TEMPLATE.format(
        n_supplier=f"{n_supplier:03d}",
        n_seed=f"{n_seed:03d}",
        supplier_name=s["name"],
        supplier_slug=s["slug"],
        supplier_slug_underscore=s["slug"].replace("-", "_"),
        website=s.get("website", "https://example.com"),
        trust_tier=s.get("trust_tier", "platform"),
        n_instances=len(instances),
        brand_colour_sql=f"'{s['brand_colour']}'" if s.get("brand_colour") else "NULL",
        contact_email_sql=f"'{s['contact_email']}'" if s.get("contact_email") else "NULL",
        metadata_sql="jsonb_build_object(" + ", ".join(
            f"'{k}', {json.dumps(v)}" for k, v in s.get("metadata", {}).items()
        ) + ")" if s.get("metadata") else "'{}'::jsonb",
        instance_values=",\n".join(instance_values),
    )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("spec", help="Path to the YAML spec file")
    parser.add_argument("--output-dir", default=".", help="Where to write the rendered brief files")
    parser.add_argument("--asset-dir", default=None, help="Where to write seed JSON files")
    parser.add_argument("--print-only", action="store_true", help="Print the rendered brief to stdout instead of writing")
    args = parser.parse_args()

    spec = yaml.safe_load(Path(args.spec).read_text())
    supplier_brief = render_supplier_brief(spec)

    if args.print_only:
        print(supplier_brief)
        return

    out_dir = Path(args.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    n_supplier = spec.get("brief_number_supplier_and_instances", 47)
    out_path = out_dir / f"{n_supplier:03d}-{spec['supplier']['slug']}-supplier-and-instances.md"
    out_path.write_text(supplier_brief)
    print(f"Wrote: {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()