import { StatusBadge } from './StatusBadge';
import { NX, useVisualStyles } from './styles';
import type { BatchView, GenealogyLink, WarehouseHu } from '../../factoryModel';
import { formatQty } from '../../factoryModel';

export function BatchNode({
  batch,
  selected,
  onSelect,
}: {
  batch: BatchView;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const classes = useVisualStyles();
  return (
    <button
      type="button"
      className={classes.nodeCard}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Batch ${batch.batchId}, status ${batch.status}`}
      style={
        selected
          ? { borderColor: NX.teal, boxShadow: `0 0 0 2px ${NX.runningBg}` }
          : undefined
      }
    >
      <p className={classes.nodeTitle}>{batch.batchId}</p>
      <div className={classes.nodeId}>{batch.materialId}</div>
      <div style={{ marginTop: 10 }}>
        <StatusBadge status={batch.status} />
      </div>
      <div className={classes.nodeMeta}>
        Order {batch.orderId}
        <br />
        Qty {formatQty(batch.goodQuantity)}
        {batch.role && (
          <>
            <br />
            Role {batch.role}
          </>
        )}
      </div>
    </button>
  );
}

export function HandlingUnitNode({
  hu,
  onSelect,
}: {
  hu: WarehouseHu;
  onSelect?: () => void;
}) {
  const classes = useVisualStyles();
  return (
    <button
      type="button"
      className={classes.nodeCard}
      onClick={onSelect}
      aria-label={`Handling unit ${hu.huId}, status ${hu.status}`}
    >
      <p className={classes.nodeTitle}>{hu.huId}</p>
      <div className={classes.nodeId}>{hu.material}</div>
      <div style={{ marginTop: 10 }}>
        <StatusBadge status={hu.status} />
      </div>
      <div className={classes.nodeMeta}>
        {formatQty(hu.quantity)} · {hu.location}
        {hu.qualityStatus && (
          <>
            <br />
            Quality {hu.qualityStatus}
          </>
        )}
      </div>
    </button>
  );
}

/**
 * Configuration-driven material / batch chain.
 * Prefer order-linked batches; fall back to genealogy edges.
 */
export function MaterialFlowView({
  batches,
  genealogy,
  warehouse,
  simulationRunning,
  selectedBatchId,
  onSelectBatch,
}: {
  batches: BatchView[];
  genealogy: GenealogyLink[];
  warehouse: WarehouseHu[];
  simulationRunning?: boolean;
  selectedBatchId?: string;
  onSelectBatch?: (batchId: string) => void;
}) {
  const classes = useVisualStyles();
  const chain =
    batches.length > 0
      ? batches
      : genealogy
          .filter(g => g.relation)
          .reduce<string[]>((acc, g) => {
            if (!acc.includes(g.from)) acc.push(g.from);
            if (!acc.includes(g.to)) acc.push(g.to);
            return acc;
          }, [])
          .map(
            id =>
              ({
                batchId: id,
                materialId: '—',
                orderId: '—',
                status: 'AVAILABLE',
                goodQuantity: 0,
              }) as BatchView,
          );

  if (!chain.length && !warehouse.length) {
    return null;
  }

  return (
    <div
      className={classes.flowCol}
      role="list"
      aria-label="Material flow"
    >
      {chain.map((batch, index) => (
        <div key={batch.batchId} role="listitem">
          <div
            className={
              simulationRunning && batch.status === 'IN_PROCESS' ? classes.pulse : undefined
            }
          >
            <BatchNode
              batch={batch}
              selected={selectedBatchId === batch.batchId}
              onSelect={() => onSelectBatch?.(batch.batchId)}
            />
          </div>
          {index < chain.length - 1 && (
            <div className={classes.connector} aria-hidden>
              ↓
            </div>
          )}
        </div>
      ))}
      {warehouse.length > 0 && (
        <>
          <div className={classes.connector} aria-hidden>
            ↓
          </div>
          {warehouse.map(hu => (
            <div key={hu.huId} role="listitem">
              <HandlingUnitNode hu={hu} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export function GenealogyChain({
  batchId,
  genealogy,
}: {
  batchId: string;
  genealogy: GenealogyLink[];
}) {
  const classes = useVisualStyles();

  const collectUpstream = (
    id: string,
    visited: Set<string> = new Set(),
  ): string[] => {
    const out: string[] = [];
    for (const link of genealogy) {
      if (link.to === id && !visited.has(link.from)) {
        visited.add(link.from);
        out.push(...collectUpstream(link.from, visited), link.from);
      }
    }
    return out;
  };

  const collectDownstream = (
    id: string,
    visited: Set<string> = new Set(),
  ): string[] => {
    const out: string[] = [];
    for (const link of genealogy) {
      if (link.from === id && !visited.has(link.to)) {
        visited.add(link.to);
        out.push(link.to, ...collectDownstream(link.to, visited));
      }
    }
    return out;
  };

  const upstream = collectUpstream(batchId);
  const downstream = collectDownstream(batchId);
  const chain = [...upstream, batchId, ...downstream];
  if (chain.length <= 1 && genealogy.length === 0) {
    return null;
  }
  const display = chain.length > 1 ? chain : [batchId];

  return (
    <div className={classes.flowCol} role="list" aria-label={`Genealogy for ${batchId}`}>
      {display.map((id, index) => (
        <div key={`${id}-${index}`} role="listitem">
          <div className={classes.nodeCard} style={{ cursor: 'default' }}>
            <p className={classes.nodeTitle}>{id}</p>
            {id === batchId && (
              <div className={classes.nodeId}>Selected batch</div>
            )}
          </div>
          {index < display.length - 1 && (
            <div className={classes.connector} aria-hidden>
              ↓
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
