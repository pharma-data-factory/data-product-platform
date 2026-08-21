import { PHARMA_NAVY, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from './landingTokens';

export function OeeProofDiagram({
  ariaLabel,
  mes,
  machine,
  rest,
  mqtt,
  product,
  formula,
  api,
}: Readonly<{
  ariaLabel: string;
  mes: string;
  machine: string;
  rest: string;
  mqtt: string;
  product: string;
  formula: string;
  api: string;
}>) {
  return (
    <svg
      viewBox="0 0 640 360"
      role="img"
      aria-label={ariaLabel}
      style={{ width: '100%', height: 'auto', display: 'block' }}
    >
      <rect width="640" height="360" rx="16" fill="#05101C" />
      <Box x={64} y={24} width={200} height={44} label={mes} />
      <Box x={376} y={24} width={200} height={44} label={machine} />
      <line x1="164" y1="68" x2="164" y2="96" stroke={PHARMA_TEAL} strokeWidth="2" />
      <line x1="476" y1="68" x2="476" y2="96" stroke={PHARMA_TEAL} strokeWidth="2" />
      <Box x={64} y={96} width={200} height={40} label={rest} muted />
      <Box x={376} y={96} width={200} height={40} label={mqtt} muted />
      <path
        d="M164 136 V168 H476 V136"
        fill="none"
        stroke={PHARMA_TEAL}
        strokeWidth="2"
      />
      <line x1="320" y1="168" x2="320" y2="188" stroke={PHARMA_TEAL} strokeWidth="2" />
      <Box x={170} y={188} width={300} height={48} label={product} accent />
      <text
        x="320"
        y="262"
        textAnchor="middle"
        fill={PHARMA_TEAL_LIGHT}
        fontSize="18"
        fontWeight={700}
        fontFamily="JetBrains Mono, ui-monospace, monospace"
      >
        {formula}
      </text>
      <line x1="320" y1="274" x2="320" y2="296" stroke={PHARMA_TEAL} strokeWidth="2" />
      <Box x={220} y={296} width={200} height={40} label={api} muted />
    </svg>
  );
}

function Box({
  x,
  y,
  width,
  height,
  label,
  muted = false,
  accent = false,
}: Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  muted?: boolean;
  accent?: boolean;
}>) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="10"
        fill={accent ? PHARMA_NAVY : 'rgba(255,255,255,0.06)'}
        stroke={accent ? PHARMA_TEAL : 'rgba(255,255,255,0.16)'}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 + 5}
        textAnchor="middle"
        fill={muted ? '#CBD5E1' : '#F8FAFC'}
        fontSize="14"
        fontWeight={700}
        fontFamily="Space Grotesk, Inter, sans-serif"
      >
        {label}
      </text>
    </g>
  );
}
