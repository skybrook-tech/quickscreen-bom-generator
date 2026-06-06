---
skill: au-fencing-supplier-tier-tagger
id: cmpnfyke300pv06advwg2jvhp
description: Tier-A/B/C classification rubric for Australian fencing material suppliers in the Anyfence database. Tier A = top 15 with named decision-makers and strategic fit; B = middle 31 with mail-merge fit; C = bottom 15 low-priority. Includes criteria for each tier and a worked example against the 61-supplier database.
whenToUse: 
tags: 
---

# AU Fencing Supplier Tier Tagger

A repeatable classification rubric for sorting fencing material suppliers into outreach priority tiers. Use during the build of any supplier database to decide who gets a personal email vs mail merge vs deprioritization.

## The criteria

### Tier A (top ~25%) — personal outreach with named contact

Must satisfy ALL of:
- **National reach:** trades in 3+ Australian states (drops sub-nationals like Bowens Timber, Probuild Technologies)
- **Strategic fit:** carries products in 2+ of Anyfence's Tier 1 launch categories (aluminium slat, post & rail, Colorbond)
- **Decision-maker identifiable:** a real human contact found on LinkedIn or the company directory with title containing "Marketing", "Trade", "Distribution", "Channel", "Partnerships", "Sales Manager", "GM", "Director", or "CEO"

Bonus (any of):
- Already runs a contractor referral or partner program (e.g. Oxworks)
- Owns the supply chain end-to-end as manufacturer (rather than reselling)
- Listed in the top 5 by national store/depot count in their category

Treatment: personal email + LinkedIn DM, hand-written subject line, 15-min call ask, send wireframe on response.

### Tier B (middle ~50%) — mail merge with personalization tokens

Satisfies at least 2 of:
- National reach (3+ states)
- Strategic fit (1+ Tier 1 launch category)
- Has a public email (info@, sales@, marketing@)
- 10+ stores/depots OR 5+ years in market OR known brand

Treatment: mail merge with `{First_Name}`, `{Company_Name}`, `{Category}`, `{Specific_Product}` tokens. Use sales@ or info@ if no direct contact.

### Tier C (bottom ~25%) — low priority

Catch-all:
- 2 states or fewer
- Niche category coverage (PVC, brushwood — interesting but small TAM)
- Generic email only (info@) with no role-based fallback
- Low public profile (no LinkedIn presence for the company)

Treatment: mail merge, no follow-up scheduled. If they reply, escalate to Tier A treatment.

## Mechanical scoring (when you want to automate)

```
Tier A: national + Tier1_categories≥2 + named_contact
Tier B: (national OR Tier1_categories≥1) + (named_contact OR sales_email) + (stores≥10 OR years≥5 OR known_brand)
Tier C: everything else
```

## Anti-patterns to avoid

- **Don't promote to Tier A based on company size alone.** A massive supplier with no identifiable decision-maker is still a Tier B (or you'll waste effort on info@ with no follow-up path).
- **Don't demote to Tier C based on niche category alone.** Brushwood Fencing Australia is a small player but the brushwood category has only 4 national suppliers — so Anyfence has high leverage there. Score on overall fit, not just category size.
- **Don't tier a supplier you only know via their reseller.** Bunnings sells Colorbond products, but BlueScope/Lysaght is the actual manufacturer — tier them separately, even if they appear under the same SKUs.

## Worked example: Anyfence May 2026 distribution

15 Tier A / 31 Tier B / 15 Tier C across 61 national suppliers.

**Tier A examples** (named contact + multi-category + national):
- Stratco — Kristopher Powell (CMO), 70+ stores, Colorbond + steel sheet + post & rail
- BlueScope/Lysaght — Robert Evans, Colorbond manufacturer
- Bunnings Trade — Elissa Cunsolo (Trade Marketing), all categories, massive distribution
- Oxworks — Adam Barrack, already runs contractor referral program
- Steeline — Kirsty Chivell, rural distribution leader
- Waratah — Kaye Nugent, rural post & wire leader
- Mitre 10 Trade — Sarah Hewson (Trade Marketing)

**Tier B examples** (national + email but no named contact, OR named contact but single category):
- House of Bamboo — niche but national, marketing@ email available
- Whites Group — mandy.sheffield@whitesgroup.com.au verified
- Brushwood Fencing Australia — only 4 brushwood competitors so still worth merging

**Tier C examples** (sub-categorical, limited reach):
- Specialty PVC suppliers with one regional depot
- Single-state distributors that crept into the merged list
- Generic info@-only contacts with no LinkedIn presence

## How to update tiers over time

- If a Tier B supplier replies positively → promote to A for the next campaign
- If a Tier A supplier ghosts past day-14 break-up → keep at A but cool down 90 days
- If a Tier C reply seems valuable → escalate immediately to A treatment for the conversation

## What this skill is NOT for

- Tiering CONTRACTORS (different rubric — contractor tiering is by trade-licence, region density, and lead-volume capacity)
- Tiering CONSUMERS (anyfence.com.au end users — not B2B)
- Non-Australian markets (the "national = 3+ states" criterion is Australia-specific)
