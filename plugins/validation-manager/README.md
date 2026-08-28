# Validation Manager Plugin

GMP-Compliant Requirements Management Suite für Pharma Data Factory.

## Features

- **Requirements Editor**: Edit URS mit GxP Assessment und Risk Level
- **Auto-Versioning**: Automatische Versionierung bei Änderungen
- **Document Generator**: Generiert URS.md, TDS.md, Traceability Matrix
- **Approval Workflow**: Multi-Level Approval Chain (QA → Validation → Legal → Sign)
- **Digital Signature**: Digitale Signatur mit Audit Trail
- **DMS Integration**: Dokumentenverwaltung mit Archivierung
- **GMP Compliance**: Audit Logs, Change Control, Document Integrity

## GMP Rules Applied

✓ Change Control (CC) für Major/Minor Updates  
✓ Traceability (URS → SYS → TDS → Tests)  
✓ Approval Chain (QA + Validation + Legal + Signature)  
✓ Digital Integrity (Hash + Timestamp Authority)  
✓ Immutable Audit Trail  
✓ Document Retention (3 years + 7 years archive)  
✓ Access Control & RBAC  
✓ Backup & Redundancy  

## Struktur

```
plugins/validation-manager/
├── README.md
├── package.json
├── src/
│   ├── index.tsx                    # Plugin Export
│   ├── Plugin.tsx                   # Plugin Setup
│   ├── routes.tsx                   # Routing
│   ├── theme/
│   │   └── validationTheme.ts       # Pharma Design System
│   ├── pages/
│   │   ├── ValidationDashboard.tsx  # Main Page
│   │   ├── RequirementsPage.tsx     # List + Filter
│   │   ├── RequirementEditor.tsx    # Edit Form
│   │   └── DocumentGenerator.tsx    # PDF Export
│   ├── components/
│   │   ├── RequirementCard.tsx      # Card Component
│   │   ├── GxPAssessmentForm.tsx    # GxP Form
│   │   ├── ApprovalChain.tsx        # Approval UI
│   │   ├── VersionHistory.tsx       # Change Log
│   │   └── AuditTrail.tsx           # Audit UI
│   ├── api/
│   │   ├── useRequirements.ts       # API Hook
│   │   ├── useApproval.ts           # Approval API
│   │   ├── useDocumentGenerator.ts  # Generator API
│   │   └── useDMS.ts                # DMS API
│   ├── services/
│   │   ├── validationService.ts     # Business Logic
│   │   ├── versioningService.ts     # Version Management
│   │   ├── complianceService.ts     # GMP Rules
│   │   ├── documentService.ts       # Document Gen
│   │   └── auditService.ts          # Audit Trail
│   └── types/
│       └── validation.ts             # TypeScript Types
│
├── backend/
│   ├── src/
│   │   ├── index.ts                 # Plugin Registration
│   │   ├── router.ts                # API Routes
│   │   ├── service/
│   │   │   ├── RequirementService.ts
│   │   │   ├── VersioningService.ts
│   │   │   ├── ApprovalService.ts
│   │   │   ├── DocumentService.ts
│   │   │   ├── SignatureService.ts
│   │   │   ├── AuditService.ts
│   │   │   └── ComplianceService.ts
│   │   ├── storage/
│   │   │   ├── YamlStorage.ts       # Load/Save requirements.yaml
│   │   │   └── DMSConnector.ts      # DMS Integration
│   │   ├── models/
│   │   │   ├── Requirement.ts
│   │   │   ├── Approval.ts
│   │   │   ├── Signature.ts
│   │   │   └── AuditLog.ts
│   │   └── utils/
│   │       ├── hashUtils.ts
│   │       ├── versioningRules.ts
│   │       └── complianceRules.ts
│   └── package.json
│
└── validation-rules.yaml            # GMP Configuration
```

## Installation

```bash
yarn add @internal/plugin-validation-manager
```

## Configuration

In `app-config.yaml`:

```yaml
validationManager:
  dms:
    enabled: true
    baseUrl: 'https://dms.example.com'
    apiKey: ${DMS_API_KEY}
  
  signature:
    enabled: true
    certificateFile: ${SIGNATURE_CERT}
    timestampAuthority: 'https://tsa.example.com'
  
  retention:
    active: '3 years'
    archive: '7 years'
  
  compliance:
    gmpRules: true
    auditTrail: true
    changeControl: true
```
