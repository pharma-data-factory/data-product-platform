import { makeStyles } from '@material-ui/core/styles';
import { PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from '../theme/tokens';

const LIBRARY_CHIPS = [
  'REST',
  'MQTT',
  'Storage',
  'Health',
  'Observability',
  'REST Source',
] as const;

const useStyles = makeStyles({
  wrap: {
    marginTop: 16,
  },
  svg: {
    display: 'block',
    height: 'auto',
    maxWidth: 720,
    width: '100%',
  },
  captions: {
    color: '#475569',
    display: 'grid',
    gap: 6,
    marginTop: 12,
  },
  label: {
    color: PHARMA_TEAL,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  copy: {
    fontSize: 14,
    lineHeight: 1.55,
    margin: 0,
  },
});

function chip(x: number, y: number, width: number, label: string) {
  return (
    <g key={label}>
      <rect
        x={x}
        y={y}
        width={width}
        height="28"
        rx="7"
        fill="rgba(0,194,217,0.16)"
        stroke={PHARMA_TEAL}
      />
      <text
        x={x + width / 2}
        y={y + 19}
        textAnchor="middle"
        fill="#99F6E4"
        fontFamily="Space Grotesk, Inter, sans-serif"
        fontSize="12"
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}

function box(
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  variant: 'solid' | 'teal' | 'dashed',
  key: string,
) {
  let fill = PHARMA_NAVY;
  if (variant === 'teal') {
    fill = PHARMA_TEAL;
  } else if (variant === 'dashed') {
    fill = 'rgba(255,255,255,0.06)';
  }
  const stroke = variant === 'dashed' ? 'rgba(255,255,255,0.28)' : PHARMA_TEAL;
  return (
    <g key={key}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="8"
        fill={fill}
        stroke={stroke}
        strokeDasharray={variant === 'dashed' ? '4 4' : undefined}
      />
      <text
        x={x + width / 2}
        y={y + height / 2 + 5}
        textAnchor="middle"
        fill={variant === 'dashed' ? '#CBD5E1' : '#F8FAFC'}
        fontFamily="Space Grotesk, Inter, sans-serif"
        fontSize="13"
        fontWeight={700}
      >
        {label}
      </text>
    </g>
  );
}

/**
 * Canonical composition fork.
 * Existing pattern → Golden Path → Create.
 * New use case → Composer → design-first YAML. Not a second Golden Path.
 */
export function BuildingBlocksVisual() {
  const classes = useStyles();
  const chipWidth = 108;
  const chipGap = 8;
  const row1 = LIBRARY_CHIPS.slice(0, 4);
  const row2 = LIBRARY_CHIPS.slice(4);
  const row1Width = row1.length * chipWidth + (row1.length - 1) * chipGap;
  const row2Width = row2.length * chipWidth + (row2.length - 1) * chipGap;
  const row1Start = (720 - row1Width) / 2;
  const row2Start = (720 - row2Width) / 2;

  return (
    <div className={classes.wrap}>
      <svg
        className={classes.svg}
        viewBox="0 0 720 520"
        role="img"
        aria-label="Component Library composes into an existing Golden Path such as OEE, or a new use case in Composer such as Equipment Use Log as a design-first example"
      >
        <rect width="720" height="520" rx="16" fill={PHARMA_NAVY_DARK} />
        <text
          x="360"
          y="28"
          textAnchor="middle"
          fill={PHARMA_TEAL_LIGHT}
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          fontSize="12"
          fontWeight={600}
          letterSpacing="2"
        >
          PHARMA DATA FACTORY
        </text>
        <rect
          x="70"
          y="42"
          width="580"
          height="96"
          rx="12"
          fill="rgba(0,194,217,0.08)"
          stroke={PHARMA_TEAL}
        />
        <text
          x="360"
          y="64"
          textAnchor="middle"
          fill={PHARMA_TEAL_LIGHT}
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          fontSize="11"
          fontWeight={600}
          letterSpacing="2"
        >
          COMPONENT LIBRARY
        </text>
        {row1.map((label, index) =>
          chip(row1Start + index * (chipWidth + chipGap), 76, chipWidth, label),
        )}
        {row2.map((label, index) =>
          chip(row2Start + index * (chipWidth + chipGap), 108, chipWidth, label),
        )}
        <line
          x1="360"
          y1="138"
          x2="360"
          y2="168"
          stroke={PHARMA_TEAL_LIGHT}
          strokeWidth="2"
        />
        {box(270, 168, 180, 36, 'COMPOSITION', 'teal', 'composition')}
        <path
          d="M360 204 L360 228 L200 228 L200 248"
          fill="none"
          stroke={PHARMA_TEAL_LIGHT}
          strokeWidth="2"
        />
        <path
          d="M360 204 L360 228 L520 228 L520 248"
          fill="none"
          stroke={PHARMA_TEAL_LIGHT}
          strokeWidth="2"
        />
        <text
          x="200"
          y="268"
          textAnchor="middle"
          fill="#94A3B8"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          fontSize="10"
          fontWeight={600}
          letterSpacing="1.4"
        >
          EXISTING PATTERN
        </text>
        <text
          x="520"
          y="268"
          textAnchor="middle"
          fill="#94A3B8"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          fontSize="10"
          fontWeight={600}
          letterSpacing="1.4"
        >
          NEW USE CASE
        </text>
        {box(110, 280, 180, 36, 'Golden Path', 'solid', 'golden-path')}
        {box(430, 280, 180, 36, 'Composer', 'solid', 'composer')}
        {box(110, 332, 180, 36, 'OEE', 'teal', 'oee')}
        {box(430, 332, 180, 36, 'Equipment Use Log', 'dashed', 'equipment-use-log')}
        <text
          x="520"
          y="390"
          textAnchor="middle"
          fill="#94A3B8"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          fontSize="11"
          fontWeight={600}
          letterSpacing="1.6"
        >
          DESIGN FIRST
        </text>
        {box(110, 388, 180, 36, 'Create Product', 'solid', 'create')}
        <text
          x="360"
          y="456"
          textAnchor="middle"
          fill="#94A3B8"
          fontFamily="Inter, Segoe UI, sans-serif"
          fontSize="12"
        >
          Equipment Use Log is a design example. It is not a Golden Path.
        </text>
        <text
          x="360"
          y="478"
          textAnchor="middle"
          fill="#94A3B8"
          fontFamily="Inter, Segoe UI, sans-serif"
          fontSize="12"
        >
          Official Create remains MQTT Temperature, REST Equipment, and OEE.
        </text>
      </svg>
      <div className={classes.captions}>
        <p className={classes.copy}>
          <span className={classes.label}>Existing pattern</span>
          <br />
          Reuse a certified Golden Path and Create the product. OEE is the
          composed example.
        </p>
        <p className={classes.copy}>
          <span className={classes.label}>New use case</span>
          <br />
          Use Composer to select components and export YAML. Domain logic stays
          with the developer. Design first is not Create.
        </p>
      </div>
    </div>
  );
}
