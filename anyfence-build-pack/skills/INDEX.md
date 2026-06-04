# Anyfence Build Pack — Skills Index

| Skill | Category | Has scripts? | One-line purpose |
|---|---|---|---|
| anyfence-fence-config-schema | calculator-engine | No | The canonical fence_system_config.json schema used by the Anyfence calculator engine. |
| treated-pine-paling-fence-calculator | calculator-engine | Yes | Calculates a bill of materials for standard boundary paling fences (treated pine or hardwood) using canonical product names. |
| au-fence-compliance-rules | calculator-engine | No | Australian fence compliance reference: AS1926.1-2012 (pool barriers), H3/H4 timber treatment, AS3959 BAL bushfire restrictions, state-specific Fences Act requirements, council height caps. |
| quickscreen-seed-data-conventions | calculator-engine | No | QuickScreen BOM engine seed-data conventions: JSON files as source of truth, business-key resolution (no UUIDs), bomCategory 12-category taxonomy for BOM display ordering. |
| QSHS Fence BOM Calculator (Glass Outlet) | quickscreen-systems | No | Self-contained BOM calculator spec for The Glass Outlet's QSHS (QuickScreen Horizontal Slat) fence system. |
| VS Fence BOM Calculator (Glass Outlet) | quickscreen-systems | No | Self-contained BOM calculator spec for The Glass Outlet's VS (Vertical Slat) fence system. |
| XPL Fence BOM Calculator (Glass Outlet) | quickscreen-systems | No | Self-contained BOM calculator spec for The Glass Outlet's XPL (XPress Plus Premium) friction-fit post fence system. |
| BAYG Fence BOM Calculator with Alumawood (Glass Outlet) | quickscreen-systems | No | Self-contained BOM calculator spec for The Glass Outlet's BAYG (Buy As You Go) fence system, including Alumawood-finish variant. |
| bunnings-fence-scraper | data-ingestion | Yes | Ingests Bunnings fencing catalogue data via Exa search and outputs fence_system_config.json files matching the Anyfence calculator engine schema. |
| supplier-catalogue-extractor | data-ingestion | No | Methodology for extracting Australian fencing supplier catalogues (PDFs, brochures, build-packs) into calculator-ready structured data. |
| supplier-catalogue-extraction-workflow | data-ingestion | No | Systematic procedure for extracting structured product data (SKUs, pricing, specifications) from supplier web portals. |
| fence-calculator-ui-conventions | ui-qa | No | UI conventions for any fence BOM calculator with a canvas/mapper component. |
| fence-calculator-qa-tester | ui-qa | No | Quality-assurance methodology for any fence BOM calculator. |
| calculator-project-coordination-playbook | methodology | No | Project coordination playbook for parametric calculator builds (QuickScreen, Anyfence, any tradie SaaS calculator). |
| anyfence-strategic-playbook | gtm-ops | No | Strategic playbook for Anyfence — the per-fence-type calculator network connecting Australian contractors with local material suppliers. |
| anyfence-supplier-wireframe-pattern | gtm-ops | No | Single-page HTML wireframe pattern for showing fence suppliers what their branded Anyfence calculator would look like. |
| au-fencing-supplier-tier-tagger | gtm-ops | No | Tier-A/B/C classification rubric for Australian fencing material suppliers in the Anyfence database. |
| b2b-tiered-cold-outreach-playbook | gtm-ops | No | Three-week B2B cold-outreach sequence with tier-based personalization, mail-merge templates, day-7 follow-up, day-14 break-up email. |
| parallel-research-to-table-pattern | gtm-ops | No | Pattern for large-scope structured research: dispatch N parallel sub-agents, each returning structured JSON, then deduplicate and merge into a single sortable table. |
