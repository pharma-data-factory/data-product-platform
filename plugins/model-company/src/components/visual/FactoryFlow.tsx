import useMediaQuery from '@material-ui/core/useMediaQuery';
import { useTheme } from '@material-ui/core/styles';
import { AreaNode } from './AreaNode';
import { useVisualStyles } from './styles';
import type { EquipmentState, FactoryArea, OrderView } from '../../factoryModel';
import { aggregateAreaState, formatQty } from '../../factoryModel';
import type { EquipmentRuntime } from '../../factoryModel';

export interface ValueStreamStage {
  area: FactoryArea;
  state: EquipmentState;
  order?: OrderView;
  batchId?: string;
  quantityLabel?: string;
}

export function buildValueStreamStages(
  areas: FactoryArea[],
  runtimeById: Record<string, EquipmentRuntime | undefined>,
  orders: OrderView[],
): ValueStreamStage[] {
  return areas.map(area => {
    const lineIds = new Set(area.lines.map(l => l.id));
    const order = orders.find(o => lineIds.has(o.lineId));
    const state = aggregateAreaState(area, runtimeById);
    let quantityLabel: string | undefined;
    if (order) {
      quantityLabel =
        order.targetQuantity > 0
          ? `${formatQty(order.goodQuantity)} / ${formatQty(order.targetQuantity)}`
          : formatQty(order.goodQuantity);
    }
    return {
      area,
      state,
      order,
      batchId: order?.batch,
      quantityLabel,
    };
  });
}

export function FactoryFlow({
  stages,
  onSelectArea,
}: {
  stages: ValueStreamStage[];
  onSelectArea?: (areaId: string) => void;
}) {
  const classes = useVisualStyles();
  const theme = useTheme();
  const horizontal = useMediaQuery(theme.breakpoints.up('md'));

  if (!stages.length) {
    return null;
  }

  return (
    <div
      className={horizontal ? classes.flowRow : classes.flowCol}
      role="list"
      aria-label="Factory value stream"
    >
      {stages.map((stage, index) => (
        <div
          key={stage.area.id}
          role="listitem"
          style={{
            display: 'flex',
            flexDirection: horizontal ? 'row' : 'column',
            alignItems: 'stretch',
            flex: horizontal ? '1 1 180px' : undefined,
            minWidth: horizontal ? 0 : undefined,
          }}
        >
          <AreaNode
            areaName={stage.area.name}
            areaId={stage.area.id}
            lineCount={stage.area.lines.length}
            equipmentCount={stage.area.lines.reduce((n, l) => n + l.equipment.length, 0)}
            state={stage.state}
            orderId={stage.order?.orderId}
            batchId={stage.batchId}
            quantityLabel={stage.quantityLabel}
            onSelect={() => onSelectArea?.(stage.area.id)}
          />
          {index < stages.length - 1 && (
            <div className={classes.connector} aria-hidden>
              {horizontal ? '→' : '↓'}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
