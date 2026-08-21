import { resolveMarketplaceOrganization } from './organizationMapping';

describe('Marketplace organization linking', () => {
  const links = [
    {
      organizationId: 'internal',
      customerAwsAccountId: '123456789012',
      licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
      productCode: 'example',
    },
    {
      organizationId: 'internal',
      customerAwsAccountId: '123456789012',
      licenseArn: 'arn:aws:license-manager::123456789012:license:rest-2',
      productCode: 'example',
    },
  ];

  it('does not trust a client-supplied organization id', () => {
    expect(
      resolveMarketplaceOrganization({
        links,
        claimedOrganizationId: 'internal',
      }),
    ).toMatchObject({ status: 'UNKNOWN_ORGANIZATION' });
  });

  it('maps a verified AWS account and License ARN to the configured organization', () => {
    expect(
      resolveMarketplaceOrganization({
        links,
        customerAwsAccountId: '123456789012',
        licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
        productCode: 'example',
        claimedOrganizationId: 'attacker-supplied-org',
      }),
    ).toMatchObject({
      status: 'UNTRUSTED_CLAIM',
      organizationId: 'internal',
    });
  });

  it('rejects an unknown Marketplace identity', () => {
    expect(
      resolveMarketplaceOrganization({
        links,
        customerAwsAccountId: '999999999999',
        licenseArn: 'arn:aws:license-manager::999999999999:license:other',
      }),
    ).toMatchObject({ status: 'UNKNOWN_ORGANIZATION' });
  });

  it('keeps multiple agreements on the same organization distinguishable', () => {
    expect(
      resolveMarketplaceOrganization({
        links,
        customerAwsAccountId: '123456789012',
        productCode: 'example',
      }),
    ).toMatchObject({
      status: 'MULTIPLE_AGREEMENTS',
      organizationId: 'internal',
    });
  });

  it('records expired agreements without provisioning a tenant', () => {
    expect(
      resolveMarketplaceOrganization({
        links,
        customerAwsAccountId: '123456789012',
        licenseArn: 'arn:aws:license-manager::123456789012:license:rest-1',
        agreementExpired: true,
      }),
    ).toMatchObject({
      status: 'EXPIRED_AGREEMENT',
      organizationId: 'internal',
    });
  });
});
