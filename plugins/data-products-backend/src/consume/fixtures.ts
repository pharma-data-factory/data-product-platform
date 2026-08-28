import type { Entity } from '@backstage/catalog-model';
import type { QueryResult, StreamEvent } from '@internal/data-product-consumption/node';
import { descriptorFromEntity } from '@internal/data-product-consumption/node';

/** Sample / fixture payloads — used when no upstream baseUrl is configured. */
export function fixtureQuery(entity: Entity, context: Record<string, string>): QueryResult {
  const name = entity.metadata.name;
  const equipment =
    context.equipment ||
    entity.metadata.annotations?.['nexora.io/equipment'] ||
    'BOTTLE-FILLER-01';

  if (name.includes('oee') || entity.metadata.annotations?.['dataprod.platform/template'] === 'oee-data-product') {
    return {
      source: 'fixture',
      detail: 'SAMPLE fixture — configure dataProducts.consume.baseUrls for live upstream',
      columns: [
        { id: 'equipmentId', type: 'string' },
        { id: 'availability', type: 'number', semanticType: 'percentage' },
        { id: 'performance', type: 'number', semanticType: 'percentage' },
        { id: 'quality', type: 'number', semanticType: 'percentage' },
        { id: 'oee', type: 'number', semanticType: 'percentage' },
        { id: 'timestamp', type: 'string' },
      ],
      rows: [
        {
          equipmentId: equipment,
          availability: 0.91,
          performance: 0.94,
          quality: 0.98,
          oee: 0.838,
          timestamp: new Date().toISOString(),
        },
      ],
      total: 1,
    };
  }

  if (name.includes('equipment') || name.includes('rest-equipment')) {
    return {
      source: 'fixture',
      detail: 'SAMPLE equipment list fixture',
      columns: [
        { id: 'equipmentId', type: 'string' },
        { id: 'name', type: 'string' },
        { id: 'site', type: 'string' },
        { id: 'status', type: 'string' },
        { id: 'updatedAt', type: 'string' },
      ],
      rows: [
        {
          equipmentId: equipment,
          name: equipment,
          site: context.site || 'MODEL-PHARMA-01',
          status: 'ACTIVE',
          updatedAt: new Date().toISOString(),
        },
        {
          equipmentId: 'CAPPER-01',
          name: 'CAPPER-01',
          site: context.site || 'MODEL-PHARMA-01',
          status: 'ACTIVE',
          updatedAt: new Date().toISOString(),
        },
      ],
      total: 2,
    };
  }

  if (name.includes('temperature') || name.includes('mqtt-temperature')) {
    return {
      source: 'fixture',
      detail: 'SAMPLE temperature fixture',
      columns: [
        { id: 'deviceId', type: 'string' },
        { id: 'temperature', type: 'number', semanticType: 'temperature', unit: 'C' },
        { id: 'unit', type: 'string' },
        { id: 'timestamp', type: 'string' },
      ],
      rows: [
        {
          deviceId: equipment,
          temperature: 23.7,
          unit: 'C',
          timestamp: new Date().toISOString(),
        },
      ],
      total: 1,
    };
  }

  const d = descriptorFromEntity(entity);
  return {
    source: 'fixture',
    detail: 'Generic empty preview — no product-specific fixture',
    columns: [{ id: 'message', type: 'string' }],
    rows: [
      {
        message: `No fixture for ${d.name}. Connect upstream via dataProducts.consume.baseUrls.`,
      },
    ],
  };
}

export function fixtureStreamEvent(entity: Entity, context: Record<string, string>): StreamEvent {
  const equipment = context.equipment || 'BOTTLE-FILLER-01';
  return {
    eventId: `EVT-FIX-${Date.now()}`,
    timestamp: new Date().toISOString(),
    source: equipment,
    dataQuality: 'GOOD',
    payload: {
      equipmentId: equipment,
      state: 'RUNNING',
      product: entity.metadata.name,
    },
  };
}

export function resolveBaseUrl(
  configMap: Record<string, string>,
  entity: Entity,
): string | undefined {
  const name = entity.metadata.name;
  return (
    configMap[name] ||
    configMap[entity.metadata.annotations?.['dataprod.platform/template'] ?? ''] ||
    entity.metadata.annotations?.['dataprod.platform/consume-base-url']
  );
}
