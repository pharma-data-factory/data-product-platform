import { type ReactNode } from 'react';
import { ArchitectureOverviewImage } from './ArchitectureOverviewImage';
import {
  ArchitectureDiagramStyles,
  ContractConsumerDiagram,
  DataProductRuntimeDiagram,
  DeveloperFlowDiagram,
  DiagramExplanation,
  SystemArchitectureDiagram,
} from './diagrams';
import {
  AasVsUnsDiagram,
  ControlPlaneVsDataPlaneDiagram,
  FullPlatformStackDiagram,
  FutureIntelligenceDiagram,
  GoldenPathLifecycleDiagram,
  HeroArchitectureDiagram,
  PlatformComponentCompositionDiagram,
  StoryDataProductCards,
  SystemOfRecordToConsumerDiagram,
} from './storyDiagrams';
import { LandingFooter, LandingNav, LandingStyles } from '../identity/PublicLanding';
import { LandingI18nProvider } from '../identity/landingI18n';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from '../identity/landingTokens';
import {
  AUTHENTICATED_ARCHITECTURE_LINKS,
  LAYER_COMPARISON,
  LAYER_ROLE_CARDS,
} from '../identity/platformStoryData';

const archTh = {
  textAlign: 'left' as const,
  padding: '12px 14px',
  borderBottom: `1px solid ${C.border}`,
  color: PHARMA_TEAL,
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
};

const archTd = {
  padding: 14,
  borderBottom: `1px solid ${C.border}`,
  verticalAlign: 'top' as const,
};

export interface ArchitecturePageProps {
  onSignIn?: () => void;
  standalone?: boolean;
}

export function ArchitecturePage({
  onSignIn,
  standalone = false,
}: ArchitecturePageProps) {
  const body = (
    <>
      <ArchitectureDiagramStyles />
      <OverviewHero />
      <BoundarySection />
      <LayerRolesSection />
      <ComparisonSection />
      <DiagramSection
        id="full-stack"
        eyebrow="PLATFORM STACK"
        title="How the layers fit together"
        diagram={<FullPlatformStackDiagram />}
        what="It shows Control Plane, Golden Paths, Platform Components, AAS, Unified Namespace, Data Products and systems of record as distinct layers."
        why="Customers need a business picture in seconds and an architecture picture without collapsing all layers into one box."
        how="Each layer has a job: meaning, data flow, reusable capability, composition, domain value, or governance."
        decoupled="Systems of record stay authoritative. Data Products run independently. The Control Plane does not process all operational data."
      />
      <DiagramSection
        id="aas-semantics"
        eyebrow="AAS AND ASSET SEMANTICS"
        title="AAS explains what an asset is"
        diagram={<AasVsUnsDiagram />}
        what="Asset Administration Shell holds asset registry, equipment, sensors, submodels, semantic IDs, units, relationships and endpoint mapping."
        why="Operational values are useless without a governed meaning for the asset and property."
        how="Filler 01 exposes Temperature, Pressure, Speed and Machine State as semantic properties, not as a historian."
        decoupled="AAS does not store time-series values. Unified Namespace does not own asset semantics."
      />
      <DiagramSection
        id="unified-namespace"
        eyebrow="UNIFIED NAMESPACE"
        title="UNS governs operational data flow"
        diagram={<SystemOfRecordToConsumerDiagram />}
        what="Unified Namespace provides governed MQTT, REST, events and files/streams. OPC UA and Kafka are planned."
        why="Teams need a stable place for operational paths without custom point-to-point wiring."
        how="AAS property speed on filler-01 maps to pharma/basel/packaging/line-01/filler-01/speed/value."
        decoupled="UNS transports values. It does not replace MES or own the meaning of the asset."
      />
      <DiagramSection
        id="platform-components"
        eyebrow="PLATFORM COMPONENTS"
        title="Reusable technical building blocks"
        diagram={<PlatformComponentCompositionDiagram />}
        what="Integration, data and operations components can be composed. Wave 1 Health, Observability, REST API, REST Source, MQTT Consumer and Time-Series Storage are CERTIFIED."
        why="Golden Paths should reuse certified capabilities instead of copying connectors."
        how="Catalog type platform-component tracks version and lifecycle. Unified Namespace and AAS Foundation are DEVELOPMENT."
        decoupled="Intelligence components (RAG, LLM Gateway, Knowledge Graph, Vector Store) are planned and not implemented."
      />
      <DiagramSection
        id="golden-path-composition"
        eyebrow="GOLDEN PATH COMPOSITION"
        title="Golden Paths compose certified capabilities"
        diagram={<GoldenPathLifecycleDiagram />}
        what="A Golden Path is a certified composition pattern. MQTT Temperature, REST Equipment and OEE Data Product are official examples."
        why="Composition keeps domain logic small and technical capabilities reusable."
        how="OEE Golden Path 1.0 composes REST Source, MQTT Consumer, Time-Series Storage, REST API, Health, Observability and OEE domain logic. Technical CERTIFIED only, not GxP."
        decoupled="Cold Chain, Quality, Energy and AI Assistant are future. Generated Data Products do not require the Control Plane at runtime."
      />
      <DiagramSection
        id="data-products-story"
        eyebrow="DATA PRODUCT LAYER"
        title="Independently governed Data Products"
        diagram={<StoryDataProductCards />}
        what="A Data Product contains domain value, contract, quality, compatibility, CI/CD, version and owner."
        why="Business capabilities must evolve without changing the system of record."
        how="Temperature, Equipment and OEE are certified examples. Cold Chain and Quality are future."
        decoupled="A generated Data Product runs independently. It does not require the Control Plane at runtime."
      />
      <DiagramSection
        id="control-plane-data-plane"
        eyebrow="CONTROL PLANE VS DATA PLANE"
        title="Governance around independently running products"
        diagram={<ControlPlaneVsDataPlaneDiagram />}
        what="Pharma Data Factory is the Control Plane for build, release, discovery and operation metadata."
        why="Engineering governance must not become a second operational runtime."
        how="Catalog, Create, Marketplace, Golden Paths, contracts, quality, CI/CD, TechDocs, Search, RBAC and Developer Hub sit in the Control Plane."
        decoupled="Operational data stays on governed interfaces and in Data Product runtimes. The Control Plane does not replace ERP, MES, LIMS or EWM."
      />
      <DiagramSection
        id="future-intelligence"
        eyebrow="FUTURE INTELLIGENCE"
        title="RAG and Knowledge Graph remain planned"
        diagram={<FutureIntelligenceDiagram />}
        what="Intelligence components would consume governed Data Products, not source-system internals."
        why="AI assistants need contracts and semantics before they are productized."
        how="A future composition would combine RAG, LLM Gateway, Knowledge Graph and Vector Store around certified products."
        decoupled="RAG, Knowledge Graph, LLM Gateway and Vector Store are planned. They are not available."
      />
      <DiagramSection
        id="system-architecture"
        eyebrow="SYSTEM ARCHITECTURE"
        title="From core systems to Data Products"
        diagram={<SystemArchitectureDiagram />}
        what="It shows how operational systems, governed interfaces, the Pharma Data Factory control plane, and Data Products sit in layers."
        why="Manufacturing IT needs a clear picture of where innovation happens without changing the system of record."
        how="Core systems expose controlled APIs, events, MQTT, REST, files and streams. The control plane applies Golden Paths, contracts, quality, compatibility, CI/CD, catalog and governance. Data Products consume those interfaces."
        decoupled="ERP, MES, LIMS, EWM, historians and CMO platforms remain the systems of record. Pharma Data Factory does not replace them or read their databases directly."
      />
      <DiagramSection
        id="data-product-runtime"
        eyebrow="DATA PRODUCT RUNTIME"
        title="How an individual Data Product works"
        diagram={<DataProductRuntimeDiagram />}
        what="A Data Product ingests from a source or sensor, validates against its contract and quality rules, stores product data, and serves consumers through its own API."
        why="Each product must be independently operable, testable, and versioned."
        how="MQTT or REST carries events into ingestion. Schema and quality checks run before product storage. Dashboards, analytics, AI / ML and applications consume the product API."
        decoupled="Source systems keep operational data. Consumers do not bind to core-system internals. The control plane does not store all enterprise data."
      />
      <DiagramSection
        id="developer-flow"
        eyebrow="DEVELOPER FLOW"
        title="Build once. Govern by default."
        diagram={<DeveloperFlowDiagram />}
        what="A developer starts from a certified Golden Path, generates a GitHub repository, and gets CI/CD, contract tests, quality tests, compatibility tests, Docker, catalog registration and documentation by default."
        why="Teams without a large platform-engineering organization still need a repeatable, governed path to production-quality Data Products."
        how="Pharma Data Factory provisions the Golden Path. GitHub holds source and pipelines. Catalog and TechDocs make the product discoverable after tests pass."
        decoupled="Generated Data Products run independently of the control plane. Governance metadata lives with the product, not inside the source system."
      />
      <DiagramSection
        id="contracts-consumers"
        eyebrow="CONTRACTS AND CONSUMERS"
        title="Contracts keep providers and consumers aligned"
        diagram={<ContractConsumerDiagram />}
        what="A provider Data Product publishes a data contract. Consumers bind to that contract. Catalog relationships record Provides, Consumes, Depends On and Used By."
        why="Independent versioning only works when compatibility is explicit."
        how="An optional field from v1.1 to v1.2 stays compatible. A breaking schema change from v1.x to v2.0 is a breaking change and must be treated as such."
        decoupled="Consumers depend on the contract, not on the provider's storage or the core system of record."
      />
      <ArchitectureCta onSignIn={onSignIn} />
      <AuthenticatedLinksSection />
    </>
  );

  if (!standalone) {
    return (
      <LandingI18nProvider>
        <div className="pdf-root" style={{ background: C.base }}>
          <LandingStyles />
          {body}
        </div>
      </LandingI18nProvider>
    );
  }

  return (
    <LandingI18nProvider>
      <main className="pdf-root">
        <LandingStyles />
        <LandingNav onSignIn={onSignIn} location="architecture" />
        {body}
        <LandingFooter location="architecture" />
      </main>
    </LandingI18nProvider>
  );
}

function OverviewHero() {
  return (
    <section
      aria-label="Architecture overview"
      style={{
        padding: '128px 24px 72px',
        background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
        color: '#F8FAFC',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <p
          className="pdf-mono"
          style={{
            color: PHARMA_TEAL_LIGHT,
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            margin: '0 0 16px',
          }}
        >
          Platform architecture
        </p>
        <h1
          className="pdf-display"
          style={{
            fontSize: 'clamp(32px, 4.8vw, 52px)',
            fontWeight: 600,
            lineHeight: 1.15,
            margin: 0,
            maxWidth: 840,
          }}
        >
          Keep Core Systems Standard.
          <br />
          Innovate Through Data Products.
        </h1>
        <p style={{ marginTop: 20, fontSize: 18, lineHeight: 1.7, color: '#CBD5E1', maxWidth: 760 }}>
          Pharma Data Factory does not replace ERP, MES, LIMS, EWM, Historians,
          CMO platforms or other operational IT/OT systems.
        </p>
        <p style={{ marginTop: 12, fontSize: 18, lineHeight: 1.7, color: '#CBD5E1', maxWidth: 760 }}>
          It provides the engineering and governance control plane for
          independently managed Data Products around those systems.
        </p>
        <figure
          style={{
            margin: '40px 0 0',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
            background: '#071525',
          }}
        >
          <HeroArchitectureDiagram />
        </figure>
        <figure
          style={{
            margin: '24px 0 0',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
            background: '#071525',
          }}
        >
          <ArchitectureOverviewImage priority />
        </figure>
      </div>
    </section>
  );
}

function BoundarySection() {
  const items = [
    {
      title: 'SYSTEM OF RECORD',
      body: 'ERP, MES, LIMS, EWM, historians and CMO platforms remain the operational source. They stay stable and close to standard. Pharma Data Factory does not own that data and does not connect to those databases directly.',
    },
    {
      title: 'DATA PRODUCT',
      body: 'A Data Product is an independently versioned service with its own contract, quality gates, API, tests and documentation. It evolves around the core, not inside it.',
    },
    {
      title: 'PHARMA DATA FACTORY CONTROL PLANE',
      body: 'The control plane is the governed engineering layer: Golden Paths, catalog, contracts, quality, compatibility, CI/CD and technical certification. It does not replace source systems and does not store all enterprise data.',
    },
  ];

  return (
    <section
      aria-label="Architectural boundary"
      style={{ padding: '72px 24px', background: C.paper }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h2
          className="pdf-display"
          style={{
            fontSize: 28,
            fontWeight: 600,
            margin: '0 0 24px',
            color: PHARMA_NAVY,
          }}
        >
          Keep these three layers distinct
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {items.map(item => (
            <article key={item.title} className="pdf-card" style={{ padding: 24 }}>
              <h3
                className="pdf-mono"
                style={{
                  margin: 0,
                  color: PHARMA_TEAL,
                  fontSize: 12,
                  letterSpacing: '0.12em',
                  fontWeight: 600,
                }}
              >
                {item.title}
              </h3>
              <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.6, color: C.text }}>
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LayerRolesSection() {
  return (
    <section aria-label="What each layer does" style={{ padding: '56px 24px', background: C.section }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h2
          className="pdf-display"
          style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px', color: PHARMA_NAVY }}
        >
          What each layer does
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {LAYER_ROLE_CARDS.map(card => (
            <article key={card.id} className="pdf-card" style={{ padding: 20 }}>
              <h3
                className="pdf-mono"
                style={{
                  margin: 0,
                  color: PHARMA_TEAL,
                  fontSize: 12,
                  letterSpacing: '0.12em',
                  fontWeight: 600,
                }}
              >
                {card.title}
              </h3>
              <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.6, color: C.text }}>
                {card.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ComparisonSection() {
  return (
    <section aria-label="AAS vs UNS vs Data Product comparison" style={{ padding: '56px 24px', background: C.paper }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h2
          className="pdf-display"
          style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px', color: PHARMA_NAVY }}
        >
          AAS vs UNS vs Data Product
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
            <thead>
              <tr>
                <th style={archTh}>Layer</th>
                <th style={archTh}>Question</th>
                <th style={archTh}>Owns</th>
              </tr>
            </thead>
            <tbody>
              {LAYER_COMPARISON.map(row => (
                <tr key={row.id}>
                  <th scope="row" style={{ ...archTd, fontWeight: 700, color: PHARMA_NAVY }}>
                    {row.title}
                  </th>
                  <td style={archTd}>{row.question}</td>
                  <td style={archTd}>{row.owns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function DiagramSection({
  id,
  eyebrow,
  title,
  diagram,
  what,
  why,
  how,
  decoupled,
}: {
  id: string;
  eyebrow: string;
  title: string;
  diagram: ReactNode;
  what: string;
  why: string;
  how: string;
  decoupled: string;
}) {
  return (
    <section id={id} style={{ padding: '56px 24px', background: C.section }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <p
          className="pdf-mono"
          style={{
            color: PHARMA_TEAL,
            fontSize: 12,
            letterSpacing: '0.16em',
            margin: '0 0 12px',
            fontWeight: 600,
          }}
        >
          {eyebrow}
        </p>
        <h2
          className="pdf-display"
          style={{
            fontSize: 'clamp(24px, 3.2vw, 36px)',
            fontWeight: 600,
            margin: '0 0 24px',
            color: PHARMA_NAVY,
          }}
        >
          {title}
        </h2>
        {diagram}
        <DiagramExplanation what={what} why={why} how={how} decoupled={decoupled} />
      </div>
    </section>
  );
}

function ArchitectureCta({ onSignIn }: { onSignIn?: () => void }) {
  return (
    <section
      style={{
        padding: '80px 24px',
        textAlign: 'center',
        background: PHARMA_NAVY,
        color: '#F8FAFC',
      }}
    >
      <h2 className="pdf-display" style={{ fontSize: 32, fontWeight: 600, margin: 0 }}>
        Ready to explore the factory
      </h2>
      <p style={{ margin: '16px auto 0', maxWidth: 560, color: '#CBD5E1', lineHeight: 1.7 }}>
        {onSignIn
          ? 'Continue to Golden Paths, return to the public landing, or sign in to the Control Plane.'
          : 'Return to the public landing to continue exploring Pharma Data Factory.'}
      </p>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: 16,
          marginTop: 28,
        }}
      >
        <a
          href="/"
          className="pdf-btn-hero-ghost pdf-focus"
          style={{ padding: '10px 18px', textDecoration: 'none', fontWeight: 600 }}
        >
          Back to landing
        </a>
        <a
          href="/platform/architecture/developer"
          className="pdf-btn-hero-ghost pdf-focus"
          style={{ padding: '10px 18px', textDecoration: 'none', fontWeight: 600 }}
        >
          How developers build
        </a>
        <a
          href="/#golden-paths"
          className="pdf-btn-hero-ghost pdf-focus"
          style={{ padding: '10px 18px', textDecoration: 'none', fontWeight: 600 }}
        >
          Explore Golden Paths
        </a>
        {onSignIn ? (
          <button
            type="button"
            className="pdf-btn-hero-primary pdf-focus"
            onClick={onSignIn}
            style={{
              padding: '10px 18px',
              border: 0,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Sign In
          </button>
        ) : null}
      </div>
    </section>
  );
}

function AuthenticatedLinksSection() {
  return (
    <section
      aria-label="Authenticated architecture links"
      style={{ padding: '48px 24px 80px', background: C.paper }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h2
          className="pdf-display"
          style={{ fontSize: 24, fontWeight: 600, margin: '0 0 8px', color: PHARMA_NAVY }}
        >
          Continue in Developer Hub
        </h2>
        <p style={{ margin: '0 0 16px', color: C.muted, fontSize: 15 }}>
          These routes require Sign In. Public architecture stays on this page.
        </p>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {AUTHENTICATED_ARCHITECTURE_LINKS.map(link => (
            <a
              key={link.id}
              href={link.href}
              className="pdf-focus"
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                border: `1px solid ${C.border}`,
                textDecoration: 'none',
                color: PHARMA_NAVY,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}
