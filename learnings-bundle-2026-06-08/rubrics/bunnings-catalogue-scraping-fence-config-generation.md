# Bunnings catalogue scraping & fence-config generation
- id: cmpp0133j004o07adqyln5a89 · task type: data-pipeline · criteria: 5

This work involves a multi-stage data pipeline (search, parse, map, audit, enrich) producing structured configs consumed by a calculator engine. Quality hinges on subtle classification ordering, domain-specific formulas (paling overlap math), and regulatory accuracy — none of which are captured by generic research/coding rubrics.

## Criteria

### Product classification accuracy (correct category assignment with priority ordering) (weight: 0.2)
Evaluates product classification accuracy (correct category assignment with priority ordering)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Schema extension correctness (new categories, units, cuts_per_run_fn formulas) (weight: 0.2)
Evaluates schema extension correctness (new categories, units, cuts_per_run_fn formulas)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Price extraction fidelity (per-item vs per-linear-metre disambiguation) (weight: 0.2)
Evaluates price extraction fidelity (per-item vs per-linear-metre disambiguation)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Compliance rule completeness and accuracy (AS1926.1, AS/NZS 1604, BAL, council) (weight: 0.2)
Evaluates compliance rule completeness and accuracy (as1926.1, as/nzs 1604, bal, council)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Output config validity and downstream usability by calculator engine (weight: 0.2)
Evaluates output config validity and downstream usability by calculator engine

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent
