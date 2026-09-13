import type { Entity } from '@backstage/catalog-model';
import type { QueryResult } from '@internal/data-product-consumption/node';

/** Context forwarded from /consume/query into upstream adapters. */
export type ConsumeQueryContext = {
  site?: string;
  area?: string;
  line?: string;
  equipment?: string;
};

export type EnvelopeAdapter = {
  id: string;
  /**
   * Map a raw upstream JSON body into a Nexora QueryResult envelope.
   * Must never throw on unexpected shapes — return empty rows with detail.
   */
  toQueryResult(body: unknown, context: ConsumeQueryContext): QueryResult;
};

export function isEnvelopeBody(body: unknown): body is QueryResult {
  if (!body || typeof body !== 'object') {
    return false;
  }
  const candidate = body as Partial<QueryResult>;
  return Array.isArray(candidate.columns) && Array.isArray(candidate.rows);
}

export function asRecordRows(body: unknown): Record<string, unknown>[] {
  if (Array.isArray(body)) {
    return body.filter(
      (row): row is Record<string, unknown> =>
        !!row && typeof row === 'object' && !Array.isArray(row),
    );
  }
  if (body && typeof body === 'object') {
    const withItems = body as { items?: unknown[] };
    if (Array.isArray(withItems.items)) {
      return withItems.items.filter(
        (row): row is Record<string, unknown> =>
          !!row && typeof row === 'object' && !Array.isArray(row),
      );
    }
    return [body as Record<string, unknown>];
  }
  return [];
}

export function templateOf(entity: Entity): string {
  return (
    entity.metadata.annotations?.['dataprod.platform/template'] ??
    entity.metadata.name
  ).toLowerCase();
}

export function productNameOf(entity: Entity): string {
  return entity.metadata.name.toLowerCase();
}
