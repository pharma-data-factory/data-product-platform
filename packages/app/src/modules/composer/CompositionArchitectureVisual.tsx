import { makeStyles } from '@material-ui/core/styles';
import { ComposerArchitectureLayer } from '@internal/platform-common';
import { PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from '../theme/tokens';

const useStyles = makeStyles({
  svg: {
    display: 'block',
    height: 'auto',
    width: '100%',
  },
});

/**
 * Architecture graph generated from the current composition selection.
 * External systems are labelled only; they are not Catalog components.
 */
export function CompositionArchitectureVisual(props: {
  layers: ComposerArchitectureLayer[];
  productLabel: string;
}) {
  const classes = useStyles();
  const { layers, productLabel } = props;
  const flow = layers.filter(layer => layer.id !== 'operations');
  const operations = layers.find(layer => layer.id === 'operations');
  const row = 36;
  const boxH = 28;
  const left = 24;
  const width = 200;
  const flowHeight = Math.max(flow.length, 1) * row + 24;
  const opHeight = operations ? operations.titles.length * row + 24 : 0;
  const height = Math.max(flowHeight, opHeight) + 72;

  return (
    <svg
      className={classes.svg}
      viewBox={`0 0 560 ${height}`}
      role="img"
      aria-label={`${flow
        .flatMap(layer => layer.titles)
        .join(', ')} compose into ${productLabel}. Health and observability are cross-cutting when selected.`}
      data-testid="composition-architecture"
    >
      <rect width="560" height={height} rx="16" fill={PHARMA_NAVY_DARK} />
      <text
        x="124"
        y="22"
        textAnchor="middle"
        fill="#94A3B8"
        fontFamily="JetBrains Mono, ui-monospace, monospace"
        fontSize="10"
      >
        MACHINE / MES (outside composition)
      </text>
      {flow.map((layer, index) => {
        const y = 36 + index * row;
        const dashed = layer.id === 'domain';
        return (
          <g key={layer.id}>
            <rect
              x={left}
              y={y}
              width={width}
              height={boxH}
              rx="8"
              fill={dashed ? 'rgba(255,255,255,0.06)' : 'rgba(0,194,217,0.16)'}
              stroke={dashed ? 'rgba(255,255,255,0.28)' : PHARMA_TEAL}
              strokeDasharray={dashed ? '4 4' : undefined}
            />
            <text
              x={left + 12}
              y={y + 19}
              fill={dashed ? '#E2E8F0' : '#99F6E4'}
              fontFamily="Space Grotesk, Inter, sans-serif"
              fontSize="12"
              fontWeight={600}
            >
              {layer.titles.join(' · ') || layer.label}
            </text>
            {index < flow.length - 1 && (
              <text x={left + width / 2} y={y + boxH + 14} textAnchor="middle" fill={PHARMA_TEAL_LIGHT} fontSize="14">
                ↓
              </text>
            )}
          </g>
        );
      })}
      {operations &&
        operations.titles.map((title, index) => (
          <g key={title}>
            <rect
              x="320"
              y={36 + index * row}
              width={width}
              height={boxH}
              rx="8"
              fill="rgba(0,194,217,0.10)"
              stroke={PHARMA_TEAL}
            />
            <text
              x="332"
              y={36 + index * row + 19}
              fill="#99F6E4"
              fontFamily="Space Grotesk, Inter, sans-serif"
              fontSize="12"
            >
              {title}
            </text>
          </g>
        ))}
      {operations && (
        <text
          x="420"
          y={36 + operations.titles.length * row + 18}
          textAnchor="middle"
          fill="#94A3B8"
          fontFamily="JetBrains Mono, ui-monospace, monospace"
          fontSize="10"
        >
          CROSS-CUTTING
        </text>
      )}
    </svg>
  );
}
