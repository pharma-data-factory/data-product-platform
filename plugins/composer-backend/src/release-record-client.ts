/**
 * The release record a product repository's release workflow published for a
 * version (NXD-133; written by NXD-132), from the data-products plugin, which
 * owns GitHub access. Same arrangement as `ci-evidence-client.ts`: Composer
 * asks, it does not talk to GitHub.
 */

export interface ReleaseRecordLookup {
  available: boolean;
  /** Why not: no-release, ambiguous-release, no-release-record, invalid-release-record, … */
  reason?: string;
  problem?: string;
  tags?: string[];
  release?: {
    tag: string;
    url: string;
    publishedAt?: string;
    /** The commit the tag points at, resolved by GitHub. */
    commit?: string;
  };
  /** `nexora-release.json` as published; shape checked, content not trusted. */
  record?: Record<string, unknown>;
  /** NXD-137. `nexora.yaml` as it is at the commit the tag points at. */
  manifest?: string;
  /** Why there is no manifest: no-manifest, manifest-too-large, … */
  manifestReason?: string;
}

export interface ReleaseRecordClient {
  getReleaseRecord(
    repositoryUrl: string,
    version: string,
  ): Promise<ReleaseRecordLookup>;
}

export function createHttpReleaseRecordClient(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getOwnServiceCredentials(): Promise<unknown>;
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): ReleaseRecordClient {
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  return {
    async getReleaseRecord(repositoryUrl, version) {
      const base = await options.discovery.getBaseUrl('data-products');
      const { token } = await options.auth.getPluginRequestToken({
        onBehalfOf: await options.auth.getOwnServiceCredentials(),
        targetPluginId: 'data-products',
      });
      const query = new URLSearchParams({ repoUrl: repositoryUrl, version });
      const response = await doFetch(`${base}/release-record?${query}`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const body = (await response
        .json()
        .catch(() => ({}))) as ReleaseRecordLookup & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(
          body.error ?? `data-products answered ${response.status}`,
        );
      }
      return body;
    },
  };
}
