import { ConfigReader } from '@backstage/config';
import { createEntitlementRuntime, loadCommercialConfig } from './runtime';
import {
  AwsMarketplaceEntitlementProvider,
  classifyAwsError,
  mapAwsEntitlement,
  redactAccount,
  redactRegistrationToken,
  sanitizeAwsErrorMessage,
} from './awsMarketplace';

describe('commercial runtime', () => {
  it('defaults to the local provider and internal organization', () => {
    const config = loadCommercialConfig(new ConfigReader({}));
    expect(config).toMatchObject({
      organizationId: 'internal',
      edition: 'internal',
      environment: 'local',
      entitlementProvider: 'local',
      failClosed: false,
      legalDistributionStatus: 'BLOCKED',
    });
    expect(config.localProductIds).toEqual([
      'golden-path.mqtt-temperature',
      'golden-path.rest-equipment',
      'platform.core',
    ]);
  });

  it('fail-closes production AWS mode when Marketplace is not configured', async () => {
    const runtime = createEntitlementRuntime({
      config: new ConfigReader({
        commercial: {
          environment: 'production',
          entitlementProvider: 'aws',
        },
      }),
    });
    expect(runtime.config.failClosed).toBe(true);
    expect(runtime.awsStatus).toBe('NOT_CONFIGURED');
    expect(runtime.diagnostics().errorCategory).toBe('NOT_CONFIGURED');
    expect(
      await runtime.service.hasEntitlement(
        'internal',
        'golden-path.rest-equipment',
      ),
    ).toBe(false);
  });

  it('does not mix local entitlements into an AWS provider selection', async () => {
    const runtime = createEntitlementRuntime({
      config: new ConfigReader({
        commercial: {
          environment: 'local',
          entitlementProvider: 'aws',
          awsMarketplace: {
            region: 'us-east-1',
            productCode: 'example',
          },
        },
      }),
    });
    expect(runtime.awsStatus).toBe('ERROR');
    expect(runtime.diagnostics().errorCategory).toBe('MIXED_CONFIGURATION');
    expect(
      await runtime.service.hasEntitlement(
        'internal',
        'golden-path.mqtt-temperature',
      ),
    ).toBe(false);
  });

  it('does not require AWS credentials for normal local development', async () => {
    const runtime = createEntitlementRuntime({
      config: new ConfigReader({
        commercial: {
          environment: 'local',
          entitlementProvider: 'local',
          localEntitlements: {
            internal: ['golden-path.mqtt-temperature'],
          },
        },
      }),
    });
    expect(await runtime.service.hasEntitlement('internal', 'golden-path.mqtt-temperature')).toBe(
      true,
    );
    expect(await runtime.service.hasEntitlement('internal', 'golden-path.rest-equipment')).toBe(
      false,
    );
    expect(await runtime.metering.reportUsage({
      organizationId: 'internal',
      dimension: 'developers',
      quantity: 1,
      occurredAt: new Date().toISOString(),
    })).toEqual({
      accepted: false,
      reason: expect.stringMatching(/future/i),
    });
  });
});

describe('AWS Marketplace adapter', () => {
  const restLink = {
    organizationId: 'internal',
    customerAwsAccountId: '123456789012',
    licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
  };

  it('maps GetEntitlements dimensions without storing secrets', () => {
    const entitlement = mapAwsEntitlement('internal', 'prod-code', {
      dimension: 'golden-path.mqtt-temperature',
      customerAwsAccountId: '123456789012',
      licenseArn: 'arn:aws:license-manager::123456789012:license:example',
      expirationDate: new Date('2099-01-01'),
      integerValue: 1,
    });
    expect(entitlement.source).toBe('AWS_MARKETPLACE');
    expect(entitlement.status).toBe('ACTIVE');
    expect(entitlement.externalReference).toContain('license');
    expect(entitlement.metadata?.customerAwsAccountId).toBe('****9012');
    expect(JSON.stringify(entitlement)).not.toMatch(/AWS_SECRET|session token/i);
  });

  it('maps ACTIVE, PENDING, EXPIRED, SUSPENDED, and UNKNOWN Marketplace states', () => {
    expect(
      mapAwsEntitlement('internal', 'prod-code', {
        dimension: 'golden-path.rest-equipment',
        expirationDate: new Date('2099-01-01'),
      }).status,
    ).toBe('ACTIVE');
    expect(
      mapAwsEntitlement('internal', 'prod-code', {
        dimension: 'golden-path.rest-equipment',
        stringValue: 'pending',
        expirationDate: new Date('2099-01-01'),
      }).status,
    ).toBe('PENDING');
    expect(
      mapAwsEntitlement('internal', 'prod-code', {
        dimension: 'golden-path.rest-equipment',
        expirationDate: new Date('2020-01-01'),
      }).status,
    ).toBe('EXPIRED');
    expect(
      mapAwsEntitlement('internal', 'prod-code', {
        dimension: 'golden-path.rest-equipment',
        booleanValue: false,
      }).status,
    ).toBe('SUSPENDED');
    expect(
      mapAwsEntitlement('internal', 'prod-code', {
        dimension: 'not-a-commercial-product',
      }).status,
    ).toBe('UNKNOWN');
  });

  it('keeps concurrent agreements distinguishable by License ARN', () => {
    const first = mapAwsEntitlement('internal', 'prod-code', {
      dimension: 'golden-path.rest-equipment',
      licenseArn: 'arn:aws:license-manager::1:license:a',
      expirationDate: new Date('2099-01-01'),
    });
    const second = mapAwsEntitlement('internal', 'prod-code', {
      dimension: 'golden-path.rest-equipment',
      licenseArn: 'arn:aws:license-manager::1:license:b',
      expirationDate: new Date('2099-01-01'),
    });
    expect(first.id).not.toEqual(second.id);
    expect(first.externalReference).toContain('license:a');
    expect(second.externalReference).toContain('license:b');
    expect(JSON.stringify([first, second])).not.toMatch(/CustomerIdentifier/);
  });

  it('fail-closes when the AWS API is unavailable and does not grant INTERNAL entitlements', async () => {
    const provider = new AwsMarketplaceEntitlementProvider({
      organizationId: 'internal',
      region: 'us-east-1',
      productCode: 'example',
      organizationLinks: [restLink],
      clients: {
        getEntitlements: async () => {
          throw new Error('simulated AWS failure ETIMEDOUT');
        },
        resolveCustomer: async () => ({}),
      },
    });
    const entitlements = await provider.getEntitlements('internal');
    expect(entitlements).toEqual([]);
    expect(provider.errorCategory).toBe('TIMEOUT');
    expect(provider.lastFailedLookup).toBeDefined();
    expect(entitlements.some(item => item.source === 'INTERNAL')).toBe(false);
  });

  it('fail-closes production AWS mode when credentials are missing at lookup time', async () => {
    const runtime = createEntitlementRuntime({
      config: new ConfigReader({
        commercial: {
          environment: 'test-marketplace',
          entitlementProvider: 'aws',
          awsMarketplace: {
            region: 'us-east-1',
            productCode: 'example',
            organizationLinks: [restLink],
          },
        },
      }),
      awsClients: {
        getEntitlements: async () => {
          const error = new Error('Could not load credentials from any providers');
          error.name = 'CredentialsProviderError';
          throw error;
        },
        resolveCustomer: async () => ({}),
      },
    });
    expect(runtime.config.failClosed).toBe(true);
    expect(
      await runtime.service.hasEntitlement(
        'internal',
        'golden-path.rest-equipment',
      ),
    ).toBe(false);
    expect(runtime.diagnostics().errorCategory).toBe('CREDENTIALS');
    expect(runtime.diagnostics().status).toBe('ERROR');
  });

  it('returns no entitlements for an unknown organization', async () => {
    const provider = new AwsMarketplaceEntitlementProvider({
      organizationId: 'internal',
      region: 'us-east-1',
      productCode: 'example',
      organizationLinks: [restLink],
      clients: {
        getEntitlements: async () => [
          {
            dimension: 'golden-path.rest-equipment',
            licenseArn: restLink.licenseArn,
            expirationDate: new Date('2099-01-01'),
          },
        ],
        resolveCustomer: async () => ({}),
      },
    });
    expect(await provider.getEntitlements('unknown-org')).toEqual([]);
    expect(provider.errorCategory).toBe('UNKNOWN_ORGANIZATION');
  });

  it('keeps multiple License ARNs for the same AWS account distinguishable', async () => {
    const calls: string[] = [];
    const provider = new AwsMarketplaceEntitlementProvider({
      organizationId: 'internal',
      region: 'us-east-1',
      productCode: 'example',
      organizationLinks: [
        {
          organizationId: 'internal',
          customerAwsAccountId: '123456789012',
          licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
        },
        {
          organizationId: 'internal',
          customerAwsAccountId: '123456789012',
          licenseArn: 'arn:aws:license-manager::123456789012:license:rest-2',
        },
      ],
      clients: {
        getEntitlements: async input => {
          calls.push(input.licenseArn ?? '');
          return [
            {
              dimension: 'golden-path.rest-equipment',
              licenseArn: input.licenseArn,
              expirationDate: new Date('2099-01-01'),
            },
          ];
        },
        resolveCustomer: async () => ({}),
      },
    });
    const entitlements = await provider.getEntitlements('internal');
    expect(calls).toEqual([
      'arn:aws:license-manager::123456789012:license:rest-1',
      'arn:aws:license-manager::123456789012:license:rest-2',
    ]);
    expect(new Set(entitlements.map(item => item.id)).size).toBe(2);
    expect(JSON.stringify(entitlements)).not.toMatch(/CustomerIdentifier/);
  });

  it('does not use deprecated CustomerIdentifier filters', () => {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, 'awsMarketplace.ts'),
      'utf8',
    );
    expect(src).toContain('CUSTOMER_AWS_ACCOUNT_ID');
    expect(src).toContain('LICENSE_ARN');
    expect(src).toContain('CustomerIdentifier is not populated');
    expect(src).not.toContain('fallback: localProvider');
  });

  it('redacts Marketplace registration tokens and access keys', () => {
    expect(redactRegistrationToken('abc123')).toBe('[redacted-marketplace-token]');
    expect(redactAccount('123456789012')).toBe('****9012');
    expect(
      sanitizeAwsErrorMessage('token=super-secret-registration-token'),
    ).toBe('token=[redacted]');
    expect(classifyAwsError(new Error('InvalidRegistrationToken'))).toBe(
      'INVALID_TOKEN',
    );
  });
});
