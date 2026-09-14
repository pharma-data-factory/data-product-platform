import { LEARN_ASSEMBLY_EXAMPLES, LEARN_TOPICS } from '@internal/platform-common';
import { ArchitectureDiagramStyles } from '../architecture/diagrams';
import { C, PHARMA_NAVY, PHARMA_TEAL } from './landingTokens';
import { useLandingI18n } from './landingI18n';
import {
  NEXORA_CARD,
} from '@internal/plugin-nexora-common';

function AssemblyDiagram() {
  const { t } = useLandingI18n();
  return (
    <div
      className="pdf-diag"
      role="group"
      aria-label={t.learn.assemblyLabel}
    >
      <div className="pdf-diag-flow">
        {t.learn.assemblySteps.map((step, index) => (
          <span key={step} style={{ display: 'contents' }}>
            {index > 0 && (
              <div className="pdf-diag-arrow" aria-hidden="true">
                →
              </div>
            )}
            <span
              className="pdf-diag-node"
              style={{
                background: index === t.learn.assemblySteps.length - 1 ? NEXORA_CARD : 'rgba(0,194,217,0.08)',
                border: `1px solid ${index === t.learn.assemblySteps.length - 1 ? 'rgba(0,194,217,0.45)' : 'rgba(0,194,217,0.35)'}`,
                color: PHARMA_NAVY,
              }}
            >
              {step}
            </span>
          </span>
        ))}
      </div>
      <p className="pdf-diag-layer-title" style={{ marginTop: 20 }}>
        {t.learn.availableToday}
      </p>
      <div className="pdf-diag-nodes">
        {LEARN_ASSEMBLY_EXAMPLES.map(label => (
          <span
            key={label}
            className="pdf-diag-node"
            style={{
              background: NEXORA_CARD,
              border: '1px solid rgba(0,194,217,0.45)',
              color: PHARMA_NAVY,
            }}
          >
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LearnSection() {
  const { t } = useLandingI18n();
  return (
    <section
      id="learn"
      aria-label={t.nav.learn}
      style={{ padding: '96px 24px', background: C.paper }}
    >
      <ArchitectureDiagramStyles />
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ maxWidth: 680, marginBottom: 40 }}>
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
            {t.learn.eyebrow}
          </p>
          <h2
            className="pdf-display"
            style={{
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 600,
              lineHeight: 1.2,
              margin: 0,
              color: PHARMA_NAVY,
            }}
          >
            {t.learn.title}
          </h2>
          <p className="pdf-muted" style={{ marginTop: 16, fontSize: 18, lineHeight: 1.7 }}>
            {t.learn.sub}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {LEARN_TOPICS.map(topic => (
            <article
              key={topic.id}
              id={`learn-${topic.id}`}
              className="pdf-card"
              style={{ padding: 24, scrollMarginTop: 88 }}
            >
              <h3
                className="pdf-display"
                style={{ fontSize: 18, fontWeight: 600, margin: 0, color: PHARMA_NAVY }}
              >
                {t.learn.topics[topic.id]?.title ?? topic.title}
              </h3>
              <p className="pdf-muted" style={{ margin: '12px 0 0', fontSize: 15, lineHeight: 1.7 }}>
                {t.learn.topics[topic.id]?.summary ?? topic.summary}
              </p>
            </article>
          ))}
        </div>

        <div style={{ marginTop: 28 }}>
          <AssemblyDiagram />
        </div>
      </div>
    </section>
  );
}
