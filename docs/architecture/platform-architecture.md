# Platform Architecture

**Version**: 1.0  
**Status**: BASELINE  
**Last Updated**: 2026-08-25  

---

## Overview

The Pharma Data Factory is a Backstage-based Internal Developer Platform (IDP) for pharmaceutical manufacturing data integration, requirement management, and solution composition.

The platform separates concerns into layers:

1. **Experience Layer** — User-facing plugins and navigation
2. **Pharma Engineering Layer** — Domain-specific capabilities
3. **Platform Services Layer** — Backstage core and standard plugins
4. **Data & Persistence Layer** — PostgreSQL, Git, Catalog

---

## Layered Architecture

```
┌────────────────────────────────────────────────────────────┐
│  EXPERIENCE LAYER                                          │
│                                                            │
│  Home │ Marketplace │ Factory │ Model Company │ Developer │
│  Portal │ Releases │ Identity │ Platform │ Theme          │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  PHARMA ENGINEERING LAYER                                  │
│                                                            │
│  URS Composer         Solution Composer    Validation      │
│  ├─ Requirements      ├─ Components        Expert          │
│  ├─ Baselines         ├─ Data Products     ├─ Risk         │
│  ├─ Approval          ├─ Connectors        ├─ Tests        │
│  └─ Traceability      └─ Marketplace       └─ Evidence     │
│                                                            │
│  Nexora Plugin Suite                                       │
│  ├─ Assets (AAS)      ├─ Contracts        ├─ Quality      │
│                                                            │
│  Plugin Directory                                          │
│  ├─ Discovery        ├─ Installation      ├─ Governance   │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  PLATFORM SERVICES LAYER                                   │
│  (Backstage Core + Official Plugins)                       │
│                                                            │
│  Catalog               Search              TechDocs        │
│  Scaffolder (Create)   Permissions         Auth            │
│  API Registry          Graph Relations     Events          │
│  Notifications         Signals             Proxy           │
│                                                            │
├────────────────────────────────────────────────────────────┤
│  DATA & PERSISTENCE LAYER                                  │
│                                                            │
│  PostgreSQL            Git Repositories    Backstage       │
│  (Operational State)   (Engineering        Catalog         │
│                        Artifacts)          (Entities)      │
│                                                            │
│  Audit Events (PostgreSQL)                                 │
│  Engineering Documentation (Git / TechDocs)               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Experience Layer

Provides the user interface and navigation for different personas and workflows.

| Component | Purpose | Implementation |
|-----------|---------|-----------------|
| Home | Public landing page for unauthenticated visitors | Custom module |
| Marketplace | Technical discovery and installation of Data Products | `plugin-marketplace` |
| Factory | Model Company visualization and simulation | `plugin-model-company` |
| Developer Portal | Authenticated developer starting point | Custom module (`developerHubModule`) |
| Platform Components | Reusable library of composition building blocks | Custom module |
| Architecture | Platform architecture visualization | Custom module (`architectureModule`) |
| Releases | Release notes and versioning history | Custom module |
| Create | Golden Path wizard for new products | Custom module + Scaffolder |
| Entitlements | Commercial edition and feature gating | Custom module |

---

## Pharma Engineering Layer

Domain-specific plugins implementing pharmaceutical engineering capabilities.

### URS Composer

**Purpose**: Requirement management with business capability traceability  
**Status**: IMPLEMENTED (P0 in-memory), PROPOSED (P1A PostgreSQL)  
**Backend**: `plugin-urs-composer-backend`  
**Frontend**: `plugin-urs-composer`  

**Key Features**:
- Business Capability anchor
- Business Need tracking
- Requirement versioning (P1A planned)
- Immutable approved baselines (P1A planned)
- Configurable approval workflows (P1A planned)
- Append-only audit trail
- Quality checks
- Traceability

**Persistence**: In-memory P0 → PostgreSQL P1A  
**APIs**: `/api/urs-composer/*`  
**Permissions**: `urs.read`, `urs.create`, `urs.manage`, `urs.approve`, `urs.admin`

### Solution Composer

**Purpose**: Solution design and component composition  
**Status**: CONCEPTUAL  
**Backend**: TBD  
**Frontend**: TBD  

**Key Concepts**:
- Maps URS requirements to engineering solutions
- Manages component selection and configuration
- Links to Data Products and Golden Paths
- Tracks solution-to-requirement traceability
- Supports solution versioning

**Planned Integration**: Catalog Components, Data Products, Platform Components

### Validation Expert

**Purpose**: Risk assessment, test planning, and evidence tracking  
**Status**: PARTIALLY IMPLEMENTED  
**Backend**: `plugin-validation-expert-backend`  
**Frontend**: `plugin-validation-expert`  

**Key Features**:
- Risk identification from requirements
- Test case linking to URS
- Evidence collection
- Validation status tracking
- Future: Change impact analysis

**Integration Seam**: Receives approved URS baselines from URS Composer

### Nexora Industrial Plugin Suite

**Purpose**: Data integration and industrial asset management  
**Status**: PARTIALLY IMPLEMENTED  

**Components**:

| Component | Purpose | Status |
|-----------|---------|--------|
| **nexora-backend** | Core service coordination | DEVELOPMENT |
| **nexora-assets** | AAS-based asset registry | CERTIFIED |
| **nexora-contracts** | Data contract management | DEVELOPMENT |
| **nexora-quality** | Quality & compliance tracking | DEVELOPMENT |
| **nexora-common** | Shared utilities and types | DEVELOPMENT |

**Key Concepts**:
- Asset Administration Shell (AAS) support
- Industrial protocol handling (MQTT, REST, OPC UA planned)
- Data contract definitions
- Quality gate integration

### Plugin Directory

**Purpose**: Discovery, installation, and lifecycle management of plugins  
**Status**: PARTIALLY IMPLEMENTED  
**Backend**: `plugin-directory-backend`  
**Frontend**: `plugin-directory`  

**Key Features**:
- Plugin catalog
- Installation workflow
- Dependency resolution (planned)
- Governance policies (planned)

### Model Company

**Purpose**: Reference implementation and simulation of pharmaceutical manufacturing  
**Status**: IMPLEMENTED  
**Backend**: `plugin-model-company-backend`  
**Frontend**: `plugin-model-company`  

**Key Features**:
- Factory visualization
- Material flow simulation
- Order/batch management
- Equipment state simulation
- Integration point for testing Data Products

### Validation Manager

**Purpose**: Legacy approval workflow and compliance documentation  
**Status**: PARTIALLY IMPLEMENTED (being superseded by URS Composer)  
**Backend**: `plugin-validation-manager-backend`  
**Frontend**: `plugin-validation-manager`  

**Status**: IMPLEMENTED features being migrated to URS Composer P1A

---

## Platform Services Layer

Official Backstage plugins providing core platform capabilities.

| Service | Purpose | Usage |
|---------|---------|-------|
| **Catalog** | Entity registry (Components, Systems, Resources, APIs, Data Products) | Authoritative platform entities |
| **Scaffolder** | Template-driven code generation for Golden Paths | Create workflow |
| **TechDocs** | Markdown-based documentation hosting | Developer Hub, API docs |
| **Search** | Full-text search across platform | Global search |
| **Auth** | Authentication (GitHub OAuth + Guest) | Identity provider |
| **Permissions** | Permission framework and policy enforcement | Authorization |
| **Events** | Event bus for async operations | Notifications, integrations |
| **Signals** | Bi-directional communication | Real-time updates (planned) |
| **API Registry** | OpenAPI/AsyncAPI hosting | Contract management |
| **Graph** | Catalog entity relationships | Topology visualization |

---

## Data & Persistence Layer

Responsibility assignment for different persistence mechanisms.

| Information | System of Record | Reason |
|-------------|-----------------|--------|
| **Operational State** | PostgreSQL | Transactional state, audit history |
| **Approved URS Baselines** | PostgreSQL + Git export | Controlled version, immutability |
| **Engineering Artifacts** | Git | Source control, versioning |
| **Platform Entities** | Backstage Catalog | Entity relationships, topology |
| **Entity Relationships** | Catalog relations | Traceability, provenance |
| **Documentation** | Git / TechDocs | Docs-as-code, searchable |
| **Audit Events** | PostgreSQL (append-only) | Compliance, history |
| **API Contracts** | Catalog (API entities) | Source of truth for contracts |

### PostgreSQL Operational Persistence

**Stores**:
- URS data (requirements, versions, baselines)
- Approval workflows and instances
- Audit events
- Business capabilities
- Validation Evidence (planned)

**Design Principles**:
- Optimistic concurrency control (revision field)
- Append-only audit table
- Transactional integrity for multi-step operations
- Backwards compatibility maintained (in-memory P0 layer remains functional)

### Git for Engineering Artifacts

**Stores**:
- Generated Data Product source code
- Software templates (Golden Paths)
- Engineering documentation
- Configuration as code

**Design Principles**:
- Single source of truth for code
- Complete audit trail via Git history
- Decoupled from platform (Data Products run independently)

### Backstage Catalog

**Stores**:
- Software components
- Data Products
- APIs (as contracts)
- Platform components
- Systems
- Resources

**Design Principles**:
- Entity topology (relationships)
- Annotations for metadata
- Certification overlay (custom annotation)
- Relations for traceability

---

## Component Interaction

### Request Flow

```
Developer
   │
   ▼
Frontend (React)
   │ API call
   ▼
Backstage Backend Router
   │ Authorization
   ├─ Permission Framework (check)
   │ Routing
   ├─ Custom plugin handler
   │ Business logic
   ├─ Service layer
   │ Data access
   ├─ PostgreSQL Repository OR In-memory Repository (P0)
   │
   ▼ Data access
PostgreSQL / In-memory storage
   │
   ▼
Audit Trail (recorded)
   │
   ▼
Response → Frontend
```

### Async Workflows

```
Long-running operation
   │ (e.g., Create Data Product)
   │
   ├─ Scaffolder template execution
   │  └─ GitHub repo creation
   │
   ├─ GitHub Actions CI trigger
   │  └─ Build, test, publish
   │
   └─ Events bus
      ├─ Completion notification
      ├─ Catalog update
      └─ TechDocs publication
```

---

## Plugin Integration Points

### Inter-Plugin Communication

| From | To | Mechanism | Purpose |
|------|-----|-----------|---------|
| URS Composer | Solution Composer | API reference | Traceability |
| Solution Composer | Validation Expert | API reference | Risk linking |
| Validation Expert | URS Composer | API reference | Evidence reference |
| Plugin Directory | Marketplace | Catalog entity | Discoverability |
| Model Company | Data Products | Catalog reference | Testing integration |
| All plugins | Catalog | SDK / API | Entity registration |
| All plugins | Search | Indexing API | Full-text search |
| All plugins | TechDocs | File convention | Auto-publication |

---

## Extension Points

### For Future Integrations

- **Validation Expert Integration**: URS Composer exposes `/api/urs-composer/baselines/:id` for requirement traceability
- **Change Impact Analysis**: Relationship graph supports future impact traversal (P2+)
- **Knowledge Graph**: Relationship model defined (unused in P0, ready for P1+)
- **External SAP/MES Integration**: Plugin Directory architecture supports connectors
- **AI/LLM Requirements**: Extension point in URS Composer (P2+)
- **Electronic Signatures**: Approval workflow architecture supports future integration (P3+)

---

## Technology Stack

- **Frontend**: React 18, Material-UI 4, Backstage frontend API
- **Backend**: Node.js, Express, Backstage backend plugin API
- **Database**: PostgreSQL (P1A) or in-memory (P0)
- **Source Control**: Git (GitHub)
- **CI/CD**: GitHub Actions
- **Container**: Docker, Docker Compose
- **Templating**: Handlebars (Scaffolder)
- **Documentation**: Markdown, TechDocs

---

## Deployment

**Current**: Single Backstage application instance  
**Persistence**: PostgreSQL database + Git repositories + Catalog  
**Generated Artifacts**: Independent Docker containers (Data Products)  

**Upgrade Path**:
- Backstage framework updates: Regular cadence
- Plugin updates: Decoupled from core
- Database schema: Migrations via Flyway or equivalent
- Breaking changes: Requires ADR + documentation update

---

## Governance

### Architecture Decisions

All architectural decisions recorded in ADRs. Statuses:
- ACCEPTED: Decision made, implemented or actively planned
- PROPOSED: Decision drafted, awaiting approval
- DEPRECATED: Replaced by newer decision
- SUPERSEDED: Explicitly replaced by newer ADR

### Change Impact

Changes affecting architecture must:
1. Update relevant documentation
2. Create or update ADR
3. Reference updated documentation in PR
4. Maintain alignment with [Status model](../status-model.md)

---

**See Also**:
- [domain-architecture.md](domain-architecture.md) — Engineering domain responsibilities
- [plugin-architecture.md](plugin-architecture.md) — Custom plugin patterns
- [data-architecture.md](data-architecture.md) — Persistence design
- [adr/README.md](adr/README.md) — Architecture Decision Record index
