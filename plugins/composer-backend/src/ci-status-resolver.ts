/**
 * CI Status Resolver — cross-plugin HTTP boundary to data-products /ci-status.
 *
 * Used by the Product Composer Release Gate after a Catalog entity exists
 * (same post-scaffold moment as Catalog manifest pin checks).
 *
 * Fail-closed: UNKNOWN / missing payload blocks release (CI_STATUS_UNVERIFIED).
 * This is a technical control — not GxP or regulatory validation.
 */

export type CiAuthCredentials = unknown;

export type PlatformCiStatusForGate =
  | 'RUNNING'
  | 'PASSED'
  | 'FAILED'
  | 'CANCELLED'
  | 'UNKNOWN';

export interface CiStatusSnapshot {
  status: PlatformCiStatusForGate;
  representation?: string;
  workflowName?: string;
  conclusion?: string;
  message?: string;
  branch?: string;
  commitSha?: string;
  htmlUrl?: string;
}

export interface CiStatusResolver {
  resolveByEntityRef(
    entityRef: string,
    credentials: CiAuthCredentials,
  ): Promise<CiStatusSnapshot>;
}

export interface ReleaseGateBlockerLike {
  code: string;
  message: string;
}

const PLATFORM_STATUSES = new Set<PlatformCiStatusForGate>([
  'RUNNING',
  'PASSED',
  'FAILED',
  'CANCELLED',
  'UNKNOWN',
]);

export function parseCiStatusSnapshot(data: unknown): CiStatusSnapshot {
  if (!data || typeof data !== 'object') {
    return { status: 'UNKNOWN', message: 'Not available' };
  }
  const raw = data as Record<string, unknown>;
  const status = PLATFORM_STATUSES.has(raw.status as PlatformCiStatusForGate)
    ? (raw.status as PlatformCiStatusForGate)
    : 'UNKNOWN';
  return {
    status,
    ...(typeof raw.representation === 'string'
      ? { representation: raw.representation }
      : {}),
    ...(typeof raw.workflowName === 'string'
      ? { workflowName: raw.workflowName }
      : {}),
    ...(typeof raw.conclusion === 'string' ? { conclusion: raw.conclusion } : {}),
    ...(typeof raw.message === 'string' ? { message: raw.message } : {}),
    ...(typeof raw.branch === 'string' ? { branch: raw.branch } : {}),
    ...(typeof raw.commitSha === 'string' ? { commitSha: raw.commitSha } : {}),
    ...(typeof raw.htmlUrl === 'string' ? { htmlUrl: raw.htmlUrl } : {}),
  };
}

/**
 * Evaluate CI snapshot for Release Gate. Only PASSED clears the gate.
 * Pre-scaffold (no Catalog entity) must skip calling this entirely.
 */
export function evaluateCiStatusForReleaseGate(
  snapshot: CiStatusSnapshot,
): ReleaseGateBlockerLike[] {
  switch (snapshot.status) {
    case 'PASSED':
      return [];
    case 'FAILED':
      return [
        {
          code: 'CI_STATUS_FAILED',
          message:
            'Latest CI Quality Gate failed; a controlled release requires PASSED',
        },
      ];
    case 'RUNNING':
      return [
        {
          code: 'CI_STATUS_RUNNING',
          message:
            'CI Quality Gate is still running; wait for PASSED before release',
        },
      ];
    case 'CANCELLED':
      return [
        {
          code: 'CI_STATUS_CANCELLED',
          message:
            'Latest CI Quality Gate was cancelled; a controlled release requires PASSED',
        },
      ];
    case 'UNKNOWN':
    default:
      return [
        {
          code: 'CI_STATUS_UNVERIFIED',
          message:
            snapshot.message?.trim() ||
            'CI Quality Gate status is DEGRADED / UNVERIFIED; cannot confirm PASSED',
        },
      ];
  }
}

export function createHttpCiStatusResolver(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: CiAuthCredentials;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): CiStatusResolver {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return {
    async resolveByEntityRef(entityRef, credentials) {
      const trimmed = entityRef.trim();
      if (!trimmed) {
        return { status: 'UNKNOWN', message: 'Not available' };
      }
      if (!credentials) {
        throw new Error(
          'Caller credentials are required to resolve CI Quality Gate status',
        );
      }
      const { token } = await options.auth.getPluginRequestToken({
        onBehalfOf: credentials,
        targetPluginId: 'data-products',
      });
      const base = await options.discovery.getBaseUrl('data-products');
      const url = `${base}/ci-status?entityRef=${encodeURIComponent(trimmed)}`;
      const res = await doFetch(url, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(
          `data-products ci-status returned HTTP ${res.status} for ${trimmed}`,
        );
      }
      return parseCiStatusSnapshot(await res.json());
    },
  };
}
