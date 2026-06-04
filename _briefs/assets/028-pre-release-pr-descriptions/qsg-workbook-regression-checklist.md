# QSG Sliding Gates — Workbook Regression Checklist

**Source workbook:** `Order-Form+QSG+Sliding+Gates~V2-T1.xlsx` (uploaded to a prior Hyperagent thread; Liam will need to re-upload to this thread or extract to repo's `_briefs/assets/qsg-workbook/`)
**Target:** unblock the `codex/qsg-sliding-gates-calculator` PR for merge

---

## The 3-5 configurations to regress

Pick configurations that span the typical range. Minimum 3; up to 5 ideal:

1. **Small standard sliding gate** — single slide, ~3.0m clear opening, 65mm slat, 9mm gap, single colour (Black or Monument)
2. **Standard sliding gate** — single slide, ~4.5m clear opening, 65mm slat, 9mm gap, default colour
3. **Large sliding gate with cantilever offset** — single slide, ~5.5m clear opening, 65mm slat, 20mm gap, default colour
4. (Optional) **Double-leaf sliding gate** — bi-parting if the system supports it
5. (Optional) **Edge case** — non-standard slat width or gap that exercises the validation rules

For each configuration:

## The regression procedure

### Step 1 — capture the inputs

From the workbook's Inputs tab:
- Clear opening width (mm)
- Gate height (mm)
- Slat size (65 / 90)
- Gap (5 / 9 / 20)
- Colour
- Post type (1W / 2W / 90)
- Any optional accessories (clamps, latches, motor pre-wire)

### Step 2 — capture the expected outputs

From the workbook's BOM tab:
- Every line item: `(sku, qty, taxonomy)`
- Note any optional rows the workbook surfaces (vs. auto-add only)

### Step 3 — run the calculator

In a fresh quote on the deploy preview for `codex/qsg-sliding-gates-calculator`:
- Enter inputs verbatim
- Add a sliding gate of the configured size
- Generate BOM

### Step 4 — diff line-by-line

Use this template:

| SKU | Expected qty | Actual qty | Expected taxonomy | Actual taxonomy | Match? |
|---|---|---|---|---|---|
| QSG-… | 5 | 5 | auto_add | auto_add | ✓ |
| QSG-… | 3 | 2 | auto_add | auto_add | **✗** |

Any row with `Match? = ✗` is a regression bug. The PR cannot merge until all configurations show 100% line-by-line match.

### Step 5 — file the diff in the PR

Paste the diff table into the PR body as a comment. Tag Codex (or open a follow-up brief) for any mismatches.

---

## Common failure modes (from prior gates work)

- **Math.js string comparison** — `gate_movement == "sliding"` evaluates wrong; must use `equalText(gate_movement, "sliding")`. Codex's discovery.md flags this.
- **Off-by-one bay count** — sliding gates measure clear opening DIFFERENTLY from swing (they need overlap and tail support; the bay calc must account for that).
- **Missing cantilever offset adders** — sliding gates that overhang need extra hardware (rollers, end stops, anti-lift). The selector matches must surface these.
- **Wrong post count** — sliding gates typically need 2 posts on the latch side OR a wall pocket. Make sure the post count rule isn't reusing the swing-gate formula.

---

## If regression passes

Update the PR description to add:

> **Workbook regression: ✓ 3 (or 5) configurations match line-for-line against `Order-Form+QSG+Sliding+Gates~V2-T1.xlsx`. Diff results pasted in PR comments below.**

Then the PR can be marked ready for review (still draft until merged though — never set ready-for-review without Liam clicking that).

## If regression fails on ≥1 config

Don't merge. Either:
1. Fix the seed JSON rules in a follow-up commit on the same branch, re-run regression, repeat until clean
2. OR split the QSG sliding work into smaller pieces — merge what's correct, open a follow-up brief for what's not

The trust anchor is the workbook. Don't ship sliding gates that under-quote a real job — that's a refund email Liam doesn't want.