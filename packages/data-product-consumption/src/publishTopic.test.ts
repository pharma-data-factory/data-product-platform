/**
 * Product Publish Bus topic helpers (ADR-011).
 */

import { buildProductPublishTopic } from './publishTopic';

describe('buildProductPublishTopic', () => {
  it('builds products/{domain}/{name}/{contract}/v{major}', () => {
    expect(
      buildProductPublishTopic({
        domain: 'Manufacturing',
        name: 'Line04-OEE',
        contract: 'oee-result-v1',
        major: 1,
      }),
    ).toBe('products/manufacturing/line04-oee/oee-result-v1/v1');
  });

  it('never uses uns/ prefix', () => {
    const topic = buildProductPublishTopic({
      domain: 'make',
      name: 'temp',
      contract: 'temperature-event',
    });
    expect(topic.startsWith('products/')).toBe(true);
    expect(topic.includes('uns/')).toBe(false);
  });
});
