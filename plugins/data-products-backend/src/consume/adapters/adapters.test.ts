import type { Entity } from '@backstage/catalog-model';
import {
  equipmentAdapter,
  oeeAdapter,
  resolveEnvelopeAdapter,
  temperatureAdapter,
} from './index';
import { genericAdapter } from './generic';
import { isEnvelopeBody } from './types';

function entity(name: string, template?: string): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name,
      annotations: template
        ? { 'dataprod.platform/template': template }
        : undefined,
    },
    spec: { type: 'data-product', owner: 'group:default/platform-team' },
  };
}

describe('envelope adapters', () => {
  it('detects Envelope v1 bodies', () => {
    expect(
      isEnvelopeBody({
        columns: [{ id: 'a' }],
        rows: [{ a: 1 }],
        source: 'upstream',
      }),
    ).toBe(true);
    expect(isEnvelopeBody([{ a: 1 }])).toBe(false);
  });

  it('resolves Golden Path adapters by template', () => {
    expect(
      resolveEnvelopeAdapter(entity('x', 'mqtt-temperature-product')).id,
    ).toBe('mqtt-temperature');
    expect(
      resolveEnvelopeAdapter(entity('x', 'rest-equipment-product')).id,
    ).toBe('rest-equipment');
    expect(resolveEnvelopeAdapter(entity('x', 'oee-data-product')).id).toBe(
      'oee',
    );
    expect(resolveEnvelopeAdapter(entity('other-product')).id).toBe('generic');
  });

  it('maps temperature events into QueryResult', () => {
    const result = temperatureAdapter.toQueryResult(
      [
        {
          eventId: 'e1',
          deviceId: 'sensor-1',
          temperature: 21.5,
          unit: 'C',
          timestamp: '2026-09-10T06:00:00Z',
        },
      ],
      {},
    );
    expect(result.source).toBe('upstream');
    expect(result.columns.map(c => c.id)).toEqual([
      'eventId',
      'deviceId',
      'temperature',
      'unit',
      'timestamp',
    ]);
    expect(result.rows[0].temperature).toBe(21.5);
    expect(result.columns.find(c => c.id === 'temperature')?.semanticType).toBe(
      'temperature',
    );
  });

  it('maps equipment list and filters by context', () => {
    const result = equipmentAdapter.toQueryResult(
      [
        {
          equipmentId: 'FILLER-01',
          name: 'Filler',
          site: 'SITE-A',
          status: 'ACTIVE',
          updatedAt: '2026-09-10T06:00:00Z',
        },
        {
          equipmentId: 'CAPPER-01',
          name: 'Capper',
          site: 'SITE-B',
          status: 'ACTIVE',
          updatedAt: '2026-09-10T06:00:00Z',
        },
      ],
      { site: 'SITE-A' },
    );
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].equipmentId).toBe('FILLER-01');
  });

  it('flattens OEE payload into dashboard columns', () => {
    const result = oeeAdapter.toQueryResult(
      {
        equipmentId: 'BOTTLE-FILLER-01',
        availability: 0.91,
        performance: 0.94,
        quality: 0.98,
        oee: 0.838,
        calculatedAt: '2026-09-10T06:00:00Z',
        context: { site: 'MODEL-PHARMA-01', area: 'PACK', line: 'L1' },
      },
      {},
    );
    expect(result.rows[0]).toMatchObject({
      equipmentId: 'BOTTLE-FILLER-01',
      oee: 0.838,
      site: 'MODEL-PHARMA-01',
      line: 'L1',
    });
    expect(result.columns.find(c => c.id === 'oee')?.semanticType).toBe(
      'percentage',
    );
  });

  it('generic adapter passes through Envelope v1', () => {
    const envelope = {
      columns: [{ id: 'x' }],
      rows: [{ x: 1 }],
      source: 'fixture' as const,
    };
    const result = genericAdapter.toQueryResult(envelope, {});
    expect(result.source).toBe('upstream');
    expect(result.rows[0].x).toBe(1);
  });
});
