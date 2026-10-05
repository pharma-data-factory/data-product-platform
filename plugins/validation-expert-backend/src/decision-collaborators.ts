/**
 * The two calls a validation decision signature makes to sibling plugins
 * (NXD-119), behind functions so the service and router are testable
 * without HTTP.
 *
 * - The PIN is verified in the URS Composer, on behalf of the signer, so the
 *   platform has one signing credential and one lockout per person.
 * - The GMP classification comes from the Product Composer, as this plugin:
 *   which products depend on the baseline and who created their versions.
 */

import { NotAllowedError } from '@backstage/errors';
import type { GmpClassifier, ProductEvidenceReader } from './service';

type FetchLike = typeof fetch;

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

/** Verifies the PIN of the person whose credentials are given; returns the method. */
export type PinVerifier = (credentials: unknown, pin: string) => Promise<string>;

async function errorText(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: string | { message?: string };
    };
    const error = body?.error;
    return typeof error === 'string' ? error : error?.message ?? '';
  } catch {
    return '';
  }
}

export function createHttpPinVerifier(options: {
  discovery: Discovery;
  auth: Auth;
  fetchImpl?: FetchLike;
}): PinVerifier {
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  return async (credentials, pin) => {
    const base = await options.discovery.getBaseUrl('urs-composer');
    const { token } = await options.auth.getPluginRequestToken({
      // The signer, not this plugin: the URS Composer checks the token's own
      // user's PIN and counts a failure against that user's lockout.
      onBehalfOf: credentials,
      targetPluginId: 'urs-composer',
    });
    const response = await doFetch(`${base}/signing-pin/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pin }),
    });
    if (response.ok) {
      const body = (await response.json()) as { method?: string };
      return body.method ?? 'signature-pin';
    }
    if (response.status === 401 || response.status === 403) {
      throw new NotAllowedError(
        (await errorText(response)) || 'Re-authentication failed. Signature rejected.',
      );
    }
    throw new Error(
      `The signing PIN could not be verified: ${response.status} ${await errorText(response)}`,
    );
  };
}

export function createHttpGmpClassifier(options: {
  discovery: Discovery;
  auth: Auth;
  fetchImpl?: FetchLike;
}): GmpClassifier {
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  return async ursBaselineId => {
    const base = await options.discovery.getBaseUrl('composer');
    const { token } = await options.auth.getPluginRequestToken({
      onBehalfOf: await options.auth.getOwnServiceCredentials(),
      targetPluginId: 'composer',
    });
    const response = await doFetch(
      `${base}/urs-baselines/${encodeURIComponent(ursBaselineId)}/gmp-classification`,
      { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      throw new Error(`${response.status} ${await errorText(response)}`);
    }
    const body = (await response.json()) as {
      products?: Array<{ id: string; name: string; gxpRelevance?: string }>;
      versionCreators?: string[];
      versions?: Array<{
        id: string;
        productId: string;
        productName: string;
        version: string;
        status: string;
      }>;
    };
    return {
      products: body.products ?? [],
      versionCreators: body.versionCreators ?? [],
      versions: body.versions ?? [],
    };
  };
}

/** NXD-124. A product version's recorded test evidence, from the Composer. */
export function createHttpProductEvidenceReader(options: {
  discovery: Discovery;
  auth: Auth;
  fetchImpl?: FetchLike;
}): ProductEvidenceReader {
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  return async productVersionId => {
    const base = await options.discovery.getBaseUrl('composer');
    const { token } = await options.auth.getPluginRequestToken({
      onBehalfOf: await options.auth.getOwnServiceCredentials(),
      targetPluginId: 'composer',
    });
    const response = await doFetch(
      `${base}/versions/${encodeURIComponent(productVersionId)}/test-evidence`,
      { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) {
      throw new Error(
        `The product's test evidence could not be read: ${response.status} ${await errorText(response)}`,
      );
    }
    return response.json();
  };
}
