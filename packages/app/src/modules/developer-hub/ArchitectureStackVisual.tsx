import { makeStyles } from '@material-ui/core/styles';
import {
  PHARMA_NAVY,
  PHARMA_NAVY_DARK,
  PHARMA_TEAL,
  PHARMA_TEAL_LIGHT,
} from '../theme/tokens';

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
  caption: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 1.55,
    margin: '12px 0 0',
  },
});

function chipWidth(label: string): number {
  return Math.round(label.length * 7.4 + 26);
}

function chip(x: number, y: number, width: number, label: string) {
  return (
    <g key={label}>
      <rect
        x={x}
        y={y}
        width={width}
        height={26}
        rx={7}
        fill="rgba(255,255,255,0.07)"
        stroke={PHARMA_TEAL}
        strokeWidth={1}
      />
      <text
        x={x + width / 2}
        y={y + 17}
        textAnchor="middle"
        fill="#E2E8F0"
        fontFamily="Space Grotesk, Inter, sans-serif"
        fontSize={11.5}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}

function chipRow(items: string[], x: number, y: number, available: number) {
  const gap = 8;
  const widths = items.map(chipWidth);
  const total = widths.reduce((sum, w) => sum + w, 0) + gap * (items.length - 1);
  let cursor = x + (available - total) / 2;
  return items.map((label, index) => {
    const node = chip(cursor, y, widths[index], label);
    cursor += widths[index] + gap;
    return node;
  });
}

function Connector({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={PHARMA_TEAL_LIGHT} strokeWidth={2} />
      <polygon
        points={`${x},${y1} ${x - 5},${y1 + 8} ${x + 5},${y1 + 8}`}
        fill={PHARMA_TEAL_LIGHT}
      />
    </g>
  );
}

const MONO_FONT = 'JetBrains Mono, ui-monospace, monospace';
const DISPLAY_FONT = 'Space Grotesk, Inter, sans-serif';

/**
 * Canonical platform stack: Data Products sit on Nexora,
 * which sits on the open-source Backstage platform kernel.
 */
export function ArchitectureStackVisual() {
  const classes = useStyles();

  return (
    <div className={classes.wrap}>
      <svg
        className={classes.svg}
        viewBox="0 0 720 480"
        role="img"
        aria-label="Layered architecture: Data Products sit on Nexora, which sits on the open-source Backstage platform kernel"
      >
        <rect width="720" height="480" rx="16" fill={PHARMA_NAVY_DARK} />
        <text
          x="360"
          y="30"
          textAnchor="middle"
          fill={PHARMA_TEAL_LIGHT}
          fontFamily={MONO_FONT}
          fontSize="12"
          fontWeight={600}
          letterSpacing="2"
        >
          PLATFORM ARCHITECTURE
        </text>

        {/* Layer 3 — Data Products */}
        <rect
          x="150"
          y="50"
          width="420"
          height="60"
          rx="12"
          fill={PHARMA_TEAL}
        />
        <text
          x="360"
          y="74"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily={DISPLAY_FONT}
          fontSize="14"
          fontWeight={700}
        >
          DATA PRODUCTS
        </text>
        <text
          x="360"
          y="96"
          textAnchor="middle"
          fill="rgba(255,255,255,0.85)"
          fontFamily="Inter, Segoe UI, sans-serif"
          fontSize="12"
        >
          independent services · your domain logic
        </text>

        <Connector x={360} y1={110} y2={142} />

        {/* Layer 2 — Nexora */}
        <rect
          x="96"
          y="142"
          width="528"
          height="124"
          rx="12"
          fill={PHARMA_NAVY}
          stroke={PHARMA_TEAL}
          strokeWidth={1.5}
        />
        <text
          x="112"
          y="166"
          fill={PHARMA_TEAL_LIGHT}
          fontFamily={MONO_FONT}
          fontSize="12"
          fontWeight={600}
          letterSpacing="2"
        >
          NEXORA
        </text>
        <text
          x="112"
          y="184"
          fill="#94A3B8"
          fontFamily="Inter, Segoe UI, sans-serif"
          fontSize="11"
        >
          product &amp; extension layer
        </text>
        {chipRow(
          ['Data Product Standard', 'Platform Components', 'SDK'],
          112,
          198,
          496,
        )}
        {chipRow(['Contracts & Quality', 'Golden Paths', 'Composer'], 112, 232, 496)}

        <Connector x={360} y1={266} y2={300} />

        {/* Layer 1 — Backstage */}
        <rect
          x="40"
          y="300"
          width="640"
          height="140"
          rx="12"
          fill="rgba(0,194,217,0.08)"
          stroke={PHARMA_TEAL}
          strokeWidth={1.5}
        />
        <text
          x="56"
          y="324"
          fill={PHARMA_TEAL_LIGHT}
          fontFamily={MONO_FONT}
          fontSize="12"
          fontWeight={600}
          letterSpacing="2"
        >
          BACKSTAGE
        </text>
        <text
          x="56"
          y="342"
          fill="#94A3B8"
          fontFamily="Inter, Segoe UI, sans-serif"
          fontSize="11"
        >
          open-source platform kernel · everything sits on this
        </text>
        {chipRow(['Catalog', 'Scaffolder', 'TechDocs', 'Search'], 56, 356, 608)}
        {chipRow(['Identity & RBAC', 'Plugin System', 'Auth'], 56, 390, 608)}
      </svg>
      <p className={classes.caption}>
        Backstage is the kernel. Nexora extends it with the Data
        Product standard, Platform Components and Golden Paths. Data Products
        are the independent services you ship on top — never a second Backstage
        fork.
      </p>
    </div>
  );
}
