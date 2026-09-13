import type { QueryResult } from '@internal/data-product-consumption/node';
import {
  asRecordRows,
  type ConsumeQueryContext,
  type EnvelopeAdapter,
  isEnvelopeBody,
} from './types';

/**
 * Fallback: pass through Envelope v1 or invent columns from object keys.
 */
export const genericAdapter: EnvelopeAdapter = {
  id: 'generic',
  toQueryResult(body: unknown, _context: ConsumeQueryContext): QueryResult {
    if (isEnvelopeBody(body)) {
      return {
        ...body,
        source: 'upstream',
        detail: body.detail ?? 'Upstream Envelope v1',
      };
    }
    const rows = asRecordRows(body);
    const columns = Object.keys(rows[0] ?? {}).map(id => ({ id }));
    return {
      source: 'upstream',
      columns,
      rows,
      total: rows.length,
      detail: 'Generic key inference (no Golden Path adapter)',
    };
  },
};
