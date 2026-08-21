# Handle a Breaking Change

Owner: Platform Team  
Documentation Version: 1.0  
Applicable Platform: Data Product Standard 1.0.x  
Last Reviewed: 2026-08  
Audience: PLATFORM USER

A breaking contract change is a **MAJOR** version. Consumers must opt in.
Do not silently publish an incompatible schema on the same contract version.

Typical breaking changes:

- required field removed or renamed
- incompatible type change
- v1.x → v2.0

Additive optional fields (v1.1 → v1.2) stay **COMPATIBLE**.

Procedure:

1. Follow [Change a Data Contract](contract-change.md).
2. Bump the MAJOR contract version.
3. Update Catalog `dataprod.platform/contract-version`.
4. Run contract, quality, and compatibility tests.
5. Tell consumers. Compatibility status will show BREAKING CHANGE until
   they move.

Canonical policy: [versioning-policy.md](../versioning-policy.md),
[compatibility-matrix.md](../compatibility-matrix.md),
[Compatibility](../engineering/compatibility.md).
