import type { CSSProperties, ReactNode } from 'react';
import { PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from './landingTokens';
import { useLandingI18n } from './landingI18n';
import {
  NEXORA_ACCENT,
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';

const STROKE = {
  fill: 'none' as const,
  stroke: PHARMA_TEAL_LIGHT,
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

function Packet({
  x,
  y,
  travel,
  delay,
}: Readonly<{ x: number; y: number; travel: number; delay: string }>) {
  return (
    <circle
      className="gpv-packet"
      cx={x}
      cy={y}
      r="2.8"
      fill={PHARMA_TEAL_LIGHT}
      style={{ '--gpv-travel': `${travel}px`, animationDelay: delay } as CSSProperties}
    />
  );
}

function SceneFrame({
  id,
  label,
  children,
}: Readonly<{ id: string; label: string; children: ReactNode }>) {
  return (
    <div className="gpv" role="img" aria-label={label} data-testid={`golden-path-visual-${id}`}>
      <svg viewBox="0 0 320 128" width="100%" height="128" aria-hidden="true">
        <defs>
          <linearGradient id={`gpv-bg-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={PHARMA_NAVY_DARK} />
            <stop offset="100%" stopColor="#12243A" />
          </linearGradient>
        </defs>
        <rect width="320" height="128" rx="0" fill={`url(#gpv-bg-${id})`} />
        <rect x="0.5" y="0.5" width="319" height="127" rx="0" fill="none" stroke="rgba(0,194,217,0.18)" />
        {children}
      </svg>
    </div>
  );
}

function Caption({
  x,
  y,
  children,
}: Readonly<{ x: number | string; y: number | string; children: string }>) {
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fill={NEXORA_ACCENT.onNavyMuted}
      fontSize="10"
      fontFamily="'JetBrains Mono', ui-monospace, monospace"
      letterSpacing="0.08em"
    >
      {children}
    </text>
  );
}

function MqttScene({ from, via, to }: Readonly<{ from: string; via: string; to: string }>) {
  return (
    <>
      <g className="gpv-float">
        <path {...STROKE} d="M36 28 v28" />
        <circle cx="36" cy="64" r="8" fill="rgba(0,194,217,0.14)" stroke={PHARMA_TEAL} />
        <rect className="gpv-mercury" x="33.2" y="34" width="5.6" height="22" rx="2" fill={PHARMA_TEAL} />
        <path {...STROKE} d="M30 38 h12 M30 44 h12" />
      </g>
      <line x1="48" y1="56" x2="108" y2="56" className="gpv-flow" />
      <line x1="176" y1="56" x2="228" y2="56" className="gpv-flow" />
      <Packet x={48} y={56} travel={60} delay="0s" />
      <Packet x={176} y={56} travel={52} delay="0.8s" />
      <g className="gpv-pulse">
        <path d="M126 44 a18 12 0 0 1 36 0" fill="none" stroke={PHARMA_TEAL} strokeWidth="1.5" />
        <path d="M134 48 a12 8 0 0 1 20 0" fill="none" stroke={PHARMA_TEAL_LIGHT} strokeWidth="1.4" />
        <circle cx="144" cy="56" r="3.2" fill={PHARMA_TEAL_LIGHT} />
      </g>
      <g>
        <rect x="232" y="34" width="60" height="40" rx="8" fill="rgba(0,194,217,0.10)" stroke={PHARMA_TEAL} />
        <path {...STROKE} d="M244 48 h36 M244 56 h24" />
      </g>
      <Caption x="36" y="108">{from}</Caption>
      <Caption x="144" y="108">{via}</Caption>
      <Caption x="262" y="108">{to}</Caption>
    </>
  );
}

function RestScene({ from, via, to }: Readonly<{ from: string; via: string; to: string }>) {
  return (
    <>
      <g>
        <path {...STROKE} d="M22 86 h56 M30 86 V50 h16 v36 M54 86 V58 h18 v28" />
        <path {...STROKE} d="M30 50 l6 -10 h30 l8 10" />
      </g>
      <line x1="86" y1="62" x2="150" y2="62" className="gpv-flow" />
      <line x1="190" y1="62" x2="228" y2="62" className="gpv-flow" />
      <Packet x={86} y={62} travel={64} delay="0.2s" />
      <Packet x={190} y={62} travel={38} delay="1s" />
      <g className="gpv-pulse">
        <circle cx="170" cy="62" r="16" fill="none" stroke={PHARMA_TEAL} />
        <path d="M158 62 h24 M170 50 c6 5 6 19 0 24 M170 50 c-6 5 -6 19 0 24" fill="none" stroke={PHARMA_TEAL_LIGHT} />
      </g>
      <g className="gpv-float">
        <rect x="232" y="40" width="66" height="44" rx="8" fill="rgba(0,194,217,0.10)" stroke={PHARMA_TEAL} />
        <text x="265" y="58" textAnchor="middle" fill={PHARMA_TEAL_LIGHT} fontSize="8" fontFamily="'JetBrains Mono', ui-monospace, monospace">
          equipmentId
        </text>
        <path d="M248 72 l6 6 14 -14" fill="none" stroke={PHARMA_TEAL_LIGHT} strokeWidth="1.6" />
      </g>
      <Caption x="50" y="108">{from}</Caption>
      <Caption x="170" y="108">{via}</Caption>
      <Caption x="265" y="108">{to}</Caption>
    </>
  );
}

function OeeScene({ from, via, to }: Readonly<{ from: string; via: string; to: string }>) {
  return (
    <>
      <g className="gpv-bar-a">
        <rect x="22" y="36" width="44" height="44" rx="10" fill="rgba(0,194,217,0.10)" stroke={PHARMA_TEAL} />
        <text x="44" y="63" textAnchor="middle" fill={PHARMA_TEAL_LIGHT} fontSize="16" fontWeight="600">
          {from}
        </text>
      </g>
      <text x="80" y="64" textAnchor="middle" fill={NEXORA_GREY[400]} fontSize="16">
        ×
      </text>
      <g className="gpv-bar-b">
        <rect x="94" y="36" width="44" height="44" rx="10" fill="rgba(0,194,217,0.10)" stroke={PHARMA_TEAL} />
        <text x="116" y="63" textAnchor="middle" fill={PHARMA_TEAL_LIGHT} fontSize="16" fontWeight="600">
          {via}
        </text>
      </g>
      <text x="152" y="64" textAnchor="middle" fill={NEXORA_GREY[400]} fontSize="16">
        ×
      </text>
      <g className="gpv-bar-c">
        <rect x="166" y="36" width="44" height="44" rx="10" fill="rgba(0,194,217,0.10)" stroke={PHARMA_TEAL} />
        <text x="188" y="63" textAnchor="middle" fill={PHARMA_TEAL_LIGHT} fontSize="16" fontWeight="600">
          {to}
        </text>
      </g>
      <line x1="216" y1="58" x2="236" y2="58" className="gpv-flow" />
      <Packet x={216} y={58} travel={20} delay="0.4s" />
      <g className="gpv-gauge">
        <circle cx="268" cy="58" r="22" fill="rgba(0,194,217,0.08)" stroke="rgba(0,194,217,0.28)" />
        <circle
          className="gpv-arc"
          cx="268"
          cy="58"
          r="16"
          fill="none"
          stroke={PHARMA_TEAL_LIGHT}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="70 100"
        />
        <text x="268" y="62" textAnchor="middle" fill={NEXORA_GREY[50]} fontSize="11" fontWeight="600">
          OEE
        </text>
      </g>
      <Caption x="116" y="108">{`${from} × ${via} × ${to}`}</Caption>
    </>
  );
}

function SnowflakeScene({ from, via, to }: Readonly<{ from: string; via: string; to: string }>) {
  return (
    <>
      <g>
        <rect x="18" y="38" width="52" height="36" rx="8" fill="rgba(0,194,217,0.08)" stroke={PHARMA_TEAL} />
        <path {...STROKE} d="M28 52 h32 M28 60 h20" />
      </g>
      <line x1="76" y1="56" x2="132" y2="56" className="gpv-flow" />
      <line x1="176" y1="56" x2="222" y2="56" className="gpv-flow" />
      <Packet x={76} y={56} travel={56} delay="0.1s" />
      <Packet x={176} y={56} travel={46} delay="0.9s" />
      <g className="gpv-pulse">
        <path
          d="M154 36 l6 12 h12 l-9 8 4 12 -13 -7 -13 7 4 -12 -9 -8 h12 z"
          fill="none"
          stroke={PHARMA_TEAL_LIGHT}
        />
      </g>
      <g className="gpv-float">
        <ellipse cx="258" cy="44" rx="28" ry="9" fill="none" stroke={PHARMA_TEAL} />
        <path d="M230 44 v28 c0 6 12 10 28 10 s28 -4 28 -10 V44" fill="none" stroke={PHARMA_TEAL} />
        <path d="M230 58 c0 6 12 10 28 10 s28 -4 28 -10" fill="none" stroke={PHARMA_TEAL_LIGHT} />
      </g>
      <Caption x="44" y="108">{from}</Caption>
      <Caption x="154" y="108">{via}</Caption>
      <Caption x="258" y="108">{to}</Caption>
    </>
  );
}

function SapScene({ from, via, to }: Readonly<{ from: string; via: string; to: string }>) {
  return (
    <>
      <g>
        <path {...STROKE} d="M28 84 V46 l24 -16 24 16 v38" />
        <path {...STROKE} d="M42 84 v-18 h20 v18" />
        <path {...STROKE} d="M40 56 h10 M54 56 h10" />
      </g>
      <line x1="82" y1="58" x2="128" y2="58" className="gpv-flow" />
      <line x1="188" y1="58" x2="228" y2="58" className="gpv-flow" />
      <Packet x={82} y={58} travel={46} delay="0.15s" />
      <Packet x={188} y={58} travel={40} delay="0.95s" />
      <g className="gpv-pulse">
        <rect x="132" y="38" width="52" height="40" rx="8" fill="rgba(0,194,217,0.08)" stroke={PHARMA_TEAL} />
        <path {...STROKE} d="M144 52 h28 M144 62 h18" />
      </g>
      <g className="gpv-float">
        <rect x="232" y="38" width="62" height="40" rx="8" fill="rgba(0,194,217,0.10)" stroke={PHARMA_TEAL} />
        <path {...STROKE} d="M244 52 h38 M244 62 h24" />
      </g>
      <Caption x="52" y="108">{from}</Caption>
      <Caption x="158" y="108">{via}</Caption>
      <Caption x="263" y="108">{to}</Caption>
    </>
  );
}

function ColdChainScene({ from, via, to }: Readonly<{ from: string; via: string; to: string }>) {
  return (
    <>
      <g>
        <rect x="20" y="36" width="56" height="44" rx="8" fill="rgba(0,194,217,0.08)" stroke={PHARMA_TEAL} />
        <path {...STROKE} d="M32 50 h32 M32 62 h20" />
      </g>
      <line x1="82" y1="58" x2="118" y2="58" className="gpv-flow" />
      <line x1="202" y1="58" x2="228" y2="58" className="gpv-flow" />
      <Packet x={82} y={58} travel={36} delay="0.2s" />
      <Packet x={202} y={58} travel={26} delay="1.1s" />
      <g>
        <rect x="122" y="34" width="74" height="48" rx="8" fill="rgba(0,194,217,0.06)" stroke={PHARMA_TEAL} />
        <line x1="134" y1="46" x2="184" y2="46" stroke="rgba(148,163,184,0.45)" />
        <line x1="134" y1="70" x2="184" y2="70" stroke="rgba(148,163,184,0.45)" />
        <path
          className="gpv-band"
          d="M134 58 C146 50, 158 66, 170 54 S184 58, 184 58"
          fill="none"
          stroke={PHARMA_TEAL_LIGHT}
          strokeWidth="2"
        />
        <circle className="gpv-excursion" cx="170" cy="54" r="3" fill={PHARMA_TEAL_LIGHT} />
      </g>
      <g className="gpv-pulse">
        <rect x="232" y="38" width="66" height="40" rx="8" fill="rgba(0,194,217,0.10)" stroke={PHARMA_TEAL} />
        <path d="M246 58 l8 8 18 -18" fill="none" stroke={PHARMA_TEAL_LIGHT} strokeWidth="1.8" />
      </g>
      <Caption x="48" y="108">{from}</Caption>
      <Caption x="159" y="108">{via}</Caption>
      <Caption x="265" y="108">{to}</Caption>
    </>
  );
}

function AasScene({ from, via, to }: Readonly<{ from: string; via: string; to: string }>) {
  return (
    <>
      <g>
        <rect x="18" y="40" width="48" height="36" rx="6" fill="rgba(0,194,217,0.08)" stroke={PHARMA_TEAL} />
        <path {...STROKE} d="M28 50 h28 M28 62 h16" />
      </g>
      <line x1="72" y1="58" x2="120" y2="58" className="gpv-flow" />
      <line x1="180" y1="58" x2="228" y2="58" className="gpv-flow" />
      <Packet x={72} y={58} travel={48} delay="0.15s" />
      <Packet x={180} y={58} travel={48} delay="0.9s" />
      <g className="gpv-pulse">
        <rect x="124" y="40" width="52" height="36" rx="6" fill="rgba(0,194,217,0.10)" stroke={PHARMA_TEAL} />
        <circle cx="138" cy="52" r="3" fill={PHARMA_TEAL_LIGHT} />
        <circle cx="152" cy="54" r="2.4" fill={PHARMA_TEAL_LIGHT} />
        <circle cx="164" cy="56" r="2" fill={PHARMA_TEAL_LIGHT} />
        <path {...STROKE} d="M138 62 h20" />
      </g>
      <g className="gpv-float">
        <rect x="232" y="40" width="60" height="36" rx="6" fill="rgba(0,194,217,0.10)" stroke={PHARMA_TEAL} />
        <path {...STROKE} d="M244 48 h36 M244 56 h28" />
      </g>
      <Caption x="42" y="108">{from}</Caption>
      <Caption x="152" y="108">{via}</Caption>
      <Caption x="262" y="108">{to}</Caption>
    </>
  );
}

export function GoldenPathVisualStyles() {
  return (
    <style>{`
      .gpv {
        overflow: hidden;
        background: ${PHARMA_NAVY_DARK};
      }
      .gpv svg { display: block; }
      .gpv-flow {
        stroke: ${PHARMA_TEAL};
        stroke-width: 1.4;
        stroke-dasharray: 4 5;
        stroke-linecap: round;
      }
      @media (prefers-reduced-motion: no-preference) {
        .gpv-flow { animation: gpv-dash 1.1s linear infinite; }
        .gpv-float { animation: gpv-float 5.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .gpv-pulse { animation: gpv-pulse 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .gpv-mercury { transform-box: fill-box; transform-origin: bottom center; animation: gpv-mercury 2.8s ease-in-out infinite; }
        .gpv-bar-a, .gpv-bar-b, .gpv-bar-c { animation: gpv-pulse 2.6s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .gpv-bar-b { animation-delay: 0.25s; }
        .gpv-bar-c { animation-delay: 0.5s; }
        .gpv-arc { animation: gpv-arc 3.2s ease-in-out infinite; }
        .gpv-excursion { animation: gpv-excursion 3.6s ease-in-out infinite; transform-box: fill-box; }
        .gpv-packet {
          opacity: 0;
          animation: gpv-packet 2.4s linear infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
      }
      @keyframes gpv-dash { to { stroke-dashoffset: -18; } }
      @keyframes gpv-float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-3px); }
      }
      @keyframes gpv-pulse {
        0%, 100% { opacity: 0.62; }
        50% { opacity: 1; }
      }
      @keyframes gpv-mercury {
        0%, 100% { transform: scaleY(0.62); }
        50% { transform: scaleY(1); }
      }
      @keyframes gpv-arc {
        0%, 100% { stroke-dasharray: 46 100; }
        50% { stroke-dasharray: 82 100; }
      }
      @keyframes gpv-excursion {
        0%, 70%, 100% { transform: translateY(0); opacity: 0.85; }
        82% { transform: translateY(-14px); opacity: 1; }
      }
      @keyframes gpv-packet {
        0% { transform: translateX(0); opacity: 0; }
        12% { opacity: 1; }
        88% { opacity: 1; }
        100% { transform: translateX(var(--gpv-travel, 48px)); opacity: 0; }
      }
      @media (prefers-reduced-motion: reduce) {
        .gpv-flow { stroke-dasharray: none; }
        .gpv-packet { display: none; }
      }
    `}</style>
  );
}

export function GoldenPathVisual({ id }: Readonly<{ id: string }>) {
  const { t } = useLandingI18n();
  const copy = t.goldenPaths.visuals[id];
  if (!copy) {
    return null;
  }

  let scene: ReactNode = null;
  if (id === 'mqtt-temperature') {
    scene = <MqttScene from={copy.from} via={copy.via} to={copy.to} />;
  } else if (id === 'rest-equipment') {
    scene = <RestScene from={copy.from} via={copy.via} to={copy.to} />;
  } else if (id === 'oee') {
    scene = <OeeScene from={copy.from} via={copy.via} to={copy.to} />;
  } else if (id === 'snowflake') {
    scene = <SnowflakeScene from={copy.from} via={copy.via} to={copy.to} />;
  } else if (id === 'sap') {
    scene = <SapScene from={copy.from} via={copy.via} to={copy.to} />;
  } else if (id === 'cold-chain') {
    scene = <ColdChainScene from={copy.from} via={copy.via} to={copy.to} />;
  } else if (id === 'aas-data-product') {
    scene = <AasScene from={copy.from} via={copy.via} to={copy.to} />;
  }

  return (
    <SceneFrame id={id} label={copy.label}>
      {scene}
    </SceneFrame>
  );
}
