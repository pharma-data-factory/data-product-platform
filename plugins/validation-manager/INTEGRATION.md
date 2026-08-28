# Integration Guide — Validation Manager Plugin

Schritt-für-Schritt Integration in Backstage mit Admin Area für URS-Management.

## 1. Installation

### Voraussetzungen

- Backstage 1.16+
- Node.js 18+
- PostgreSQL (für requirements storage)
- React 18+

### Installation der Dependencies

```bash
# Im Workspace root
yarn add @internal/plugin-validation-manager

# Im Backend
cd plugins/validation-manager/backend
yarn install

# Im Frontend
cd ../frontend
yarn install
```

## 2. Konfiguration in `app-config.yaml`

```yaml
# app-config.yaml

validationManager:
  # DMS Integration (Document Management System)
  dms:
    enabled: true
    baseUrl: 'https://dms.example.com'
    apiKey: ${DMS_API_KEY}
    documentFolderPath: '/documents/URS'
    archiveFolderPath: '/archive/URS'
  
  # Digitale Signatur
  signature:
    enabled: true
    certificateFile: ${SIGNATURE_CERT}
    privateKeyFile: ${SIGNATURE_KEY}
    timestampAuthority: 'https://tsa.example.com'
    validityPeriodDays: 1095  # 3 years
  
  # Document Retention
  retention:
    active: '3 years'
    archive: '7 years'
    secureDeletion: true
    deletionMethod: 'DOD-5220.22-M'  # Secure wiping standard
  
  # GMP Compliance
  compliance:
    gmpRules: true
    enforceApprovalChain: true
    enforceChangeControl: true
    auditTrail: true
    traceabilityRequired: true
  
  # Backup & Redundancy
  backup:
    enabled: true
    frequency: 'daily'
    copies: 3
    locations:
      - 'primary'
      - 'secondary'
      - 'offsite'
    encryption: 'AES-256'

# Database für Requirements
backend:
  database:
    validationManager:
      engine: 'postgres'
      connection:
        host: 'localhost'
        port: 5432
        user: 'backstage'
        password: ${DB_PASSWORD}
        database: 'validation_manager'
```

## 3. Backend Integration

### Plugin Registration in `packages/backend/src/index.ts`

```typescript
import { createBackend } from '@backstage/backend-defaults';
import { validationManagerPlugin } from '@internal/plugin-validation-manager/backend';

const backend = createBackend();

// Register Validation Manager plugin
backend.add(validationManagerPlugin());

backend.start();
```

### API Routes

Das Plugin registriert folgende API Routes:

```
GET    /api/validation-manager/requirements               # List all requirements
GET    /api/validation-manager/requirements/:id           # Get single requirement
POST   /api/validation-manager/requirements               # Create new requirement
PATCH  /api/validation-manager/requirements/:id           # Update requirement
POST   /api/validation-manager/requirements/:id/approve   # Approve requirement
POST   /api/validation-manager/requirements/:id/reject    # Reject requirement
POST   /api/validation-manager/requirements/:id/sign      # Digital signature
POST   /api/validation-manager/requirements/:id/archive   # Archive requirement
GET    /api/validation-manager/requirements/:id/history   # Version history
GET    /api/validation-manager/requirements/:id/audit     # Audit trail
GET    /api/validation-manager/requirements/:id/approvals # Approval status

POST   /api/validation-manager/documents/generate         # Generate URS/TDS/Matrix PDF
GET    /api/validation-manager/documents/:id              # Download document

GET    /api/validation-manager/admin/dashboard            # Dashboard stats
GET    /api/validation-manager/admin/compliance-report    # Compliance report
POST   /api/validation-manager/admin/verify-integrity     # Verify integrity
```

## 4. Frontend Integration

### Plugin Registration in `packages/app/src/plugins.ts`

```typescript
import { validationManagerPlugin } from '@internal/plugin-validation-manager';

export const plugins = [
  // ... other plugins
  validationManagerPlugin(),
];
```

### Navigation in `packages/app/src/App.tsx`

```typescript
import { Routes, Route } from 'react-router-dom';
import { ValidationManagerPage } from '@internal/plugin-validation-manager';

export const App = () => (
  <Routes>
    {/* ... other routes */}
    <Route path="/admin/validation" element={<ValidationManagerPage />} />
  </Routes>
);
```

### Add to Sidebar Navigation

```typescript
// In navigation configuration
{
  title: 'Admin',
  icon: FolderIcon,
  children: [
    {
      title: 'Validation Manager',
      description: 'GMP Requirements Management',
      icon: CheckCircleIcon,
      href: '/admin/validation',
      permissions: ['admin:validation:read'],
    },
  ],
}
```

## 5. UI Components

### Validation Dashboard

Der Validation Manager Plugin bietet diese Komponenten:

```typescript
// Main Dashboard
import { ValidationDashboard } from '@internal/plugin-validation-manager';

<ValidationDashboard />

// Requirements List
import { RequirementsPage } from '@internal/plugin-validation-manager';

<RequirementsPage 
  filters={{ gxpRelevance: ['Direct'] }}
  onSelectRequirement={handleSelect}
/>

// Requirement Editor
import { RequirementEditor } from '@internal/plugin-validation-manager';

<RequirementEditor 
  requirement={selectedReq}
  onSave={handleSave}
  userRole="QA_LEAD"
/>

// Approval Chain UI
import { ApprovalChain } from '@internal/plugin-validation-manager';

<ApprovalChain requirement={requirement} />

// Version History
import { VersionHistory } from '@internal/plugin-validation-manager';

<VersionHistory requirementId="URS-001" />

// Document Generator
import { DocumentGenerator } from '@internal/plugin-validation-manager';

<DocumentGenerator 
  requirements={selectedRequirements}
  documentType="URS"
  onGenerate={handleGenerate}
/>
```

## 6. YAML Storage (Structured Database)

Requirements werden als strukturiertes YAML gespeichert:

### `validation/requirements.yaml`

```yaml
requirements:
  - id: URS-001
    version: "1.0.0"
    title: "System shall support MQTT connections"
    description: "The platform must accept MQTT client connections with authentication"
    rationale: "MQTT is a standard protocol for IoT data ingestion in pharma facilities"
    gxpRelevance: "Direct"
    riskLevel: "High"
    businessCriticality: "High"
    requirementState: "BASELINED"
    implementationStatus: "IMPLEMENTED"
    verificationStatus: "PASSED"
    
    # GMP Assessment
    assessment:
      assessedDate: "2026-08-01"
      assessedBy: "john.doe@company.com"
      isDirectGMP: true
      businessCriticalityLevel: "High"
      riskJustification: "MQTT connectivity is critical for data product generation"
      regulatoryReference: "21 CFR Part 11"
    
    # Versioning & Changes
    changeLog:
      - version: "1.0.0"
        date: "2026-08-01"
        change: "Initial baseline"
        changeType: "MAJOR"
        author: "QA Team"
        reason: "Product MVP 1.0 baseline"
    
    # Approvals
    approvals:
      - role: "QA_LEAD"
        status: "APPROVED"
        date: "2026-08-01T10:00:00Z"
      - role: "VALIDATION_LEAD"
        status: "APPROVED"
        date: "2026-08-01T11:00:00Z"
      - role: "LEGAL"
        status: "APPROVED"
        date: "2026-08-01T12:00:00Z"
      - role: "SIGNATURE"
        status: "SIGNED"
        date: "2026-08-01T13:00:00Z"
    
    # Signature
    signature:
      status: "SIGNED"
      hash: "a1b2c3d4e5f6..."
      timestamp: "2026-08-01T13:00:00Z"
      validUntil: "2029-08-01T13:00:00Z"
      certificateId: "CERT-2026-001"
    
    # Document Control
    documentMetadata:
      documentId: "DOC-2026-URS-001"
      createdDate: "2026-08-01T10:00:00Z"
      status: "SIGNED"
      retentionPeriod: "3 years"
      accessControl:
        - "QA_LEAD"
        - "VALIDATION_LEAD"
        - "LEGAL"
        - "PLATFORM_ADMIN"
    
    # Audit Trail
    auditTrail:
      - timestamp: "2026-08-01T10:00:00Z"
        action: "CREATE"
        actor: "john.doe"
        role: "QA_LEAD"
        reason: "Initial requirement creation"
      - timestamp: "2026-08-01T10:30:00Z"
        action: "UPDATE"
        actor: "john.doe"
        role: "QA_LEAD"
        changes:
          description:
            old: "Initial draft"
            new: "The platform must accept MQTT client connections..."
```

## 7. Permission Model

### Backstage Permission Integration

```typescript
// permissions.ts
export const validationManagerPermissions = {
  // Requirements
  requirementCreate: createPermission({
    name: 'validation-manager.requirement.create',
    description: 'Create new requirements',
    attributes: { action: 'create', resource: 'requirement' },
  }),
  requirementRead: createPermission({
    name: 'validation-manager.requirement.read',
    description: 'Read requirements',
    attributes: { action: 'read', resource: 'requirement' },
  }),
  requirementEdit: createPermission({
    name: 'validation-manager.requirement.edit',
    description: 'Edit requirements',
    attributes: { action: 'edit', resource: 'requirement' },
  }),
  requirementApprove: createPermission({
    name: 'validation-manager.requirement.approve',
    description: 'Approve requirements',
    attributes: { action: 'approve', resource: 'requirement' },
  }),
  requirementSign: createPermission({
    name: 'validation-manager.requirement.sign',
    description: 'Digitally sign requirements',
    attributes: { action: 'sign', resource: 'requirement' },
  }),
  
  // Admin
  adminRead: createPermission({
    name: 'validation-manager.admin.read',
    description: 'View admin dashboard',
    attributes: { action: 'read', resource: 'admin' },
  }),
};
```

## 8. Environment Variables

Setzen Sie in `.env`:

```bash
# DMS Integration
DMS_API_KEY=your-dms-api-key

# Digital Signature
SIGNATURE_CERT=/path/to/certificate.pem
SIGNATURE_KEY=/path/to/private-key.pem

# Database
DB_PASSWORD=your-db-password

# TSA (Timestamp Authority)
TSA_URL=https://tsa.example.com
TSA_USER=admin
TSA_PASS=secure-password
```

## 9. Testing & Validation

### Unit Tests

```bash
cd plugins/validation-manager
npm run test
```

### Integration Tests

```bash
# Test approval workflow
npm run test:approval-workflow

# Test document generation
npm run test:document-generation

# Test GMP rules
npm run test:gmp-rules
```

### Compliance Report

```bash
npm run report:compliance
```

## 10. Deployment

### Docker Integration

```dockerfile
# Dockerfile für Validation Manager Backend
FROM node:18-alpine

WORKDIR /app
COPY . .

RUN yarn install --frozen-lockfile
RUN yarn build

EXPOSE 7007

CMD ["node", "packages/backend/dist/index.js"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  postgres-validation:
    image: postgres:15
    environment:
      POSTGRES_DB: validation_manager
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - validation-db:/var/lib/postgresql/data

  backstage-validation:
    build: .
    ports:
      - "3000:3000"
      - "7007:7007"
    depends_on:
      - postgres-validation
    environment:
      DB_PASSWORD: ${DB_PASSWORD}
      DMS_API_KEY: ${DMS_API_KEY}
    volumes:
      - ./plugins/validation-manager:/app/plugins/validation-manager

volumes:
  validation-db:
```

## 11. Monitoring & Auditing

### Logging

```bash
# View audit trail for specific requirement
curl http://localhost:7007/api/validation-manager/requirements/URS-001/audit

# View compliance report
curl http://localhost:7007/api/validation-manager/admin/compliance-report

# Verify document integrity
curl http://localhost:7007/api/validation-manager/admin/verify-integrity
```

### Metrics

Das Plugin exportiert folgende Metriken:

```
validation_manager_requirements_total{state="BASELINED"} = 42
validation_manager_approvals_pending{role="QA_LEAD"} = 5
validation_manager_signatures_valid{status="SIGNED"} = 40
validation_manager_documents_archived{retention="3_years"} = 8
validation_manager_audit_trail_entries_total = 1250
```

## 12. Troubleshooting

### Requirements laden sich nicht

```bash
# Check database connection
SELECT COUNT(*) FROM validation_requirements;

# Validate YAML structure
npm run validate:yaml

# Check permissions
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:7007/api/validation-manager/requirements
```

### Signatur fehlgeschlagen

```bash
# Verify certificate
openssl x509 -in certificate.pem -text -noout

# Check TSA connectivity
curl https://tsa.example.com/tsp

# View signature logs
docker logs backstage-validation | grep "SIGN"
```

---

## Support & Contact

- **Documentation:** `GMP-RULES.md`
- **API Docs:** `/api/validation-manager/swagger`
- **Support:** validation@pharma-data-factory.com
