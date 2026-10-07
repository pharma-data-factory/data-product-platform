/**
 * The three plugins the installations store asks, each over its public HTTP
 * route and each on behalf of the person acting (the `pinVerifierFor` /
 * release-registrar arrangement of NXD-128 and NXD-137). The caller's own
 * credentials travel, so the other plugin applies its own rules to that
 * person: the registry its `artifact.read`, the Composer its `product.read`,
 * the URS Composer that person's PIN and lockout.
 *
 * No plugin's database is read (AGENTS.md, plugin boundaries).
 */

import { NotAllowedError, ServiceUnavailableError } from '@backstage/errors';
import type {
  ArtifactCoordinate,
  ArtifactVersion,
  GmpClassificationSource,
} from '@internal/platform-common';

interface Discovery {
  getBaseUrl(pluginId: string): Promise<string>;
}

interface Auth {
  getPluginRequestToken(options: {
    onBehalfOf: unknown;
    targetPluginId: string;
  }): Promise<{ token: string }>;
}

interface Logger {
  warn(message: string): void;
}

type FetchLike = typeof fetch;

interface ClientOptions {
  discovery: Discovery;
  auth: Auth;
  fetchImpl?: FetchLike;
}

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

async function call(
  options: ClientOptions,
  credentials: unknown,
  pluginId: string,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  const base = await options.discovery.getBaseUrl(pluginId);
  const { token } = await options.auth.getPluginRequestToken({
    onBehalfOf: credentials,
    targetPluginId: pluginId,
  });
  return doFetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

/** Reads one registry version: lifecycle, manifest and release build. */
export type ArtifactVersionReader = (
  credentials: unknown,
  coordinate: ArtifactCoordinate,
) => Promise<ArtifactVersion | undefined>;

export function createHttpArtifactVersionReader(
  options: ClientOptions,
): ArtifactVersionReader {
  return async (credentials, { namespace, name, version }) => {
    const path = `/artifacts/${encodeURIComponent(namespace)}/${encodeURIComponent(
      name,
    )}/versions/${encodeURIComponent(version)}`;
    const response = await call(options, credentials, 'artifact-registry', path);
    if (response.status === 404) return undefined;
    if (response.status === 401 || response.status === 403) {
      const reason = (await errorText(response)) || 'not permitted';
      throw new NotAllowedError(
        `The Artifact Registry refused to show ${namespace}/${name}@${version}: ${reason}`,
      );
    }
    if (!response.ok) {
      throw new ServiceUnavailableError(
        `The Artifact Registry answered ${response.status} ${await errorText(response)}`,
      );
    }
    return (await response.json()) as ArtifactVersion;
  };
}

export interface GmpClassification {
  gmpRelevant: boolean;
  source: GmpClassificationSource;
}

/**
 * Whether an artifact is GMP-relevant, from the Composer product that
 * governs it (NXD-139). Never throws: a Composer that cannot answer makes
 * the act GMP-relevant (`UNAVAILABLE`), so an outage asks for the signature
 * rather than waiving it.
 */
export type GmpClassifier = (
  credentials: unknown,
  artifact: { namespace: string; name: string },
) => Promise<GmpClassification>;

export function createHttpGmpClassifier(
  options: ClientOptions & { logger: Logger },
): GmpClassifier {
  return async (credentials, { namespace, name }) => {
    try {
      const response = await call(
        options,
        credentials,
        'composer',
        `/artifacts/${encodeURIComponent(namespace)}/${encodeURIComponent(
          name,
        )}/gmp-classification`,
      );
      if (!response.ok) {
        throw new Error(`${response.status} ${await errorText(response)}`);
      }
      const body = (await response.json()) as {
        governed?: boolean;
        gmpRelevant?: boolean;
      };
      if (body.governed === false) {
        return { gmpRelevant: false, source: 'NO_PRODUCT' };
      }
      if (body.governed === true && typeof body.gmpRelevant === 'boolean') {
        return { gmpRelevant: body.gmpRelevant, source: 'PRODUCT' };
      }
      throw new Error('the answer named no classification');
    } catch (error) {
      options.logger.warn(
        `GMP classification of ${namespace}/${name} unavailable; treating it ` +
          `as GMP-relevant: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { gmpRelevant: true, source: 'UNAVAILABLE' };
    }
  };
}

/**
 * Verifies the signer's PIN in the URS Composer, on their behalf: the one
 * signing credential and the one lockout of NXD-119, which this plugin does
 * not hold a copy of. Same contract as `composer-backend`'s and
 * `validation-expert-backend`'s verifiers; each plugin owns its client, as
 * each owns its schema (NXD-092).
 */
export type PinVerifier = (credentials: unknown, pin: string) => Promise<string>;

export function createHttpPinVerifier(options: ClientOptions): PinVerifier {
  return async (credentials, pin) => {
    const response = await call(options, credentials, 'urs-composer', '/signing-pin/verify', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
    if (response.ok) {
      const body = (await response.json().catch(() => ({}))) as { method?: string };
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
