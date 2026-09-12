/**
 * Validation Expert Evidence Registrar — HTTP boundary to register technical
 * CI Quality Gate evidence before a controlled Product RELEASED (fail-closed).
 *
 * Cross-plugin OBO only. Technical metadata — not GxP / Part 11 validation.
 */

import type {
  RegisterTechnicalCiEvidenceRequest,
  RegisterTechnicalCiEvidenceResponse,
  TechnicalCiEvidenceReference,
} from '@internal/platform-common';

export type EvidenceAuthCredentials = unknown;

export interface TechnicalEvidenceRegistrar {
  registerTechnicalCiEvidence(
    request: RegisterTechnicalCiEvidenceRequest,
    credentials: EvidenceAuthCredentials,
  ): Promise<RegisterTechnicalCiEvidenceResponse>;
}

export function buildCiEvidenceIdempotencyKey(input: {
  productVersionId: string;
  manifestContentHash: string;
  commitSha?: string;
}): string {
  return [
    input.productVersionId,
    input.manifestContentHash,
    input.commitSha ?? 'no-sha',
    'PASSED',
  ].join(':');
}

export function buildTechnicalCiEvidenceReference(
  input: Omit<TechnicalCiEvidenceReference, 'kind' | 'disclaimer' | 'ciStatus'> & {
    ciStatus?: 'PASSED';
  },
): TechnicalCiEvidenceReference {
  return {
    kind: 'ci-quality-gate',
    ciStatus: 'PASSED',
    disclaimer: 'technical-control-not-gxp',
    ...input,
  };
}

export function createHttpTechnicalEvidenceRegistrar(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: EvidenceAuthCredentials;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): TechnicalEvidenceRegistrar {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return {
    async registerTechnicalCiEvidence(request, credentials) {
      if (!credentials) {
        throw new Error(
          'Caller credentials are required to register technical CI evidence',
        );
      }
      const { token } = await options.auth.getPluginRequestToken({
        onBehalfOf: credentials,
        targetPluginId: 'validation-expert',
      });
      const base = await options.discovery.getBaseUrl('validation-expert');
      const res = await doFetch(`${base}/evidence/technical`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(
          `validation-expert technical evidence returned HTTP ${res.status}${
            body ? `: ${body.slice(0, 200)}` : ''
          }`,
        );
      }
      return (await res.json()) as RegisterTechnicalCiEvidenceResponse;
    },
  };
}
