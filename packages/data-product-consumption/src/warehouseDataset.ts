/**
 * Warehouse dataset id helpers (Phase C / ADR-011).
 * Format: `{domain}.{product}_{contract}_v{major}`
 */

export type WarehouseDatasetParts = {
  domain: string;
  name: string;
  contract: string;
  major?: number | string;
};

export function buildWarehouseDataset(parts: WarehouseDatasetParts): string {
  const domain = sqlSlug(parts.domain) || 'unknown';
  const name = sqlSlug(parts.name) || 'product';
  const contract = sqlSlug(parts.contract.replace(/-v\d+$/i, '')) || 'contract';
  const major = String(parts.major ?? 1).replace(/^v/i, '') || '1';
  return `${domain}.${name}_${contract}_v${major}`;
}

function sqlSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
