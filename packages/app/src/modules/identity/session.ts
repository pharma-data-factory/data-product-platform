import { IdentityApi } from '@backstage/core-plugin-api';

export async function signOutToLanding(
  identityApi: IdentityApi,
  assign: (url: string) => void = url => window.location.assign(url),
): Promise<void> {
  try {
    await identityApi.signOut();
  } catch {
    // Session errors must not trap the user on an authenticated route.
  }
  assign('/');
}
