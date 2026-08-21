import {
  BackstageUserIdentity,
  DiscoveryApi,
  IdentityApi,
  ProfileInfo,
} from '@backstage/core-plugin-api';

interface GuestSession {
  token: string;
  identity: BackstageUserIdentity;
  profile: ProfileInfo;
}

export class GuestSessionIdentity implements IdentityApi {
  constructor(private readonly session: GuestSession) {}

  getUserId(): string {
    const ref = this.session.identity.userEntityRef;
    return ref.split('/').pop() ?? 'guest';
  }

  async getIdToken(): Promise<string | undefined> {
    return this.session.token;
  }

  getProfile(): ProfileInfo {
    return this.session.profile;
  }

  async getProfileInfo(): Promise<ProfileInfo> {
    return this.session.profile;
  }

  async getBackstageIdentity(): Promise<BackstageUserIdentity> {
    return this.session.identity;
  }

  async getCredentials(): Promise<{ token?: string }> {
    return { token: this.session.token };
  }

  async signOut(): Promise<void> {
    return undefined;
  }
}

export async function createGuestIdentity(
  discoveryApi: DiscoveryApi,
): Promise<IdentityApi> {
  const baseUrl = await discoveryApi.getBaseUrl('auth');
  const response = await fetch(`${baseUrl}/guest/refresh`, {
    headers: { 'X-Requested-With': 'XMLHttpRequest' },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(
      'Guest sign-in is available only as a local development fallback.',
    );
  }
  const data = (await response.json()) as {
    profile?: ProfileInfo;
    backstageIdentity?: {
      token?: string;
      identity?: BackstageUserIdentity;
    };
  };
  const token = data.backstageIdentity?.token;
  const identity = data.backstageIdentity?.identity;
  if (!token || !identity) {
    throw new Error(
      'Guest sign-in is available only as a local development fallback.',
    );
  }
  return new GuestSessionIdentity({
    token,
    identity,
    profile: data.profile ?? { displayName: 'Guest' },
  });
}
