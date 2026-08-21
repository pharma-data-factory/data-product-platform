import { Entity } from '@backstage/catalog-model';
import {
  isDataProductEntity,
  catalogClassLabel,
  catalogClassOf,
  isSampleDataProduct,
  matchesQuery,
  parseCertificationStatus,
  parseQualityStatus,
  toDataProduct,
  toRelatedDataProducts,
  withCatalogRelationships,
} from './model';

const entity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'orders-api',
    title: 'Orders API',
    description: 'Order events data product',
    annotations: {
      'dataprod.platform/kind': 'data-product',
      'dataprod.platform/version': '1.2.0',
      'dataprod.platform/domain': 'commerce',
      'dataprod.platform/certification-status': 'TESTED',
      'dataprod.platform/source-systems': 'erp, crm',
      'dataprod.platform/interfaces': 'REST',
      'dataprod.platform/data-contracts': 'orders-v1',
      'dataprod.platform/depends-on': 'resource:default/postgres',
      'dataprod.platform/deployment': 'docker-compose',
    },
    links: [
      {
        url: 'https://github.com/example/orders-api',
        title: 'Repository',
      },
      {
        url: 'https://github.com/example/orders-api/blob/main/docs/index.md',
        title: 'Documentation',
      },
    ],
  },
  spec: {
    type: 'data-product',
    owner: 'group:default/platform-team',
    lifecycle: 'experimental',
    providesApis: ['orders-api-api'],
    dependsOn: [],
  },
};

const mqttEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'mqtt-temperature-product',
    title: 'MQTT Temperature Data Product',
    description: 'MQTT temperature events',
    annotations: {
      'backstage.io/techdocs-ref': 'dir:.',
      'dataprod.platform/kind': 'data-product',
      'dataprod.platform/version': '1.0.0',
      'dataprod.platform/domain': 'manufacturing',
      'dataprod.platform/certification-status': 'DEVELOPMENT',
      'dataprod.platform/source-systems': 'mqtt',
      'dataprod.platform/interfaces': 'REST',
      'dataprod.platform/protocol': 'MQTT',
      'dataprod.platform/data-contracts': 'temperature-event-v1',
      'dataprod.platform/dataContract':
        'contracts/temperature-event.schema.json',
      'dataprod.platform/dataContractVersion': '1.1.0',
      'dataprod.platform/qualityStatus': 'TESTED',
      'dataprod.platform/quality-endpoint': '/api/v1/quality',
      'dataprod.platform/providesContract': 'temperature-event',
      'dataprod.platform/quality-checks':
        'deviceId_not_empty,timestamp_iso8601,temperature_within_limits,unit_allowed,eventId_not_empty,contract_schema',
      'dataprod.platform/dataProductStandardVersion': '1.0.0',
      'dataprod.platform/dataProductSdkVersion': '1.0.0',
      'dataprod.platform/template': 'mqtt-temperature-data-product',
      'dataprod.platform/templateVersion': '1.0.0',
    },
    links: [
      {
        url: 'https://github.com/pharma-data-factory/mqtt-temperature-product',
        title: 'Repository',
      },
    ],
  },
  spec: {
    type: 'data-product',
    owner: 'group:default/platform-team',
    lifecycle: 'experimental',
    dependsOn: [],
  },
};

const consumerEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'temperature-dashboard-consumer',
    title: 'Temperature Dashboard Consumer',
    annotations: {
      'dataprod.platform/kind': 'data-product',
      'dataprod.platform/version': '1.0.0',
      'dataprod.platform/consumesContract': 'temperature-event',
      'dataprod.platform/compatibleVersions': '1.x',
      'dataprod.platform/qualityStatus': 'DEVELOPMENT',
    },
  },
  spec: {
    type: 'data-product',
    owner: 'group:default/platform-team',
    lifecycle: 'experimental',
    dependsOn: ['component:default/mqtt-temperature-product'],
    consumesApis: ['temperature-event'],
  },
};

const mqttEntityWithRelations: Entity = {
  ...mqttEntity,
  spec: {
    ...mqttEntity.spec,
    providesApis: ['temperature-event'],
  },
  relations: [
    {
      type: 'providesApi',
      targetRef: 'api:default/temperature-event',
    },
    {
      type: 'dependencyOf',
      targetRef: 'component:default/temperature-dashboard-consumer',
    },
  ],
};

const consumerEntityWithRelations: Entity = {
  ...consumerEntity,
  relations: [
    {
      type: 'consumesApi',
      targetRef: 'api:default/temperature-event',
    },
    {
      type: 'dependsOn',
      targetRef: 'component:default/mqtt-temperature-product',
    },
    {
      type: 'dependsOn',
      targetRef: 'api:default/temperature-event',
    },
  ],
};

const temperatureEventApi: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'API',
  metadata: {
    name: 'temperature-event',
    title: 'Temperature Event Contract',
    annotations: {
      'dataprod.platform/contract-version': '1.1.0',
    },
  },
  spec: {
    type: 'contract',
  },
  relations: [
    {
      type: 'apiProvidedBy',
      targetRef: 'component:default/mqtt-temperature-product',
    },
    {
      type: 'apiConsumedBy',
      targetRef: 'component:default/temperature-dashboard-consumer',
    },
  ],
};

const nativeMqttEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'mqtt-temperature-product',
    title: 'MQTT Temperature Data Product',
    annotations: {
      'dataprod.platform/kind': 'data-product',
      'dataprod.platform/version': '1.0.0',
      'dataprod.platform/qualityStatus': 'TESTED',
      'dataprod.platform/certification-status': 'DEVELOPMENT',
    },
  },
  spec: {
    type: 'data-product',
    owner: 'group:default/platform-team',
    lifecycle: 'experimental',
    providesApis: ['temperature-event'],
    dependsOn: [],
  },
  relations: [
    {
      type: 'providesApi',
      targetRef: 'api:default/temperature-event',
    },
    {
      type: 'dependencyOf',
      targetRef: 'component:default/temperature-dashboard-consumer',
    },
  ],
};

const nativeConsumerEntity: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'temperature-dashboard-consumer',
    title: 'Temperature Dashboard Consumer',
    annotations: {
      'dataprod.platform/kind': 'data-product',
      'dataprod.platform/version': '1.0.0',
      'dataprod.platform/compatibleVersions': '1.x',
      'dataprod.platform/qualityStatus': 'DEVELOPMENT',
    },
  },
  spec: {
    type: 'data-product',
    owner: 'group:default/platform-team',
    lifecycle: 'experimental',
    dependsOn: [
      'component:default/mqtt-temperature-product',
      'api:default/temperature-event',
    ],
    consumesApis: ['temperature-event'],
  },
  relations: [
    {
      type: 'consumesApi',
      targetRef: 'api:default/temperature-event',
    },
    {
      type: 'dependsOn',
      targetRef: 'component:default/mqtt-temperature-product',
    },
    {
      type: 'dependsOn',
      targetRef: 'api:default/temperature-event',
    },
  ],
};

describe('data product model', () => {
  it('identifies data product entities', () => {
    expect(isDataProductEntity(entity)).toBe(true);
    expect(
      isDataProductEntity({
        ...entity,
        spec: { type: 'website' },
        metadata: { ...entity.metadata, annotations: {} },
      }),
    ).toBe(false);
    expect(
      isDataProductEntity({
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'unified-namespace',
          annotations: { 'dataprod.platform/kind': 'platform-component' },
        },
        spec: { type: 'platform-component' },
      }),
    ).toBe(false);
  });

  it('maps catalog metadata to the Data Product model', () => {
    const product = toDataProduct(entity);
    expect(product.name).toBe('orders-api');
    expect(product.owner).toBe('group:default/platform-team');
    expect(product.version).toBe('1.2.0');
    expect(product.lifecycle).toBe('experimental');
    expect(product.repository).toBe('https://github.com/example/orders-api');
    expect(product.documentation).toContain('docs/index.md');
    expect(product.techDocsUrl).toBeUndefined();
    expect(product.dependencies).toEqual(['resource:default/postgres']);
    expect(product.providesContract).toBe('orders-api-api');
    expect(product.apis).toEqual(['orders-api-api']);
    expect(product.certificationStatus).toBe('TESTED');
    expect(product.qualityStatus).toBe('DEVELOPMENT');
    expect(product.sourceSystems).toEqual(['erp', 'crm']);
  });

  it('maps MQTT Temperature Data Product quality metadata', () => {
    const product = toDataProduct(mqttEntity);
    expect(product.title).toBe('MQTT Temperature Data Product');
    expect(product.owner).toBe('group:default/platform-team');
    expect(product.lifecycle).toBe('experimental');
    expect(product.version).toBe('1.0.0');
    expect(product.dataContract).toBe(
      'contracts/temperature-event.schema.json',
    );
    expect(product.dataContractVersion).toBe('1.1.0');
    expect(product.qualityStatus).toBe('TESTED');
    expect(product.certificationStatus).toBe('DEVELOPMENT');
    expect(product.sourceSystems).toEqual(['mqtt']);
    expect(product.protocol).toBe('MQTT');
    expect(product.interfaces).toEqual(['REST']);
    expect(product.qualityEndpoint).toBe('/api/v1/quality');
    expect(product.templateName).toBe('mqtt-temperature-data-product');
    expect(product.templateVersion).toBe('1.0.0');
    expect(product.dataProductStandardVersion).toBe('1.0.0');
    expect(product.dataProductSdkVersion).toBe('1.0.0');
    expect(product.requiredChecks).toEqual([
      'deviceId_not_empty',
      'timestamp_iso8601',
      'temperature_within_limits',
      'unit_allowed',
      'eventId_not_empty',
      'contract_schema',
    ]);
    expect(product.repository).toBe(
      'https://github.com/pharma-data-factory/mqtt-temperature-product',
    );
    expect(product.documentation).toBe(
      '/docs/default/component/mqtt-temperature-product',
    );
    expect(product.techDocsUrl).toBe(
      '/docs/default/component/mqtt-temperature-product',
    );
    expect(product.providesContract).toBe('temperature-event');
  });

  it('maps consumer contract metadata and used-by relationships', () => {
    const [provider, consumer] = toRelatedDataProducts([
      mqttEntityWithRelations,
      consumerEntityWithRelations,
      temperatureEventApi,
    ]);
    expect(consumer.consumesContract).toBe('temperature-event');
    expect(consumer.compatibleVersions).toEqual(['1.x']);
    expect(consumer.dependsOn).toEqual([
      'component:default/mqtt-temperature-product',
      'api:default/temperature-event',
    ]);
    expect(provider.usedBy).toEqual(['Temperature Dashboard Consumer']);
    expect(provider.compatibilityStatus).toBe('COMPATIBLE');
    expect(consumer.compatibilityStatus).toBe('COMPATIBLE');
  });

  it('prefers native Catalog relations over conflicting annotations', () => {
    const provider = toDataProduct({
      ...mqttEntity,
      metadata: {
        ...mqttEntity.metadata,
        annotations: {
          ...mqttEntity.metadata.annotations,
          'dataprod.platform/providesContract': 'legacy-contract',
          'dataprod.platform/depends-on': 'resource:default/ignored',
        },
      },
      spec: {
        ...mqttEntity.spec,
        providesApis: ['from-spec-api'],
        dependsOn: ['component:default/from-spec'],
      },
      relations: [
        {
          type: 'providesApi',
          targetRef: 'api:default/from-relation',
        },
        {
          type: 'dependsOn',
          targetRef: 'component:default/from-relation',
        },
      ],
    });
    const consumer = toDataProduct({
      ...consumerEntity,
      metadata: {
        ...consumerEntity.metadata,
        annotations: {
          ...consumerEntity.metadata.annotations,
          'dataprod.platform/consumesContract': 'legacy-contract',
        },
      },
      spec: {
        ...consumerEntity.spec,
        consumesApis: ['from-spec-api'],
      },
      relations: [
        {
          type: 'consumesApi',
          targetRef: 'api:default/from-relation',
        },
      ],
    });

    expect(provider.providesContract).toBe('from-relation');
    expect(provider.apis).toEqual(['from-relation']);
    expect(provider.dependsOn).toEqual(['component:default/from-relation']);
    expect(consumer.consumesContract).toBe('from-relation');

    const specOverAnnotation = toDataProduct({
      ...mqttEntity,
      metadata: {
        ...mqttEntity.metadata,
        annotations: {
          ...mqttEntity.metadata.annotations,
          'dataprod.platform/providesContract': 'legacy-contract',
        },
      },
      spec: {
        ...mqttEntity.spec,
        providesApis: ['temperature-event'],
      },
    });
    expect(specOverAnnotation.providesContract).toBe('temperature-event');

    const consumeSpecOverAnnotation = toDataProduct({
      ...consumerEntity,
      metadata: {
        ...consumerEntity.metadata,
        annotations: {
          ...consumerEntity.metadata.annotations,
          'dataprod.platform/consumesContract': 'legacy-contract',
        },
      },
    });
    expect(consumeSpecOverAnnotation.consumesContract).toBe('temperature-event');
  });

  it('falls back to custom annotations when native relations are absent', () => {
    const provider = toDataProduct(mqttEntity);
    const consumer = toDataProduct({
      ...consumerEntity,
      spec: {
        type: 'data-product',
        owner: 'group:default/platform-team',
        lifecycle: 'experimental',
        dependsOn: [],
        consumesApis: [],
      },
    });
    const annotatedDepends = toDataProduct(entity);

    expect(provider.providesContract).toBe('temperature-event');
    expect(consumer.consumesContract).toBe('temperature-event');
    expect(annotatedDepends.dependsOn).toEqual(['resource:default/postgres']);
    expect(consumer.compatibleVersions).toEqual(['1.x']);
    expect(provider.qualityStatus).toBe('TESTED');
    expect(provider.certificationStatus).toBe('DEVELOPMENT');
    expect(provider.dataContractVersion).toBe('1.1.0');
  });

  it('derives Used By from dependencyOf and apiConsumedBy relations only', () => {
    const fromDependencyOf = toDataProduct(mqttEntityWithRelations);
    expect(fromDependencyOf.usedBy).toEqual([
      'component:default/temperature-dashboard-consumer',
    ]);

    const providerWithoutDependencyOf = toDataProduct({
      ...mqttEntityWithRelations,
      relations: [
        {
          type: 'providesApi',
          targetRef: 'api:default/temperature-event',
        },
      ],
    });
    const linked = withCatalogRelationships(
      providerWithoutDependencyOf,
      [
        providerWithoutDependencyOf,
        toDataProduct(consumerEntityWithRelations),
      ],
      [temperatureEventApi],
    );
    expect(linked.usedBy).toEqual(['Temperature Dashboard Consumer']);

    const annotationOnly = withCatalogRelationships(
      toDataProduct(mqttEntity),
      [toDataProduct(mqttEntity), toDataProduct(consumerEntity)],
    );
    expect(annotationOnly.usedBy).toEqual([]);
  });

  it('keeps compatibility status COMPATIBLE for native and fallback contract metadata', () => {
    const native = toRelatedDataProducts([
      mqttEntityWithRelations,
      consumerEntityWithRelations,
      temperatureEventApi,
    ]);
    expect(native[0].compatibilityStatus).toBe('COMPATIBLE');
    expect(native[1].compatibilityStatus).toBe('COMPATIBLE');

    const fallbackProvider = toDataProduct(mqttEntity);
    const fallbackConsumer = toDataProduct(consumerEntity);
    const fallback = withCatalogRelationships(fallbackProvider, [
      fallbackProvider,
      fallbackConsumer,
    ]);
    const fallbackConsumerStatus = withCatalogRelationships(
      fallbackConsumer,
      [fallbackProvider, fallbackConsumer],
    );
    expect(fallback.compatibilityStatus).toBe('COMPATIBLE');
    expect(fallbackConsumerStatus.compatibilityStatus).toBe('COMPATIBLE');
  });

  it('works with only native Catalog relations and no topology annotations', () => {
    expect(
      nativeMqttEntity.metadata.annotations?.[
        'dataprod.platform/providesContract'
      ],
    ).toBeUndefined();
    expect(
      nativeConsumerEntity.metadata.annotations?.[
        'dataprod.platform/consumesContract'
      ],
    ).toBeUndefined();
    expect(
      nativeMqttEntity.metadata.annotations?.[
        'dataprod.platform/dataContractVersion'
      ],
    ).toBeUndefined();
    expect(
      nativeMqttEntity.metadata.annotations?.['dataprod.platform/depends-on'],
    ).toBeUndefined();

    const [provider, consumer] = toRelatedDataProducts([
      nativeMqttEntity,
      nativeConsumerEntity,
      temperatureEventApi,
    ]);
    expect(provider.providesContract).toBe('temperature-event');
    expect(consumer.consumesContract).toBe('temperature-event');
    expect(provider.dataContractVersion).toBe('1.1.0');
    expect(consumer.dataContractVersion).toBe('1.1.0');
    expect(provider.usedBy).toEqual(['Temperature Dashboard Consumer']);
    expect(provider.compatibilityStatus).toBe('COMPATIBLE');
    expect(consumer.compatibilityStatus).toBe('COMPATIBLE');
    expect(consumer.compatibleVersions).toEqual(['1.x']);
    expect(provider.qualityStatus).toBe('TESTED');
    expect(provider.certificationStatus).toBe('DEVELOPMENT');
  });

  it('prefers the API contract-version annotation over component dataContractVersion', () => {
    const linked = withCatalogRelationships(
      toDataProduct(mqttEntity),
      [toDataProduct(mqttEntity)],
      [
        {
          ...temperatureEventApi,
          metadata: {
            ...temperatureEventApi.metadata,
            annotations: {
              'dataprod.platform/contract-version': '1.2.0',
            },
          },
        },
      ],
    );
    expect(toDataProduct(mqttEntity).dataContractVersion).toBe('1.1.0');
    expect(linked.dataContractVersion).toBe('1.2.0');
  });

  it('keeps reading legacy providesContract and dataContractVersion', () => {
    const legacy = toDataProduct(mqttEntity);
    expect(legacy.providesContract).toBe('temperature-event');
    expect(legacy.dataContractVersion).toBe('1.1.0');
    expect(legacy.contractLogicalName).toBe('temperature-event');
  });

  it('uses unique API entity names without colliding logical contracts', () => {
    const { ['dataprod.platform/providesContract']: _provides, ['dataprod.platform/dataContractVersion']: _version, ...annotations } =
      mqttEntity.metadata.annotations ?? {};
    const first = toDataProduct({
      ...mqttEntity,
      metadata: {
        ...mqttEntity.metadata,
        name: 'cold-room-temperature',
        annotations,
      },
      spec: {
        ...mqttEntity.spec,
        providesApis: ['cold-room-temperature--temperature-event'],
      },
    });
    const second = toDataProduct({
      ...mqttEntity,
      metadata: {
        ...mqttEntity.metadata,
        name: 'warehouse-temperature',
        annotations,
      },
      spec: {
        ...mqttEntity.spec,
        providesApis: ['warehouse-temperature--temperature-event'],
      },
    });
    expect(first.providesContract).toBe(
      'cold-room-temperature--temperature-event',
    );
    expect(second.providesContract).toBe(
      'warehouse-temperature--temperature-event',
    );
    expect(first.providesContract).not.toBe(second.providesContract);
    expect(first.contractLogicalName).toBe('temperature-event');
    expect(second.contractLogicalName).toBe('temperature-event');
  });

  it('marks current standard, SDK, and template versions as CURRENT', () => {
    const product = withCatalogRelationships(toDataProduct(mqttEntity), [
      toDataProduct(mqttEntity),
    ]);
    expect(product.upgrade?.standard.status).toBe('CURRENT');
    expect(product.upgrade?.sdk.status).toBe('CURRENT');
    expect(product.upgrade?.template.status).toBe('CURRENT');
    expect(product.upgrade?.overall).toBe('CURRENT');
  });

  it('filters by search query', () => {
    const product = toDataProduct(entity);
    expect(matchesQuery(product, 'orders')).toBe(true);
    expect(matchesQuery(product, 'commerce')).toBe(true);
    expect(matchesQuery(product, 'kafka')).toBe(false);
    expect(matchesQuery(toDataProduct(mqttEntity), 'TESTED')).toBe(true);
    expect(matchesQuery(toDataProduct(mqttEntity), '1.1.0')).toBe(true);
  });

  it('defaults unknown quality and certification to DEVELOPMENT', () => {
    expect(parseCertificationStatus('VALIDATED')).toBe('DEVELOPMENT');
    expect(parseCertificationStatus('CERTIFIED')).toBe('CERTIFIED');
    expect(parseQualityStatus('TESTED')).toBe('TESTED');
    expect(parseQualityStatus('unknown')).toBe('DEVELOPMENT');
  });

  it('marks sample catalog entities without a second source of truth', () => {
    expect(
      isSampleDataProduct({ name: 'sample-mqtt-temperature-product' }),
    ).toBe(true);
    expect(isSampleDataProduct({ name: 'cold-room-temperature' })).toBe(false);
    expect(
      isSampleDataProduct({ name: 'orders', title: 'Sample Orders Product' }),
    ).toBe(true);
    expect(
      catalogClassOf({
        name: 'machine-metrics-reference',
        catalogClass: 'REFERENCE',
      }),
    ).toBe('REFERENCE');
    expect(
      catalogClassLabel({
        name: 'machine-metrics-reference',
        catalogClass: 'REFERENCE',
      }),
    ).toBe('REFERENCE');
    expect(catalogClassLabel({ name: 'cold-room-temperature' })).toBeUndefined();
  });
});
