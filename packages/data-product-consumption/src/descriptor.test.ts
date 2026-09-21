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

  // Phase 6 (P6-S1): Analytics Providers
  it('parses analytics providers from JSON annotation', () => {
    const providers = [
      { name: 'OEE Dashboard', type: 'PowerBI', url: 'https://powerbi.example.com/oee' },
      { name: 'Process Notebook', type: 'Jupyter', description: 'Daily batch analysis' },
    ];
    const d = descriptorFromEntity(
      entity({
        metadata: {
          name: 'analytics-product',
          annotations: {
            'dataprod.platform/analytics-providers': JSON.stringify(providers),
          },
        },
      }),
    );
    expect(d.analyticsProviders).toHaveLength(2);
    expect(d.analyticsProviders[0].name).toBe('OEE Dashboard');
    expect(d.analyticsProviders[0].type).toBe('PowerBI');
    expect(d.analyticsProviders[0].url).toBe('https://powerbi.example.com/oee');
    expect(d.analyticsProviders[1].type).toBe('Jupyter');
    expect(d.analyticsProviders[1].description).toBe('Daily batch analysis');
  });

  it('coerces unknown analytics provider type to Custom', () => {
    const d = descriptorFromEntity(
      entity({
        metadata: {
          name: 'x',
          annotations: {
            'dataprod.platform/analytics-providers': JSON.stringify([
              { name: 'Unknown Tool', type: 'NotARealTool' },
            ]),
          },
        },
      }),
    );
    expect(d.analyticsProviders[0].type).toBe('Custom');
  });

  it('returns empty analyticsProviders when annotation is absent', () => {
    const d = descriptorFromEntity(entity({ metadata: { name: 'x' } }));
    expect(d.analyticsProviders).toEqual([]);
  });
});
