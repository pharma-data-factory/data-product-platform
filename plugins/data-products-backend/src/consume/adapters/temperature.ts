import type { QueryResult } from '@internal/data-product-consumption/node';
import {
  asRecordRows,
  type ConsumeQueryContext,
  type EnvelopeAdapter,
  isEnvelopeBody,
} from './types';

const COLUMNS: QueryResult['columns'] = [
  { id: 'eventId', type: 'string' },
  { id: 'deviceId', type: 'string' },
  { id: 'temperature', type: 'number', semanticType: 'temperature', unit: 'C' },
  { id: 'unit', type: 'string' },
  { id: 'timestamp', type: 'string' },
];

function pickUnit(row: Record<string, unknown>): string {
  const unit = row.unit;
  return typeof unit === 'string' && unit.length > 0 ? unit : 'C';
}

export const temperatureAdapter: EnvelopeAdapter = {
  id: 'mqtt-temperature',
  toQueryResult(body: unknown, _context: ConsumeQueryContext): QueryResult {
    if (isEnvelopeBody(body)) {
      return { ...body, source: 'upstream' };
    }
    const rows = asRecordRows(body).map(row => {
      const unit = pickUnit(row);
      return {
        eventId: String(row.eventId ?? ''),
        deviceId: String(row.deviceId ?? row.sensorId ?? ''),
        temperature:
          typeof row.temperature === 'number'
            ? row.temperature
            : Number(row.temperature),
        unit,
        timestamp: String(row.timestamp ?? ''),
      };
    });
    return {
      source: 'upstream',
      columns: COLUMNS.map(col =>
        col.id === 'temperature' ? { ...col, unit: rows[0]?.unit ?? 'C' } : col,
      ),
      rows,
      total: rows.length,
      detail: 'MQTT Temperature Golden Path adapter',
    };
  },
};
