# Release a Golden Path

Owner: Golden Path Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: INTERNAL ENGINEERING

Official process for MQTT Temperature, REST Equipment, and future
certified Golden Paths. This is not GxP validation.

1. **Develop** the template and generated product without changing unrelated Golden Path runtime.
2. **Run tests** (`yarn tsc`, unit tests, Golden Path tests).
3. **Conformance** against the Data Product Standard.
4. **Certification** — template annotation CERTIFIED.
5. **Version** using existing SemVer (PATCH / MINOR / MAJOR).
6. **Release notes** in `docs/releases/<template>-<version>.md`.
7. **Request approval** — Developer proposes; Owner reviews certification.
8. **Approve release** — Platform Admin only (`golden-path.release.manage`).
9. **Publish** the RELEASED manifest (`catalog/releases/golden-path-releases.yaml`).
10. **Verify Marketplace** shows Version, CERTIFIED, RELEASED, Internal and Template Edition.

Catalog: `/releases`. Checklist: [Release Checklist](../engineering/release-checklist.md).
