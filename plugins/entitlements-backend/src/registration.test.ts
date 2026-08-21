import { MarketplaceLinkStore } from './linkStore';
import { SlidingWindowRateLimiter } from './rateLimit';
import { MarketplaceRegistrationService } from './registration';
import { createEntitlementRuntime } from './runtime';
import { ConfigReader } from '@backstage/config';
import { PlatformEntitlementService } from '@internal/platform-common';

function mockClients(overrides?: {
  resolve?: () => Promise<{
    customerAwsAccountId?: string;
    productCode?: string;
    licenseArn?: string;
  }>;
  entitlements?: () => Promise<
    Array<{
      dimension?: string;
      licenseArn?: string;
      expirationDate?: Date;
      booleanValue?: boolean;
    }>
  >;
}) {
  return {
    resolveCustomer:
      overrides?.resolve ??
      (async () => ({
        customerAwsAccountId: '123456789012',
        productCode: 'example',
        licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
      })),
    getEntitlements:
      overrides?.entitlements ??
      (async () => [
        {
          dimension: 'golden-path.rest-equipment',
          licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
          expirationDate: new Date('2099-01-01'),
        },
      ]),
  };
}

describe('MarketplaceLinkStore', () => {
  it('approves a pending identity onto the existing internal organization', () => {
    const store = new MarketplaceLinkStore('internal');
    const pending = store.recordPending({
      awsAccountId: '123456789012',
      licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
      productCode: 'example',
    });
    const approved = store.approve(pending.id, 'internal', 'user:default/admin');
    expect(approved).toEqual(
      expect.objectContaining({
        ok: true,
        link: expect.objectContaining({
          status: 'APPROVED',
          organizationId: 'internal',
        }),
      }),
    );
  });

  it('rejects an untrusted organization id and does not auto-reassign', () => {
    const store = new MarketplaceLinkStore('internal');
    const pending = store.recordPending({
      awsAccountId: '123456789012',
      licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
    });
    const result = store.approve(
      pending.id,
      'attacker-org',
      'user:default/admin',
    );
    expect(result).toEqual({ ok: false, reason: 'UNTRUSTED_ORG' });
  });

  it('disables a link so entitlements stop resolving', () => {
    const store = new MarketplaceLinkStore('internal', [
      {
        organizationId: 'internal',
        customerAwsAccountId: '123456789012',
        licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
      },
    ]);
    const id = store.list()[0].id;
    expect(store.disable(id, 'user:default/admin')?.status).toBe('DISABLED');
    expect(store.approvedForOrganization('internal')).toEqual([]);
  });
});

describe('Marketplace registration', () => {
  const audit = jest.fn();

  it('resolves a customer, keeps the token out of the result, and does not create a tenant', async () => {
    const store = new MarketplaceLinkStore('internal');
    const service = new MarketplaceRegistrationService({
      organizationId: 'internal',
      productCode: 'example',
      clients: mockClients(),
      store,
      audit,
    });
    const result = await service.register({
      token: 'super-secret-registration-token',
    });
    expect(result.tenantCreated).toBe(false);
    expect(result.accessGranted).toBe(false);
    expect(result.requiresSignIn).toBe(true);
    expect(result.status).toBe('PENDING_ACCESS');
    expect(JSON.stringify(result)).not.toContain(
      'super-secret-registration-token',
    );
    expect(JSON.stringify(audit.mock.calls)).not.toContain(
      'super-secret-registration-token',
    );
  });

  it('returns ENTITLED when the identity is approved and REST Equipment is ACTIVE', async () => {
    const store = new MarketplaceLinkStore('internal', [
      {
        organizationId: 'internal',
        customerAwsAccountId: '123456789012',
        licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
        productCode: 'example',
      },
    ]);
    const service = new MarketplaceRegistrationService({
      organizationId: 'internal',
      productCode: 'example',
      clients: mockClients(),
      store,
      audit,
    });
    const result = await service.register({ token: 'ok-token' });
    expect(result.status).toBe('ENTITLED');
    expect(result.entitledProductIds).toContain('golden-path.rest-equipment');
    expect(result.accessGranted).toBe(false);
  });

  it('marks expired agreements as not entitled', async () => {
    const store = new MarketplaceLinkStore('internal', [
      {
        organizationId: 'internal',
        customerAwsAccountId: '123456789012',
        licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
        productCode: 'example',
      },
    ]);
    const service = new MarketplaceRegistrationService({
      organizationId: 'internal',
      productCode: 'example',
      clients: mockClients({
        entitlements: async () => [
          {
            dimension: 'golden-path.rest-equipment',
            licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
            expirationDate: new Date('2020-01-01'),
          },
        ],
      }),
      store,
      audit,
    });
    expect((await service.register({ token: 'expired' })).status).toBe(
      'NOT_ENTITLED',
    );
  });

  it('denies an invalid registration token', async () => {
    const service = new MarketplaceRegistrationService({
      organizationId: 'internal',
      productCode: 'example',
      clients: mockClients({
        resolve: async () => {
          const error = new Error('InvalidRegistrationToken');
          error.name = 'InvalidTokenException';
          throw error;
        },
      }),
      store: new MarketplaceLinkStore('internal'),
      audit,
    });
    const result = await service.register({ token: 'bad' });
    expect(result.status).toBe('INVALID_TOKEN');
    expect(result.tenantCreated).toBe(false);
  });

  it('fail-closes when ResolveCustomer is unavailable', async () => {
    const service = new MarketplaceRegistrationService({
      organizationId: 'internal',
      productCode: 'example',
      clients: mockClients({
        resolve: async () => {
          throw new Error('ETIMEDOUT');
        },
      }),
      store: new MarketplaceLinkStore('internal'),
      audit,
    });
    expect((await service.register({ token: 'x' })).status).toBe('UNAVAILABLE');
  });
});

describe('rate limiter', () => {
  it('limits repeated registration attempts from the same client', () => {
    const limiter = new SlidingWindowRateLimiter(2, 60_000);
    expect(limiter.allow('a', 1)).toBe(true);
    expect(limiter.allow('a', 2)).toBe(true);
    expect(limiter.allow('a', 3)).toBe(false);
    expect(limiter.allow('b', 3)).toBe(true);
  });
});

describe('test-marketplace runtime', () => {
  it('does not fall back to local entitlements when AWS is selected', async () => {
    const runtime = createEntitlementRuntime({
      config: new ConfigReader({
        commercial: {
          environment: 'test-marketplace',
          entitlementProvider: 'aws',
          legalDistributionStatus: 'BLOCKED',
          awsMarketplace: {
            region: 'us-east-1',
            productCode: 'example',
          },
        },
      }),
      awsClients: mockClients({
        entitlements: async () => {
          throw new Error('simulated AWS failure ETIMEDOUT');
        },
      }),
    });
    expect(runtime.config.failClosed).toBe(true);
    expect(runtime.config.legalDistributionStatus).toBe('BLOCKED');
    expect(
      await runtime.service.hasEntitlement(
        'internal',
        'golden-path.rest-equipment',
      ),
    ).toBe(false);
    expect(runtime.service).toBeInstanceOf(PlatformEntitlementService);
  });
});
