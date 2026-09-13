import type { CSSProperties } from 'react';
import { ARCHITECTURE_PATH } from '../architecture/constants';
import { C, PHARMA_TEAL } from './landingTokens';
import { useLandingI18n } from './landingI18n';
import { StoryStatusBadge } from './ArchitecturePrinciple';
import {
  AUTHENTICATED_ARCHITECTURE_LINKS,
  COMMERCIAL_EDITION_STORY,
  DISTRIBUTION_PIPELINE,
  FILLER_TO_OEE_STEPS,
  LAYER_COMPARISON,
  LAYER_ROLE_CARDS,
} from './platformStoryData';

const thStyle: CSSProperties = {
  textAlign: 'left',
  padding: '12px 14px',
  borderBottom: `1px solid ${C.border}`,
  color: PHARMA_TEAL,
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  fontSize: 12,
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
};

const tdStyle: CSSProperties = {
  padding: '14px',
  borderBottom: `1px solid ${C.border}`,
  verticalAlign: 'top',
};

export function FitsTogetherSection({ onSignIn }: Readonly<{ onSignIn?: () => void }>) {
  const { t } = useLandingI18n();

  return (
    <section
      aria-label="How Nexora fits together"
      style={{ padding: '96px 24px', background: C.paper, color: C.text }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <p
          className="pdf-mono"
          style={{
            color: PHARMA_TEAL,
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            margin: '0 0 16px',
          }}
        >
          Level 1 · 20 seconds
        </p>
        <h2
          className="pdf-display"
          style={{
            fontSize: 'clamp(28px, 3.6vw, 40px)',
            fontWeight: 600,
            margin: 0,
            color: C.text,
            maxWidth: 760,
          }}
        >
          Keep core systems standard. Compose digital capabilities. Deliver governed Data Products.
        </h2>
        <p style={{ marginTop: 16, fontSize: 17, lineHeight: 1.7, color: C.muted, maxWidth: 760 }}>
          Nexora is not a replacement for ERP, MES, LIMS, EWM, CMO
          platforms or other IT/OT systems. Those systems of record stay
          authoritative. The Control Plane governs how Data Products are built
          around them.
        </p>

        <h3
          className="pdf-display"
          style={{ fontSize: 24, fontWeight: 600, margin: '56px 0 20px', color: C.text }}
        >
          What each layer does
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
          aria-label="What each layer does"
        >
          {LAYER_ROLE_CARDS.map(card => (
            <article key={card.id} className="pdf-card" style={{ padding: 20 }}>
              <h4
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
              </h4>
              <p style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.6 }}>{card.body}</p>
            </article>
          ))}
        </div>

        <h3
          className="pdf-display"
          style={{ fontSize: 24, fontWeight: 600, margin: '56px 0 20px', color: C.text }}
        >
          AAS vs UNS vs Data Product
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table
            aria-label="AAS vs UNS vs Data Product comparison"
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            <thead>
              <tr>
                <th style={thStyle}>Layer</th>
                <th style={thStyle}>Question</th>
                <th style={thStyle}>Owns</th>
              </tr>
            </thead>
            <tbody>
              {LAYER_COMPARISON.map(row => (
                <tr key={row.id}>
                  <th scope="row" style={{ ...tdStyle, color: C.text, fontWeight: 700 }}>
                    {row.title}
                  </th>
                  <td style={tdStyle}>{row.question}</td>
                  <td style={tdStyle}>{row.owns}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h3
          className="pdf-display"
          style={{ fontSize: 24, fontWeight: 600, margin: '56px 0 20px', color: C.text }}
        >
          From Filler 01 to OEE
        </h3>
        <ol
          aria-label="From Filler 01 to OEE"
          style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 12 }}
        >
          {FILLER_TO_OEE_STEPS.map((step, index) => (
            <li
              key={step.id}
              className="pdf-card"
              style={{ padding: 20, display: 'grid', gap: 8 }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <strong>
                  {index + 1}. {step.title.replace(/^Step \d+ — /, '')}
                </strong>
                <StoryStatusBadge status={step.status} />
              </div>
              <p style={{ margin: 0, color: C.muted, lineHeight: 1.6 }}>{step.body}</p>
            </li>
          ))}
        </ol>

        <h3
          className="pdf-display"
          style={{ fontSize: 24, fontWeight: 600, margin: '56px 0 20px', color: C.text }}
        >
          Build once. Certify. Release. Distribute.
        </h3>
        <div
          aria-label="Commercial distribution"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          {DISTRIBUTION_PIPELINE.map((step, index) => (
            <span key={step} className="pdf-mono" style={{ color: PHARMA_TEAL, fontWeight: 700 }}>
              {step}
              {index < DISTRIBUTION_PIPELINE.length - 1 ? ' → ' : ''}
            </span>
          ))}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16,
          }}
        >
          {COMMERCIAL_EDITION_STORY.map(edition => (
            <article key={edition.id} className="pdf-card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <h4
                  className="pdf-mono"
                  style={{
                    margin: 0,
                    color: PHARMA_TEAL,
                    fontSize: 12,
                    letterSpacing: '0.08em',
                    fontWeight: 600,
                  }}
                >
                  {edition.title}
                </h4>
                <StoryStatusBadge status={edition.status} />
              </div>
              <p style={{ margin: '12px 0 0', lineHeight: 1.6 }}>{edition.body}</p>
              {'detail' in edition && edition.detail ? (
                <p className="pdf-mono" style={{ margin: '8px 0 0', fontSize: 11, color: C.muted }}>
                  {edition.detail}
                </p>
              ) : null}
            </article>
          ))}
        </div>
        <p style={{ marginTop: 16, fontSize: 14, color: C.muted }}>
          No entitlement or billing is implemented in this release. SaaS is future.
        </p>

        <div
          aria-label="Architecture story actions"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 40 }}
        >
          <a
            className="pdf-btn-primary pdf-focus"
            href={ARCHITECTURE_PATH}
            style={{ padding: '12px 20px', textDecoration: 'none', fontWeight: 600 }}
          >
            {t.storyCta.primary}
          </a>
          <a
            className="pdf-btn-ghost pdf-focus"
            href="#golden-paths"
            style={{ padding: '12px 20px', textDecoration: 'none', fontWeight: 600 }}
          >
            {t.storyCta.secondary}
          </a>
          {onSignIn ? (
            <button
              type="button"
              className="pdf-focus"
              onClick={onSignIn}
              style={{
                padding: '12px 20px',
                borderRadius: 10,
                border: `1px solid ${C.border}`,
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 15,
                color: C.text,
              }}
            >
              {t.signIn}
            </button>
          ) : null}
        </div>

        <p
          className="pdf-mono"
          style={{ margin: '40px 0 12px', color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.12em' }}
        >
          Continue in Developer Hub
        </p>
        <p style={{ margin: '0 0 12px', fontSize: 14, color: C.muted }}>
          The following routes require Sign In.
        </p>
        <nav aria-label="Authenticated architecture links" style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
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
                color: C.text,
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
