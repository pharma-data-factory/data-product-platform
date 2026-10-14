/**
 * The registry's one question to the Composer (NXD-146): is a product
 * version registered as this coordinate RELEASED? Asked over the Composer's
 * public route with the registry's own service credentials. Publishing is
 * the registry's rule, not something the publishing person may see or not,
 * and the Composer admits a service on this route. No plugin's database is
 * read (AGENTS.md, plugin boundaries).
 */

import type { ArtifactReleaseStatus } from '@internal/platform-common';
import type { ReleaseStatusReader } from './service';

interface Discovery {
  getBaseUrl(pluginId: string): Promise<string>;
}

interface Auth {
  getOwnServiceCredentials(): Promise<unknown>;
  getPluginRequestToken(options: {
    onBehalfOf: unknown;
    targetPluginId: string;
  }): Promise<{ token: string }>;
}

export function createHttpReleaseStatusReader(options: {
  discovery: Discovery;
  auth: Auth;
  fetchImpl?: typeof fetch;
}): ReleaseStatusReader {
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  return async ({ namespace, name, version }) => {
    const base = await options.discovery.getBaseUrl('composer');
    const { token } = await options.auth.getPluginRequestToken({
      onBehalfOf: await options.auth.getOwnServiceCredentials(),
      targetPluginId: 'composer',
    });
    const path = `/artifacts/${encodeURIComponent(namespace)}/${encodeURIComponent(
      name,
    )}/versions/${encodeURIComponent(version)}/release-status`;
    const response = await doFetch(`${base}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      throw new Error(`the Composer answered ${response.status}`);
    }
    return (await response.json()) as ArtifactReleaseStatus;
  };
}
