import type { FactoryEquipment, FactoryModel } from '../types';

export const DEFAULT_UNS_ROOT = 'uns';

export const AREA_SLUG_DEFAULTS: Record<string, string> = {
  'SOLID-DOSE': 'manufacturing',
  PACKAGING: 'packaging',
  'FILL-FINISH': 'fill-finish',
  'DRUG-PRODUCT': 'drug-product',
  'DEVICE-ASSEMBLY': 'device-assembly',
  'FG-WAREHOUSE': 'warehouse',
};

export type UnsInformationType =
  | 'availability'
  | 'state'
  | 'telemetry'
  | 'counts'
  | 'temperature'
  | `events/${string}`;

export interface UnsConfig {
  root: string;
  enterpriseId: string;
  sourceSystem: string;
  areaSlugs: Record<string, string>;
}

export function unsConfigFromModel(model: FactoryModel): UnsConfig {
  return {
    root: model.uns?.root ?? DEFAULT_UNS_ROOT,
    enterpriseId: model.uns?.enterpriseId ?? model.company.id,
    sourceSystem: model.uns?.sourceSystem ?? 'model-factory',
    areaSlugs: { ...AREA_SLUG_DEFAULTS, ...(model.uns?.areaSlugs ?? {}) },
  };
}

export function areaSlug(config: UnsConfig, areaId: string): string {
  return config.areaSlugs[areaId] ?? areaId.toLowerCase().replace(/_/g, '-');
}

export function equipmentTopic(
  config: UnsConfig,
  eq: Pick<FactoryEquipment, 'siteId' | 'areaId' | 'lineId' | 'id'>,
  informationType: UnsInformationType,
): string {
  const area = areaSlug(config, eq.areaId);
  return [
    config.root,
    config.enterpriseId,
    eq.siteId,
    area,
    eq.lineId,
    eq.id,
    informationType,
  ].join('/');
}

export function orderTopic(
  config: UnsConfig,
  siteId: string,
  orderId: string,
): string {
  return `${config.root}/${config.enterpriseId}/${siteId}/orders/${orderId}/state`;
}

export function batchTopic(
  config: UnsConfig,
  siteId: string,
  batchId: string,
): string {
  return `${config.root}/${config.enterpriseId}/${siteId}/batches/${batchId}/state`;
}

export function warehouseHuTopic(
  config: UnsConfig,
  siteId: string,
  huId: string,
): string {
  return `${config.root}/${config.enterpriseId}/${siteId}/warehouse/handling-units/${huId}/state`;
}

export function qualityTopic(config: UnsConfig, siteId: string): string {
  return `${config.root}/${config.enterpriseId}/${siteId}/quality/events`;
}

export function qosForInformationType(informationType: string): 0 | 1 {
  if (informationType === 'telemetry' || informationType === 'temperature') {
    return 0;
  }
  return 1;
}

export function retainForInformationType(informationType: string): boolean {
  return !informationType.startsWith('events/');
}

export type DataQuality = 'GOOD' | 'UNCERTAIN' | 'BAD' | 'STALE';

export type UnsEquipmentState =
  | 'OFF'
  | 'IDLE'
  | 'SETUP'
  | 'RUNNING'
  | 'MICROSTOP'
  | 'STOPPED'
  | 'BREAKDOWN'
  | 'MATERIAL_STARVED'
  | 'QUALITY_HOLD'
  | 'MAINTENANCE'
  | 'CHANGEOVER';

export interface UnsEnvelope {
  schemaVersion: '1.0';
  eventId: string;
  timestamp: string;
  sourceSystem: string;
  enterpriseId: string;
  siteId: string;
  areaId?: string | null;
  lineId?: string | null;
  equipmentId?: string | null;
  orderId?: string | null;
  batchId?: string | null;
  dataQuality: DataQuality;
  payload: Record<string, unknown>;
}

export function buildEnvelope(input: {
  eventId: string;
  timestamp: string;
  config: UnsConfig;
  siteId: string;
  areaId?: string | null;
  lineId?: string | null;
  equipmentId?: string | null;
  orderId?: string | null;
  batchId?: string | null;
  dataQuality?: DataQuality;
  payload: Record<string, unknown>;
}): UnsEnvelope {
  return {
    schemaVersion: '1.0',
    eventId: input.eventId,
    timestamp: input.timestamp,
    sourceSystem: input.config.sourceSystem,
    enterpriseId: input.config.enterpriseId,
    siteId: input.siteId,
    areaId: input.areaId ?? null,
    lineId: input.lineId ?? null,
    equipmentId: input.equipmentId ?? null,
    orderId: input.orderId ?? null,
    batchId: input.batchId ?? null,
    dataQuality: input.dataQuality ?? 'GOOD',
    payload: input.payload,
  };
}

/** Lightweight structural validation (full AJV optional). */
export function validateCounts(payload: {
  goodCount: number;
  rejectCount: number;
  totalCount: number;
}): string[] {
  const errors: string[] = [];
  if (payload.totalCount !== payload.goodCount + payload.rejectCount) {
    errors.push('totalCount must equal goodCount + rejectCount');
  }
  if (payload.goodCount < 0 || payload.rejectCount < 0) {
    errors.push('counts must be non-negative');
  }
  return errors;
}

export function buildUnsTree(model: FactoryModel, config: UnsConfig) {
  const site = model.sites[0];
  const equipmentNodes = model.equipment.map(eq => {
    const base = equipmentTopic(config, eq, 'state').replace(/\/state$/, '');
    return {
      equipmentId: eq.id,
      lineId: eq.lineId,
      areaId: eq.areaId,
      areaSlug: areaSlug(config, eq.areaId),
      topics: [
        `${base}/availability`,
        `${base}/state`,
        `${base}/telemetry`,
        `${base}/counts`,
        `${base}/temperature`,
        `${base}/events/equipment-state-changed`,
        `${base}/events/microstop`,
        `${base}/events/breakdown`,
      ],
    };
  });
  return {
    root: config.root,
    enterpriseId: config.enterpriseId,
    siteId: site?.id,
    areas: site?.areas.map(a => ({
      id: a.id,
      slug: areaSlug(config, a.id),
      lines: a.lines.map(l => l.id),
    })),
    businessTopics: [
      `${config.root}/${config.enterpriseId}/${site?.id}/orders/`,
      `${config.root}/${config.enterpriseId}/${site?.id}/batches/`,
      `${config.root}/${config.enterpriseId}/${site?.id}/warehouse/`,
      `${config.root}/${config.enterpriseId}/${site?.id}/quality/`,
    ],
    equipment: equipmentNodes,
  };
}
