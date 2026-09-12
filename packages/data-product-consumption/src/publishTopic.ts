/**
 * Product Publish Bus topic helpers (ADR-011).
 * Namespace is always under `products/…`, never `uns/…`.
 */

export type ProductPublishTopicParts = {
  domain: string;
  name: string;
  contract: string;
  /** Major contract version, e.g. 1 */
  major?: number | string;
};

/**
 * Build `products/{domain}/{name}/{contract}/v{major}`.
 * Segments are slugified to MQTT-safe tokens.
 */
export function buildProductPublishTopic(parts: ProductPublishTopicParts): string {
  const domain = slug(parts.domain) || 'unknown';
  const name = slug(parts.name) || 'product';
  const contract = slug(parts.contract) || 'contract';
  const major = String(parts.major ?? 1).replace(/^v/i, '') || '1';
  return `products/${domain}/${name}/${contract}/v${major}`;
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
