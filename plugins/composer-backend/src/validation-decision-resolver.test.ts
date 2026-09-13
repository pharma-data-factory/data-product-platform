import { createHttpValidationDecisionResolver } from './validation-decision-resolver';

const binding = {
  ursBaselineId: 'urs-1',
  productId: 'product-1',
  productVersionId: 'version-1',
  productBaselineId: 'baseline-1',
  manifestHash: 'a'.repeat(64),
  commitSha: 'abc123',
};

describe('Validation decision resolver', () => {
  it('accepts only the APPROVED context matching the full stable-ID binding', async () => {
    const resolver = createHttpValidationDecisionResolver({
      discovery: { getBaseUrl: jest.fn().mockResolvedValue('http://validation') },
      auth: {
        getPluginRequestToken: jest.fn().mockResolvedValue({ token: 'token' }),
      },
      fetchImpl: jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          items: [
            {
              id: 'ctx-1',
              status: 'APPROVED',
              source: { baselineId: binding.ursBaselineId },
              productRef: {
                ...binding,
                assignedAt: new Date().toISOString(),
              },
            },
          ],
        }),
      }) as unknown as typeof fetch,
    });

    await expect(resolver.resolve(binding, {})).resolves.toEqual({
      status: 'APPROVED',
      contextId: 'ctx-1',
    });
    await expect(
      resolver.resolve({ ...binding, manifestHash: 'b'.repeat(64) }, {}),
    ).resolves.toEqual({ status: 'MISSING' });
  });
});
