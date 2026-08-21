import {
  ENTITLEMENT_IDS,
  FUTURE_ENTITLEMENTS,
  MVP_ENABLED_ENTITLEMENTS,
  createDefaultEntitlementContext,
  createEntitlementContext,
  createEntitlementRecord,
  createNoopUsageMeteringProvider,
  deriveEntitlementStatus,
  isActiveEntitlement,
  rejectSaasRegistration,
} from './entitlements';

describe('EntitlementContext', () => {
  it('treats locally configured capabilities as entitled', () => {
    const context = createDefaultEntitlementContext();

    expect(context.source).toBe('INTERNAL');
    expect(context.provider).toBe('local');
    expect(context.organizationId).toBe('internal');
    expect(MVP_ENABLED_ENTITLEMENTS).toEqual([
      'golden-path.mqtt-temperature',
      'golden-path.rest-equipment',
      'platform.core',
    ]);
    for (const id of MVP_ENABLED_ENTITLEMENTS) {
      expect(context.isEntitled(id)).toBe(true);
    }
    expect(context.isEntitled('platform-core')).toBe(true);
    expect(context.isEntitled('mqtt-temperature-template')).toBe(true);
  });

  it('documents future entitlements without enabling them', () => {
    const context = createDefaultEntitlementContext();

    expect(ENTITLEMENT_IDS).toContain('future.golden-path.oee');
    expect(FUTURE_ENTITLEMENTS).toEqual(['future.golden-path.oee']);
    expect(context.isEntitled('future.golden-path.oee')).toBe(false);
  });

  it('does not implement payment or marketplace enforcement in the local model', () => {
    const context = createDefaultEntitlementContext();
    const source = JSON.stringify(context);

    expect(source).not.toMatch(/stripe|invoice|billing|payment|checkout/i);
    expect(context.source).not.toBe('AWS_MARKETPLACE');
    expect(context.isEntitled('platform.core')).toBe(true);
    expect(JSON.stringify(context.entitlements)).not.toMatch(
      /AWS_ACCESS_KEY|secret|token/i,
    );
  });

  it('treats expired and suspended entitlements as not entitled', () => {
    const expired = createEntitlementRecord({
      organizationId: 'internal',
      productId: 'golden-path.mqtt-temperature',
      status: 'ACTIVE',
      validUntil: '2020-01-01T00:00:00.000Z',
    });
    expect(deriveEntitlementStatus(expired)).toBe('EXPIRED');
    expect(isActiveEntitlement(expired)).toBe(false);

    const suspended = createEntitlementRecord({
      organizationId: 'internal',
      productId: 'golden-path.rest-equipment',
      status: 'SUSPENDED',
    });
    expect(isActiveEntitlement(suspended)).toBe(false);
  });

  it('keeps concurrent agreements distinguishable and entitles if any is ACTIVE', () => {
    const expired = createEntitlementRecord({
      organizationId: 'internal',
      productId: 'golden-path.rest-equipment',
      status: 'EXPIRED',
      externalReference: 'arn:aws:license-manager::1:license:old',
    });
    const active = createEntitlementRecord({
      organizationId: 'internal',
      productId: 'golden-path.rest-equipment',
      status: 'ACTIVE',
      externalReference: 'arn:aws:license-manager::1:license:new',
    });
    expect(expired.id).not.toEqual(active.id);
    const context = createEntitlementContext({
      organizationId: 'internal',
      entitlements: [expired, active],
      source: 'AWS_MARKETPLACE',
      provider: 'aws',
    });
    expect(context.isEntitled('golden-path.rest-equipment')).toBe(true);
    expect(context.getEntitlement('golden-path.rest-equipment')?.externalReference).toContain(
      'license:new',
    );
  });

  it('keeps SaaS registration and metering as non-operational boundaries', async () => {
    expect(rejectSaasRegistration()).toMatchObject({
      enabled: false,
      status: 'NOT_IMPLEMENTED',
    });
    await expect(
      createNoopUsageMeteringProvider().reportUsage({
        organizationId: 'internal',
        dimension: 'golden-paths',
        quantity: 1,
        occurredAt: new Date().toISOString(),
      }),
    ).resolves.toMatchObject({ accepted: false });
  });
});
