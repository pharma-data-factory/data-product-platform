import fs from 'fs';
import os from 'os';
import path from 'path';
import { FileCreateAuthorizationAuditStore } from './create-authorization-audit-store';
import { LocalEntitlementProvider, PlatformEntitlementService } from './entitlement-service';
import { createEntitlementRecord } from './entitlements';

function serviceWith(productIds?: readonly string[], records?: readonly ReturnType<typeof createEntitlementRecord>[]) {
  return new PlatformEntitlementService({
    provider: new LocalEntitlementProvider({ productIds, records }),
    organizationId: 'internal',
  });
}

describe('PlatformEntitlementService', () => {
  it('returns active local entitlements for the internal organization', async () => {
    const service = serviceWith();
    const context = await service.getEntitlements('internal');
    expect(context.isEntitled('golden-path.mqtt-temperature')).toBe(true);
    expect(await service.hasEntitlement('internal', 'golden-path.rest-equipment')).toBe(
      true,
    );
    expect(await service.listAvailableCapabilities('internal')).toEqual(
      expect.arrayContaining([
        'golden-path.mqtt-temperature',
        'golden-path.rest-equipment',
        'platform.core',
      ]),
    );
  });

  it('allows Developer create when RBAC and entitlement are both granted', async () => {
    const service = serviceWith();
    const result = await service.authorizeCreate({
      organizationId: 'internal',
      templateId: 'mqtt-temperature-data-product',
      role: 'DEVELOPER',
      actor: 'user:default/developer',
    });
    expect(result).toMatchObject({
      allowed: true,
      rbacAllowed: true,
      entitled: true,
      reason: 'OK',
      productId: 'golden-path.mqtt-temperature',
    });
  });

  it('denies Viewer create even when the organization is entitled', async () => {
    const service = serviceWith();
    const result = await service.authorizeCreate({
      organizationId: 'internal',
      templateId: 'mqtt-temperature-data-product',
      role: 'VIEWER',
      actor: 'user:default/viewer',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('RBAC');
    expect(result.entitled).toBe(true);
  });

  it('denies Developer create when the commercial entitlement is missing', async () => {
    const service = serviceWith(['platform.core']);
    const result = await service.authorizeCreate({
      organizationId: 'internal',
      templateId: 'mqtt-temperature-data-product',
      role: 'DEVELOPER',
      actor: 'user:default/developer',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ENTITLEMENT');
    expect(result.rbacAllowed).toBe(true);
    expect(result.message).toMatch(/commercial capability is unavailable/i);
  });

  it('denies Developer create when the commercial entitlement is expired', async () => {
    const service = serviceWith(undefined, [
      createEntitlementRecord({
        organizationId: 'internal',
        productId: 'golden-path.rest-equipment',
        status: 'ACTIVE',
        validUntil: '2020-01-01T00:00:00.000Z',
      }),
    ]);
    const result = await service.authorizeCreate({
      organizationId: 'internal',
      templateId: 'rest-equipment-data-product',
      role: 'DEVELOPER',
      actor: 'user:default/developer',
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('ENTITLEMENT');
    expect(service.auditTrail().map(event => event.type)).toEqual(
      expect.arrayContaining(['ENTITLEMENT_EXPIRED', 'ACCESS_DENIED']),
    );
  });

  it('allows an internal Developer with a local ACTIVE entitlement', async () => {
    const service = serviceWith(['golden-path.rest-equipment']);
    const result = await service.authorizeCreate({
      organizationId: 'internal',
      templateId: 'rest-equipment-data-product',
      role: 'DEVELOPER',
      actor: 'user:default/developer',
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('OK');
  });

  it('does not commercially create DRAFT, TESTING, DEPRECATED, or RETIRED Golden Paths', async () => {
    const draft = serviceWith(['golden-path.mqtt-temperature']);
    const result = await draft.authorizeCreate({
      organizationId: 'internal',
      templateId: 'mqtt-temperature-data-product',
      role: 'DEVELOPER',
      actor: 'user:default/developer',
    });
    expect(result.allowed).toBe(true);
    expect(result.releaseEligible).toBe(true);

    const blocked = new PlatformEntitlementService({
      provider: new LocalEntitlementProvider({
        productIds: ['golden-path.mqtt-temperature'],
      }),
      organizationId: 'internal',
      releases: [
        {
          template: 'mqtt-temperature-data-product',
          name: 'MQTT Temperature Data Product',
          version: '0.9.0',
          status: 'DRAFT',
          certification: {
            status: 'DEVELOPMENT',
            standard: '1.0.x',
            sdk: '1.x',
          },
          distribution: ['INTERNAL'],
          release: { date: '2026-08', notes: 'draft' },
          changelog: {
            breaking: [],
            capabilities: [],
            fixes: [],
            migration: 'None',
          },
        },
      ],
    });
    const draftDenied = await blocked.authorizeCreate({
      organizationId: 'internal',
      templateId: 'mqtt-temperature-data-product',
      role: 'DEVELOPER',
      actor: 'user:default/developer',
    });
    expect(draftDenied.allowed).toBe(false);
    expect(draftDenied.reason).toBe('RELEASE');
  });

  it('treats expired and suspended entitlements as denied', async () => {
    const expired = serviceWith(undefined, [
      createEntitlementRecord({
        organizationId: 'internal',
        productId: 'golden-path.mqtt-temperature',
        status: 'ACTIVE',
        validUntil: '2020-01-01T00:00:00.000Z',
      }),
    ]);
    expect(
      await expired.hasEntitlement('internal', 'golden-path.mqtt-temperature'),
    ).toBe(false);

    const suspended = serviceWith(undefined, [
      createEntitlementRecord({
        organizationId: 'internal',
        productId: 'golden-path.mqtt-temperature',
        status: 'SUSPENDED',
      }),
    ]);
    expect(
      await suspended.hasEntitlement('internal', 'golden-path.mqtt-temperature'),
    ).toBe(false);
  });

  it('does not enable SaaS tenant creation from a registration token', () => {
    const service = serviceWith();
    const result = service.registerSaasCustomer({
      registrationToken: 'must-not-be-persisted',
    });
    expect(result.enabled).toBe(false);
    expect(result.status).toBe('NOT_IMPLEMENTED');
    expect(service.auditTrail().map(event => event.type)).toContain(
      'MARKETPLACE_REGISTRATION_ATTEMPT',
    );
    expect(JSON.stringify(service.auditTrail())).not.toContain(
      'must-not-be-persisted',
    );
  });

  it('records technical access granted and denied events', async () => {
    const service = serviceWith(['platform.core']);
    await service.authorizeCreate({
      organizationId: 'internal',
      templateId: 'rest-equipment-data-product',
      role: 'DEVELOPER',
      actor: 'user:default/developer',
    });
    expect(service.auditTrail().map(event => event.type)).toContain('ACCESS_DENIED');
    expect(service.auditTrail()[0]).toMatchObject({
      organizationId: 'internal',
      productId: 'golden-path.rest-equipment',
      actor: 'user:default/developer',
    });
  });

  it('does not require a commercial entitlement for non-SKU templates', async () => {
    const service = serviceWith([]);
    const result = await service.authorizeCreate({
      organizationId: 'internal',
      templateId: 'python-microservice',
      role: 'DEVELOPER',
      actor: 'user:default/developer',
    });
    expect(result.allowed).toBe(true);
    expect(result.productId).toBeUndefined();
  });

  it('maps entitled Golden Paths to RELEASED artifacts only', async () => {
    const service = serviceWith();
    const result = await service.resolveDistribution(
      'internal',
      'golden-path.mqtt-temperature',
    );
    expect(result.allowed).toBe(true);
    expect(result.releaseStatus).toBe('RELEASED');
    expect(result.reason).toMatch(/not an AWS Marketplace ZIP/i);
  });

  it('blocks customer handoff while legal distribution is BLOCKED', async () => {
    const blocked = new PlatformEntitlementService({
      provider: new LocalEntitlementProvider(),
      organizationId: 'internal',
      legalDistributionStatus: 'BLOCKED',
    });
    const customer = await blocked.authorizeCreate({
      organizationId: 'internal',
      templateId: 'rest-equipment-data-product',
      role: 'DEVELOPER',
      actor: 'user:default/developer',
      handoff: 'customer',
    });
    expect(customer.allowed).toBe(false);
    expect(customer.reason).toBe('LEGAL');
    const internal = await blocked.authorizeCreate({
      organizationId: 'internal',
      templateId: 'rest-equipment-data-product',
      role: 'DEVELOPER',
      actor: 'user:default/developer',
      handoff: 'internal',
    });
    expect(internal.allowed).toBe(true);
    expect(
      await blocked.resolveDistribution(
        'internal',
        'golden-path.rest-equipment',
        'customer',
      ),
    ).toMatchObject({ allowed: false, reason: /BLOCKED/ });
  });

  it('allows customer handoff when legal distribution is APPROVED', async () => {
    const approved = new PlatformEntitlementService({
      provider: new LocalEntitlementProvider(),
      organizationId: 'internal',
      legalDistributionStatus: 'APPROVED',
    });
    const result = await approved.authorizeCreate({
      organizationId: 'internal',
      templateId: 'rest-equipment-data-product',
      role: 'DEVELOPER',
      actor: 'user:default/developer',
      handoff: 'customer',
    });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('OK');
  });

  it('retains Create authorization records after a new service instance reads the same store', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'create-auth-audit-'));
    const filePath = path.join(dir, 'create-authorization-audit.jsonl');
    const first = new PlatformEntitlementService({
      provider: new LocalEntitlementProvider(),
      organizationId: 'internal',
      auditStore: new FileCreateAuthorizationAuditStore(filePath),
    });
    await first.authorizeCreate({
      organizationId: 'internal',
      templateId: 'mqtt-temperature-data-product',
      role: 'VIEWER',
      actor: 'user:default/viewer',
    });

    const restarted = new PlatformEntitlementService({
      provider: new LocalEntitlementProvider({ productIds: [] }),
      organizationId: 'internal',
      auditStore: new FileCreateAuthorizationAuditStore(filePath),
    });
    const retained = restarted
      .auditTrail()
      .filter(event => event.type === 'ACCESS_DENIED');
    expect(retained.length).toBeGreaterThan(0);
    expect(retained[0]).toMatchObject({
      actor: 'user:default/viewer',
      action: 'authorizeCreate',
      decision: 'DENY',
      organizationId: 'internal',
      productId: 'golden-path.mqtt-temperature',
      authorizationContext: {
        reason: 'RBAC',
        templateId: 'mqtt-temperature-data-product',
        role: 'VIEWER',
        rbacAllowed: false,
      },
    });
    expect(retained[0].at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
