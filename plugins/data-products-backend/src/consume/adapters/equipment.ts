import type { QueryResult } from '@internal/data-product-consumption/node';
import {
  asRecordRows,
  type ConsumeQueryContext,
  type EnvelopeAdapter,
  isEnvelopeBody,
} from './types';

const COLUMNS: QueryResult['columns'] = [
  { id: 'equipmentId', type: 'string' },
  { id: 'name', type: 'string' },
  { id: 'site', type: 'string' },
  { id: 'status', type: 'string' },
  { id: 'updatedAt', type: 'string' },
];

export const equipmentAdapter: EnvelopeAdapter = {
  id: 'rest-equipment',
  toQueryResult(body: unknown, context: ConsumeQueryContext): QueryResult {
    if (isEnvelopeBody(body)) {
      return { ...body, source: 'upstream' };
    }
    let rows = asRecordRows(body).map(row => ({
      equipmentId: String(row.equipmentId ?? ''),
      name: String(row.name ?? ''),
      site: String(row.site ?? context.site ?? ''),
      status: String(row.status ?? ''),
      updatedAt: String(row.updatedAt ?? ''),
    }));
    if (context.equipment) {
      rows = rows.filter(
        row =>
          row.equipmentId === context.equipment ||
          row.name === context.equipment,
      );
    }
    if (context.site) {
      rows = rows.filter(row => !row.site || row.site === context.site);
    }
    return {
      source: 'upstream',
      columns: COLUMNS,
      rows,
      total: rows.length,
      detail: 'REST Equipment Golden Path adapter',
    };
  },
};
