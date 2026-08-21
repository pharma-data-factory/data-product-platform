import {
  CERTIFIED_GOLDEN_PATHS,
  ENTERPRISE_PRICING_CTA,
  FUTURE_GOLDEN_PATHS,
  HOW_IT_WORKS_STEPS,
  INTERNAL_OPERATING_EDITION,
  LEARN_ASSEMBLY_EXAMPLES,
  LEARN_ASSEMBLY_STEPS,
  LEARN_TOPICS,
  LEGAL_DISTRIBUTION_STATUS,
  parseLegalDistributionStatus,
  PLATFORM_CAPABILITIES,
  PRICING_MODELS,
  PRODUCT_EDITIONS,
  learnTopicHref,
} from './commercial';

describe('commercial edition model', () => {
  it('labels Template as available MVP, Platform as planned, and SaaS as future', () => {
    const template = PRODUCT_EDITIONS.find(edition => edition.id === 'template');
    const platform = PRODUCT_EDITIONS.find(edition => edition.id === 'platform');
    const saas = PRODUCT_EDITIONS.find(edition => edition.id === 'saas');

    expect(LEGAL_DISTRIBUTION_STATUS.engineeringPackage).toBe(
      'READY FOR LEGAL REVIEW',
    );
    expect(LEGAL_DISTRIBUTION_STATUS.counselGates).toBe('OPEN');
    expect(LEGAL_DISTRIBUTION_STATUS.commerciallyDistributable).toBe(false);
    expect(parseLegalDistributionStatus(undefined)).toBe('BLOCKED');
    expect(parseLegalDistributionStatus('APPROVED')).toBe('APPROVED');
    expect(template?.statusLabel).toBe('AVAILABLE FOR PILOT');
    expect(template?.availability).toBe('available');
    expect(platform?.statusLabel).toBe('PLANNED');
    expect(platform?.availability).toBe('planned');
    expect(saas?.statusLabel).toBe('FUTURE');
    expect(saas?.availability).toBe('future');
    expect(saas?.cta).toBe('Coming Later');
    expect(saas?.ctaDisabled).toBe(true);
    expect(INTERNAL_OPERATING_EDITION.id).toBe('internal');
    expect(INTERNAL_OPERATING_EDITION.customerSku).toBe(false);
    expect(template?.name).toBe('Template');
    expect(platform?.name).toBe('Platform');
    expect(saas?.name).toBe('SaaS');
    expect(template?.priceLabel).toBe('Per template');
    expect(platform?.priceLabel).toBe("Let's talk");
    expect(saas?.priceLabel).toBe('Coming later');
    expect(template?.deploymentKind).toBe('customer-hosted');
    expect(platform?.deploymentKind).toBe('customer-hosted');
    expect(saas?.deploymentKind).toBe('managed');
    expect(platform?.includesFrom).toBe('Template');
    expect(saas?.includesFrom).toBe('Platform');
  });

  it('does not present SaaS as available today', () => {
    const saas = PRODUCT_EDITIONS.find(edition => edition.id === 'saas');
    expect(saas?.availability).not.toBe('available');
    expect(saas?.description).toMatch(/operated as a service/i);
    expect(saas?.futureCapabilities?.length).toBeGreaterThan(0);
  });

  it('describes pricing models without inventing prices', () => {
    expect(PRICING_MODELS.map(model => model.model)).toEqual([
      'Per Template / Subscription',
      'Annual Platform License',
      'Managed Subscription',
    ]);
    expect(PRICING_MODELS.find(model => model.id === 'saas')?.statusLabel).toBe(
      'Future',
    );
    expect(ENTERPRISE_PRICING_CTA).toBe('Contact us for enterprise pricing.');
    const serialized = JSON.stringify({ PRODUCT_EDITIONS, PRICING_MODELS });
    expect(serialized).not.toMatch(/\$\d|€\d/);
    expect(serialized).not.toMatch(/Free|99|199/);
    expect(serialized).not.toMatch(/\bUSD\b|\bEUR\b/);
  });

  it('separates certified Golden Paths from planned future examples', () => {
    expect(CERTIFIED_GOLDEN_PATHS.map(path => path.name)).toEqual([
      'MQTT Temperature Data Product',
      'REST Equipment Data Product',
      'OEE Data Product',
    ]);
    expect(CERTIFIED_GOLDEN_PATHS.map(path => path.id)).toEqual([
      'mqtt-temperature',
      'rest-equipment',
      'oee',
    ]);
    expect(CERTIFIED_GOLDEN_PATHS.every(path => path.statusLabel === 'CERTIFIED')).toBe(
      true,
    );
    expect(FUTURE_GOLDEN_PATHS.map(path => path.name)).toEqual([
      'Snowflake',
      'SAP',
      'Cold Chain',
    ]);
    expect(
      FUTURE_GOLDEN_PATHS.every(path => path.availability === 'future'),
    ).toBe(true);
    expect(HOW_IT_WORKS_STEPS).toEqual([
      'Discover',
      'Create',
      'Test',
      'Govern',
      'Publish',
      'Consume',
    ]);
    expect(PLATFORM_CAPABILITIES).toHaveLength(6);
  });

  it('keeps Learn topics short and in business language', () => {
    expect(LEARN_TOPICS.map(topic => topic.title)).toEqual([
      'What is a Data Product?',
      'What is a Data Contract?',
      'Ownership',
      'How products are assembled',
      'Catalog vs Marketplace',
    ]);
    expect(LEARN_TOPICS).toHaveLength(5);
    for (const topic of LEARN_TOPICS) {
      expect(topic.summary.split(' ').length).toBeLessThan(40);
      expect(learnTopicHref(topic.id)).toBe(`#learn-${topic.id}`);
    }
    expect(LEARN_TOPICS.find(topic => topic.id === 'data-product')?.summary).toMatch(
      /without changing ERP, MES, or LIMS/i,
    );
    expect(LEARN_ASSEMBLY_STEPS).toEqual([
      'Connect sources',
      'Apply contract and quality',
      'Publish a Data Product',
    ]);
    expect(LEARN_ASSEMBLY_EXAMPLES).toEqual(['Temperature', 'Equipment']);
    const serialized = JSON.stringify(LEARN_TOPICS);
    expect(serialized).not.toMatch(/MQTT Consumer|Time-Series|TechDocs|output ports/i);
    expect(serialized).not.toMatch(/OEE|Cold Chain|dbt|ODCS/i);
  });
});
