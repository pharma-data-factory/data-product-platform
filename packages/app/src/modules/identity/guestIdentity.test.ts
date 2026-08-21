import { createGuestIdentity, GuestSessionIdentity } from './guestIdentity';

describe('Guest development fallback identity', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('creates a token-backed Guest identity from the guest provider', async () => {
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        profile: { displayName: 'Guest' },
        backstageIdentity: {
          token: 'guest-session-token',
          identity: {
            type: 'user',
            userEntityRef: 'user:default/guest',
            ownershipEntityRefs: [
              'user:default/guest',
              'group:default/guests',
              'group:default/data-product-developers',
            ],
          },
        },
      }),
    })) as unknown as typeof fetch;

    const identity = await createGuestIdentity({
      getBaseUrl: async () => 'http://localhost:7007/api/auth',
    });

    expect(identity).toBeInstanceOf(GuestSessionIdentity);
    await expect(identity.getCredentials()).resolves.toEqual({
      token: 'guest-session-token',
    });
    await expect(identity.getBackstageIdentity()).resolves.toMatchObject({
      userEntityRef: 'user:default/guest',
    });
    expect(JSON.stringify(await identity.getProfileInfo())).not.toContain(
      'AUTH_GITHUB_CLIENT_SECRET',
    );
  });

  it('rejects Guest when the development provider is unavailable', async () => {
    global.fetch = jest.fn(async () => ({
      ok: false,
      json: async () => ({}),
    })) as unknown as typeof fetch;

    await expect(
      createGuestIdentity({
        getBaseUrl: async () => 'http://localhost:7007/api/auth',
      }),
    ).rejects.toThrow(/local development fallback/i);
  });
});
