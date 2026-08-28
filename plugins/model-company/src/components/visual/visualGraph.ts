import type {
  BatchView,
  EquipmentRuntime,
  EquipmentState,
  FactoryArea,
  FactoryEquipment,
  FactorySite,
  OrderView,
  WarehouseHu,
} from '../../factoryModel';
import { aggregateAreaState, formatQty, humanizeId } from '../../factoryModel';
import {
  resolveEquipmentIconKind,
  type EquipmentIconKind,
} from './equipmentIcons';

export type VisualFlowType = 'product' | 'material' | 'information';

export type VisualNodeKind =
  | 'equipment'
  | 'material'
  | 'batch'
  | 'hu'
  | 'warehouse'
  | 'area';

export interface FactoryVisualNode {
  id: string;
  kind: VisualNodeKind;
  type?: string;
  label: string;
  status?: EquipmentState | string;
  meta?: string;
  iconKind?: EquipmentIconKind;
  reasonCode?: string | null;
  areaId?: string;
  lineId?: string;
  supply?: boolean;
}

export interface FactoryVisualEdge {
  id: string;
  source: string;
  target: string;
  flowType: VisualFlowType;
  interrupted?: boolean;
  label?: string;
}

export interface ValueStreamLane {
  id: string;
  name: string;
  state: EquipmentState;
  order?: OrderView;
  batchId?: string;
  quantityLabel?: string;
  equipment: FactoryVisualNode[];
  supplies: FactoryVisualNode[];
  edges: FactoryVisualEdge[];
}

export interface ActiveAlert {
  id: string;
  equipmentId: string;
  equipmentType: string;
  status: string;
  reason?: string;
  areaId?: string;
}

export interface BatchJourneyStep {
  batchId: string;
  role?: string;
  status: string;
  materialId: string;
  active: boolean;
  complete: boolean;
}

export function isFlowInterrupted(status?: string): boolean {
  const s = (status ?? '').toUpperCase();
  return (
    s === 'BREAKDOWN' ||
    s === 'MATERIAL_STARVED' ||
    s === 'QUALITY_HOLD' ||
    s === 'BLOCKED' ||
    s.includes('BLOCKED')
  );
}

export function isOperationalWarning(status?: string): boolean {
  const s = (status ?? '').toUpperCase();
  return s === 'MICROSTOP' || s === 'CHANGEOVER' || s === 'SETUP';
}

function matchesSupplyTarget(supplyId: string, equipmentType?: string): boolean {
  const t = (equipmentType ?? '').toLowerCase();
  if (supplyId.includes('label')) return /label/.test(t);
  if (supplyId.includes('carton')) return /carton/.test(t);
  if (supplyId.includes('leaflet')) return /leaflet|carton/.test(t);
  if (supplyId.includes('device') || supplyId.includes('spring')) {
    return /assembl|spring|feed/.test(t);
  }
  if (supplyId.includes('primary')) return /feed/.test(t);
  if (supplyId.includes('raw-dp')) return /compound|fill|hold/.test(t);
  return false;
}

/** Infer packaging / device supply nodes from equipment.type (never from id). */
export function inferMaterialSupplies(
  equipment: FactoryEquipment[],
  runtimeById: Record<string, EquipmentRuntime | undefined>,
): FactoryVisualNode[] {
  const supplies: FactoryVisualNode[] = [];
  const seen = new Set<string>();

  const add = (id: string, label: string, typeHint: RegExp) => {
    if (seen.has(id)) return;
    const target = equipment.find(e => typeHint.test((e.type ?? '').toLowerCase()));
    if (!target) return;
    seen.add(id);
    const starved =
      (runtimeById[target.id]?.state ?? '').toUpperCase() === 'MATERIAL_STARVED';
    supplies.push({
      id,
      kind: 'material',
      label,
      status: starved ? 'MATERIAL_STARVED' : 'STAGED',
      supply: true,
      areaId: target.areaId,
      meta: `→ ${humanizeId(target.id)}`,
      type: 'supply',
    });
  };

  add('supply-raw-dp', 'Drug Product Materials', /compound|fill|hold/);
  add('supply-device-parts', 'Device Parts', /assembl|feed/);
  add('supply-springs-caps', 'Springs / Caps', /spring|assembl/);
  add('supply-primary-containers', 'Primary Containers', /feed/);
  add('supply-labels', 'Labels', /label/);
  add('supply-cartons', 'Cartons', /carton/);
  add('supply-leaflets', 'Leaflets', /leaflet|carton/);

  return supplies;
}

export function equipmentToVisualNode(
  eq: FactoryEquipment,
  runtimeById: Record<string, EquipmentRuntime | undefined>,
): FactoryVisualNode {
  const runtime = runtimeById[eq.id] ?? eq.runtime;
  return {
    id: eq.id,
    kind: 'equipment',
    type: eq.type,
    label: humanizeId(eq.id),
    status: runtime?.state ?? 'IDLE',
    reasonCode: runtime?.reasonCode,
    iconKind: resolveEquipmentIconKind(eq.type),
    areaId: eq.areaId,
    lineId: eq.lineId,
    meta:
      runtime?.goodCount !== undefined
        ? `Good ${formatQty(runtime.goodCount)} · Reject ${formatQty(runtime.rejectCount)}`
        : eq.type,
  };
}

export function buildLaneEdges(
  equipment: FactoryVisualNode[],
  supplies: FactoryVisualNode[],
): FactoryVisualEdge[] {
  const edges: FactoryVisualEdge[] = [];
  for (let i = 0; i < equipment.length - 1; i += 1) {
    const source = equipment[i];
    const target = equipment[i + 1];
    edges.push({
      id: `${source.id}->${target.id}`,
      source: source.id,
      target: target.id,
      flowType: 'product',
      interrupted: isFlowInterrupted(source.status) || isFlowInterrupted(target.status),
    });
  }

  for (const supply of supplies) {
    const target = equipment.find(e => matchesSupplyTarget(supply.id, e.type));
    if (!target) continue;
    edges.push({
      id: `${supply.id}->${target.id}`,
      source: supply.id,
      target: target.id,
      flowType: 'material',
      interrupted: (supply.status ?? '').toUpperCase() === 'MATERIAL_STARVED',
      label: supply.label,
    });
  }
  return edges;
}

export function buildValueStreamLanes(
  areas: FactoryArea[],
  runtimeById: Record<string, EquipmentRuntime | undefined>,
  orders: OrderView[],
): ValueStreamLane[] {
  return areas.map(area => {
    const lineIds = new Set(area.lines.map(l => l.id));
    const order = orders.find(o => lineIds.has(o.lineId));
    const flatEq = area.lines.flatMap(l => l.equipment);
    const equipment = flatEq.map(e => equipmentToVisualNode(e, runtimeById));
    const supplies = inferMaterialSupplies(flatEq, runtimeById).filter(
      s => !s.areaId || s.areaId === area.id,
    );
    let quantityLabel: string | undefined;
    if (order) {
      quantityLabel =
        order.targetQuantity > 0
          ? `${formatQty(order.goodQuantity)} / ${formatQty(order.targetQuantity)}`
          : formatQty(order.goodQuantity);
    }
    return {
      id: area.id,
      name: area.name,
      state: aggregateAreaState(area, runtimeById),
      order,
      batchId: order?.batch,
      quantityLabel,
      equipment,
      supplies,
      edges: buildLaneEdges(equipment, supplies),
    };
  });
}

export function collectActiveAlerts(
  sites: FactorySite[],
  runtimeById: Record<string, EquipmentRuntime | undefined>,
): ActiveAlert[] {
  const alerts: ActiveAlert[] = [];
  for (const site of sites) {
    for (const area of site.areas) {
      for (const line of area.lines) {
        for (const eq of line.equipment) {
          const runtime = runtimeById[eq.id] ?? eq.runtime;
          const status = (runtime?.state ?? '').toUpperCase();
          if (
            !status ||
            status === 'RUNNING' ||
            status === 'IDLE' ||
            status === 'OFF' ||
            status === 'COMPLETED'
          ) {
            continue;
          }
          alerts.push({
            id: `${eq.id}:${status}`,
            equipmentId: eq.id,
            equipmentType: eq.type,
            status,
            reason: runtime?.reasonCode ?? undefined,
            areaId: area.id,
          });
        }
      }
    }
  }
  return alerts;
}

export function buildBatchJourney(batches: BatchView[]): BatchJourneyStep[] {
  if (!batches.length) return [];
  const roleOrder = ['drug-product', 'assembly', 'packaging', 'finished-goods', 'fg'];
  const sorted = [...batches].sort((a, b) => {
    const ai = roleOrder.findIndex(r => (a.role ?? '').toLowerCase().includes(r));
    const bi = roleOrder.findIndex(r => (b.role ?? '').toLowerCase().includes(r));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const activeIdx = sorted.findIndex(b =>
    /run|active|in_process|in-process|open/i.test(b.status),
  );
  const focus = activeIdx >= 0 ? activeIdx : sorted.length - 1;
  return sorted.map((b, i) => ({
    batchId: b.batchId,
    role: b.role,
    status: b.status,
    materialId: b.materialId,
    active: i === focus,
    complete: i < focus || /complete|released|closed/i.test(b.status),
  }));
}

export function summarizeKpis(
  orders: OrderView[],
  batches: BatchView[],
  warehouse: WarehouseHu[],
) {
  const activeOrder =
    orders.find(o => /run|active|open|release/i.test(o.status)) ?? orders[0];
  const activeBatch =
    batches.find(b => /run|active|in_process|open/i.test(b.status)) ?? batches[0];
  const produced = orders.reduce((n, o) => n + (o.goodQuantity ?? 0), 0);
  const target = orders.reduce((n, o) => n + (o.targetQuantity ?? 0), 0);
  const rejects = orders.reduce((n, o) => n + (o.rejectQuantity ?? 0), 0);
  const packagingHus = warehouse.filter(h =>
    /pack|case|carton/i.test(h.material),
  ).length;
  const fgHus = warehouse.filter(
    h =>
      /fg|finished|pallet/i.test(h.material) || /FG|WH-FG/i.test(h.location),
  ).length;
  return {
    activeOrder,
    activeBatch,
    produced,
    target,
    rejects,
    packagingHus,
    fgHus,
  };
}
