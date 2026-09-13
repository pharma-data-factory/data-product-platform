/**
 * Shared digital-thread contract smoke tests.
 */
import {
  computeUrsBaselineContentHash,
  validateUrsProductBinding,
  computeProductManifestFileHash,
  isUrsBaselineBindableStatus,
} from './digital-thread';

describe('digital-thread contracts', () => {
  it('validates URS product binding fields', () => {
    expect(validateUrsProductBinding({})).toEqual(
      expect.arrayContaining([
        'requirementSetId is required',
        'ursBaselineId is required',
        'ursVersion is required',
        'ursContentHash is required',
      ]),
    );
    expect(
      validateUrsProductBinding({
        requirementSetId: 'set-1',
        ursBaselineId: 'bl-1',
        ursVersion: '1.0',
        ursContentHash: 'a'.repeat(64),
      }),
    ).toEqual([]);
  });

  it('accepts APPROVED and BASELINED', () => {
    expect(isUrsBaselineBindableStatus('APPROVED')).toBe(true);
    expect(isUrsBaselineBindableStatus('BASELINED')).toBe(true);
    expect(isUrsBaselineBindableStatus('DRAFT')).toBe(false);
  });

  it('computes stable baseline and manifest file hashes', () => {
    const hash = computeUrsBaselineContentHash({
      id: 'bl-1',
      requirementSetId: 'set-1',
      baselineVersion: '1.0',
      requirementVersionIds: ['rv-1', 'rv-2'],
      status: 'APPROVED',
    });
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(
      computeUrsBaselineContentHash({
        id: 'bl-1',
        requirementSetId: 'set-1',
        baselineVersion: '1.0',
        requirementVersionIds: ['rv-1', 'rv-2'],
        status: 'APPROVED',
      }),
    ).toBe(hash);

    const fileHash = computeProductManifestFileHash({
      productId: 'p1',
      productVersionId: 'v1',
      productBaselineId: 'b1',
      requirementSetId: 'set-1',
      ursBaselineId: 'bl-1',
      ursVersion: '1.0',
      ursContentHash: hash,
      components: [],
      contracts: [],
      policies: [],
      qualityGates: [],
    });
    expect(fileHash).toMatch(/^[a-f0-9]{64}$/);
  });
});
