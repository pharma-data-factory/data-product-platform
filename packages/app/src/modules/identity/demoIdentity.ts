/**
 * Signing in as, and switching between, the local demo identities.
 *
 * The same shape as `guestIdentity.ts` — hit the provider's refresh endpoint,
 * wrap the returned token in an `IdentityApi` — with two differences.
 *
 * First, the identity is named in a header rather than baked into the provider
 * config, because there is more than one of them and the point is to move
 * between them.
 *
 * Second, the choice is remembered. Backstage's sign-in state lives in memory:
 * `onSignInSuccess` sets it for the session and a reload sends you back to the
 * sign-in page. For guest that is harmless. Here it would mean losing your seat
 * on every reload, part-way through a three-step approval — so the chosen name
 * is kept in sessionStorage and replayed on load.
 *
 * sessionStorage, not localStorage: a demo identity should not outlive the tab
 * that chose it, and two tabs holding different seats is a feature here, not a
 * bug — it is the cheapest way to have the author and the reviewer open at once.
 */

import {
  BackstageUserIdentity,
  DiscoveryApi,
  IdentityApi,
  ProfileInfo,
} from '@backstage/core-plugin-api';

/** Matches DEMO_USER_HEADER in plugins/users-backend. */
const DEMO_USER_HEADER = 'x-nexora-demo-user';

const STORAGE_KEY = 'nexora.demoUser';

export function rememberedDemoUser(): string | undefined {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) ?? undefined;
  } catch {
    // Storage can be unavailable (privacy modes, sandboxed iframes). Losing
    // the seat on reload is worse than crashing the sign-in page is worse.
    return undefined;
  }
}

export function rememberDemoUser(userName: string): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, userName);
  } catch {
    // As above: remembering is a convenience, not a requirement.
  }
}

export function forgetDemoUser(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // As above.
  }
}

class DemoSessionIdentity implements IdentityApi {
  constructor(
    private readonly session: {
      token: string;
      identity: BackstageUserIdentity;
      profile: ProfileInfo;
    },
  ) {}

  getUserId(): string {
    return this.session.identity.userEntityRef.split('/').pop() ?? 'demo';
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

  /**
   * Drops the remembered seat and reloads.
   *
   * A reload rather than a state update: the sign-in page owns the identity and
   * there is no supported way to hand it a different one mid-session. This is
   * also what "switch user" runs, which is why it is on the identity rather
   * than only on a menu item.
   */
  async signOut(): Promise<void> {
    forgetDemoUser();
    window.location.assign('/');
  }
}

export async function createDemoIdentity(
  discoveryApi: DiscoveryApi,
  userName: string,
): Promise<IdentityApi> {
  const baseUrl = await discoveryApi.getBaseUrl('auth');
  const response = await fetch(`${baseUrl}/demo/refresh`, {
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      [DEMO_USER_HEADER]: userName,
    },
    credentials: 'include',
  });
  if (!response.ok) {
    // The provider's refusals are specific and worth surfacing verbatim —
    // "'x' is not a configured demo identity. Configured: a, b, c." tells the
    // user what to do; "sign-in failed" does not.
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.error?.message ?? body?.error ?? '';
    } catch {
      // Non-JSON body; fall through to the generic message.
    }
    forgetDemoUser();
    throw new Error(
      detail ||
        'Demo sign-in is available only as a local development fallback.',
    );
  }
  const data = (await response.json()) as {
    profile?: ProfileInfo;
    backstageIdentity?: { token?: string; identity?: BackstageUserIdentity };
  };
  const token = data.backstageIdentity?.token;
  const identity = data.backstageIdentity?.identity;
  if (!token || !identity) {
    forgetDemoUser();
    throw new Error(
      'Demo sign-in is available only as a local development fallback.',
    );
  }
  rememberDemoUser(userName);
  return new DemoSessionIdentity({
    token,
    identity,
    profile: data.profile ?? { displayName: userName },
  });
}
