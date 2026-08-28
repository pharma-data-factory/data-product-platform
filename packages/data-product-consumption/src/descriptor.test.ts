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

  it('defaults unknown validation to NOT_VALIDATED', () => {
    const d = descriptorFromEntity(
      entity({
        metadata: {
          name: 'x',
          annotations: { 'dataprod.platform/validation-status': 'SOMETHING_ELSE' },
        },
      }),
    );
    expect(d.validation.status).toBe('NOT_VALIDATED');
  });
});
