import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { PolicyQueryUser } from '@backstage/plugin-permission-node';
import {
  createDefaultEntitlementContext,
  createDefaultOrganizationContext,
  createMvpPlatformContext,
  marketplaceViewPermission,
} from '@internal/platform-common';
import { PlatformPermissionPolicy } from './permission/policy';

describe('SaaS-readiness MVP defaults', () => {
  it('keeps a single default organization', () => {
    const organization = createDefaultOrganizationContext();
    expect(organization.isolationMode).toBe('single-organization');
    expect(organization.organization.id).toBe('internal');
  });

  it('treats configured capabilities as entitled without payment enforcement', () => {
    const entitlements = createDefaultEntitlementContext();
    expect(entitlements.isEntitled('platform.core')).toBe(true);
    expect(entitlements.source).toBe('INTERNAL');
  });

  it('does not change RBAC when entitlements exist', async () => {
    const runtime = createMvpPlatformContext({
      userEntityRef: 'user:default/viewer',
      ownershipEntityRefs: [
        'user:default/viewer',
        'group:default/platform-viewers',
      ],
    });
    expect(runtime.entitlements.isEntitled('platform.core')).toBe(true);

    const policy = new PlatformPermissionPolicy();
    const viewer: PolicyQueryUser = {
      credentials: {
        $$type: '@backstage/BackstageCredentials',
        principal: { type: 'user', userEntityRef: 'user:default/viewer' },
      } as PolicyQueryUser['credentials'],
      info: {
        userEntityRef: 'user:default/viewer',
        ownershipEntityRefs: [
          'user:default/viewer',
          'group:default/platform-viewers',
        ],
      },
    };

    await expect(
      policy.handle({ permission: marketplaceViewPermission }, viewer),
    ).resolves.toEqual({ result: AuthorizeResult.ALLOW });
    await expect(
      policy.handle(
        {
          permission: {
            name: 'scaffolder.task.create',
            attributes: { action: 'create' },
            type: 'basic',
          },
        },
        viewer,
      ),
    ).resolves.toEqual({ result: AuthorizeResult.DENY });
  });
});
