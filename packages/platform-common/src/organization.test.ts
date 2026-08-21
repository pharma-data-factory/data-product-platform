import {
  DEFAULT_ORGANIZATION_ID,
  DEFAULT_ORGANIZATION_NAME,
  createDefaultOrganizationContext,
  isDefaultOrganization,
  resolveOrganizationId,
} from './organization';

describe('OrganizationContext', () => {
  it('defaults to a single internal organization without changing isolation', () => {
    const context = createDefaultOrganizationContext();

    expect(context.isolationMode).toBe('single-organization');
    expect(context.organization.id).toBe(DEFAULT_ORGANIZATION_ID);
    expect(context.organization.id).toBe('internal');
    expect(context.organization.name).toBe(DEFAULT_ORGANIZATION_NAME);
    expect(context.organization.slug).toBe('internal');
    expect(context.organization.configuration.deploymentMode).toBe(
      'single-organization',
    );
    expect(context.organization.configuration.productEdition).toBe('internal');
    expect(isDefaultOrganization(context.organization)).toBe(true);
  });

  it('keeps the internal organization id even when display fields are overridden', () => {
    const context = createDefaultOrganizationContext({
      name: 'Acme Pharma',
      users: ['user:default/viewer'],
    });

    expect(context.organization.id).toBe(DEFAULT_ORGANIZATION_ID);
    expect(context.isolationMode).toBe('single-organization');
    expect(context.organization.name).toBe('Acme Pharma');
    expect(context.organization.users).toEqual(['user:default/viewer']);
  });

  it('treats catalog namespace default as the same internal organization', () => {
    expect(resolveOrganizationId('default')).toBe('internal');
    expect(resolveOrganizationId(undefined)).toBe('internal');
    expect(resolveOrganizationId('customer-a')).toBe('customer-a');
    expect(
      isDefaultOrganization({
        ...createDefaultOrganizationContext().organization,
        id: 'default',
      }),
    ).toBe(true);
  });
});
