import { useEffect, useState } from 'react';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { Typography } from '@material-ui/core';
import { useTheme } from '@material-ui/core/styles';
import { StatusBadge } from './StatusBadge';
import {
  EquipmentCard,
  MaterialFlowArrow,
  MaterialSupplyChip,
  ProductFlowArrow,
} from './EquipmentCard';
import type { ValueStreamLane } from './visualGraph';
import { NX, useVisualStyles } from './styles';

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

function LaneRow({
  lane,
  animated,
  reducedMotion,
  stack,
  onSelectEquipment,
  onSelectMaterial,
}: {
  lane: ValueStreamLane;
  animated?: boolean;
  reducedMotion?: boolean;
  stack?: boolean;
  onSelectEquipment?: (id: string) => void;
  onSelectMaterial?: (id: string) => void;
}) {
  return (
    <section
      aria-label={`${lane.name} value stream lane`}
      style={{
        background: NX.card,
        border: `1px solid ${NX.border}`,
        borderRadius: 14,
        padding: 14,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
          paddingBottom: 10,
          borderBottom: `1px solid ${NX.border}`,
        }}
      >
        <Typography
          style={{
            fontFamily: "'Space Grotesk', Inter, sans-serif",
            fontWeight: 600,
            fontSize: 14,
            color: NX.navy,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            margin: 0,
          }}
        >
          {lane.name}
        </Typography>
        <StatusBadge status={lane.state} />
        {lane.batchId && (
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: NX.muted,
            }}
          >
            Batch {lane.batchId}
          </span>
        )}
        {lane.quantityLabel && (
          <span style={{ fontSize: 12, fontWeight: 600, color: NX.navy }}>
            {lane.quantityLabel}
          </span>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: stack ? 'column' : 'row',
          gap: 12,
          alignItems: stack ? 'stretch' : 'flex-start',
        }}
      >
        {lane.supplies.length > 0 && (
          <div
            aria-label={`${lane.name} material supply`}
            style={{
              display: 'flex',
              flexDirection: stack ? 'row' : 'column',
              flexWrap: 'wrap',
              gap: 8,
              minWidth: stack ? undefined : 120,
              maxWidth: stack ? undefined : 160,
            }}
          >
            {lane.supplies.map(supply => (
              <div
                key={supply.id}
                style={{
                  display: 'flex',
                  flexDirection: stack ? 'column' : 'row',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <MaterialSupplyChip node={supply} onSelect={onSelectMaterial} />
                {!stack && (
                  <MaterialFlowArrow
                    interrupted={(supply.status ?? '').toUpperCase() === 'MATERIAL_STARVED'}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <div
          role="list"
          aria-label={`${lane.name} equipment sequence`}
          style={{
            display: 'flex',
            flexDirection: stack ? 'column' : 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 4,
            flex: 1,
            minWidth: 0,
          }}
        >
          {lane.equipment.map((node, index) => {
            const edge = lane.edges.find(
              e => e.source === node.id && e.flowType === 'product',
            );
            return (
              <div
                key={node.id}
                role="listitem"
                style={{
                  display: 'flex',
                  flexDirection: stack ? 'column' : 'row',
                  alignItems: 'center',
                }}
              >
                <EquipmentCard
                  node={node}
                  onSelect={onSelectEquipment}
                  reducedMotion={reducedMotion}
                />
                {index < lane.equipment.length - 1 && (
                  <ProductFlowArrow
                    interrupted={edge?.interrupted}
                    animated={animated}
                    reducedMotion={reducedMotion}
                  />
                )}
              </div>
            );
          })}
          {lane.equipment.length === 0 && (
            <Typography variant="body2" color="textSecondary">
              No equipment configured in this area.
            </Typography>
          )}
        </div>
      </div>
    </section>
  );
}

export function ValueStreamCanvas({
  lanes,
  simulationRunning,
  onSelectEquipment,
  onSelectMaterial,
  onSelectArea,
}: {
  lanes: ValueStreamLane[];
  simulationRunning?: boolean;
  onSelectEquipment?: (id: string) => void;
  onSelectMaterial?: (id: string) => void;
  onSelectArea?: (areaId: string) => void;
}) {
  const classes = useVisualStyles();
  const theme = useTheme();
  const stack = useMediaQuery(theme.breakpoints.down('sm'));
  const reducedMotion = usePrefersReducedMotion();

  if (!lanes.length) {
    return (
      <div className={classes.empty} role="status">
        No manufacturing areas available in the factory model.
      </div>
    );
  }

  return (
    <div
      aria-label="Pharma manufacturing value stream"
      style={{ width: '100%' }}
    >
      <style>{`
        @keyframes nx-flow-pulse {
          0%, 100% { opacity: 1; transform: translateX(0); }
          50% { opacity: 0.45; transform: translateX(3px); }
        }
        .nx-flow-pulse {
          display: inline-block;
          animation: nx-flow-pulse 2.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .nx-flow-pulse { animation: none !important; }
        }
      `}</style>
      {lanes.map(lane => (
        <div key={lane.id}>
          <LaneRow
            lane={lane}
            animated={simulationRunning}
            reducedMotion={reducedMotion}
            stack={stack}
            onSelectEquipment={id => {
              onSelectEquipment?.(id);
            }}
            onSelectMaterial={onSelectMaterial}
          />
          {/* area click affordance for keyboard users */}
          <button
            type="button"
            onClick={() => onSelectArea?.(lane.id)}
            style={{
              background: 'none',
              border: 'none',
              color: NX.tealDark,
              fontSize: 12,
              cursor: 'pointer',
              margin: '-4px 0 12px 4px',
              padding: 0,
              textDecoration: 'underline',
            }}
          >
            Open {lane.name} operations
          </button>
        </div>
      ))}
    </div>
  );
}
