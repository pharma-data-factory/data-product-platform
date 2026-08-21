import {
  githubLoginFromEntityRef,
  githubUserEntityRef,
  hasApprovedPlatformAccess,
  isGuestIdentity,
  platformGroupNames,
  resolvePlatformRole,
  ROLE_LABELS,
} from './roles';

describe('platform identity mapping', () => {
  it('maps GitHub usernames onto catalog User entity refs', () => {
    expect(githubUserEntityRef('schmeckm')).toBe('user:default/schmeckm');
    expect(githubUserEntityRef('Ada-Lovelace')).toBe(
      'user:default/ada-lovelace',
    );
    expect(githubLoginFromEntityRef('user:default/schmeckm')).toBe('schmeckm');
  });

  it('does not treat Guest as a production identity', () => {
    expect(isGuestIdentity('user:default/guest')).toBe(true);
    expect(isGuestIdentity('user:default/developer')).toBe(false);
  });

  it('resolves the highest platform group to a role', () => {
    expect(
      resolvePlatformRole(['user:default/viewer', 'group:default/platform-viewers']),
    ).toBe('VIEWER');
    expect(
      resolvePlatformRole(['group:default/data-product-developers']),
    ).toBe('DEVELOPER');
    expect(
      resolvePlatformRole([
        'group:default/platform-viewers',
        'group:default/data-product-owners',
      ]),
    ).toBe('DATA_PRODUCT_OWNER');
    expect(
      resolvePlatformRole(['group:default/platform-admins']),
    ).toBe('PLATFORM_ADMIN');
  });

  it('does not treat unknown GitHub users as approved platform members', () => {
    expect(resolvePlatformRole(['user:default/new-github-user'])).toBe(
      'VIEWER',
    );
    expect(
      hasApprovedPlatformAccess(['user:default/new-github-user']),
    ).toBe(false);
    expect(
      hasApprovedPlatformAccess(['group:default/platform-admins']),
    ).toBe(true);
    expect(
      hasApprovedPlatformAccess(['group:default/data-product-developers']),
    ).toBe(true);
    expect(platformGroupNames(['user:default/new-github-user'])).toEqual([]);
    expect(ROLE_LABELS.VIEWER).toBe('Viewer');
    expect(ROLE_LABELS.DEVELOPER).toBe('Developer');
    expect(ROLE_LABELS.DATA_PRODUCT_OWNER).toBe('Data Product Owner');
    expect(ROLE_LABELS.PLATFORM_ADMIN).toBe('Platform Admin');
  });
});
