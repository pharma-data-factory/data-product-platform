import { documentationHref } from '@internal/platform-common';
import { DEVELOPER_ARCHITECTURE_PATH } from './constants';
import { DeveloperArchitectureDiagram } from './DeveloperArchitectureDiagram';
import { ArchitectureDiagramStyles } from './diagrams';
import {
  DEVELOPER_BUILD_STEPS,
  DEVELOPER_DOC_LINKS,
  MQTT_TEMPERATURE_COMPOSITION,
} from './developerArchitectureData';
import { LandingFooter, LandingNav, LandingStyles } from '../identity/PublicLanding';
import { LandingI18nProvider } from '../identity/landingI18n';
import { StoryStatusBadge } from '../identity/ArchitecturePrinciple';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from '../identity/landingTokens';

const linkStyle = {
  padding: '8px 12px',
  borderRadius: 999,
  border: `1px solid ${C.border}`,
  textDecoration: 'none',
  color: PHARMA_NAVY,
  fontSize: 13,
  fontWeight: 600,
} as const;

export interface DeveloperArchitecturePageProps {
  onSignIn?: () => void;
  standalone?: boolean;
}

export function DeveloperArchitecturePage({
  onSignIn,
  standalone = false,
}: Readonly<DeveloperArchitecturePageProps>) {
  const body = (
    <>
      <ArchitectureDiagramStyles />
      <Hero />
      <DiagramSection />
      <HowSection />
      <ManifestSection />
      <DocsSection />
      <Cta onSignIn={onSignIn} />
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

function Hero() {
  return (
    <section
      aria-label="Developer architecture overview"
      style={{
        padding: '128px 24px 64px',
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
          Developer technical view
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
          How a developer builds a Data Product.
        </h1>
        <p style={{ marginTop: 20, fontSize: 18, lineHeight: 1.7, color: '#CBD5E1', maxWidth: 760 }}>
          The public architecture story explains why Nexora exists.
          This page explains how a developer uses Catalog, Marketplace, Create,
          Golden Paths and Platform Components to ship an independently running
          Data Product.
        </p>
        <p style={{ marginTop: 12, fontSize: 16, lineHeight: 1.7, color: '#94A3B8', maxWidth: 760 }}>
          Detailed procedures stay in Developer Hub and TechDocs. This view does
          not replace that documentation.
        </p>
      </div>
    </section>
  );
}

function DiagramSection() {
  return (
    <section
      id="developer-architecture-diagram"
      aria-label="Developer architecture diagram"
      style={{ padding: '56px 24px', background: C.section }}
    >
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
          CONTROL PLANE TO RUNTIME
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
          Catalog, Marketplace and Create feed a Golden Path
        </h2>
        <DeveloperArchitectureDiagram />
        <p style={{ margin: '20px 0 0', fontSize: 15, lineHeight: 1.7, color: C.muted, maxWidth: 760 }}>
          A Golden Path is a certified composition. Its composition manifest
          names Platform Components. Create generates a GitHub repository.
          Catalog later discovers the product. The runtime does not stay inside
          the Control Plane.
        </p>
      </div>
    </section>
  );
}

function HowSection() {
  return (
    <section aria-label="How developers use the architecture" style={{ padding: '56px 24px', background: C.paper }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h2
          className="pdf-display"
          style={{ fontSize: 28, fontWeight: 600, margin: '0 0 24px', color: PHARMA_NAVY }}
        >
          Developer path
        </h2>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}>
          {DEVELOPER_BUILD_STEPS.map((step, index) => (
            <li key={step.id} className="pdf-card" style={{ padding: 22 }}>
              <p className="pdf-mono" style={{ margin: 0, color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.12em' }}>
                STEP {index + 1}
              </p>
              <h3 className="pdf-display" style={{ margin: '8px 0 0', fontSize: 20, color: PHARMA_NAVY }}>
                {step.title}
              </h3>
              <p style={{ margin: '10px 0 0', lineHeight: 1.6, color: C.text }}>{step.body}</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 14 }}>
                {step.href ? (
                  <a href={step.href} className="pdf-focus" style={linkStyle}>
                    {step.linkLabel}
                    {step.auth ? ' (sign in)' : ''}
                  </a>
                ) : null}
                {step.docsHref ? (
                  <a href={step.docsHref} className="pdf-focus" style={linkStyle}>
                    {step.docsLabel} (TechDocs)
                  </a>
                ) : null}
                {step.extraHref ? (
                  <a href={step.extraHref} className="pdf-focus" style={linkStyle}>
                    {step.extraLabel} (TechDocs)
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ManifestSection() {
  return (
    <section aria-label="Composition manifest" style={{ padding: '56px 24px', background: C.section }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <h2
            className="pdf-display"
            style={{ fontSize: 28, fontWeight: 600, margin: 0, color: PHARMA_NAVY }}
          >
            Composition manifest
          </h2>
          <StoryStatusBadge status={MQTT_TEMPERATURE_COMPOSITION.status} />
        </div>
        <p style={{ margin: '16px 0 0', fontSize: 16, lineHeight: 1.7, color: C.muted, maxWidth: 760 }}>
          MQTT Temperature is an official certified Golden Path. The conceptual
          manifest records which Platform Components it uses. The existing
          template runtime is not refactored by this page.
        </p>
        <pre
          aria-label="MQTT Temperature composition manifest"
          className="pdf-diag pdf-diag-compact"
          style={{
            marginTop: 24,
            padding: 16,
            color: C.text,
            overflowX: 'auto',
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          {MQTT_TEMPERATURE_COMPOSITION.yaml}
        </pre>
        <p style={{ margin: '16px 0 0', fontSize: 14, color: C.muted }}>
          OEE Golden Path 1.0 is technically CERTIFIED. RAG and Knowledge
          Graph remain planned.
        </p>
        <a
          href={documentationHref('platform-component-composition')}
          className="pdf-focus"
          style={{ ...linkStyle, display: 'inline-block', marginTop: 12 }}
        >
          Composition docs (TechDocs)
        </a>
      </div>
    </section>
  );
}

function DocsSection() {
  return (
    <section aria-label="Existing developer documentation" style={{ padding: '56px 24px', background: C.paper }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <h2
          className="pdf-display"
          style={{ fontSize: 28, fontWeight: 600, margin: '0 0 12px', color: PHARMA_NAVY }}
        >
          Continue in Developer Hub
        </h2>
        <p style={{ margin: '0 0 20px', color: C.muted, maxWidth: 720, lineHeight: 1.6 }}>
          These routes reuse TechDocs and Search. Sign in is required except for
          the public architecture story.
        </p>
        <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {DEVELOPER_DOC_LINKS.map(link => (
            <a key={link.href} href={link.href} className="pdf-focus" style={linkStyle}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </section>
  );
}

function Cta({ onSignIn }: Readonly<{ onSignIn?: () => void }>) {
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
        Build from a certified Golden Path
      </h2>
      <p style={{ margin: '16px auto 0', maxWidth: 560, color: '#CBD5E1', lineHeight: 1.7 }}>
        Public architecture explains the layers. Developer Hub holds the
        procedures. Create is the path into a generated Data Product.
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
          href="/platform/architecture"
          className="pdf-btn-hero-ghost pdf-focus"
          style={{ padding: '10px 18px', textDecoration: 'none', fontWeight: 600 }}
        >
          Public architecture
        </a>
        <a
          href="/developer"
          className="pdf-btn-hero-ghost pdf-focus"
          style={{ padding: '10px 18px', textDecoration: 'none', fontWeight: 600 }}
        >
          Developer Hub
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
      <p className="pdf-mono" style={{ margin: '24px 0 0', color: '#64748B', fontSize: 12 }}>
        {DEVELOPER_ARCHITECTURE_PATH}
      </p>
    </section>
  );
}
