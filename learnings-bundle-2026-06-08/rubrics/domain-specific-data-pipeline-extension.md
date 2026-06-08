# Domain-Specific Data Pipeline Extension
- id: cmpp00mwb003807adarydfns7 · task type: coding · criteria: 5

This work extends a structured data pipeline (Bunnings fence scraper) with three new fence-type families, adding ~13 new component categories, new BOM quantity formulas, and parser improvements. Quality hinges on domain accuracy (do the formulas match installer specs?), classification precision (keyword collisions caused real bugs that needed fixing mid-flight), and regression discipline (verifying old configs still work). A dedicated rubric would help evaluate similar iterative pipeline-extension work.

## Criteria

### Schema extension correctness (new categories cover the domain without overlap) (weight: 0.2)
Evaluates schema extension correctness (new categories cover the domain without overlap)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Classification accuracy (keyword ordering avoids substring collisions and misclassifications) (weight: 0.2)
Evaluates classification accuracy (keyword ordering avoids substring collisions and misclassifications)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Quantity formula correctness (cuts-per-run expressions reflect real-world install specs) (weight: 0.2)
Evaluates quantity formula correctness (cuts-per-run expressions reflect real-world install specs)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Regression safety (changes don't break previously-working configs) (weight: 0.2)
Evaluates regression safety (changes don't break previously-working configs)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent

### Deliverable completeness (configs saved, skill updated, documentation reflects new state) (weight: 0.2)
Evaluates deliverable completeness (configs saved, skill updated, documentation reflects new state)

**Scoring guide:**
- 1: Poor
- 3: Acceptable
- 5: Excellent
