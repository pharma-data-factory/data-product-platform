import { PHARMA_NAVY, PHARMA_TEAL, C } from './landingTokens';
import {
  NEXORA_CARD,
  NEXORA_TONE,
} from '@internal/plugin-nexora-common';

/**
 * High-visibility Model Company entry on the public landing.
 * Does not replace the landing page — additive section only.
 */
export function ModelCompanySection() {
  return (
    <section
      id="model-company"
      aria-label="Explore the Model Company"
      style={{ padding: '96px 24px', background: 'rgba(10, 25, 41, 0.03)' }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <p
          className="pdf-mono"
          style={{
            color: PHARMA_TEAL,
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            margin: '0 0 12px',
          }}
        >
          Explore the Model Company
        </p>
        <h2
          className="pdf-display"
          style={{
            color: PHARMA_NAVY,
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 600,
            margin: '0 0 12px',
            letterSpacing: '-0.02em',
          }}
        >
          Nexora Model Pharma
        </h2>
        <p className="pdf-muted" style={{ maxWidth: 720, fontSize: 17, lineHeight: 1.55, margin: 0 }}>
          Customer Zero for the same UNS, Golden Paths and Data Products customers use —
          synthetic autoinjector manufacturing end-to-end.
        </p>

        <div
          className="pdf-card"
          style={{
            marginTop: 28,
            padding: 28,
            borderColor: 'rgba(0,194,217,0.35)',
            background: NEXORA_CARD,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              marginBottom: 16,
            }}
          >
            <span
              className="pdf-mono"
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(255, 138, 0, 0.14)',
                color: NEXORA_TONE.warning.fg,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              SYNTHETIC
            </span>
            <span
              className="pdf-mono"
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(255, 138, 0, 0.14)',
                color: NEXORA_TONE.warning.fg,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              NON-GXP
            </span>
            <span
              className="pdf-mono"
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                background: 'rgba(255, 138, 0, 0.14)',
                color: NEXORA_TONE.warning.fg,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              UNS-NATIVE
            </span>
          </div>
          <p
            className="pdf-mono"
            style={{ margin: 0, color: PHARMA_TEAL, fontSize: 12, letterSpacing: '0.12em' }}
          >
            Autoinjector End-to-End Manufacturing
          </p>
          <p style={{ margin: '14px 0 0', fontSize: 16, lineHeight: 1.5, color: C.text ?? PHARMA_NAVY }}>
            Autoinjector Drug Product → Assembly → Packaging → Finished Goods
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
            <a
              className="pdf-btn-primary pdf-focus"
              href="/model-company"
              style={{ textDecoration: 'none', padding: '12px 20px' }}
            >
              OPEN MODEL COMPANY
            </a>
            <a
              className="pdf-btn-ghost pdf-focus"
              href="/model-company/campaign"
              style={{ textDecoration: 'none', padding: '12px 20px' }}
            >
              Open Campaign
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
