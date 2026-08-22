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
} from '../identity/platformStoryData';
import { IDP_PILLARS, PLATFORM_FEATURES } from './constants';

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
      <IdpFundamentalsSection />
      <PlatformFeaturesSection />
      <BoundarySection />
      <ComparisonSection />
      <DiagramSection
        id="full-stack"
        eyebrow="PLATFORM STACK"
        title="How the layers fit together"
        diagram={<FullPlatformStackDiagram />}
        what="Control Plane, Golden Paths, Platform Components, AAS, UNS, Data Products and systems of record as separate layers."
        why="The IDP and the shopfloor must stay readable as distinct jobs."
        how="Each layer owns one job: meaning, transport, capability, composition, domain value or governance."
        decoupled="Systems of record stay authoritative. Products run independently."
      />
      <DiagramSection
        id="aas-semantics"
        eyebrow="AAS AND ASSET SEMANTICS"
        title="AAS explains what an asset is"
        diagram={<AasVsUnsDiagram />}
        what="AAS holds asset identity, properties, units and endpoint mapping."
        why="A value is useless without a governed meaning."
        how="Filler 01 exposes Temperature, Pressure, Speed and Machine State as properties — not as a historian."
        decoupled="UNS does not own asset semantics."
      />
      <DiagramSection
        id="unified-namespace"
        eyebrow="UNIFIED NAMESPACE"
        title="UNS governs operational data flow"
        diagram={<SystemOfRecordToConsumerDiagram />}
        what="Governed MQTT, REST, events and files. OPC UA and Kafka are planned."
        why="Operational paths should not be one-off point-to-point wiring."
        how="AAS property speed on filler-01 maps to a stable UNS path."
        decoupled="UNS transports values. It does not replace MES."
      />
      <DiagramSection
        id="platform-components"
        eyebrow="PLATFORM COMPONENTS"
        title="Reusable technical building blocks"
        diagram={<PlatformComponentCompositionDiagram />}
        what="Reusable integration, data and operations blocks. Wave 1 Health, Observability, REST and MQTT pieces are CERTIFIED."
        why="Golden Paths reuse certified capabilities instead of copying connectors."
        how="Catalog type platform-component tracks version and lifecycle."
        decoupled="RAG, LLM Gateway, Knowledge Graph and Vector Store are planned, not implemented."
      />
      <DiagramSection
        id="golden-path-composition"
        eyebrow="GOLDEN PATH COMPOSITION"
        title="Golden Paths compose certified capabilities"
        diagram={<GoldenPathLifecycleDiagram />}
        what="A certified composition. Official paths: MQTT Temperature, REST Equipment, OEE."
        why="Domain logic stays small. Technical capabilities stay reusable."
        how="OEE 1.0 composes REST, MQTT, storage, API, health and OEE logic. Technical CERTIFIED, not GxP."
        decoupled="A generated product does not require the Control Plane at runtime."
      />
      <DiagramSection
        id="data-products-story"
        eyebrow="DATA PRODUCT LAYER"
        title="Independently governed Data Products"
        diagram={<StoryDataProductCards />}
        what="Domain value plus contract, quality, version and owner."
        why="Capabilities evolve without changing the system of record."
        how="Temperature, Equipment and OEE are certified examples."
        decoupled="A generated Data Product runs independently."
      />
      <DiagramSection
        id="control-plane-data-plane"
        eyebrow="CONTROL PLANE VS DATA PLANE"
        title="Governance around independently running products"
        diagram={<ControlPlaneVsDataPlaneDiagram />}
        what="Build, release, discovery and operation metadata — the IDP control plane."
        why="Governance must not become a second operational runtime."
        how="Catalog, Create, Marketplace, Golden Paths, contracts, quality, CI/CD and TechDocs sit here."
        decoupled="Operational data stays on product runtimes. The Control Plane does not replace ERP or MES."
      />
      <DiagramSection
        id="future-intelligence"
        eyebrow="FUTURE INTELLIGENCE"
        title="RAG and Knowledge Graph remain planned"
        diagram={<FutureIntelligenceDiagram />}
        what="Future assistants would consume governed Data Products, not source internals."
        why="AI needs contracts and semantics before it is productized."
        how="A later composition would combine RAG, LLM Gateway, Knowledge Graph and Vector Store."
        decoupled="These components are planned. They are not available."
      />
      <DiagramSection
        id="system-architecture"
        eyebrow="SYSTEM ARCHITECTURE"
        title="From core systems to Data Products"
        diagram={<SystemArchitectureDiagram />}
        what="Core systems, governed interfaces, the Control Plane and Data Products in layers."
        why="Innovation happens around the system of record, not inside it."
        how="Core systems expose MQTT, REST and events. The Control Plane applies Golden Paths and catalog. Products consume the interfaces."
        decoupled="ERP, MES, LIMS and historians remain systems of record."
      />
      <DiagramSection
        id="data-product-runtime"
        eyebrow="DATA PRODUCT RUNTIME"
        title="How an individual Data Product works"
        diagram={<DataProductRuntimeDiagram />}
        what="Ingest, validate against contract and quality, store, serve via its own API."
        why="Each product must be independently operable and versioned."
        how="MQTT or REST in. Schema and quality checks. Dashboards and apps consume the product API."
        decoupled="Source systems keep operational data. Consumers bind to the contract."
      />
      <DiagramSection
        id="developer-flow"
        eyebrow="DEVELOPER FLOW"
        title="Build once. Govern by default."
        diagram={<DeveloperFlowDiagram />}
        what="Golden Path → GitHub repo → CI/CD, tests, Docker, catalog and TechDocs by default."
        why="Teams without a large platform-engineering group still need a paved road."
        how="Nexora provisions the path. GitHub holds source. Catalog and TechDocs follow passing tests."
        decoupled="Generated products run independently of the Control Plane."
      />
      <DiagramSection
        id="contracts-consumers"
        eyebrow="CONTRACTS AND CONSUMERS"
        title="Contracts keep providers and consumers aligned"
        diagram={<ContractConsumerDiagram />}
        what="The provider publishes a contract. Consumers bind to it. Catalog records Provides / Consumes."
        why="Independent versioning needs explicit compatibility."
        how="An optional field is compatible. A breaking schema change is v2.0."
        decoupled="Consumers depend on the contract, not on provider storage."
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
        <p style={{ marginTop: 20, fontSize: 18, lineHeight: 1.65, color: '#CBD5E1', maxWidth: 720 }}>
          Nexora is the Internal Developer Platform for industrial Data
          Products. It does not replace ERP, MES, LIMS, EWM, Historians
          or other IT/OT systems of record — it is the control plane
          around them.
        </p>
        <figure
          style={{
            margin: '40px 0 0',
            borderRadius: 16,
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.12)',
            background: '#05101C',
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
      body: 'ERP, MES, LIMS, EWM and historians stay the operational source. Nexora does not own that data and does not connect to those databases directly.',
    },
    {
      title: 'DATA PRODUCT',
      body: 'An independently versioned service with contract, quality gates, API and owner. It evolves around the core, not inside it.',
    },
    {
      title: 'PHARMA DATA FACTORY CONTROL PLANE',
      body: 'Golden Paths, catalog, contracts, quality, CI/CD and certification. It does not replace source systems and does not store all enterprise data.',
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

function CardGrid({
  label,
  title,
  lead,
  items,
  background,
}: {
  label: string;
  title: string;
  lead: string;
  items: ReadonlyArray<{ id: string; title: string; body: string }>;
  background: string;
}) {
  return (
    <section aria-label={label} style={{ padding: '56px 24px', background }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h2
          className="pdf-display"
          style={{ fontSize: 28, fontWeight: 600, margin: 0, color: PHARMA_NAVY }}
        >
          {title}
        </h2>
        <p style={{ margin: '12px 0 24px', fontSize: 16, lineHeight: 1.55, color: C.muted, maxWidth: 720 }}>
          {lead}
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {items.map(item => (
            <article key={item.id} className="pdf-card" style={{ padding: 20 }}>
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
              <p style={{ margin: '10px 0 0', fontSize: 15, lineHeight: 1.5, color: C.text }}>
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function IdpFundamentalsSection() {
  return (
    <CardGrid
      label="Internal Developer Platform fundamentals"
      title="What makes an Internal Developer Platform"
      lead="An IDP is a product for developers: self-service, a catalog of what exists, and guardrails so every team does not rebuild CI/CD, contracts and docs. Nexora applies that model to industrial Data Products."
      items={IDP_PILLARS}
      background={C.paper}
    />
  );
}

function PlatformFeaturesSection() {
  return (
    <CardGrid
      label="Platform and architecture features"
      title="Platform and architecture features"
      lead="The Control Plane is the IDP. Architecture keeps systems of record, Data Products and governance as separate layers."
      items={PLATFORM_FEATURES}
      background={C.section}
    />
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
          : 'Return to the public landing to continue exploring Nexora.'}
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
