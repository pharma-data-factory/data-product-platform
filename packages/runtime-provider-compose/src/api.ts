/**
 * The provider's two calls to Nexora (NXD-143), with the static
 * `externalAccess` token the target is bound to. Nothing else: the provider
 * reads no other route and holds no other credential for Nexora.
 */

import type {
  ArtifactInstallation,
  ObservedStateReport,
  ProviderDesiredState,
} from '@internal/platform-common';

export interface NexoraApi {
  desired(): Promise<ProviderDesiredState>;
  report(installationId: string, report: ObservedStateReport): Promise<ArtifactInstallation>;
}

export class NexoraApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export function createNexoraApi(options: {
  /** The backend's base URL, e.g. `http://localhost:7007`. */
  baseUrl: string;
  token: string;
  targetId: string;
  fetchImpl?: typeof fetch;
}): NexoraApi {
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  const base = `${options.baseUrl.replace(/\/+$/, '')}/api/installations/provider/targets/${encodeURIComponent(
    options.targetId,
  )}`;

  async function call<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await doFetch(`${base}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${options.token}`,
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!response.ok) {
      let detail = '';
      try {
        const body = (await response.json()) as { error?: unknown };
        detail = typeof body.error === 'string' ? body.error : JSON.stringify(body.error ?? '');
      } catch {
        // no JSON body
      }
      throw new NexoraApiError(`Nexora answered ${response.status} on ${path}: ${detail}`, response.status);
    }
    return (await response.json()) as T;
  }

  return {
    desired: () => call<ProviderDesiredState>('/desired'),
    report: (installationId, report) =>
      call<ArtifactInstallation>(`/installations/${encodeURIComponent(installationId)}/observed`, {
        method: 'POST',
        body: JSON.stringify(report),
      }),
  };
}
