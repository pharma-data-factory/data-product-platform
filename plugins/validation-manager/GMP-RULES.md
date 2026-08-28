# GMP Compliance Rules — Validation Manager

**Status:** ✅ APPROVED  
**Version:** 1.0.0  
**Last Updated:** 2026-08-25  
**Document ID:** DOC-2026-GMP-RULES-001  

---

## Executive Summary

The Validation Manager enforces **10 core GMP compliance rules** to ensure pharma regulatory compliance (21 CFR Part 11, ISO 13485, GxP standards).

All rules are **automatically enforced** by the system. Violations are logged to the immutable audit trail.

---

## Rule 1: Automatic Versioning ✅

**Requirement:** Every change to a requirement must trigger a version update.

### Implementation

```yaml
Change Type: MAJOR (e.g., GxP Relevance or Risk Level changes)
  New Version: X+1.0.0
  Triggered by:
    - gxpRelevance changed (Direct ↔ Indirect ↔ Claim-control ↔ None)
    - riskLevel changed (High ↔ Medium ↔ Low)
    - requirementState changed

Change Type: MINOR (e.g., description or rationale updates)
  New Version: X.Y+1.0
  Triggered by:
    - description changed
    - rationale changed
    - implementationStatus changed

Change Type: PATCH (e.g., typos or formatting)
  New Version: X.Y.Z+1
  Triggered by:
    - minor wording changes
    - metadata updates
```

### Compliance Verification

- ✅ Version number always increases
- ✅ Document version = max(requirement_versions)
- ✅ Audit trail shows version progression

---

## Rule 2: Change Control ✅

**Requirement:** MAJOR changes require formal Change Control Form (CC-001, CC-002, etc.)

### Implementation

```yaml
MAJOR Changes:
  Required: Change Control Form
  Format: CC-YYYY-NNN (e.g., CC-2026-001)
  Approval Chain:
    - QA Lead (required)
    - Validation Lead (required)
    - Legal/Compliance (required)
  Effect: Document version X+1.0.0

MINOR Changes:
  Required: QA Approval only
  Approval Chain:
    - QA Lead (required)
  Effect: Document version X.Y+1.0
  Auto-Executable: No

PATCH Changes:
  Required: None
  Approval Chain: []
  Effect: Document version X.Y.Z+1
  Auto-Executable: Yes (QA can apply directly)
```

### Compliance Verification

- ✅ CC form exists for all MAJOR changes
- ✅ CC form is formally approved
- ✅ CC form is linked in audit trail
- ✅ MINOR changes require QA approval before applying

---

## Rule 3: Approval Chain ✅

**Requirement:** Multi-level approval workflow ensures comprehensive review.

### Implementation

```yaml
Approval Chain (Sequential):
  Step 1: QA Lead
    Role: Quality Assurance
    Reviews: Technical correctness, completeness
    Can: APPROVE or REJECT
    If REJECT: Requirement returned to author for revision

  Step 2: Validation Lead
    Role: Validation & Testing
    Reviews: Testability, verification strategy
    Can: APPROVE or REJECT
    If REJECT: Requirement returned to author for revision

  Step 3: Legal/Compliance
    Role: Regulatory & Legal
    Reviews: GMP compliance, regulatory alignment
    Can: APPROVE or REJECT
    If REJECT: Requirement returned to author for revision

  Step 4: Signature
    Role: Document Owner / Authority
    Reviews: All prior approvals complete
    Action: Apply digital signature (locks document)
    Effect: Document becomes IMMUTABLE
```

### Status Flow

```
DRAFT → QA PENDING → QA APPROVED → VALIDATION PENDING → VALIDATION APPROVED 
  → LEGAL PENDING → LEGAL APPROVED → SIGNED (LOCKED)
```

### Compliance Verification

- ✅ All approval steps are sequential (not parallel)
- ✅ No step can be skipped
- ✅ Rejection returns requirement to author
- ✅ Approval history is immutable

---

## Rule 4: Digital Signature ✅

**Requirement:** When all approvals are complete, document must be digitally signed.

### Implementation

```yaml
Digital Signature Requirements:
  Trigger: All approval steps must be APPROVED
  
  Signature Components:
    - SHA256 Hash: Calculate over requirement content
      Fields hashed:
        - id
        - version
        - title
        - description
        - rationale
        - gxpRelevance
        - riskLevel
    
    - X.509 Certificate: From trusted authority
      Algorithm: ECDSA or RSA-2048
      Validity: 3 years from signing date
    
    - Timestamp Authority (TSA): External timestamp
      Provider: RFC 3161 compliant TSA
      Effect: Proves creation date
      Server: https://tsa.example.com (configurable)

Signature Validation:
  - Hash verification (content integrity)
  - Certificate validation (expiry, revocation)
  - Timestamp verification (proof of time)
  - Signature value verification (authenticity)

Effect:
  - Document status changes to SIGNED
  - Document becomes READ-ONLY (locked)
  - All fields become immutable
  - Changes require unlock (admin + new approval chain)
```

### Compliance Verification

- ✅ Signature created only after all approvals
- ✅ SHA256 hash is calculated and stored
- ✅ TSA timestamp is obtained
- ✅ Certificate is valid
- ✅ Signature cannot be forged (tied to individual)

---

## Rule 5: Document Locking ✅

**Requirement:** Signed documents become immutable.

### Implementation

```yaml
Lock Mechanism:
  Trigger: When signature is applied
  Effect: Document status = SIGNED
  
  Locked Fields (ALL):
    - id: Cannot change
    - version: Cannot change (creates new version instead)
    - title: Cannot change
    - description: Cannot change
    - rationale: Cannot change
    - gxpRelevance: Cannot change
    - riskLevel: Cannot change
    - requirementState: Cannot change
    - approvals: Cannot modify
    - signature: Cannot remove or modify

  Read Access: All authorized users can read

  Write Access: 
    - PLATFORM_ADMIN can unlock for change control
    - Unlock requires:
      - Reason for unlock
      - New approval chain must restart
      - Audit log entry created
      - New version created upon re-signing

  Exception Handling:
    - If signing failed mid-process: admin can reset and retry
    - If signature expires: document marked as EXPIRED
    - If certificate revoked: document marked as REVOKED
```

### Compliance Verification

- ✅ No edits possible on locked documents
- ✅ Signature cannot be removed
- ✅ Changes require complete re-approval
- ✅ Unlock is audited and tracked

---

## Rule 6: Immutable Audit Trail ✅

**Requirement:** Every action must be logged with timestamp, actor, and changes.

### Implementation

```yaml
Audit Log Entry Fields:
  timestamp: ISO8601 (e.g., 2026-08-25T14:30:00.000Z)
  action: CREATE | READ | UPDATE | DELETE | APPROVE | REJECT | SIGN | ARCHIVE
  actor: User ID (e.g., john.doe@company.com)
  role: User role at time of action (e.g., QA_LEAD)
  
  changes (for UPDATE):
    fieldName:
      old: previous value
      new: new value
  
  ipAddress: Source IP address
  userAgent: Browser/client information
  sessionId: Session identifier
  reason: Why this action was taken
  
  immutable: boolean (always true for audit logs)
  verificationHash: SHA256 hash for immutability verification

Audit Log Retention:
  Active Retention: 3 years
  Archive Retention: 7 years
  Immutable: Cannot be modified or deleted
  Secure Storage: Encrypted with AES-256

Audit Trail Verification:
  - Hash chain verification (each entry hashes previous entry)
  - Timestamp verification (TSA timestamps)
  - No gaps in sequence numbers
```

### Example Audit Trail

```
[2026-08-25 10:00:00] CREATE     | john.doe    | QA_LEAD      | URS-001 created v1.0.0
[2026-08-25 10:15:00] UPDATE     | john.doe    | QA_LEAD      | description updated
[2026-08-25 11:00:00] APPROVE    | jane.smith  | QA_LEAD      | QA approval granted
[2026-08-25 11:30:00] APPROVE    | bob.jones   | VALIDATION   | Validation approval granted
[2026-08-25 12:00:00] APPROVE    | legal.team  | LEGAL        | Legal approval granted
[2026-08-25 12:30:00] SIGN       | admin       | ADMIN        | Document signed, locked
```

### Compliance Verification

- ✅ Every action is logged
- ✅ Audit logs cannot be modified or deleted
- ✅ Timestamps are from trusted TSA
- ✅ Actor is authenticated user
- ✅ Complete change history available

---

## Rule 7: Document Integrity ✅

**Requirement:** Verify document content hasn't changed.

### Implementation

```yaml
Integrity Mechanisms:
  
  1. SHA256 Hash
     - Algorithm: SHA256
     - Input: Requirement content (id, version, title, description, rationale, gxpRelevance, riskLevel)
     - Output: 64-character hex string
     - Verification: Recalculate hash on access, compare to stored hash
     - If mismatch: Document marked as CORRUPTED, access blocked
  
  2. Timestamp Authority (TSA)
     - Proves document was created/signed at specific time
     - Cannot forge creation date
     - RFC 3161 compliant
     - Time source: NTP-synchronized server
  
  3. Backup Verification
     - Minimum 3 backup copies maintained
     - Daily integrity verification
     - Backup locations: Primary, Secondary, Offsite
     - Cross-verify hash against all backups
     - If corruption detected in one copy: restore from another

Hash Storage:
  - Stored with document metadata
  - Also stored in audit trail
  - Also stored in each backup copy
  
Hash Verification:
  - Automatic on document access
  - Automatic on download/export
  - Manual verification available in UI
  - Batch verification available in admin tools
```

### Compliance Verification

- ✅ SHA256 hash calculated and stored
- ✅ Hash verified on every access
- ✅ TSA timestamp proves creation date
- ✅ Multiple backup copies maintained
- ✅ Integrity verification logs created

---

## Rule 8: Retention & Archiving ✅

**Requirement:** Document lifecycle management with regulatory compliance.

### Implementation

```yaml
Document Lifecycle:

  Phase 1: ACTIVE (0-3 years from signature)
    Status: ACTIVE
    Access: Full read/write (if not locked)
    Location: Primary storage
    Retention: 3 years from signature date
    Action at end of phase: Archive
    Searchable: Yes
    Downloadable: Yes

  Phase 2: ARCHIVE (3-7 years from signature)
    Status: ARCHIVED
    Access: Read-only (no editing)
    Location: Archive storage (separate system)
    Retention: 7 years from signature date
    Action at end of phase: Secure delete
    Searchable: Yes (limited)
    Downloadable: Yes (audit logged)

  Phase 3: DISPOSAL (after 7 years)
    Status: DISPOSED
    Action: Secure deletion (DOD 5220.22-M standard)
    Verification: Certificate of destruction generated
    Audit Trail: Immutable record of disposal

Automatic Lifecycle Management:
  - Document status updated automatically on schedule
  - Retention dates calculated from signature date
  - Archival and disposal happen automatically
  - Manual overrides available for admin + approval
  - No data loss (backup maintained during disposal)
```

### Compliance Verification

- ✅ Active retention: 3 years
- ✅ Archive retention: 7 years (after active)
- ✅ Automatic lifecycle transitions
- ✅ Secure deletion of expired documents
- ✅ Certificate of destruction generated

---

## Rule 9: Traceability Matrix ✅

**Requirement:** Every requirement must map to design, implementation, and tests (URS → SYS → TDS → Tests).

### Implementation

```yaml
Traceability Mapping:

  URS (User Requirements Specification)
    └── SYS (System Requirements)
          └── TDS (Technical Design Specification)
                └── TEST (Test Cases)

  Example:
    URS-001 "System shall support MQTT connections"
    ├── SYS-001 "Backend API shall accept MQTT clients"
    ├── TDS-001 "Implement MQTT broker integration"
    └── TEST-001 "Verify MQTT client connects and authenticates"

Traceability Validation Rules:
  - Every URS must have at least one SYS mapping (1:1 or 1:n)
  - Every SYS must have at least one TDS mapping
  - Every TDS must have at least one TEST case
  - Reverse traceability: Every TEST must link back to TDS, SYS, URS
  - No orphaned requirements at any level

Traceability Matrix Document:
  - Generated automatically when publishing URS
  - Contains forward mapping (URS → Tests)
  - Contains reverse mapping (Tests → URS)
  - Includes coverage percentage
  - Includes gap analysis
  - Updated on every requirement change

Validation on Publish:
  - All mappings must be complete
  - No missing links in chain
  - Coverage must meet threshold (e.g., 100%)
  - If incomplete: Publish blocked, warnings shown
```

### Compliance Verification

- ✅ Traceability matrix generated
- ✅ No orphaned requirements
- ✅ Forward mapping complete
- ✅ Reverse mapping complete
- ✅ Coverage analysis included

---

## Rule 10: Access Control (RBAC) ✅

**Requirement:** Only authorized users can view/edit requirements based on role.

### Implementation

```yaml
Role Definitions:

  QA_LEAD (Quality Assurance Lead)
    Permissions:
      - view: All requirements
      - create: New requirements
      - edit: Own requirements (before approval)
      - edit: Requirements submitted to them
      - approve: Requirements as QA (step 1)
      - reject: Requirements as QA
      - export: Requirements they can view
      - cannotSign: Cannot apply digital signature
      - cannotArchive: Cannot archive

  VALIDATION_LEAD (Validation Manager)
    Permissions:
      - view: All requirements
      - view: QA-approved requirements
      - approve: Requirements as Validation (step 2)
      - reject: Requirements in their step
      - export: Requirements they can view
      - cannotEdit: Cannot edit requirements
      - cannotSign: Cannot apply digital signature

  LEGAL (Legal/Compliance)
    Permissions:
      - view: All requirements
      - approve: Requirements as Legal (step 3)
      - reject: Requirements in their step
      - cannotCreate: Cannot create new requirements
      - cannotEdit: Cannot edit requirements
      - cannotSign: Cannot apply digital signature

  SIGNATURE (Document Authority)
    Permissions:
      - view: All approved requirements
      - sign: Apply digital signature (step 4)
      - archive: Archive signed documents
      - unlock: Unlock signed documents (with approval)
      - cannotEdit: Cannot edit requirements
      - cannotApprove: Cannot approve in other roles

  DEVELOPER (Developer)
    Permissions:
      - view: Approved and signed requirements only
      - cannotEdit: Cannot edit any requirements
      - cannotApprove: Cannot approve
      - export: Requirements they can view

  PLATFORM_ADMIN (Administrator)
    Permissions:
      - view: All requirements (including archived)
      - edit: All requirements
      - approve: Any step (override)
      - sign: All documents
      - archive: All documents
      - unlock: All documents
      - delete: All documents (with audit trail)
      - viewAuditTrail: Full audit trail
      - viewSignatures: All signatures
      - emergency: Override approval chain (logged)

Access Control Enforcement:
  - Check role on every API call
  - Check step in approval chain before allowing action
  - Check document status (locked = no edits)
  - Check document state (archived = read-only)
  - Log all access attempts (successful and failed)
  - Deny by default (only allow if rule explicitly permits)
```

### Compliance Verification

- ✅ User role verified on every action
- ✅ Permission rules enforced by system
- ✅ Access control enforced at API level
- ✅ Unauthorized access attempts logged
- ✅ RBAC prevents privilege escalation

---

## Summary: GMP Compliance Checklist

| Rule | Implementation | Verification | Status |
|------|---|---|---|
| 1. Versioning | Automatic on change | Version format correct | ✅ |
| 2. Change Control | CC form required for MAJOR | CC-YYYY-NNN linked | ✅ |
| 3. Approval Chain | QA → Validation → Legal → Sign | All steps completed | ✅ |
| 4. Digital Signature | SHA256 + X.509 + TSA | Signature valid & verified | ✅ |
| 5. Document Locking | Status = SIGNED → read-only | Cannot edit locked docs | ✅ |
| 6. Audit Trail | Log all actions with timestamp | Immutable, TSA-stamped | ✅ |
| 7. Integrity | SHA256 hash + backups | Hash verification on access | ✅ |
| 8. Retention | 3 years active + 7 years archive | Automatic lifecycle mgmt | ✅ |
| 9. Traceability | URS → SYS → TDS → Tests | Matrix generated & checked | ✅ |
| 10. Access Control | RBAC enforcement | Role-based permissions | ✅ |

---

## Key Regulatory References

- **21 CFR Part 11** — Electronic Records & Signatures
- **ISO 13485** — Medical Device Quality Management
- **GxP Guidelines** — Good Manufacturing Practice
- **RFC 3161** — Timestamp Authority Protocol
- **FIPS 180-4** — Secure Hash Standards

---

## Configuration

See `validation-rules.yaml` for detailed configuration of all rules.

```bash
# Validate compliance rules are loaded correctly
npm run validate:compliance

# Generate compliance report
npm run report:compliance

# Audit all documents
npm run audit:all
```

---

## Contact

**Validation Manager Team**  
Email: validation@pharma-data-factory.com  
Support: Backstage Plugin System

**Document Control**  
Version: 1.0.0  
Last Updated: 2026-08-25  
Next Review: 2027-08-25
