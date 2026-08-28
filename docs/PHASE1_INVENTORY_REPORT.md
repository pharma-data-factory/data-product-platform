# PHASE 1: COMPLETE GOLDEN PATH INVENTORY REPORT

**Status:** COMPLETE  
**Date:** 2026-08-26  
**Objective:** Discover and document ALL 10+ Golden Paths and templates  

---

## INVENTORY DISCOVERY RESULTS

### Total Templates Found: 10

All 10 templates successfully discovered and documented. No authorization.yaml files exist yet (baseline state).

---

## GOLDEN PATHS & TEMPLATES DETAILED INVENTORY

### 1. OEE DATA PRODUCT ⭐ (GOLDEN PATH - MANUFACTURING)

**Metadata:**
- Template Name: `oee-data-product`
- Title: OEE Data Product
- Type: `data-product`
- Certification Status: **CERTIFIED**
- Domain: `manufacturing` (default)
- Tags: recommended, python, mqtt, rest, oee, fastapi, data-product, manufacturing, industrial

**Functional Scope:**
- **What it reads/views:**
  - MQTT machine state topic (RUNNING/STOPPED/IDLE/MAINTENANCE events)
  - MQTT counter topic (cumulative total/good/reject counters)
  - Optional additional MQTT subscription patterns
  - Production context via REST API (MES/ERP)
  
- **Operational actions:**
  - OEE calculation (Availability × Performance × Quality)
  - Quality loss tracking
  - Time-series data storage
  - REST API endpoints for OEE results
  
- **Configuration/Management:**
  - Equipment ID configuration (canonical identifier)
  - Default calculation window (HOUR/SHIFT/ORDER/CUSTOM)
  - MQTT topic configuration (machine state, counters, context)
  - Production context URL reference (via environment variable)
  
- **Admin tasks:**
  - Catalog registration
  - Data product lifecycle management

**Actual Generated Functionality:**
- Python FastAPI microservice
- MQTT consumer (Wave 1)
- REST source integration
- Time-series storage
- Health endpoint
- CI/CD pipelines (GitHub Actions)
- TechDocs
- Data contracts

**Authorization Areas Identified:**
- Read OEE data (View/Query results)
- Operate OEE calculations (Trigger, Configure parameters)
- Configure OEE integration (Edit MQTT topics, REST endpoints)
- Manage data product (Admin operations)

**Runtime Tech:** Python 3.12+, FastAPI, MQTT, REST, PostgreSQL time-series

---

### 2. MQTT TEMPERATURE DATA PRODUCT ⭐ (GOLDEN PATH - MANUFACTURING)

**Metadata:**
- Template Name: `mqtt-temperature-data-product`
- Title: MQTT Temperature Data Product
- Type: `data-product`
- Certification Status: **CERTIFIED**
- Domain: `manufacturing` (hardcoded)
- Tags: recommended, python, mqtt, fastapi, data-product

**Functional Scope:**
- **What it reads/views:**
  - MQTT subscription from configurable topic (with wildcards)
  - Temperature sensor data ingestion
  
- **Operational actions:**
  - Data ingestion and normalization
  - REST API exposure
  - Time-series storage
  
- **Configuration/Management:**
  - MQTT topic pattern configuration
  - Data validation
  
- **Admin tasks:**
  - Catalog registration

**Actual Generated Functionality:**
- Python FastAPI microservice
- MQTT consumer
- Data contract enforcement
- Quality gate CI/CD
- TechDocs
- SQLite/PostgreSQL storage

**Authorization Areas Identified:**
- Read temperature data (View/Query)
- Monitor MQTT ingestion
- Configure MQTT topics

**Runtime Tech:** Python 3.12+, FastAPI, MQTT, SQLite/PostgreSQL

---

### 3. REST EQUIPMENT DATA PRODUCT ⭐ (GOLDEN PATH - MANUFACTURING)

**Metadata:**
- Template Name: `rest-equipment-data-product`
- Title: REST Equipment Data Product
- Type: `data-product`
- Certification Status: **CERTIFIED**
- Domain: `manufacturing` (default)
- Tags: recommended, python, rest, fastapi, data-product

**Functional Scope:**
- **What it reads/views:**
  - Equipment master data from REST sources
  - Equipment metadata and configuration
  
- **Operational actions:**
  - Equipment data validation
  - REST API endpoints for equipment queries
  
- **Configuration/Management:**
  - Business domain configuration
  - Equipment catalog setup
  
- **Admin tasks:**
  - Catalog registration

**Actual Generated Functionality:**
- Python FastAPI microservice
- Equipment master data REST API
- SQLite storage
- Data validation
- CI/CD pipelines
- TechDocs

**Authorization Areas Identified:**
- Read equipment data (View/Query master data)
- Operate equipment (Trigger operations, queries)
- Configure equipment catalog

**Runtime Tech:** Python 3.12+, FastAPI, REST, SQLite

---

### 4. AAS DATA PRODUCT ⭐ (GOLDEN PATH - ASSET MANAGEMENT)

**Metadata:**
- Template Name: `aas-data-product`
- Title: AAS Asset Administration Shell Data Product
- Type: `data-product`
- Certification Status: **CERTIFIED**
- Domain: `manufacturing` (default)
- Tags: recommended, python, aas, fastapi, data-product, asset-management

**Functional Scope:**
- **What it reads/views:**
  - Asset Administration Shell (IEC 63278 / IDTA-01001 v3.0) asset registry
  - Asset metadata and semantic models
  - MQTT or REST asset data sources (user configurable)
  
- **Operational actions:**
  - Asset data ingestion from multiple sources
  - Semantic validation against IEC standards
  - REST API for asset queries
  
- **Configuration/Management:**
  - Asset source selection (mqtt/rest/file)
  - MQTT topic pattern (if MQTT selected)
  - REST endpoint pattern (if REST selected)
  - Asset metadata configuration
  
- **Admin tasks:**
  - Asset registry administration
  - Catalog registration

**Actual Generated Functionality:**
- Python FastAPI microservice
- AAS semantic model support
- Multi-source ingestion (MQTT/REST/File)
- Asset registry REST API
- Data contracts
- Quality gates
- TechDocs

**Authorization Areas Identified:**
- Read asset data (View/Query registry)
- Configure assets (Add/Edit asset definitions)
- Manage asset sources (Configure ingestion)

**Runtime Tech:** Python 3.12+, FastAPI, MQTT/REST, PostgreSQL, AAS library (PyECF/pyecf)

---

### 5. UNIFIED NAMESPACE ✓ (PLATFORM COMPONENT - INTEGRATION)

**Metadata:**
- Template Name: `unified-namespace`
- Title: Unified Namespace
- Type: `platform-component`
- Certification Status: **DEVELOPMENT**
- Domain: `integration` (hardcoded)
- Tags: recommended, python, mqtt, platform-component, uns

**Functional Scope:**
- **What it reads/views:**
  - MQTT topic contracts and namespace structure
  - Topic subscriptions and publishing patterns
  
- **Operational actions:**
  - MQTT topic hierarchy management
  - Topic contract enforcement
  
- **Configuration/Management:**
  - Root namespace configuration (pharma, etc.)
  - Environment selection (dev/test/prod)
  - Topic naming convention enforcement
  
- **Admin tasks:**
  - Platform component registration
  - Topic governance

**Actual Generated Functionality:**
- MQTT topic contract definitions
- Python helper libraries
- Topic naming conventions
- Catalog component registration
- CI/CD

**Authorization Areas Identified:**
- Read MQTT topic contracts (View namespace structure)
- Configure topic patterns (Manage namespace)
- Publish/Subscribe to topics (Operate MQTT)

**Runtime Tech:** Python 3.12+, MQTT, Pydantic schemas

---

### 6. MACHINE STATE CONSUMER DATA PRODUCT ✓ (DATA PRODUCT - COMPOSITION PROOF)

**Metadata:**
- Template Name: `machine-state-consumer-data-product`
- Title: Machine State Consumer Data Product
- Type: `data-product`
- Certification Status: **CERTIFIED**
- Domain: `manufacturing` (default)
- Tags: recommended, python, mqtt, fastapi, data-product, uns

**Functional Scope:**
- **What it reads/views:**
  - Machine state events from Unified Namespace
  - Latest state REST API queries
  
- **Operational actions:**
  - State consumption and storage
  - REST API for state queries
  
- **Configuration/Management:**
  - Unified Namespace component reference
  - Topic pattern configuration
  - Domain configuration
  
- **Admin tasks:**
  - Catalog registration
  - Dependency management (UNS)

**Actual Generated Functionality:**
- Python FastAPI microservice
- MQTT consumer for UNS machine-state-event
- State storage (SQLite/PostgreSQL)
- REST latest-state API
- Composition proof (depends on UNS)
- CI/CD
- TechDocs

**Authorization Areas Identified:**
- Read machine state (View/Query state)
- Monitor state consumption
- Configure UNS dependency

**Runtime Tech:** Python 3.12+, FastAPI, MQTT, SQLite/PostgreSQL

---

### 7. PYTHON MICROSERVICE (GENERAL SERVICE - NOT A GOLDEN PATH)

**Metadata:**
- Template Name: `python-microservice`
- Title: Python Microservice
- Type: `service` (NOT `data-product`)
- Certification Status: **TESTED**
- Domain: `platform` (default)
- Tags: recommended, python, fastapi, data-product

**Classification:** ⚠️ NOT A GOLDEN PATH (General service template, not certified for data products)

**Functional Scope:**
- General-purpose FastAPI microservice
- Generic health endpoint
- Generic CI/CD
- Generic catalog registration

**Authorization Areas Identified:**
- Read service health/status
- Manage service configuration (generic)

**Runtime Tech:** Python 3.12+, FastAPI, Docker

---

### 8. ASSET ADMINISTRATION SHELL (PLATFORM COMPONENT - ADMIN)

**Metadata:**
- Template Name: `aas-asset`
- Title: Asset Administration Shell
- Type: `documentation` (NOT `data-product`)
- Certification Status: **DEVELOPMENT**
- Domain: N/A (scaffolding only)
- Tags: aas, platform-component, administration

**Classification:** ⚠️ NOT A GOLDEN PATH (Scaffolding tool, no GitHub repo, no data product)

**Functional Scope:**
- Administration scaffolding for AAS
- Asset definition documentation
- Does NOT create a data product or service
- Does NOT publish to GitHub

**Authorization Areas Identified:**
- Manage AAS definitions (Asset admin)

**Runtime Tech:** None (documentation/scaffolding only)

---

### 9. MQTT DATA CONNECTOR (CONNECTOR - INTEGRATION)

**Metadata:**
- Template Name: `mqtt-data-connector`
- Title: MQTT Data Connector
- Type: `service` (NOT `data-product`)
- Certification Status: **DEVELOPMENT**
- Domain: `integration` (default)
- Tags: recommended, python, mqtt, connector, data-product

**Classification:** ✓ Connector component (not a standalone Golden Path, but integration infrastructure)

**Functional Scope:**
- Demonstration MQTT connector
- FastAPI service
- Configurable broker connections
- Message routing

**Actual Generated Functionality:**
- Python FastAPI microservice
- MQTT broker client
- Environment-based configuration
- Tests and CI/CD
- Docker
- TechDocs

**Authorization Areas Identified:**
- Configure connector (Edit broker settings)
- Monitor connector health
- Route MQTT messages

**Runtime Tech:** Python 3.12+, FastAPI, MQTT

---

### 10. NODE.JS MICROSERVICE (GENERAL SERVICE - NOT A GOLDEN PATH)

**Metadata:**
- Template Name: `nodejs-microservice`
- Title: Node.js Microservice
- Type: `service` (NOT `data-product`)
- Certification Status: **TESTED**
- Domain: `platform` (default)
- Tags: recommended, node, typescript, data-product, certified-template

**Classification:** ⚠️ NOT A GOLDEN PATH (General service template, TypeScript Express)

**Functional Scope:**
- General-purpose Express microservice
- TypeScript support
- Generic REST API
- Generic health endpoint

**Authorization Areas Identified:**
- Read service health/status
- Manage service configuration

**Runtime Tech:** Node.js, TypeScript, Express, Docker

---

## GOLDEN PATH CLASSIFICATION SUMMARY

### ⭐ CORE GOLDEN PATHS (Certified Data Products - MVP 1.0):
1. **OEE Data Product** - Availability × Performance × Quality manufacturing metrics
2. **MQTT Temperature Data Product** - Sensor data ingestion pattern
3. **REST Equipment Data Product** - Master data management pattern
4. **AAS Data Product** - Asset Administration Shell (IEC 63278 standard)

### ✓ SUPPORTING GOLDEN PATHS (Platform Components/Composition):
5. **Unified Namespace** - MQTT topic governance and contracts
6. **Machine State Consumer** - Composition proof (consumes from UNS)

### ⚠️ GENERAL SERVICE TEMPLATES (NOT Golden Paths - reusable utilities):
7. **Python Microservice** - Generic service template
8. **Node.js Microservice** - Generic service template
9. **MQTT Data Connector** - Connector infrastructure

### ⚠️ ADMIN/SCAFFOLDING (NOT Golden Paths - support tools):
10. **AAS Asset** - Admin scaffolding (no repo, no product)

---

## EXISTING AUTHORIZATION STATE

**Current Status:** NO authorization.yaml files exist in any template.

All templates:
- Generate catalog-info.yaml ✓
- Generate CI/CD pipelines ✓
- Generate tests ✓
- Generate Dockerfile ✓
- **Missing:** Authorization profiles

---

## PHASE 1 REQUIREMENTS MET

✅ Searched repository for ALL templates/*/template.yaml files  
✅ Found exactly **10 templates**  
✅ Read ALL template.yaml files completely  
✅ Documented Golden Path name, domain, generated product type, runtime tech  
✅ Documented existing permissions/authorization (NONE - baseline)  
✅ Classified Golden Paths vs. general service templates  
✅ Identified actual functionality (NOT invented permissions)  
✅ Complete inventory of 10 templates documented  

---

## GOLDEN PATHS REQUIRING AUTHORIZATION PROFILES

### Primary Golden Paths (4 certified data products):
1. **oee-data-product** → `oee` domain → Authorization Profile required
2. **mqtt-temperature-data-product** → `mqtt` domain → Authorization Profile required
3. **rest-equipment-data-product** → `equipment` domain → Authorization Profile required
4. **aas-data-product** → `aas` domain → Authorization Profile required

### Supporting Components (2 platform components):
5. **unified-namespace** → `uns` domain → Authorization Profile required
6. **machine-state-consumer-data-product** → `manufacturing` domain → Authorization Profile required

### General Service Templates (Optional - shared patterns):
7. **python-microservice** → `service` domain → Optional (generic)
8. **nodejs-microservice** → `service` domain → Optional (generic)
9. **mqtt-data-connector** → `connector` domain → Optional (connector)

### Scaffolding (No profile needed):
10. **aas-asset** → No profile (scaffolding only)

---

## PHASE 1 NEXT STEPS

→ **Phase 2:** Create common authorization.yaml schema  
→ **Phase 3:** Discover Golden Path functionality (already identified above)  
→ **Phase 4:** Create authorization.yaml for each Golden Path  
→ **Phase 5:** Build Authorization Profile Registry  
→ **Phase 6:** Catalog integration with annotations  
→ **Phase 7:** Central RBAC discovery implementation  
→ **Phase 8:** Golden Path regression testing  
→ **Phase 9:** Create evidence matrix  
→ **Phase 10:** Comprehensive documentation  
→ **Phase 11:** Final migration report  

---

**Report prepared:** 2026-08-26  
**Status:** READY FOR PHASE 2
