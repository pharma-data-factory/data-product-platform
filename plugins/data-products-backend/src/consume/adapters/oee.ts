import type { QueryResult } from '@internal/data-product-consumption/node';
import {
  asRecordRows,
  type ConsumeQueryContext,
  type EnvelopeAdapter,
  isEnvelopeBody,
} from './types';

const COLUMNS: QueryResult['columns'] = [
  { id: 'equipmentId', type: 'string' },
  { id: 'availability', type: 'number', semanticType: 'percentage' },
  { id: 'performance', type: 'number', semanticType: 'percentage' },
  { id: 'quality', type: 'number', semanticType: 'percentage' },
  { id: 'oee', type: 'number', semanticType: 'percentage' },
  { id: 'timestamp', type: 'string' },
  { id: 'site', type: 'string' },
  { id: 'area', type: 'string' },
  { id: 'line', type: 'string' },
];

function num(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export const oeeAdapter: EnvelopeAdapter = {
  id: 'oee',
  toQueryResult(body: unknown, context: ConsumeQueryContext): QueryResult {
    if (isEnvelopeBody(body)) {
      return { ...body, source: 'upstream' };
    }
    const rows = asRecordRows(body).map(row => {
      const contextObj =
        row.context && typeof row.context === 'object'
          ? (row.context as Record<string, unknown>)
          : {};
      return {
        equipmentId: String(
          row.equipmentId ?? context.equipment ?? '',
        ),
        availability: num(row.availability),
        performance: num(row.performance),
        quality: num(row.quality),
        oee: num(row.oee),
        timestamp: String(
          row.calculatedAt ?? row.windowEnd ?? row.timestamp ?? '',
        ),
        site: String(contextObj.site ?? context.site ?? ''),
        area: String(contextObj.area ?? context.area ?? ''),
        line: String(contextObj.line ?? context.line ?? ''),
      };
    });
    return {
      source: 'upstream',
      columns: COLUMNS,
      rows,
      total: rows.length,
      detail: 'OEE Golden Path adapter',
    };
  },
};
