# Hyperagent Learnings Export — Full Snapshot

**Exported:** 2026-06-08
**Source thread:** https://hyperagent.com/thread/cmq4v4r051bh807adh9do82fm
**Format:** Antigravity-style portable bundle — one `SKILL.md` per skill (+ scripts), a category-grouped memory dossier, the rubric set, and a checksummed manifest.

> **New to the project? Start with [`PROJECT-OVERVIEW.md`](PROJECT-OVERVIEW.md)** — the plain-English explanation of what Anyfence is, the two cornerstones, the rollout plan, the pilots, and the suggested next steps. This README documents the *bundle's structure*; `PROJECT-OVERVIEW.md` explains the *project*.

## Contents

| Type | Count |
|---|---|
| Skills (total) | 48 |
| — user / project skills | 33 |
| — platform built-in skills | 15 |
| Memories | 46 |
| Rubrics | 16 |

## Layout

```
README.md                              ← this file
skills-inventory.md                    ← flat index of all 48 skills
manifest.json                          ← every file with its SHA-256 checksum
skills/
  <slug>/SKILL.md                      ← 33 user / project skills (+ scripts where present)
  _platform-builtin/<slug>/SKILL.md    ← 15 platform / built-in skills
memories/
  memories.md                          ← full dossier, grouped by category
  memories.json                        ← structured array (same content)
rubrics/
  <slug>.md                            ← 16 rubrics (criteria + scoring guides)
  rubrics.json                         ← structured array
```

## SKILL.md format

Each `SKILL.md` opens with YAML frontmatter (`name`, `id`, `source`, `exported`, `platform_builtin`, `pinned`, `tags`, `credentials`) followed by a one-line description, a **When to use** block, the full **verbatim Documentation** body, and a **Scripts** list. Any Python / shell scripts belonging to a skill sit alongside its `SKILL.md` in the same folder.

## Memories

46 memories across 7 of the 8 categories (no `organization` memories):
user_fact (1), preference (3), project_context (14), domain_knowledge (13), people (1), active_work (2), tools_and_workflows (12). Within each category, sorted by importance (descending). Content is verbatim.

## Provenance & fidelity notes

- This is a snapshot of the **saved** knowledge base (skills, memories, rubrics) visible to this thread on 2026-06-08. It does **not** include the pending "suggested learnings" accept/dismiss queue (not selected, and not reliably readable programmatically).
- **No agent system prompt is included** — this is a generalist thread, not a named agent, so there is no agent-specific prompt to export.
- **Credentials are never included.** Scripts read secrets from environment variables at runtime (e.g. `gh_commit.py` → `GITHUB_TOKEN`; the Xero connector → `XERO_CLIENT_ID` / `XERO_CLIENT_SECRET`). No secret values appear in any file.

### Known limitations (honest flags)

1. **xero-supplier-price-connector** — the `xero_connector.py` body could **not** be exported: `FetchSkillScripts` gates script retrieval on configured credentials, and Xero's (`XERO_CLIENT_ID` / `XERO_CLIENT_SECRET`) are not set on this skill. The full skill *documentation* is included; the script file is named in the Scripts section but is not present. Re-run the export with Xero credentials configured to capture it.
2. **website-to-hyperframes** (platform skill) — references a multi-file `references/` tree; the main skill markdown is captured verbatim, but those sub-reference files are not separately exported.
3. **docx / xlsx / pptx** (platform skills) — their bundled `.py` / `.xml` helper scripts are included, but large XSD validation schemas (~34 files) were skipped to keep the bundle lean; `pptx` returned only a partial script set from the platform.
4. **Four skills are read-only shared** (owned/shared by another account): `deploy-preview-qa-verification`, `sidebar-settings-panel-patterns`, `canvas-drawing-tool-ux-patterns`, `product-configuration-ux-philosophy`. They are exported faithfully here, but you don't "own" them in the library.

## Verifying integrity

`manifest.json` lists every file with its SHA-256. After extracting, recompute checksums and compare. A future scheduled re-export can diff against this manifest to show exactly what changed since 2026-06-08.
