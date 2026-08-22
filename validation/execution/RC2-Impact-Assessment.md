# RC2 formal re-test impact — CC-001

**From:** 1.0-RC1 (`platform-core-v1.0-rc1`)  
**To:** 1.0-RC2  
**Change:** Hosted named volume + matching `CREATE_AUTHORIZATION_AUDIT_PATH`  
**Date:** 2026-08-22  

Do not execute formal IQ/OQ/UAT in this document.

## Change surface

Compose files, both Control Plane Dockerfiles, env examples, hosting docs, and file-level developer tests. No change to permission policy, entitlements logic, JSONL store implementation, catalog locations, or auth providers.

## Required formal re-tests (minimum)

| Test | Why |
| --- | --- |
| IQ-006 | Direct finding. Confirm merged path, volume, writability after restart |
| IQ-002 | Validation/production compose `--config` chain and running hosted process |
| IQ-005 | Validation stack brings product PostgreSQL |
| IQ-009 | Hosted catalog ingest on production overlay (no samples) |
| IQ-013 | Candidate-bound image `platform-core:1.0-rc2` / build artifact |

## Previously PASS IQ tests

| Test | Affected? | Action |
| --- | --- | --- |
| IQ-001 | Identity only | Record RC2 tag; not a product-logic regression |
| IQ-003 | No `permission` change | No re-test required |
| IQ-004 | No auth overlay change | No re-test required |
| IQ-007 | No `index.ts` module change | No re-test required unless hosted startup log is newly available (optional) |
| IQ-008 | Catalog locations unchanged | Covered if IQ-009 is re-run |
| IQ-010 | New env name is `${CREATE_AUTHORIZATION_AUDIT_PATH}` | Spot-check overlay still uses placeholders (optional) |
| IQ-011 | Lockfile unchanged | No re-test required |
| IQ-012 | No SBOM added | Remains NOT_ESTABLISHED unless generated later |
| IQ-014 | New stack versions | Record Postgres 16 on the validation compose when IQ-005 runs |
| IQ-015 | New optional name | Record `CREATE_AUTHORIZATION_AUDIT_PATH` presence |
| IQ-016 | Health unchanged | Re-run only against the hosted validation process if IQ-002 proceeds |

Targeted IQ re-test set for RC2: **IQ-001 (identity), IQ-002, IQ-005, IQ-006, IQ-009, IQ-013, IQ-015 (name checklist), IQ-016 (hosted health).**

Do not automatically re-execute all 16 unless the hosted stack reveals a new defect.

## OQ / UAT

Not required by this change-control for RC2 IQ re-test. Audit restart OQ remains NOT_EXECUTED.
