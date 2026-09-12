/**
 * Validation Expert Evidence Lookup — HTTP boundary to inspect technical
 * CI Quality Gate evidence for Product Composer QA readiness (advisory).
 *
 * Technical control only — not GxP / Part 11 validation.
 */

import type { EvidenceAuthCredentials } from './evidence-registrar';

export interface TechnicalEvidenceSummary {
  id: string;
  evidenceType: string;
  reference: string;
  checksum?: string;
  createdAt?: string;
}

export interface TechnicalEvidenceLookup {
  listTechnicalCiEvidence(
    credentials: EvidenceAuthCredentials,
  ): Promise<TechnicalEvidenceSummary[]>;
}

export function findTechnicalCiEvidenceByIdempotencyKey(
  items: TechnicalEvidenceSummary[],
  idempotencyKey: string,
): TechnicalEvidenceSummary | undefined {
  const needle = idempotencyKey.trim();
  if (!needle) {
    return undefined;
  }
  return items.find(item => {
    if (item.evidenceType !== 'ci-quality-gate') {
      return false;
    }
    try {
      const parsed = JSON.parse(item.reference) as {
        productVersionId?: string;
        manifestContentHash?: string;
        commitSha?: string;
      };
      const key = [
        parsed.productVersionId ?? '',
        parsed.manifestContentHash ?? '',
        parsed.commitSha ?? 'no-sha',
        'PASSED',
      ].join(':');
      return key === needle;
    } catch {
      return false;
    }
  });
}

export function createHttpTechnicalEvidenceLookup(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: EvidenceAuthCredentials;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): TechnicalEvidenceLookup {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return {
    async listTechnicalCiEvidence(credentials) {
      if (!credentials) {
        throw new Error(
          'Caller credentials are required to look up technical CI evidence',
        );
      }
      const { token } = await options.auth.getPluginRequestToken({
        onBehalfOf: credentials,
        targetPluginId: 'validation-expert',
      });
      const base = await options.discovery.getBaseUrl('validation-expert');
      const res = await doFetch(
        `${base}/evidence?evidenceType=${encodeURIComponent('ci-quality-gate')}`,
        {
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!res.ok) {
        throw new Error(
          `validation-expert evidence list returned HTTP ${res.status}`,
        );
      }
      const body = (await res.json()) as {
        items?: Array<{
          id: string;
          evidenceType?: string;
          reference?: string;
          checksum?: string;
          createdAt?: string;
        }>;
      };
      return (body.items ?? [])
        .filter(item => item.evidenceType === 'ci-quality-gate')
        .map(item => ({
          id: item.id,
          evidenceType: 'ci-quality-gate',
          reference: String(item.reference ?? ''),
          checksum: item.checksum,
          createdAt: item.createdAt,
        }));
    },
  };
}
