import { descriptorFromEntity, isDataProductComponent } from './descriptor';
import type { Entity } from '@backstage/catalog-model';

function entity(partial: Partial<Entity> & { metadata: Entity['metadata'] }): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    spec: { type: 'data-product', owner: 'group:default/platform-team', lifecycle: 'experimental' },
    ...partial,
  } as Entity;
}

describe('descriptorFromEntity', () => {
  it('normalizes OEE-like annotations without inventing live quality', () => {
    const d = descriptorFromEntity(
      entity({
        metadata: {
          name: 'sample-oee-data-product',
          title: 'Sample OEE',
          annotations: {
            'dataprod.platform/domain': 'manufacturing',
            'dataprod.platform/version': '1.0.0',
            'dataprod.platform/interfaces': 'REST',
            'dataprod.platform/consume-stream': 'sse',
            'dataprod.platform/presentation-capabilities': 'table,metric-cards,realtime',
            'dataprod.platform/presentation-extensions': 'oee-dashboard',
            'dataprod.platform/validation-status': 'NOT_VALIDATED',
            'dataprod.platform/data-contracts': 'oee-result-v1',
          },
        },
      }),
    );
    expect(d.name).toBe('sample-oee-data-product');
    expect(d.validation.status).toBe('NOT_VALIDATED');
    expect(d.quality.freshnessSeconds).toBe('NOT_AVAILABLE');
    expect(d.presentation.extensions).toEqual(['oee-dashboard']);
    expect(d.interfaces.some(i => i.type === 'rest')).toBe(true);
    expect(d.interfaces.some(i => i.type === 'stream')).toBe(true);
    expect(d.contracts.outputs).toContain('oee-result-v1');
  });

  it('rejects non data-product components', () => {
    expect(
      isDataProductComponent(
        entity({
          metadata: { name: 'svc' },
          spec: { type: 'service', owner: 'x', lifecycle: 'production' },
        }),
      ),
    ).toBe(false);
  });

  it('exposes Product Publish Bus MQTT egress from annotations', () => {
    const d = descriptorFromEntity(
      entity({
        metadata: {
          name: 'sample-mqtt-temperature-product',
          annotations: {
            'dataprod.platform/domain': 'manufacturing',
            'dataprod.platform/interfaces': 'REST',
            'dataprod.platform/publish-enabled': 'true',
            'dataprod.platform/publish-ports': 'mqtt',
            'dataprod.platform/publish-mqtt-topic':
              'products/manufacturing/sample-mqtt-temperature-product/temperature-event/v1',
            'dataprod.platform/data-contracts': 'temperature-event-v1',
          },
        },
      }),
    );
    expect(d.publish.enabled).toBe(true);
    expect(d.publish.topicConvention).toBe('products');
    expect(d.publish.ports).toEqual([
      {
        id: 'mqtt',
        type: 'mqtt',
        topic:
          'products/manufacturing/sample-mqtt-temperature-product/temperature-event/v1',
        enabled: true,
      },
    ]);
    const egress = d.interfaces.find(i => i.id === 'egress');
    expect(egress?.direction).toBe('publish');
    expect(egress?.topic).toContain('products/');
  });

  it('defaults publish to disabled without inventing warehouse ports', () => {
    const d = descriptorFromEntity(
      entity({
        metadata: {
          name: 'plain-product',
          annotations: { 'dataprod.platform/domain': 'manufacturing' },
        },
      }),
    );
    expect(d.publish.enabled).toBe(false);
    expect(d.publish.ports).toEqual([]);
  });

  it('exposes warehouse publish port with profile and dataset', () => {
    const d = descriptorFromEntity(
      entity({
        metadata: {
          name: 'sample-oee-data-product',
          annotations: {
            'dataprod.platform/domain': 'manufacturing',
            'dataprod.platform/publish-enabled': 'true',
            'dataprod.platform/publish-ports': 'mqtt,warehouse',
            'dataprod.platform/publish-mqtt-topic':
              'products/manufacturing/sample-oee-data-product/oee-result/v1',
            'dataprod.platform/publish-warehouse-profile': 'snowflake',
            'dataprod.platform/publish-warehouse-dataset':
              'manufacturing.sample_oee_data_product_oee_result_v1',
            'dataprod.platform/data-contracts': 'oee-result-v1',
          },
        },
      }),
    );
    expect(d.publish.ports).toEqual([
      {
        id: 'mqtt',
        type: 'mqtt',
        topic: 'products/manufacturing/sample-oee-data-product/oee-result/v1',
        enabled: true,
      },
      {
        id: 'warehouse',
        type: 'warehouse',
        dataset: 'manufacturing.sample_oee_data_product_oee_result_v1',
        profile: 'snowflake',
        enabled: true,
      },
    ]);
  });
});
