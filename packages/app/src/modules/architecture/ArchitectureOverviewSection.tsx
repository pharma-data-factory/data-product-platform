import { ARCHITECTURE_CONCEPTS, ARCHITECTURE_PATH } from './constants';
import { ArchitectureOverviewImage } from './ArchitectureOverviewImage';
import { C, PHARMA_TEAL } from '../identity/landingTokens';
import { useLandingI18n } from '../identity/landingI18n';

export function ArchitectureOverviewSection() {
  const { t } = useLandingI18n();
  return (
    <section
      id="architecture-overview"
      aria-label="Architecture overview"
      style={{
        padding: '96px 24px',
        background: C.section,
      }}
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
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 24,
              height: 1,
              background: PHARMA_TEAL,
            }}
          />
            {t.overview.eyebrow}
          </p>
        <h2
          className="pdf-display"
          style={{
            fontSize: 'clamp(32px, 4.6vw, 48px)',
            fontWeight: 600,
            lineHeight: 1.15,
            margin: 0,
            color: C.text,
          }}
        >
          {t.overview.title}
        </h2>
        <p
          style={{
            marginTop: 20,
            fontSize: 18,
            lineHeight: 1.7,
            color: C.muted,
            maxWidth: 760,
          }}
        >
          {t.overview.body}
        </p>

        <figure
          style={{
            margin: '40px 0 0',
            borderRadius: 16,
            overflow: 'hidden',
            border: `1px solid ${C.border}`,
            boxShadow: '0 16px 48px rgba(11, 31, 58, 0.10)',
            background: '#05101C',
          }}
        >
          <ArchitectureOverviewImage />
        </figure>

        <div
          style={{
            marginTop: 40,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
          }}
        >
          {ARCHITECTURE_CONCEPTS.map(concept => (
            <article
              key={concept.id}
              className="pdf-card"
              style={{ padding: 24 }}
            >
              <h3
                className="pdf-mono"
                style={{
                  margin: 0,
                  color: PHARMA_TEAL,
                  fontSize: 12,
                  letterSpacing: '0.14em',
                  fontWeight: 600,
                }}
              >
                {t.overview.concepts[concept.id]?.title ?? concept.title}
              </h3>
              <p
                style={{
                  margin: '12px 0 0',
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: C.text,
                }}
              >
                {t.overview.concepts[concept.id]?.body ?? concept.body}
              </p>
            </article>
          ))}
        </div>

        <a
          className="pdf-btn-primary pdf-focus"
          href={ARCHITECTURE_PATH}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            marginTop: 40,
            padding: '12px 20px',
            textDecoration: 'none',
            fontWeight: 600,
            fontSize: 15,
          }}
        >
          {t.overview.cta}
        </a>
      </div>
    </section>
  );
}
