/**
 * Read-only HTTP boundary from Product Composer to Validation Manager.
 * Product Composer only consumes a decision for the exact stable ID tuple;
 * it never reads or mutates Validation Manager persistence.
 */

import type { ValidationContext } from '@internal/platform-common';

export type ValidationDecision = {
  status: 'APPROVED' | 'MISSING' | 'NOT_APPROVED';
  contextId?: string;
};

export interface ValidationDecisionResolver {
  resolve(
    input: {
      ursBaselineId: string;
      productId: string;
      productVersionId: string;
      productBaselineId: string;
      manifestHash: string;
      commitSha: string;
    },
    credentials: unknown,
  ): Promise<ValidationDecision>;
}

export function createHttpValidationDecisionResolver(options: {
  discovery: { getBaseUrl(pluginId: string): Promise<string> };
  auth: {
    getPluginRequestToken(options: {
      onBehalfOf: unknown;
      targetPluginId: string;
    }): Promise<{ token: string }>;
  };
  fetchImpl?: typeof fetch;
}): ValidationDecisionResolver {
  const doFetch =
    options.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  return {
    async resolve(input, credentials) {
      if (!credentials) {
        throw new Error(
          'Caller credentials are required to resolve a validation decision',
        );
      }
      const { token } = await options.auth.getPluginRequestToken({
        onBehalfOf: credentials,
        targetPluginId: 'validation-expert',
      });
      const base = await options.discovery.getBaseUrl('validation-expert');
      const response = await doFetch(`${base}/contexts`, {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error(
          `validation-expert context list returned HTTP ${response.status}`,
        );
      }
      const body = (await response.json()) as { items?: ValidationContext[] };
      const context = (body.items ?? []).find(
        item =>
          item.source.baselineId === input.ursBaselineId &&
          item.productRef?.productId === input.productId &&
          item.productRef?.productVersionId === input.productVersionId &&
          item.productRef?.productBaselineId === input.productBaselineId &&
          item.productRef?.manifestHash === input.manifestHash &&
          (item.productRef?.releaseCandidateCommitSha ??
            item.productRef?.commitSha) === input.commitSha,
      );
      if (!context) {
        return { status: 'MISSING' };
      }
      return {
        status:
          context.status === 'APPROVED' ? 'APPROVED' : 'NOT_APPROVED',
        contextId: context.id,
      };
    },
  };
}
