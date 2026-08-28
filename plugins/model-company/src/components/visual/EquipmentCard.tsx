import { StatusBadge } from './StatusBadge';
import { getEquipmentIcon } from './equipmentIconRegistry';
import {
  isFlowInterrupted,
  isOperationalWarning,
  type FactoryVisualNode,
} from './visualGraph';
import { NX, useVisualStyles } from './styles';
import { humanizeId } from '../../factoryModel';

export function EquipmentCard({
  node,
  onSelect,
  reducedMotion,
}: {
  node: FactoryVisualNode;
  onSelect?: (id: string) => void;
  reducedMotion?: boolean;
}) {
  const classes = useVisualStyles();
  const status = String(node.status ?? 'IDLE');
  const problem = isFlowInterrupted(status);
  const warning = isOperationalWarning(status);
  const border = problem ? NX.dangerFg : warning ? NX.warnFg : NX.border;

  return (
    <button
      type="button"
      className={`${classes.nodeCard}${warning && !reducedMotion ? ` ${classes.pulse}` : ''}`}
      onClick={() => onSelect?.(node.id)}
      aria-label={`Equipment ${node.label}, type ${node.type ?? 'unknown'}, status ${status}${
        node.reasonCode ? `, reason ${node.reasonCode}` : ''
      }`}
      style={{
        minWidth: 148,
        maxWidth: 200,
        flex: '0 0 auto',
        borderColor: border,
        borderWidth: problem || warning ? 2 : 1,
        boxShadow: problem
          ? `0 0 0 2px ${NX.dangerBg}`
          : warning
            ? `0 0 0 2px ${NX.warnBg}`
            : undefined,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        {(() => {
          const Icon = getEquipmentIcon(node.type);
          return <Icon title={node.type ?? 'equipment'} />;
        })()}
      </div>
      <p className={classes.nodeTitle} style={{ fontSize: 13 }}>
        {node.label}
      </p>
      <div className={classes.nodeId}>{node.id}</div>
      {node.type && (
        <div className={classes.nodeMeta} style={{ marginTop: 4 }}>
          {humanizeId(node.type)}
        </div>
      )}
      <div style={{ marginTop: 8 }}>
        <StatusBadge status={status} />
      </div>
      {node.reasonCode && (
        <div className={classes.nodeMeta} style={{ color: NX.warnFg }}>
          Reason {node.reasonCode}
        </div>
      )}
      {node.meta && <div className={classes.nodeMeta}>{node.meta}</div>}
    </button>
  );
}

export function MaterialSupplyChip({
  node,
  onSelect,
}: {
  node: FactoryVisualNode;
  onSelect?: (id: string) => void;
}) {
  const starved = (node.status ?? '').toUpperCase() === 'MATERIAL_STARVED';
  return (
    <button
      type="button"
      onClick={() => onSelect?.(node.id)}
      aria-label={`Material ${node.label}, status ${node.status ?? 'STAGED'}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 4,
        padding: '8px 10px',
        borderRadius: 8,
        border: `1px dashed ${starved ? NX.dangerFg : NX.tealDark}`,
        background: starved ? NX.dangerBg : 'rgba(0, 194, 217, 0.06)',
        cursor: 'pointer',
        textAlign: 'left',
        minWidth: 110,
      }}
    >
      <span
        style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 10,
          letterSpacing: '0.08em',
          color: NX.muted,
          textTransform: 'uppercase',
        }}
      >
        Supply
      </span>
      <span style={{ fontWeight: 600, fontSize: 12, color: NX.text }}>{node.label}</span>
      <StatusBadge status={String(node.status ?? 'STAGED')} />
      {node.meta && (
        <span style={{ fontSize: 11, color: NX.muted }}>{node.meta}</span>
      )}
    </button>
  );
}

export function ProductFlowArrow({
  interrupted,
  animated,
  reducedMotion,
}: {
  interrupted?: boolean;
  animated?: boolean;
  reducedMotion?: boolean;
}) {
  const color = interrupted ? NX.dangerFg : NX.teal;
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 28,
        color,
        fontSize: 18,
        fontWeight: 700,
        opacity: interrupted ? 0.55 : 1,
        textDecoration: interrupted ? 'line-through' : undefined,
      }}
    >
      <span
        className={
          animated && !reducedMotion && !interrupted ? 'nx-flow-pulse' : undefined
        }
      >
        →
      </span>
    </div>
  );
}

export function MaterialFlowArrow({ interrupted }: { interrupted?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        display: 'flex',
        alignItems: 'center',
        color: interrupted ? NX.dangerFg : NX.tealDark,
        fontSize: 14,
        opacity: 0.85,
        padding: '0 4px',
      }}
    >
      ⇢
    </div>
  );
}
