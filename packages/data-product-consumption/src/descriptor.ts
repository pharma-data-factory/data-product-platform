import { Entity, parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import type {
  DataProductDescriptor,
  DataProductInterface,
  PresentationCapability,
  ValidationStatusView,
} from './types';

const P = 'dataprod.platform';

function ann(entity: Entity, key: string): string | undefined {
  return entity.metadata.annotations?.[`${P}/${key}`];
}

function csv(value?: string): string[] {
  if (!value?.trim()) return [];
  return value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}

function parseCapabilities(value?: string): PresentationCapability[] {
  const allowed: PresentationCapability[] = [
    'table',
    'metric-cards',
    'timeseries',
    'realtime',
    'json',
    'schema',
  ];
  const parsed = csv(value) as PresentationCapability[];
  const filtered = parsed.filter(c => allowed.includes(c));
  return filtered.length
    ? filtered
    : (['table', 'json', 'schema'] as PresentationCapability[]);
}

function parseValidation(value?: string): ValidationStatusView {
  if (
    value === 'NOT_VALIDATED' ||
    value === 'BASELINED' ||
    value === 'VALIDATION_IN_PROGRESS' ||
    value === 'VALIDATED'
  ) {
    return value;
  }
  return 'NOT_VALIDATED';
}

function buildInterfaces(entity: Entity): DataProductInterface[] {
  const interfaces: DataProductInterface[] = [];
  const declared = csv(ann(entity, 'interfaces'));
  const restPath = ann(entity, 'consume-rest-path') ?? ann(entity, 'quality-endpoint');
  if (declared.some(d => d.toUpperCase() === 'REST') || restPath) {
    interfaces.push({
      id: 'query',
      type: 'rest',
      path: restPath ?? '/api/v1',
      apiRef: ann(entity, 'consume-api-ref'),
      openApiPath: ann(entity, 'openapi'),
    });
  }
  const stream = ann(entity, 'consume-stream');
  if (stream === 'sse' || stream === 'websocket' || declared.includes('STREAM')) {
    interfaces.push({
      id: 'realtime',
      type: 'stream',
      protocol: stream === 'websocket' ? 'websocket' : 'sse',
      path: ann(entity, 'consume-stream-path') ?? '/api/v1/stream',
    });
  }
  const mqttTopic = ann(entity, 'consume-mqtt-topic') ?? ann(entity, 'mqtt-topic');
  if (mqttTopic || (ann(entity, 'protocol') ?? '').toUpperCase().includes('MQTT')) {
    interfaces.push({
      id: 'source',
      type: 'mqtt',
      topic: mqttTopic,
    });
  }
  if (interfaces.length === 0) {
    interfaces.push({ id: 'query', type: 'rest', path: '/api/v1' });
  }
  return interfaces;
}

/**
 * Normalize a Catalog Component (type data-product) into a consumption descriptor.
 * Does not invent live quality/validation metrics.
 */
export function descriptorFromEntity(entity: Entity): DataProductDescriptor {
  const ref = parseEntityRef(stringifyEntityRef(entity));
  const provides = (entity.spec?.providesApis as string[] | undefined) ?? [];
  const dependsOn = (entity.spec?.dependsOn as string[] | undefined) ?? [];
  const consumes = csv(ann(entity, 'consumesContract'));
  const outputs = csv(ann(entity, 'data-contracts') || ann(entity, 'providesContract'));

  const relations = entity.relations ?? [];
  const lineage = relations.map(r => ({
    from: r.type.endsWith('Of') || r.type === 'apiConsumedBy' ? r.targetRef : stringifyEntityRef(entity),
    to: r.type.endsWith('Of') || r.type === 'apiConsumedBy' ? stringifyEntityRef(entity) : r.targetRef,
    relation: r.type,
  }));

  return {
    entityRef: stringifyEntityRef(entity),
    name: entity.metadata.name,
    namespace: ref.namespace,
    title: entity.metadata.title ?? entity.metadata.name,
    description: entity.metadata.description ?? '',
    domain: ann(entity, 'domain') ?? 'unknown',
    owner: String(entity.spec?.owner ?? 'unknown'),
    lifecycle: String(entity.spec?.lifecycle ?? 'experimental'),
    version: ann(entity, 'version') ?? '0.0.0',
    interfaces: buildInterfaces(entity),
    contracts: {
      inputs: consumes.length ? consumes : csv(ann(entity, 'input-contracts')),
      outputs: outputs.length ? outputs : provides,
    },
    quality: {
      freshnessTargetSeconds: Number(ann(entity, 'freshness-target-seconds') || '') || undefined,
      completenessTarget: Number(ann(entity, 'completeness-target') || '') || undefined,
      endpoint: ann(entity, 'quality-endpoint'),
      checks: csv(ann(entity, 'quality-checks')),
      freshnessSeconds: 'NOT_AVAILABLE',
      completeness: 'NOT_AVAILABLE',
      lastUpdate: 'NOT_AVAILABLE',
      status: ann(entity, 'qualityStatus') ?? 'NOT_AVAILABLE',
    },
    presentation: {
      defaultView: (parseCapabilities(ann(entity, 'presentation-default'))[0] ??
        'table') as PresentationCapability,
      capabilities: parseCapabilities(
        ann(entity, 'presentation-capabilities') ?? 'table,json,schema,metric-cards',
      ),
      extensions: csv(ann(entity, 'presentation-extensions')),
    },
    validation: {
      status: parseValidation(ann(entity, 'validation-status')),
      baseline: 'NOT_AVAILABLE',
      urs: 'NOT_AVAILABLE',
      systemSpec: 'NOT_AVAILABLE',
      traceability: 'NOT_AVAILABLE',
      lastValidationRun: 'NOT_AVAILABLE',
    },
    lineage: [
      ...lineage,
      ...dependsOn.map(d => ({
        from: d,
        to: stringifyEntityRef(entity),
        relation: 'dependsOn',
      })),
    ],
    repository: entity.metadata.annotations?.['github.com/project-slug']
      ? `https://github.com/${entity.metadata.annotations['github.com/project-slug']}`
      : entity.metadata.links?.find(l => l.title === 'Repository')?.url,
    documentation: entity.metadata.links?.find(l => /doc/i.test(l.title ?? ''))?.url,
    catalogClass: ann(entity, 'catalog-class'),
    templateName: ann(entity, 'template'),
  };
}

export function isDataProductComponent(entity: Entity): boolean {
  return (
    entity.kind === 'Component' &&
    (entity.spec?.type === 'data-product' ||
      entity.metadata.annotations?.[`${P}/kind`] === 'data-product')
  );
}
