# Update a Data Contract / handle a breaking change

Owner: Platform Team  
Last reviewed: 2026-08-19  
Audience: PLATFORM USER  
Version: MVP 1.1

1. Change the versioned JSON Schema in `contracts/`.
2. Update generated models and tests.
3. Follow [versioning-policy.md](../versioning-policy.md):
   - additive optional field → MINOR
   - required field removed/renamed or incompatible type → MAJOR
4. Update the Catalog API `dataprod.platform/contract-version`.
5. Run contract tests locally and in CI.
6. Tell consumers the new contract version. Do not silently break them.

Canonical schemas:

- [temperature-event.md](../contracts/temperature-event.md)
- [equipment-event.md](../contracts/equipment-event.md)
- [OEE contracts 1.0](../oee/contracts.md)
