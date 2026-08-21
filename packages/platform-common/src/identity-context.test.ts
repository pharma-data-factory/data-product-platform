import { createIdentityContext, createMvpPlatformContext } from './identity-context';
import { DEFAULT_ORGANIZATION_ID } from './organization';
import { resolvePlatformRole } from './roles';

describe('IdentityContext', () => {
  it('wraps existing Backstage identity without changing role resolution', () => {
    const ownership = [
      'user:default/developer',
      'group:default/data-product-developers',
    ];
    const identity = createIdentityContext({
      userEntityRef: 'user:default/developer',
      ownershipEntityRefs: ownership,
      displayName: 'Developer',
    });

    expect(identity.platformRole).toBe(resolvePlatformRole(ownership));
    expect(identity.platformRole).toBe('DEVELOPER');
    expect(identity.githubLogin).toBe('developer');
    expect(identity.isGuest).toBe(false);
    expect(identity.unknownGitHubUser).toBe(false);
    expect(identity.organizationId).toBe(DEFAULT_ORGANIZATION_ID);
  });

  it('keeps Guest as a local development identity', () => {
    const identity = createIdentityContext({
      userEntityRef: 'user:default/guest',
      ownershipEntityRefs: [
        'user:default/guest',
        'group:default/guests',
        'group:default/platform-admins',
      ],
    });

    expect(identity.isGuest).toBe(true);
    expect(identity.githubLogin).toBeUndefined();
    expect(identity.platformRole).toBe('PLATFORM_ADMIN');
    expect(identity.unknownGitHubUser).toBe(false);
    expect(identity.hasPlatformAccess).toBe(true);
  });

  it('marks unknown GitHub users as unapproved', () => {
    const identity = createIdentityContext({
      userEntityRef: 'user:default/new-github-user',
      ownershipEntityRefs: ['user:default/new-github-user'],
    });

    expect(identity.platformRole).toBe('VIEWER');
    expect(identity.unknownGitHubUser).toBe(true);
    expect(identity.hasPlatformAccess).toBe(false);
    expect(identity.githubLogin).toBe('new-github-user');
  });
});

describe('MVP platform runtime context', () => {
  it('binds identity to the default organization and configured entitlements', () => {
    const runtime = createMvpPlatformContext({
      userEntityRef: 'user:default/viewer',
      ownershipEntityRefs: [
        'user:default/viewer',
        'group:default/platform-viewers',
      ],
    });

    expect(runtime.organization.isolationMode).toBe('single-organization');
    expect(runtime.identity.organizationId).toBe(DEFAULT_ORGANIZATION_ID);
    expect(runtime.identity.platformRole).toBe('VIEWER');
    expect(runtime.entitlements.isEntitled('platform.core')).toBe(true);
    expect(runtime.entitlements.isEntitled('platform-core')).toBe(true);
    expect(runtime.entitlements.isEntitled('future.golden-path.oee')).toBe(false);
  });
});
