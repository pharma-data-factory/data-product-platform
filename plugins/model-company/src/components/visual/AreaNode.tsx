import { StatusBadge } from './StatusBadge';
import { formatQty } from '../../factoryModel';
import type { EquipmentRuntime, EquipmentState } from '../../factoryModel';
import { NX, useVisualStyles } from './styles';

export function AreaNode({
  areaName,
  areaId,
  lineCount,
  equipmentCount,
  state,
  orderId,
  batchId,
  quantityLabel,
  onSelect,
}: {
  areaName: string;
  areaId: string;
  lineCount: number;
  equipmentCount: number;
  state: EquipmentState;
  orderId?: string;
  batchId?: string;
  quantityLabel?: string;
  onSelect?: () => void;
}) {
  const classes = useVisualStyles();
  return (
    <button
      type="button"
      className={classes.nodeCard}
      onClick={onSelect}
      aria-label={`Area ${areaName} ${areaId}, status ${state}`}
    >
      <p className={classes.nodeTitle}>{areaName}</p>
      <div className={classes.nodeId}>{areaId}</div>
      <div style={{ marginTop: 10 }}>
        <StatusBadge status={state} />
      </div>
      <div className={classes.nodeMeta}>
        {lineCount} line{lineCount === 1 ? '' : 's'} · {equipmentCount} equipment
        {orderId && (
          <>
            <br />
            Order {orderId}
          </>
        )}
        {batchId && (
          <>
            <br />
            Batch {batchId}
          </>
        )}
        {quantityLabel && (
          <>
            <br />
            <span style={{ color: NX.navy, fontWeight: 600 }}>{quantityLabel}</span>
          </>
        )}
      </div>
    </button>
  );
}

export function EquipmentNode({
  name,
  equipmentId,
  runtime,
  onSelect,
}: {
  name?: string;
  equipmentId: string;
  runtime?: EquipmentRuntime;
  onSelect?: () => void;
}) {
  const classes = useVisualStyles();
  const state = runtime?.state ?? 'IDLE';
  const rate =
    runtime?.speed !== undefined && runtime.speed > 0
      ? `${formatQty(runtime.speed)} units/min`
      : undefined;

  return (
    <button
      type="button"
      className={classes.nodeCard}
      onClick={onSelect}
      aria-label={`Equipment ${equipmentId}, status ${state}`}
      style={{ minWidth: 160, flex: '1 1 160px', maxWidth: 280 }}
    >
      <p className={classes.nodeTitle}>{name ?? equipmentId}</p>
      <div className={classes.nodeId}>{equipmentId}</div>
      <div style={{ marginTop: 10 }}>
        <StatusBadge status={state} />
      </div>
      <div className={classes.nodeMeta}>
        {rate && (
          <>
            {rate}
            <br />
          </>
        )}
        Good {formatQty(runtime?.goodCount)}
        <br />
        Reject {formatQty(runtime?.rejectCount)}
        {runtime?.reasonCode && (
          <>
            <br />
            Reason {runtime.reasonCode}
          </>
        )}
      </div>
    </button>
  );
}
