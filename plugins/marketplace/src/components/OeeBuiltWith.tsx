import { Link } from '@backstage/core-components';
import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  NEXORA_ACCENT,
  NEXORA_CARD,
  NEXORA_DARK,
  NEXORA_GREY,
  NEXORA_TONE,
} from '@internal/plugin-nexora-common';
import {
  OeeBuiltWithSummary,
  documentationHref,
  platformComponentPath,
} from '@internal/platform-common';

const useStyles = makeStyles({
  wrap: {
    marginTop: 8,
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    margin: '12px 0',
  },
  chip: {
    background: NEXORA_DARK.paper,
    borderRadius: 10,
    color: `${NEXORA_GREY[50]} !important`,
    fontSize: 12,
    fontWeight: 600,
    padding: '8px 12px',
    textDecoration: 'none',
    '&:hover, &:focus-visible': {
      background: NEXORA_TONE.success.bg,
      outline: 'none',
      textDecoration: 'none',
    },
  },
  visual: {
    marginTop: 16,
    maxWidth: 560,
  },
  svg: {
    display: 'block',
    height: 'auto',
    width: '100%',
  },
  meta: {
    color: NEXORA_GREY[600],
    marginTop: 12,
  },
});

export function CompositionTreeVisual(props: {
  items: Array<{ name: string; title: string }>;
  domainLabel: string;
  productLabel: string;
}) {
  const classes = useStyles();
  const { items, domainLabel, productLabel } = props;
  const row = 38;
  const boxW = 220;
  const boxH = 28;
  const left = 16;
  const spineX = 268;
  const centerX = 400;
  const treeBottom = 16 + items.length * row;
  const domainY = treeBottom + 28;
  const productY = domainY + 52;
  const height = productY + 48;
  const lastMid = 16 + (items.length - 1) * row + boxH / 2;

  return (
    <svg
      className={classes.svg}
      viewBox={`0 0 560 ${height}`}
      role="img"
      aria-label={`${items.map(item => item.title).join(', ')} compose into ${domainLabel} and ${productLabel}`}
    >
      <rect width="560" height={height} rx="16" fill="#071525" />
      {items.map((item, index) => {
        const y = 16 + index * row;
        const midY = y + boxH / 2;
        const isLast = index === items.length - 1;
        return (
          <g key={item.name}>
            <rect
              x={left}
              y={y}
              width={boxW}
              height={boxH}
              rx="8"
              fill="rgba(20,184,166,0.16)"
              stroke={NEXORA_ACCENT.teal}
            />
            <text
              x={left + 12}
              y={y + 19}
              fill={NEXORA_ACCENT.tealPale}
              fontFamily="JetBrains Mono, ui-monospace, monospace"
              fontSize="12"
            >
              {item.title}
            </text>
            <line
              x1={left + boxW}
              y1={midY}
              x2={spineX}
              y2={midY}
              stroke={NEXORA_ACCENT.teal}
              strokeWidth="2"
            />
            <line
              x1={spineX}
              y1={midY}
              x2={spineX}
              y2={isLast ? lastMid : 16 + (index + 1) * row + boxH / 2}
              stroke={NEXORA_ACCENT.teal}
              strokeWidth="2"
            />
          </g>
        );
      })}
      <line
        x1={spineX}
        y1={lastMid}
        x2={centerX}
        y2={lastMid}
        stroke={NEXORA_ACCENT.teal}
        strokeWidth="2"
      />
      <line
        x1={centerX}
        y1={lastMid}
        x2={centerX}
        y2={domainY}
        stroke={NEXORA_ACCENT.teal}
        strokeWidth="2"
      />
      <text x={centerX} y={domainY - 6} textAnchor="middle" fill={NEXORA_ACCENT.teal} fontSize="16">
        ↓
      </text>
      <rect
        x={centerX - 110}
        y={domainY}
        width="220"
        height="36"
        rx="8"
        fill={NEXORA_TONE.success.bg}
      />
      <text
        x={centerX}
        y={domainY + 23}
        textAnchor="middle"
        fill={NEXORA_CARD}
        fontFamily="Space Grotesk, Inter, sans-serif"
        fontSize="13"
        fontWeight={700}
      >
        {domainLabel.toUpperCase()}
      </text>
      <text
        x={centerX}
        y={productY - 6}
        textAnchor="middle"
        fill={NEXORA_ACCENT.teal}
        fontSize="16"
      >
        ↓
      </text>
      <rect
        x={centerX - 110}
        y={productY}
        width="220"
        height="36"
        rx="8"
        fill={NEXORA_CARD}
      />
      <text
        x={centerX}
        y={productY + 23}
        textAnchor="middle"
        fill={NEXORA_DARK.paper}
        fontFamily="Space Grotesk, Inter, sans-serif"
        fontSize="13"
        fontWeight={700}
      >
        {productLabel.toUpperCase()}
      </text>
    </svg>
  );
}

export function OeeBuiltWith(props: { summary: OeeBuiltWithSummary }) {
  const classes = useStyles();
  const { summary } = props;

  return (
    <div className={classes.wrap} aria-label="OEE Built With">
      <Typography variant="subtitle1">{summary.productLabel}</Typography>
      <Typography variant="body2">Built with</Typography>
      <div className={classes.chips}>
        {summary.items.map(item => (
          <Link
            key={item.name}
            className={classes.chip}
            to={platformComponentPath(item.name)}
          >
            {item.title} {item.version}
          </Link>
        ))}
      </div>
      <Typography className={classes.meta} variant="body2">
        {summary.reusableCount} reusable components
        {' · '}
        {summary.certifiedCount} technically CERTIFIED
      </Typography>
      <div className={classes.visual}>
        <CompositionTreeVisual
          items={summary.items}
          domainLabel="OEE domain logic"
          productLabel="OEE Data Product"
        />
      </div>
      <Typography variant="body2" style={{ marginTop: 12 }}>
        <Link to={documentationHref('oee-composition')}>View Composition</Link>
        {' · '}
        <Link to={documentationHref('platform-component-composition')}>
          Composition model
        </Link>
      </Typography>
    </div>
  );
}
