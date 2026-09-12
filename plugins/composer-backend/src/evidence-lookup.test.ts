import {
  createHttpTechnicalEvidenceLookup,
  findTechnicalCiEvidenceByIdempotencyKey,
} from './evidence-lookup';

describe('evidence-lookup', () => {
  it('findTechnicalCiEvidenceByIdempotencyKey matches reference pins', () => {
    const items = [
      {
        id: 'ev-1',
        evidenceType: 'ci-quality-gate',
        reference: JSON.stringify({
          productVersionId: 'v1',
          manifestContentHash: 'hash',
          commitSha: 'abc',
        }),
      },
    ];
    expect(
      findTechnicalCiEvidenceByIdempotencyKey(items, 'v1:hash:abc:PASSED')?.id,
    ).toBe('ev-1');
    expect(
      findTechnicalCiEvidenceByIdempotencyKey(items, 'v1:hash:other:PASSED'),
    ).toBeUndefined();
  });

  it('createHttpTechnicalEvidenceLookup filters ci-quality-gate', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        items: [
          {
            id: 'ev-1',
            evidenceType: 'ci-quality-gate',
            reference: '{}',
          },
          {
            id: 'ev-2',
            evidenceType: 'other',
            reference: '{}',
          },
        ],
      }),
    });
    const lookup = createHttpTechnicalEvidenceLookup({
      discovery: { getBaseUrl: jest.fn().mockResolvedValue('http://ve') },
      auth: {
        getPluginRequestToken: jest.fn().mockResolvedValue({ token: 't' }),
      },
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    const items = await lookup.listTechnicalCiEvidence({ user: 'a' });
    expect(items).toEqual([
      {
        id: 'ev-1',
        evidenceType: 'ci-quality-gate',
        reference: '{}',
        checksum: undefined,
        createdAt: undefined,
      },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      'http://ve/evidence?evidenceType=ci-quality-gate',
      expect.any(Object),
    );
  });
});
