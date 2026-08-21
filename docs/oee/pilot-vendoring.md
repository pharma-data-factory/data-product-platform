# OEE Wave 1 vendoring assessment (pilot)

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: 1.0.0

Audit only. This phase does **not** implement package distribution or
refactor vendoring.

## Current model

Generated OEE repositories copy CERTIFIED Wave 1 snapshots into
`vendor/` (Health, Observability, MQTT Consumer, REST Source,
Time-Series Storage, REST API). The generated service runs without
Backstage and without a private package registry.

## Findings

| Question | Answer |
| --- | --- |
| How versions are recorded | Each vendor package `pyproject.toml` has `version = "1.0.0"`. Composition pins `1.x`. Catalog `dependsOn` names the six components. Generated `.generated-from-golden-path.json` repeats Wave 1 1.0.0. |
| How security fixes propagate | Manual: patch `platform-components/`, recopy into `templates/oee-data-product/content/vendor/`, regenerate products, open PRs in each Data Product repo. |
| How upgrade status is detected | Compare vendor package version and file hash to `platform-components/` (Golden Path test already byte-compares). Product repos have no automated drift detector today. |
| Risk of 50 Data Products carrying 50 copies | Real. Bug and CVE fixes must land in every copy. SQLite/MQTT client behavior can drift if a product is not regenerated. Independence (no Backstage at runtime) is the reason the copies exist. |

Measure generated `vendor/` size after `python pilot/oee/generate.py`.
Observed on 2026-08-21: **53 files, 109 555 bytes (~107 KiB)** of vendored
Wave 1 source in `pilot-oee-line-01/vendor/`.

## Options (not implemented)

| Option | Meaning | Fit for first plant |
| --- | --- | --- |
| A. Continue vendoring | Keep copying CERTIFIED snapshots into each repo | Works now; operational cost grows linearly |
| B. Internal package registry | Publish `pdf-*` 1.0.0 to a private index; generated repos depend on pins | Best medium-term; needs registry + pin policy |
| C. OCI / package distribution | Ship wheel/OCI artifacts per component | Overkill for a single-line pilot |
| D. Automated vendor-update PRs | Bot regenerates `vendor/` from CERTIFIED source when Wave 1 patches | Lowest-risk next step on top of A |

## Recommendation

**Keep A for the first controlled plant line.** Add **D** (automated
vendor-update PRs) as soon as a second generated OEE repo exists.
Move to **B** when more than a handful of products must receive the
same Wave 1 patch in one change. Do not introduce C before an internal
registry exists.

Do not change Wave 1 public APIs. Do not vendor UNS or AAS into OEE.
