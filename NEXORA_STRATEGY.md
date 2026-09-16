# Nexora Strategy Guardrails

Nexora is one integrated Data Product Platform for life sciences and manufacturing.

## Mandatory principles

- One Platform: Producer and Consumer are capabilities, not separate applications or global modes.
- Backstage is the technical kernel; Nexora owns the Product and Artifact domain.
- Nexora Core is itself a Product: Nexora manages Nexora with Nexora.
- Core stays small; SAP, MES, LIMS, MQTT, OPC UA, AAS, Snowflake, Databricks, OEE and similar capabilities belong in versioned Artifacts.
- Marketplace first; reusable Artifacts are preferred over duplicated implementation.
- Manifest driven and composable by design.
- AI development providers are interchangeable. AI may implement and propose, but controlled approvals remain human.
- Data Contracts, Product Dependencies, Subscriptions, Data Quality, Semantics and Lineage are first-class concepts.
- Engineering Verification and formal Pharma Validation are separate but traceable.
- GitHub, analytics platforms, exchange technologies and AI models are providers, not Nexora domain truth.
- No big-bang rewrite: use compatibility adapters, prove parity, then remove legacy behavior.

## Target capability model

BUILD: Product Studio, Golden Paths, composition, repository generation and AI-assisted development.

EXCHANGE: Data Contracts, APIs, events, streams, subscriptions and provider-neutral exchange.

CONSUME: Data Products, analytics, applications and governed AI data analysis.

GOVERN: Requirements, Policies, Quality, Lineage, Pharma Validation, Change Impact and Release.

OPERATE: Runtime health, Data Health, usage, versions, upgrades and observability.

Before architecture or domain work also read `AGENTS.md` and all files under `docs/nexora-transformation/`.

The repository is the persistent implementation memory. Do not rely on chat history as implementation state.
