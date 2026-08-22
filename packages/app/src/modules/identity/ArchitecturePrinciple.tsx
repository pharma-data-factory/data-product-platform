import { type ReactNode, useEffect, useRef, useState } from 'react';
import { PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from './landingTokens';
import { useLandingI18n } from './landingI18n';
import {
  AAS_CAPABILITIES,
  AAS_UNS_MAPPING,
  FILLER_ASSET_EXAMPLE,
  GOLDEN_PATH_EXAMPLES,
  OEE_GOLDEN_PATH_COMPOSITION,
  PLATFORM_COMPONENT_GROUPS,
  STORY_DATA_PRODUCTS,
  UNS_TRANSPORTS,
  type CapabilityStatus,
} from './platformStoryData';

const animate =
  typeof process === 'undefined' || process.env.NODE_ENV !== 'test';

export const CORE_SYSTEMS = [
  'ERP',
  'MES',
  'LIMS',
  'EWM',
  'Historian',
  'CMO Platforms',
  'PLC / SCADA',
  'Other IT/OT',
] as const;

export const INTERFACES = ['APIs', 'Events', 'MQTT', 'REST', 'Files / Streams'] as const;

export const FACTORY_CAPABILITIES = [
  'Golden Paths',
  'Data Contracts',
  'Quality Gates',
  'Compatibility',
  'CI/CD',
  'Catalog',
  'Governance',
  'Versioning',
] as const;

export const ARCHITECTURE_BENEFITS = [
  'Reduce unnecessary core customization',
  'Decouple digital innovation from core release cycles',
  'Faster time to value',
  'Governed Data Products',
  'Independent versioning',
  'Reusable capabilities',
] as const;

export const DATA_PRODUCTS = [
  {
    id: 'temperature',
    name: 'Temperature',
    status: 'certified' as const,
    protocol: 'MQTT',
    enterAt: 7,
  },
  {
    id: 'equipment',
    name: 'Equipment',
    status: 'certified' as const,
    protocol: 'REST',
    enterAt: 7,
  },
  {
    id: 'quality',
    name: 'Quality',
    status: 'illustrative' as const,
    enterAt: 7,
  },
  {
    id: 'oee',
    name: 'OEE',
    status: 'certified' as const,
    protocol: 'MQTT+REST',
    enterAt: 7,
  },
  {
    id: 'cold-chain',
    name: 'Cold Chain',
    status: 'illustrative' as const,
    enterAt: 7,
  },
] as const;

const CORE_STUB_X = [6.25, 18.75, 31.25, 43.75, 56.25, 68.75, 81.25, 93.75];
const PIPE_X = [10, 30, 50, 70, 90];
const PARTICLE_DELAYS = ['0s', '0.5s', '1s', '1.5s', '0.25s', '0.75s', '1.25s', '1.75s', '0.4s', '1.1s'];

/** 1 cores · 2 AAS · 3 sensors · 4 UNS · 5 components · 6 golden path · 7 products · 8 version · 9 core stays · 10 control plane · 11 finale */
export const ARCHITECTURE_FINAL_STAGE = 11;
const STAGE_DELAYS_MS = [0, 420, 900, 1500, 2200, 2900, 3600, 4300, 5000, 5700, 6500];

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

function initialStage(): number {
  if (!animate || prefersReducedMotion()) {
    return ARCHITECTURE_FINAL_STAGE;
  }
  return 0;
}

function ArchitectureStyles() {
  return (
    <style>{`
      .pdf-arch {
        position: relative;
        overflow: hidden;
        padding: 112px 24px 96px;
        color: #F8FAFC;
        background: linear-gradient(180deg, #123152 0%, ${PHARMA_NAVY} 22%, ${PHARMA_NAVY_DARK} 100%);
      }
      .pdf-arch-inner { max-width: 1280px; margin: 0 auto; position: relative; }
      .pdf-arch-copy { max-width: 760px; margin-bottom: 56px; }
      .pdf-arch-viz {
        width: 100%;
        max-width: 1180px;
        margin: 0 auto;
        display: flex;
        flex-direction: column-reverse;
        gap: 28px;
      }
      .pdf-arch-layer {
        opacity: 0;
        transform: translateY(20px);
        transition: opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1);
        pointer-events: none;
      }
      .pdf-arch-layer.pdf-arch-on {
        opacity: 1;
        transform: none;
        pointer-events: auto;
      }
      .pdf-arch-cores {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
      }
      .pdf-arch-core {
        text-align: center;
        padding: 16px 8px;
        min-height: 72px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 16px;
        backdrop-filter: blur(14px);
        font-size: 13px;
        font-weight: 600;
        line-height: 1.3;
        color: #E2E8F0;
      }
      .pdf-arch-stable {
        margin-top: 16px;
        text-align: center;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity .6s ease, transform .6s cubic-bezier(.2,.8,.2,1);
      }
      .pdf-arch-stable.pdf-arch-on { opacity: 1; transform: none; }
      .pdf-arch-iface {
        position: relative;
        min-height: 124px;
        clip-path: inset(100% 0 0 0);
        transition: clip-path 1.15s cubic-bezier(.2,.8,.2,1);
      }
      .pdf-arch-iface.pdf-arch-on { clip-path: inset(0 0 0 0); }
      .pdf-arch-iface-labels {
        position: relative;
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        text-align: center;
        z-index: 1;
      }
      .pdf-arch-svg { width: 100%; height: 88px; display: block; overflow: visible; }
      .pdf-arch-pipe {
        stroke: ${PHARMA_TEAL_LIGHT};
        stroke-width: 0.7;
        stroke-dasharray: 3 3;
        opacity: 0.72;
        animation: pdf-arch-dash 1.2s linear infinite;
      }
      .pdf-arch-collector {
        stroke: ${PHARMA_TEAL};
        stroke-width: 0.55;
        opacity: 0.45;
      }
      .pdf-arch-stub {
        stroke: rgba(148,163,184,0.55);
        stroke-width: 0.5;
      }
      .pdf-arch-particle {
        position: absolute;
        width: 5px;
        height: 5px;
        margin-left: -2.5px;
        border-radius: 50%;
        background: ${PHARMA_TEAL_LIGHT};
        box-shadow: 0 0 8px ${PHARMA_TEAL_LIGHT};
        opacity: 0;
        animation: pdf-arch-rise 2.6s ease-in-out infinite;
        pointer-events: none;
      }
      .pdf-arch-panel {
        border-radius: 16px;
        padding: 16px 22px 18px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        backdrop-filter: blur(14px);
      }
      .pdf-arch-factory {
        display: flex;
        flex-direction: column;
        gap: 12px;
        align-items: center;
        box-shadow: inset 3px 0 0 ${PHARMA_TEAL};
      }
      .pdf-arch-gov {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px 16px;
      }
      .pdf-arch-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .pdf-arch-chip {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.12);
        font-size: 12px;
        font-weight: 600;
      }
      .pdf-arch-groups {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 12px;
      }
      .pdf-arch-tree {
        margin: 12px 0 0;
        padding: 12px 14px;
        border-radius: 12px;
        background: rgba(7,21,37,0.45);
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 13px;
        line-height: 1.7;
        color: #CBD5E1;
        opacity: 0;
        transform: translateY(8px);
        transition: opacity .55s ease, transform .55s cubic-bezier(.2,.8,.2,1);
      }
      .pdf-arch-tree.pdf-arch-on { opacity: 1; transform: none; }
      .pdf-arch-map {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        gap: 12px;
        align-items: center;
        margin-top: 12px;
      }
      .pdf-arch-map-box {
        padding: 12px;
        border-radius: 12px;
        background: rgba(7,21,37,0.4);
        font-size: 13px;
        line-height: 1.55;
      }
      .pdf-arch-products {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 16px;
        align-items: start;
      }
      .pdf-arch-dp {
        padding: 18px 14px;
        border-radius: 16px;
        background: rgba(255,255,255,0.06);
        border: 1px solid rgba(255,255,255,0.12);
        backdrop-filter: blur(14px);
        text-align: center;
        opacity: 0;
        transform: translateY(18px);
        transition: opacity .65s ease, transform .65s cubic-bezier(.2,.8,.2,1), border-color .4s, box-shadow .4s, background .4s;
      }
      .pdf-arch-dp.pdf-arch-on {
        opacity: 1;
        transform: translateY(0);
        animation: pdf-arch-float 7s ease-in-out 0.7s infinite;
      }
      .pdf-arch-products .pdf-arch-dp:nth-child(odd) { margin-top: 0; }
      .pdf-arch-products .pdf-arch-dp:nth-child(even) { margin-top: 22px; }
      .pdf-arch-dp.pdf-arch-evolve {
        border-color: rgba(0,194,217,0.55);
        box-shadow: 0 0 0 1px rgba(0,194,217,0.28), 0 12px 40px rgba(0,194,217,0.16);
        background: rgba(0,194,217,0.08);
      }
      .pdf-arch-ver {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        margin-top: 10px;
        min-height: 18px;
      }
      .pdf-arch-ver-next {
        color: ${PHARMA_TEAL_LIGHT};
        opacity: 0;
        transform: translateX(-6px);
        transition: opacity .5s ease, transform .5s cubic-bezier(.2,.8,.2,1);
      }
      .pdf-arch-ver-next.pdf-arch-on { opacity: 1; transform: none; }
      .pdf-arch-finale {
        margin-top: 48px;
        text-align: center;
        opacity: 0;
        transform: translateY(12px);
        transition: opacity .7s ease, transform .7s cubic-bezier(.2,.8,.2,1);
      }
      .pdf-arch-finale.pdf-arch-on { opacity: 1; transform: none; }
      .pdf-arch-benefits {
        margin-top: 28px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
        text-align: left;
      }
      .pdf-arch-benefit {
        padding: 14px 16px;
        border-radius: 16px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.10);
        backdrop-filter: blur(14px);
        font-size: 14px;
        line-height: 1.5;
        color: #CBD5E1;
      }
      .pdf-arch-mobile-label { display: none; }
      .pdf-arch-arrow { display: none; }
      .pdf-arch-factory-title { display: block; }
      .pdf-arch-msg {
        margin: 8px 0 0;
        font-size: 13px;
        line-height: 1.55;
        color: #94A3B8;
      }
      .pdf-arch-sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      @keyframes pdf-arch-dash { to { stroke-dashoffset: -18; } }
      @keyframes pdf-arch-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-8px); }
      }
      @keyframes pdf-arch-rise {
        0% { opacity: 0; transform: translateY(0); }
        18% { opacity: 0.95; }
        70% { opacity: 0.55; }
        100% { opacity: 0; transform: translateY(-96px); }
      }

      @media (max-width: 1100px) {
        .pdf-arch-viz { gap: 22px; }
        .pdf-arch-cores { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; }
        .pdf-arch-core { padding: 12px 8px; font-size: 13px; min-height: 64px; }
        .pdf-arch-products { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        .pdf-arch-dp { padding: 14px 12px; }
        .pdf-arch-products .pdf-arch-dp:nth-child(even) { margin-top: 0; }
        .pdf-arch-groups { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .pdf-arch-map { grid-template-columns: 1fr; }
        .pdf-arch-benefits { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }

      @media (max-width: 700px) {
        .pdf-arch { padding: 88px 24px 72px; }
        .pdf-arch-viz {
          flex-direction: column;
          gap: 0;
        }
        .pdf-arch-mobile-label {
          display: block;
          text-align: center;
          margin-bottom: 16px;
        }
        .pdf-arch-arrow {
          display: flex;
          justify-content: center;
          color: ${PHARMA_TEAL_LIGHT};
          font-size: 20px;
          line-height: 1;
          padding: 18px 0;
          opacity: 0.85;
        }
        .pdf-arch-cores { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .pdf-arch-products { grid-template-columns: 1fr; gap: 12px; }
        .pdf-arch-products .pdf-arch-dp:nth-child(even),
        .pdf-arch-products .pdf-arch-dp:nth-child(odd) { margin-top: 0; }
        .pdf-arch-groups { grid-template-columns: 1fr; }
        .pdf-arch-iface { min-height: 104px; }
        .pdf-arch-iface-labels { font-size: 10px; }
        .pdf-arch-layer, .pdf-arch-dp { transform: none; }
        .pdf-arch-factory-title { display: none; }
        .pdf-arch-benefits { grid-template-columns: 1fr; }
      }

      @media (prefers-reduced-motion: reduce) {
        .pdf-arch-layer,
        .pdf-arch-stable,
        .pdf-arch-dp,
        .pdf-arch-finale,
        .pdf-arch-ver-next,
        .pdf-arch-tree,
        .pdf-arch-iface {
          opacity: 1 !important;
          transform: none !important;
          clip-path: none !important;
          transition: none !important;
        }
        .pdf-arch-pipe, .pdf-arch-particle, .pdf-arch-dp { animation: none !important; }
        .pdf-arch-particle { opacity: 0.7; }
      }
    `}</style>
  );
}

function useArchitectureStage() {
  const ref = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(initialStage);

  useEffect(() => {
    if (!animate || prefersReducedMotion()) {
      setStage(ARCHITECTURE_FINAL_STAGE);
      return undefined;
    }

    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setStage(ARCHITECTURE_FINAL_STAGE);
      return undefined;
    }

    const timers: number[] = [];
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }
        io.disconnect();
        STAGE_DELAYS_MS.forEach((ms, index) => {
          timers.push(window.setTimeout(() => setStage(index + 1), ms));
        });
      },
      { threshold: 0.18 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(id => window.clearTimeout(id));
    };
  }, []);

  return { ref, stage };
}

function LayerLabel({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      className="pdf-arch-mobile-label pdf-mono"
      style={{
        color: PHARMA_TEAL_LIGHT,
        fontSize: 12,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  );
}

function StoryArrow() {
  return (
    <div className="pdf-arch-arrow" aria-hidden="true">
      ↓
    </div>
  );
}

function LayerTitle({ children }: { children: ReactNode }) {
  return (
    <div
      className="pdf-mono pdf-arch-factory-title"
      style={{
        color: PHARMA_TEAL_LIGHT,
        fontSize: 12,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        fontWeight: 600,
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function statusBadgeColor(certified: boolean, future: boolean): string {
  if (certified) {
    return PHARMA_TEAL_LIGHT;
  }
  if (future) {
    return '#94A3B8';
  }
  return '#CBD5E1';
}

export function StoryStatusBadge({ status }: { status: CapabilityStatus | 'illustrative' }) {
  const certified = status === 'CERTIFIED';
  const future = status === 'FUTURE' || status === 'PLANNED' || status === 'illustrative';
  const label = status === 'illustrative' ? 'FUTURE' : status;
  return (
    <span
      className="pdf-mono"
      aria-label={`Status ${label}`}
      style={{
        display: 'inline-block',
        fontSize: 10,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 999,
        background: certified ? 'rgba(0,194,217,0.14)' : 'rgba(71,85,105,0.18)',
        color: statusBadgeColor(certified, future),
        border: certified
          ? '1px solid rgba(0,194,217,0.45)'
          : '1px solid rgba(148,163,184,0.28)',
      }}
    >
      {label}
    </span>
  );
}

function ProductChip({
  status,
  protocol,
}: {
  status: 'certified' | 'illustrative';
  protocol?: string;
}) {
  const { t } = useLandingI18n();
  const certified = status === 'certified';
  return (
    <span
      className="pdf-mono"
      style={{
        display: 'inline-block',
        marginTop: 8,
        fontSize: 10,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        padding: '3px 8px',
        borderRadius: 999,
        background: certified ? 'rgba(0,194,217,0.14)' : 'rgba(71,85,105,0.18)',
        color: certified ? PHARMA_TEAL_LIGHT : '#94A3B8',
        border: certified ? '1px solid rgba(0,194,217,0.45)' : '1px solid rgba(148,163,184,0.28)',
      }}
    >
      {certified ? `${protocol} · ${t.principle.certified}` : t.principle.illustrative}
    </span>
  );
}

export function ArchitecturePrinciple() {
  const { t } = useLandingI18n();
  const { ref, stage } = useArchitectureStage();
  const coresOn = stage >= 1;
  const stableOn = stage >= 1;
  const aasOn = stage >= 2;
  const sensorsOn = stage >= 3;
  const ifaceOn = stage >= 4;
  const componentsOn = stage >= 5;
  const goldenOn = stage >= 6;
  const evolveOn = stage >= 8;
  const factoryOn = stage >= 10;
  const finaleOn = stage >= 11;

  return (
    <section
      id="architecture"
      ref={ref}
      className="pdf-arch pdf-grid-bg"
      aria-label="Architecture principle"
    >
      <ArchitectureStyles />
      <div
        className="pdf-hero-glow"
        style={{ width: 380, height: 380, top: 40, left: -60, background: PHARMA_TEAL, opacity: 0.2 }}
      />
      <div
        className="pdf-hero-glow"
        style={{
          width: 320,
          height: 320,
          top: 180,
          right: -80,
          background: '#1E3A5F',
          opacity: 0.35,
          animationDelay: '-8s',
        }}
      />
      <div className="pdf-arch-inner">
        <div className="pdf-arch-copy">
          <div
            className="pdf-mono"
            style={{
              color: PHARMA_TEAL_LIGHT,
              fontSize: 12,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span style={{ display: 'inline-block', width: 24, height: 1, background: PHARMA_TEAL_LIGHT }} />
            <span>{t.principle.eyebrow}</span>
          </div>
          <h2
            className="pdf-display"
            style={{
              fontSize: 'clamp(32px, 4.6vw, 48px)',
              fontWeight: 600,
              lineHeight: 1.15,
              margin: 0,
              whiteSpace: 'pre-line',
            }}
          >
            {t.principle.title}
          </h2>
          <p style={{ marginTop: 20, fontSize: 18, lineHeight: 1.7, color: '#CBD5E1', maxWidth: 720 }}>
            {t.principle.body1}
          </p>
          <p style={{ marginTop: 12, fontSize: 18, lineHeight: 1.7, color: '#CBD5E1', maxWidth: 720 }}>
            {t.principle.body2}
          </p>
        </div>

        <p className="pdf-arch-sr-only">
          {t.principle.srOnly}
        </p>

        <div
          className="pdf-arch-viz"
          aria-label="Keep core systems standard and innovate through Data Products"
        >
          <div className={`pdf-arch-layer${coresOn ? ' pdf-arch-on' : ''}`}>
            <LayerLabel>{t.principle.layers.standard}</LayerLabel>
            <div className="pdf-arch-cores" aria-label="Standard and stable IT/OT core">
              {CORE_SYSTEMS.map(name => (
                <div key={name} className="pdf-arch-core pdf-display">
                  {name}
                </div>
              ))}
            </div>
            <div className={`pdf-arch-stable${stableOn ? ' pdf-arch-on' : ''}`}>
              <span
                className="pdf-mono"
                style={{
                  color: '#94A3B8',
                  fontSize: 11,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                }}
              >
                {t.principle.captions.stableCore}
              </span>
              <p className="pdf-arch-msg">{t.principle.captions.systemsOfRecord}</p>
            </div>
          </div>

          <StoryArrow />

          <div
            className={`pdf-arch-layer${aasOn ? ' pdf-arch-on' : ''}`}
            aria-label="Asset Administration Shell"
          >
            <LayerLabel>{t.principle.layers.aas}</LayerLabel>
            <div className="pdf-arch-panel">
              <LayerTitle>{t.principle.layers.aas}</LayerTitle>
              <div className="pdf-arch-chips" aria-label="AAS capabilities">
                {AAS_CAPABILITIES.map(label => (
                  <span key={label} className="pdf-arch-chip">
                    {label}
                  </span>
                ))}
              </div>
              <p className="pdf-arch-msg">
                {t.principle.captions.aas}
              </p>
              <div
                className={`pdf-arch-tree${sensorsOn ? ' pdf-arch-on' : ''}`}
                aria-label="Filler 01 asset example"
              >
                {FILLER_ASSET_EXAMPLE.name}
                {'\n'}
                {FILLER_ASSET_EXAMPLE.properties.map((property, index) => {
                  const last = index === FILLER_ASSET_EXAMPLE.properties.length - 1;
                  return `\n  ${last ? '└─' : '├─'} ${property}`;
                })}
              </div>
            </div>
          </div>

          <StoryArrow />

          <div
            className={`pdf-arch-iface${ifaceOn ? ' pdf-arch-on' : ''}`}
            aria-label="Governed interfaces"
          >
            <LayerLabel>{t.principle.layers.uns}</LayerLabel>
            <LayerTitle>{t.principle.layers.uns}</LayerTitle>
            <div className="pdf-arch-iface-labels">
              {INTERFACES.map(label => (
                <span
                  key={label}
                  className="pdf-mono"
                  style={{
                    color: PHARMA_TEAL_LIGHT,
                    fontSize: 11,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
            <svg className="pdf-arch-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
              <line className="pdf-arch-collector" x1="3" y1="86" x2="97" y2="86" />
              {CORE_STUB_X.map(x => (
                <line key={`stub-${x}`} className="pdf-arch-stub" x1={x} y1="100" x2={x} y2="86" />
              ))}
              {PIPE_X.map(x => (
                <g key={`pipe-${x}`}>
                  <line className="pdf-arch-pipe" x1={x} y1="86" x2={x} y2="18" />
                  <circle cx={x} cy="18" r="1.15" fill={PHARMA_TEAL_LIGHT} opacity="0.9" />
                </g>
              ))}
            </svg>
            {ifaceOn &&
              PIPE_X.flatMap((x, i) => [
                <span
                  key={`p-${i}`}
                  className="pdf-arch-particle"
                  style={{ left: `${x}%`, bottom: 14, animationDelay: PARTICLE_DELAYS[i] }}
                  aria-hidden="true"
                />,
                <span
                  key={`p2-${i}`}
                  className="pdf-arch-particle"
                  style={{
                    left: `${x}%`,
                    bottom: 14,
                    animationDelay: PARTICLE_DELAYS[i + 5],
                    animationDuration: '3.1s',
                  }}
                  aria-hidden="true"
                />,
              ])}
            <div className="pdf-arch-chips" style={{ marginTop: 8 }} aria-label="UNS transports">
              {UNS_TRANSPORTS.map(item => (
                <span key={item.label} className="pdf-arch-chip">
                  {item.label}
                  <StoryStatusBadge status={item.status} />
                </span>
              ))}
            </div>
            <p className="pdf-arch-msg">
              {t.principle.captions.uns}
            </p>
            <div className="pdf-arch-map" aria-label="AAS to UNS mapping">
              <div className="pdf-arch-map-box">
                <strong>AAS</strong>
                <div>Asset: {AAS_UNS_MAPPING.asset}</div>
                <div>Property: {AAS_UNS_MAPPING.property}</div>
                <div>Unit: {AAS_UNS_MAPPING.unit}</div>
              </div>
              <div className="pdf-mono" style={{ color: PHARMA_TEAL_LIGHT, textAlign: 'center' }}>
                {t.principle.mapsTo}
              </div>
              <div className="pdf-arch-map-box">
                <strong>UNS</strong>
                <div>{AAS_UNS_MAPPING.topic}</div>
              </div>
            </div>
          </div>

          <StoryArrow />

          <div
            className={`pdf-arch-layer${componentsOn ? ' pdf-arch-on' : ''}`}
            aria-label="Platform Components"
          >
            <LayerLabel>{t.principle.layers.components}</LayerLabel>
            <div className="pdf-arch-groups">
              {PLATFORM_COMPONENT_GROUPS.map(group => (
                <div key={group.id} className="pdf-arch-panel" aria-label={group.title}>
                  <LayerTitle>{group.title}</LayerTitle>
                  {group.items.map(item => (
                    <div
                      key={item.name}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      <span style={{ fontSize: 13 }}>{item.name}</span>
                      <StoryStatusBadge status={item.status} />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <StoryArrow />

          <div
            className={`pdf-arch-layer${goldenOn ? ' pdf-arch-on' : ''}`}
            aria-label="Golden Path composition"
          >
            <LayerLabel>{t.principle.layers.goldenPaths}</LayerLabel>
            <div className="pdf-arch-panel">
              <LayerTitle>{t.principle.captions.goldenCompose}</LayerTitle>
              <div className="pdf-arch-chips" aria-label="Golden Path examples">
                {GOLDEN_PATH_EXAMPLES.map(item => (
                  <span key={item.name} className="pdf-arch-chip">
                    {item.name}
                    <StoryStatusBadge status={item.status} />
                  </span>
                ))}
              </div>
              <p className="pdf-arch-msg">
                {t.principle.captions.goldenExamples}
              </p>
              <div aria-label="OEE Golden Path composition" style={{ marginTop: 12 }}>
                <div className="pdf-mono" style={{ color: PHARMA_TEAL_LIGHT, fontSize: 11, letterSpacing: '0.12em' }}>
                  OEE GOLDEN PATH
                </div>
                <div className="pdf-arch-chips" style={{ marginTop: 8 }}>
                  {OEE_GOLDEN_PATH_COMPOSITION.map(item => (
                    <span key={item.name} className="pdf-arch-chip">
                      {item.name}
                      <StoryStatusBadge status={item.status} />
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <StoryArrow />

          <div aria-label="Data Products">
            <LayerLabel>{t.principle.layers.products}</LayerLabel>
            <div className="pdf-arch-products">
              {DATA_PRODUCTS.map(product => {
                const on = stage >= product.enterAt;
                const isEquipment = product.id === 'equipment';
                const story = STORY_DATA_PRODUCTS.find(item => item.id === product.id);
                return (
                  <article
                    key={product.id}
                    className={`pdf-arch-dp${on ? ' pdf-arch-on' : ''}${
                      isEquipment && evolveOn ? ' pdf-arch-evolve' : ''
                    }`}
                    aria-label={`${product.name} Data Product`}
                  >
                    <div className="pdf-display" style={{ fontSize: 16, fontWeight: 600 }}>
                      {product.name}
                    </div>
                    <div className="pdf-mono" style={{ fontSize: 11, color: '#94A3B8', marginTop: 4, letterSpacing: '0.08em' }}>
                      {t.principle.dataProductKind}
                    </div>
                    <ProductChip
                      status={product.status}
                      protocol={'protocol' in product ? product.protocol : undefined}
                    />
                    {story ? (
                      <div style={{ marginTop: 8 }}>
                        <StoryStatusBadge status={story.status} />
                      </div>
                    ) : null}
                    {isEquipment && on && (
                      <div className="pdf-arch-ver pdf-mono" style={{ fontSize: 12, color: '#CBD5E1' }}>
                        <span>v1.0</span>
                        <span
                          className={`pdf-arch-ver-next${evolveOn ? ' pdf-arch-on' : ''}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
                        >
                          <span style={{ color: PHARMA_TEAL }}>→</span>
                          <span>v1.1</span>
                        </span>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
            <p className="pdf-arch-msg" style={{ textAlign: 'center' }}>
              {t.principle.captions.dataProduct}
            </p>
          </div>

          <StoryArrow />

          <div
            className={`pdf-arch-layer${factoryOn ? ' pdf-arch-on' : ''}`}
            aria-label={t.principle.layers.factory}
          >
            <LayerLabel>{t.principle.layers.factory}</LayerLabel>
            <div className="pdf-arch-factory pdf-arch-panel">
              <div
                className="pdf-mono pdf-arch-factory-title"
                style={{
                  color: PHARMA_TEAL_LIGHT,
                  fontSize: 12,
                  letterSpacing: '0.16em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                {t.principle.layers.factory}
              </div>
              <div className="pdf-arch-gov">
                {FACTORY_CAPABILITIES.map(label => (
                  <span
                    key={label}
                    className="pdf-mono"
                    style={{
                      color: '#94A3B8',
                      fontSize: 11,
                      letterSpacing: '0.10em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
              <p className="pdf-arch-msg" style={{ textAlign: 'center' }}>
                {t.principle.captions.controlPlane}
              </p>
            </div>
          </div>
        </div>

        <div className={`pdf-arch-finale${finaleOn ? ' pdf-arch-on' : ''}`}>
          <p
            className="pdf-mono"
            style={{
              margin: 0,
              color: PHARMA_TEAL_LIGHT,
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: '0.14em',
              lineHeight: 1.8,
              textTransform: 'uppercase',
              whiteSpace: 'pre-line',
            }}
          >
            {t.principle.finale}
          </p>
          <div className="pdf-arch-benefits" aria-label={t.principle.benefitsLabel}>
            {t.principle.benefits.map(benefit => (
              <div key={benefit} className="pdf-arch-benefit">
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
