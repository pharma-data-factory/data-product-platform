import {
  githubLoginFromEntityRef,
  githubUserEntityRef,
  groupEntityRefFromMemberOf,
  hasApprovedPlatformAccess,
  isGuestIdentity,
  normalizeGithubLogin,
  ownershipRefsFromUserEntity,
  platformGroupNames,
  resolvePlatformRole,
  ROLE_LABELS,
  ursDomainPermissionNames,
} from './roles';

describe('platform identity mapping', () => {
  it('maps GitHub usernames onto catalog User entity refs', () => {
    expect(normalizeGithubLogin('Schmeckm')).toBe('schmeckm');
    expect(githubUserEntityRef('schmeckm')).toBe('user:default/schmeckm');
    expect(githubUserEntityRef('Schmeckm')).toBe('user:default/schmeckm');
    expect(githubUserEntityRef('Ada-Lovelace')).toBe(
      'user:default/ada-lovelace',
    );
    expect(githubLoginFromEntityRef('user:default/schmeckm')).toBe('schmeckm');
  });

  it('builds ownership claims from catalog User relations and spec.memberOf', () => {
    expect(groupEntityRefFromMemberOf('platform-admins')).toBe(
      'group:default/platform-admins',
    );
    expect(groupEntityRefFromMemberOf('group:default/platform-admins')).toBe(
      'group:default/platform-admins',
    );
    expect(
      ownershipRefsFromUserEntity({
        metadata: { name: 'Schmeckm' },
        spec: { memberOf: ['platform-admins'] },
      }),
    ).toEqual(['user:default/schmeckm', 'group:default/platform-admins']);
    expect(
      hasApprovedPlatformAccess(
        ownershipRefsFromUserEntity({
          metadata: { name: 'schmeckm' },
          spec: { memberOf: ['platform-admins'] },
        }),
      ),
    ).toBe(true);
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

  it('maps urs-* catalog groups to domain permission names', () => {
    expect(
      [...ursDomainPermissionNames(['group:default/urs-authors'])].sort(),
    ).toEqual(['urs.create', 'urs.manage', 'urs.read']);
    expect(
      [...ursDomainPermissionNames(['group:default/urs-quality-reviewers'])].sort(),
    ).toEqual(['urs.approve', 'urs.read', 'urs.sign']);
    expect(
      ursDomainPermissionNames(['group:default/platform-viewers']).size,
    ).toBe(0);
  });
});
