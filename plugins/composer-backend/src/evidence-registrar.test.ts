import {
  buildCiEvidenceIdempotencyKey,
  buildTechnicalCiEvidenceReference,
  createHttpTechnicalEvidenceRegistrar,
} from './evidence-registrar';

describe('evidence-registrar', () => {
  it('buildCiEvidenceIdempotencyKey is stable', () => {
    expect(
      buildCiEvidenceIdempotencyKey({
        productVersionId: 'v1',
        manifestContentHash: 'abc',
        commitSha: 'deadbeef',
      }),
    ).toBe('v1:abc:deadbeef:PASSED');
  });

  it('buildTechnicalCiEvidenceReference marks technical-control-not-gxp', () => {
    const ref = buildTechnicalCiEvidenceReference({
      productId: 'p1',
      productVersionId: 'v1',
      productBaselineId: 'b1',
      ursBaselineId: 'u1',
      manifestContentHash: 'abc',
      registeredAt: '2026-01-01T00:00:00.000Z',
      commitSha: 'deadbeef',
    });
    expect(ref.kind).toBe('ci-quality-gate');
    expect(ref.ciStatus).toBe('PASSED');
    expect(ref.disclaimer).toBe('technical-control-not-gxp');
    expect(ref.commitSha).toBe('deadbeef');
  });

  it('createHttpTechnicalEvidenceRegistrar posts to validation-expert', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        created: true,
        item: {
          id: 'ev-1',
          evidenceType: 'ci-quality-gate',
          reference: '{}',
          source: 'runtime',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      }),
    });
    const registrar = createHttpTechnicalEvidenceRegistrar({
      discovery: {
        getBaseUrl: jest.fn().mockResolvedValue('http://ve'),
      },
      auth: {
        getPluginRequestToken: jest.fn().mockResolvedValue({ token: 't-ve' }),
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const result = await registrar.registerTechnicalCiEvidence(
      {
        evidenceType: 'ci-quality-gate',
        reference: '{"kind":"ci-quality-gate"}',
        createdBy: 'user:default/a',
        idempotencyKey: 'v1:hash:sha',
      },
      { user: 'a' },
    );

    expect(result.created).toBe(true);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://ve/evidence/technical',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer t-ve',
        }),
      }),
    );
  });
});
