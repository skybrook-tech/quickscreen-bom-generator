# Catalogue Scraping & Schema Mapping Pipeline
- id: cmpp0191x004b07adjqz6hbfp · task type: coding · criteria: 5

This work involves building a multi-stage data pipeline (search → parse → map → validate) with domain-specific classification logic, schema design for a downstream calculator engine, and embedded regulatory compliance. Quality hinges on catching misclassifications (e.g., hinge panel vs hinge hardware), correct unit semantics (per-piece vs per-metre), and producing outputs the downstream engine can actually consume.

## Criteria

### Data extraction accuracy (correct prices, dimensions, categories) (weight: 0.2)
Evaluates data extraction accuracy (correct prices, dimensions, categories)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Classification taxonomy completeness (handles edge cases and priority ordering) (weight: 0.2)
Evaluates classification taxonomy completeness (handles edge cases and priority ordering)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Schema extensibility (new categories integrate cleanly with existing config) (weight: 0.2)
Evaluates schema extensibility (new categories integrate cleanly with existing config)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Output validation and audit (verifies correctness before delivery) (weight: 0.2)
Evaluates output validation and audit (verifies correctness before delivery)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Domain compliance integration (regulatory rules embedded with enforcement levels) (weight: 0.2)
Evaluates domain compliance integration (regulatory rules embedded with enforcement levels)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent
