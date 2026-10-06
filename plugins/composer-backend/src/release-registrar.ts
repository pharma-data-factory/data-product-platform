/**
 * Registers a product's release build in the Artifact Registry, on behalf of
 * the person who imported the release (NXD-137) — the same arrangement as
 * `pin-verifier.ts`: the caller's own credentials travel, so the registry's
 * artifact.create and the publisher's namespace apply to that person, not to
 * the Composer.
 */

export interface ReleaseBuildRegistration {
  manifest: string;
  release: {
    imageRepository?: string;
    imageDigest: string;
    commitSha: string;
    releaseUrl?: string;
  };
}

export interface RegisteredReleaseBuild {
  artifactRef: string;
  artifactVersionId: string;
  lifecycle: string;
  alreadyRegistered: boolean;
}

export type ReleaseRegistrar = (
  credentials: unknown,
  request: ReleaseBuildRegistration,
) => Promise<RegisteredReleaseBuild>;

export function createHttpReleaseRegistrar(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): ReleaseRegistrar {
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  return async (credentials, request) => {
    const base = await options.discovery.getBaseUrl('artifact-registry');
    const { token } = await options.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'artifact-registry',
    });
    const response = await doFetch(`${base}/artifacts/release-builds`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(request),
    });
    const body = (await response.json().catch(() => ({}))) as {
      artifact?: { namespace: string; name: string };
      version?: { id: string; version: string; lifecycle: string };
      alreadyRegistered?: boolean;
      error?: string | { message?: string };
    };
    if (!response.ok || !body.artifact || !body.version) {
      const message =
        typeof body.error === 'string' ? body.error : body.error?.message;
      throw new Error(
        message || `the Artifact Registry answered ${response.status}`,
      );
    }
    return {
      artifactRef: `${body.artifact.namespace}/${body.artifact.name}@${body.version.version}`,
      artifactVersionId: body.version.id,
      lifecycle: body.version.lifecycle,
      alreadyRegistered: body.alreadyRegistered === true,
    };
  };
}
