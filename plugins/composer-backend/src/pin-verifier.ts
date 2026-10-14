/**
 * Verifies a signer's PIN in the URS Composer, on their behalf (NXD-128), as
 * the Validation Expert does (NXD-119): one signing credential and one
 * lockout per person on the platform.
 */

import { NotAllowedError } from '@backstage/errors';

export type PinVerifier = (credentials: unknown, pin: string) => Promise<string>;

export function createHttpPinVerifier(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): PinVerifier {
  const doFetch = options.fetchImpl ?? ((...args) => fetch(...args));
  return async (credentials, pin) => {
    const base = await options.discovery.getBaseUrl('urs-composer');
    const { token } = await options.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'urs-composer',
    });
    const response = await doFetch(`${base}/signing-pin/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ pin }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      method?: string;
      error?: string | { message?: string };
    };
    if (response.ok) {
      return body.method ?? 'signature-pin';
    }
    const message =
      typeof body.error === 'string' ? body.error : body.error?.message;
    if (response.status === 401 || response.status === 403) {
      throw new NotAllowedError(message || 'Re-authentication failed. Signature rejected.');
    }
    throw new Error(`The signing PIN could not be verified: ${response.status} ${message ?? ''}`);
  };
}
