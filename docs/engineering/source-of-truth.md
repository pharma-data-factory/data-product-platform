# Certification and Marketplace source of truth

Owner: Platform Team  
Last reviewed: 2026-08-21  
Audience: INTERNAL ENGINEERING  
Version: MVP 1.1

Do not add a third certification store.

## Canonical model

| Layer | Role |
| --- | --- |
| Catalog annotation `dataprod.platform/certification-status` | Canonical technical status on the entity |
| Golden Path release metadata | Certification and RELEASED status of **official Golden Path versions** |
| `catalog/certification-overrides.json` | MVP operational overlay for the running Control Plane |
| Marketplace static list | Curated presentation only |

## Overlay (MVP)

`FileCertificationOverlay` writes `catalog/certification-overrides.json`.
At read time the overlay wins if present. This is an MVP convenience so
Owners can change status without editing YAML. It is not a second product
database.

Prevent conflicting states:

- Treat the overlay as an instance override, not source for Git.
- Do not commit live override files (see `.dockerignore` / `.gitignore`).
- Official Golden Path **template** certification comes from release
  metadata, not from sample Catalog entities.

## Marketplace

Static Marketplace fields are presentation (name, category, description,
template reference). Version, certification, contract, and quality are
enriched from release metadata and Catalog when those exist.
