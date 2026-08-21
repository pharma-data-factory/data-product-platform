import {
  allowsGuestSignIn,
  allowsUnknownGithubUserSignIn,
  decideSignInAccess,
  requiresCatalogUserApproval,
} from './accessPolicy';

describe('production access policy', () => {
  it('allows an approved GitHub Catalog User to sign in', () => {
    expect(
      decideSignInAccess({
        environment: 'production',
        hasCatalogUser: true,
      }),
    ).toBe('allow');
    expect(
      decideSignInAccess({
        environment: 'development',
        hasCatalogUser: true,
      }),
    ).toBe('allow');
  });

  it('denies unknown GitHub users in production', () => {
    expect(
      decideSignInAccess({
        environment: 'production',
        hasCatalogUser: false,
      }),
    ).toBe('deny');
    expect(requiresCatalogUserApproval('production')).toBe(true);
    expect(allowsUnknownGithubUserSignIn('production')).toBe(false);
  });

  it('does not grant Viewer implicitly to unknown production users', () => {
    expect(
      decideSignInAccess({
        environment: 'production',
        hasCatalogUser: false,
      }),
    ).not.toBe('allow');
  });

  it('allows unknown GitHub users only as a development fallback', () => {
    expect(
      decideSignInAccess({
        environment: 'development',
        hasCatalogUser: false,
      }),
    ).toBe('allow');
    expect(allowsUnknownGithubUserSignIn('development')).toBe(true);
  });

  it('allows Guest in development and forbids Guest in production', () => {
    expect(
      decideSignInAccess({
        environment: 'development',
        hasCatalogUser: false,
        isGuest: true,
      }),
    ).toBe('allow');
    expect(
      decideSignInAccess({
        environment: 'production',
        hasCatalogUser: false,
        isGuest: true,
      }),
    ).toBe('deny');
    expect(allowsGuestSignIn('development')).toBe(true);
    expect(allowsGuestSignIn('production')).toBe(false);
  });
});
