import type {
  BatchView,
  EquipmentRuntime,
  FactoryApiModel,
  FactorySite,
  OrderView,
  WarehouseHu,
} from '../../factoryModel';
import { normalizeFactory } from '../../factoryModel';
import {
  buildBatchJourney,
  buildValueStreamLanes,
  collectActiveAlerts,
  summarizeKpis,
  type ActiveAlert,
  type BatchJourneyStep,
  type ValueStreamLane,
} from './visualGraph';

/**
 * Normalized Overview presentation model.
 * Topology from Factory-as-Code; state/quantities from runtime APIs.
 * No invented OEE / quality business rules.
 */
export interface FactoryValueStream {
  stages: ValueStreamLane[];
  equipment: ReturnType<typeof flattenEquipmentNodes>;
  materials: ReturnType<typeof flattenMaterials>;
  flows: ReturnType<typeof flattenFlows>;
  batches: BatchJourneyStep[];
  handlingUnits: {
    total: number;
    packaging: number;
    finishedGoods: number;
    aggregateLabel: string;
  };
  alerts: ActiveAlert[];
  kpis: ReturnType<typeof summarizeKpis>;
  oeeConnected: boolean;
  siteId?: string;
  siteName?: string;
  companyName?: string;
}

function flattenEquipmentNodes(stages: ValueStreamLane[]) {
  return stages.flatMap(s => s.equipment);
}

function flattenMaterials(stages: ValueStreamLane[]) {
  return stages.flatMap(s => s.supplies);
}

function flattenFlows(stages: ValueStreamLane[]) {
  return stages.flatMap(s => s.edges);
}

export function buildFactoryValueStream(input: {
  factory: FactoryApiModel | null | undefined;
  sites?: FactorySite[];
  runtimeById: Record<string, EquipmentRuntime | undefined>;
  orders: OrderView[];
  batches: BatchView[];
  warehouse: WarehouseHu[];
}): FactoryValueStream {
  const sites =
    input.sites ?? (input.factory ? normalizeFactory(input.factory) : []);
  const areas = sites[0]?.areas ?? [];
  const stages = buildValueStreamLanes(areas, input.runtimeById, input.orders);
  const kpis = summarizeKpis(input.orders, input.batches, input.warehouse);
  const oeeConnected = Boolean(
    (
      input.factory?.dataProducts as Array<{ goldenPath?: string }> | undefined
    )?.some(dp => /oee/i.test(dp.goldenPath ?? '')),
  );
  const huTotal = input.warehouse.length;
  const aggregateLabel =
    huTotal === 0
      ? 'AWAITING RECEIPT'
      : huTotal > 24
        ? `▣ ${kpis.fgHus || huTotal} HUs`
        : `${huTotal} HUs`;

  return {
    stages,
    equipment: flattenEquipmentNodes(stages),
    materials: flattenMaterials(stages),
    flows: flattenFlows(stages),
    batches: buildBatchJourney(input.batches),
    handlingUnits: {
      total: huTotal,
      packaging: kpis.packagingHus,
      finishedGoods: kpis.fgHus,
      aggregateLabel,
    },
    alerts: collectActiveAlerts(sites, input.runtimeById),
    kpis,
    oeeConnected,
    siteId: sites[0]?.id,
    siteName: sites[0]?.displayName ?? sites[0]?.name,
    companyName: input.factory?.company?.name,
  };
}
