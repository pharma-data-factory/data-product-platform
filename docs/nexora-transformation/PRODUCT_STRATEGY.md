# Nexora Product Strategy

## Vision
Nexora is one integrated Data Product Platform for life sciences and manufacturing. Consumers, Developers, Publishers, Reviewers, Product Owners, Validation Reviewers and Platform Administrators use the same platform. Producer and Consumer are capability profiles, not different applications.

## Platform model
Backstage remains the technical kernel and provides plugin runtime, Catalog, Scaffolder, Identity, Permission Framework, Search and documentation integration.

Nexora owns the business/domain layer: Product, ProductVersion, Artifact, ArtifactVersion, Publisher, ProductDependency, Installation, Subscription, DataContract, Requirements/URS, ProductBaseline, ValidationContext, Policies, Lifecycle, Release and Change Impact.

## Core and ecosystem
Nexora Core is itself a Product. Principle: **Nexora manages Nexora with Nexora.**

The Core stays small and generic. Domain capabilities such as SAP, MES, LIMS, MQTT, OPC UA, AAS, Snowflake, Databricks, OEE, Machine State, Cold Chain and Batch Release are versioned Artifacts.

Supported Artifact families include COMPONENT, CONNECTOR, TEMPLATE, GOLDEN_PATH, DATA_PRODUCT, POLICY_PACK and VALIDATION_PACK. Artifacts are manifest-driven, e.g. through `nexora.yaml`.

## Marketplace
Marketplace is both a consumption and publishing surface.

Consumer actions: Discover, Evaluate, Consume, Install, Subscribe, Build From, Add to Product, Upgrade.

Producer actions: Create, Develop, Test, Submit, Review, Certify, Publish, Version, Deprecate.

## Product Studio
Products are composed from business need, approved Requirements/URS, Golden Paths, Artifacts, Components, Data Contracts, NFRs, Policies, configuration and Product Specification. The result is a reproducible Product and Product Repository.

## AI-assisted Product Development
Nexora is not an IDE. Nexora defines and governs the Product; implementation occurs in a normal Product Repository.

Development Providers may include humans, Claude, Codex, Cursor, Gemini and future enterprise AI. Providers remain interchangeable.

Nexora should generate a Development Context containing Product Specification, Requirements Baseline/URS, NFRs, architecture, Artifact versions, Data Contracts, Policies, test strategy and repository instructions.

AI may code, refactor, create tests and propose traceability, risks and findings. AI must not autonomously approve controlled URS, risks, validation, deviations or releases.

Principle: **AI proposes; humans govern.**

## Roles, permissions and capabilities
Do not create global PRODUCER_MODE or CONSUMER_MODE.

Role = human responsibility.
Permission = technical action.
Capability/Entitlement = functionality available to an organization or edition.

Publishing should ultimately evaluate user permission, publisher membership, organization capability, lifecycle state and policy/certification gates. Segregation of Duties must be preserved.

## Data Exchange and Data Contracts
Nexora governs data exchange but does not replace transport technologies.

Data Products explicitly define consumed data, provided data, Data Contracts, delivery mechanism, schema, semantics, quality expectations, SLA, access policy and compatibility.

DataContract is a first-class domain concept. Exchange providers may include REST, GraphQL, OData, Kafka, MQTT, UNS, OPC UA, AAS, PostgreSQL, Snowflake, Databricks, object storage, Parquet, SAP, MES and LIMS.

## Product Dependencies and Subscriptions
Not every dependency is an installation. Dependency semantics may include INSTALLATION, SUBSCRIPTION, DATA_CONSUMPTION and API_CONSUMPTION.

Dependencies carry provider, consumer, Contract/Artifact, version, compatibility and provenance.

## Data Quality, Semantics and Lineage
Runtime health and Data Health are distinct.

Data Quality dimensions include availability, freshness, completeness, validity, uniqueness, consistency, volume and schema drift.

A semantic layer supports concepts such as Plant, Area, Line, Work Center, Equipment, Material, Batch, Order, Operation, State and Downtime.

Lineage connects sources, Data Products, transformations, Contracts, Consumers and Analytics. Lineage feeds Change Impact and revalidation scope.

## Analytics and AI Data Analyst
Nexora integrates analytics platforms instead of replacing them. Possible providers include Power BI, Tableau, Grafana, Snowflake, Databricks, Jupyter and Superset.

Nexora may expose Data preview, Contract view, Consumer view, lineage and Data Quality.

A governed AI Data Analyst may use Contracts, semantics, lineage and access policies, but must not receive unrestricted access to arbitrary enterprise databases.

## Testing and Pharma Validation
Engineering Verification and formal Pharma Validation are separate but traceable.

Engineering Verification can include static analysis, policy checks, unit, component, contract, integration, security, system, performance and Data Quality tests.

Target validation chain:

Requirements
→ Approved Baseline
→ Development
→ CI
→ Engineering Evidence
→ Product Baseline
→ Validation Context
→ IQ / OQ / UAT / optional PQ
→ Evidence
→ Findings / Retest
→ Independent Review
→ Validation Decision
→ Release Gate
→ Released

Automated evidence may be reused when provenance and integrity are sufficient. Formal approval remains human.

## Change Impact
Changes to Requirements, Artifacts, Contracts, dependencies, code and policies feed impact analysis.

Target: Change → affected Products → affected Requirements → affected Contracts → affected Tests → affected Evidence → revalidation scope.

Prefer justified risk-based revalidation scope over blanket full revalidation.

## Positioning
Nexora combines Developer Platform, Data Product Platform, Marketplace, Composable Architecture, Requirements Management, Policy as Code, Validation and Product Lifecycle Management.

Short principle: **Build once. Publish once. Reuse everywhere.**
