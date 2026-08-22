# RB-P1-008 — Technical evidence

| Field | Value |
| --- | --- |
| Backlog ID | RB-P1-008 |
| Origin | Phase 3B P0 finding on RB-P0-001 (torn JSONL) |
| Baseline | PDF-PC-VAL-BL-1.0 |
| Related URS / SYS / TDS | URS-AUD-001 / SYS-AUD-001 / TDS-AUD-001 |
| Related risk | RA-007 |
| Evidence status | **TECHNICAL_EVIDENCE_AVAILABLE** |
| Date | 2026-08-22 |
| Phase | 4A |

## Chosen behavior (not Part 11)

`FileCreateAuthorizationAuditStore.list()`:

1. Reads the JSONL file without rewriting or truncating it.
2. Returns a line only when it parses as JSON **and** has required audit fields (`type`, `at`, `actor`, `organizationId` as non-empty strings; `decision` if present is GRANT or DENY).
3. A line that fails `JSON.parse` (typical torn last write) is skipped and recorded as `{ lineNumber, reason: 'MALFORMED_JSON' }`.
4. Valid JSON that is not a well-formed audit event is skipped and recorded as `{ lineNumber, reason: 'MALFORMED_RECORD' }`.
5. Does not invent a synthetic valid record from torn or schema-invalid bytes.
6. Does not delete the malformed bytes (evidence remains on disk).

Administrator GET `/admin/entitlements` calls `auditTrail()` then includes `auditIssues` so torn/malformed data is detectable.

This is not Part 11 functionality.

## Tests

- `packages/platform-common/src/create-authorization-audit-store.test.ts`
