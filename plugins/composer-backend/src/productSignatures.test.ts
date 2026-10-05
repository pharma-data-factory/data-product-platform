/**
 * Approval and release as signed acts (NXD-128).
 *
 * For a GMP-relevant product (INDIRECT, DIRECT or unanswered) approving a
 * version, approving its baseline and releasing it need a justification and
 * the signer's PIN; for NONE a confirmation suffices. Pinned: the PIN is
 * checked only after the act is known to be allowed, a refused PIN changes
 * nothing, and every act is recorded with its meaning.
 */

import knex, { Knex } from 'knex';
import { NotAllowedError } from '@backstage/errors';
import { ComposerRepository } from './repository';
import { ComposerService } from './service';

const mockLogger: any = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  child: jest.fn((): any => mockLogger),
};

const AUTHOR = 'user:default/dana-author';
const REVIEWER = 'user:default/rick-reviewer';

describe('signed approval and release (NXD-128)', () => {
  let db: Knex;
  let service: ComposerService;
  const verifyPin = jest.fn(async (pin: string) => {
    if (pin !== 'right-pin') {
      throw new NotAllowedError('Re-authentication failed. Signature rejected.');
    }
    return 'signature-pin';
  });

  beforeEach(async () => {
    verifyPin.mockClear();
    db = knex({ client: 'better-sqlite3', connection: { filename: ':memory:' }, useNullAsDefault: true });
    const repository = await ComposerRepository.create({ getClient: () => db });
    service = new ComposerService({ logger: mockLogger, repository });
  });

  afterEach(async () => {
    await db?.destroy();
  });

  async function draft(gxpRelevance?: string) {
    const product = await service.createProduct(
      {
        name: `p-${Math.random()}`,
        productType: 'DATA_PRODUCT',
        ...(gxpRelevance ? { gxpRelevance } : {}),
      } as any,
      AUTHOR,
    );
    const version = await service.createProductVersion(product.id, { version: '1.0' }, AUTHOR);
    return { product, version };
  }

  it('GMP: approval needs a justification and the PIN, and is recorded', async () => {
    const { product, version } = await draft('DIRECT');
    await expect(
      service.signedVersionTransition(version.id, { targetStatus: 'APPROVED' }, REVIEWER, verifyPin),
    ).rejects.toThrow(/needs a justification and your signing PIN/);

    const approved = await service.signedVersionTransition(
      version.id,
      { targetStatus: 'APPROVED', signature: { justification: 'Reviewed scope and traceability.', pin: 'right-pin' } },
      REVIEWER,
      verifyPin,
    );
    expect(approved.status).toBe('APPROVED');
    expect(await service.listProductSignatures(product.id)).toEqual([
      expect.objectContaining({
        entityType: 'PRODUCT_VERSION',
        entityId: version.id,
        meaning: 'VERSION_APPROVED',
        justification: 'Reviewed scope and traceability.',
        signedBy: REVIEWER,
        gmpRelevant: true,
        reauthMethod: 'signature-pin',
      }),
    ]);
  });

  it('a product without a GxP answer counts as GMP-relevant', async () => {
    const { version } = await draft();
    await expect(
      service.signedVersionTransition(
        version.id,
        { targetStatus: 'APPROVED', signature: { justification: 'ok' } },
        REVIEWER,
        verifyPin,
      ),
    ).rejects.toThrow(/needs your signing PIN/);
  });

  it('a wrong PIN changes nothing', async () => {
    const { product, version } = await draft('INDIRECT');
    await expect(
      service.signedVersionTransition(
        version.id,
        { targetStatus: 'APPROVED', signature: { justification: 'ok', pin: 'wrong' } },
        REVIEWER,
        verifyPin,
      ),
    ).rejects.toThrow(/Re-authentication failed/);
    expect((await service.getProductVersion(version.id))?.status).toBe('DRAFT');
    expect(await service.listProductSignatures(product.id)).toEqual([]);
  });

  it('a refused act costs no PIN attempt', async () => {
    const { version } = await draft('DIRECT');
    await expect(
      service.signedVersionTransition(
        version.id,
        { targetStatus: 'APPROVED', signature: { justification: 'mine', pin: 'right-pin' } },
        AUTHOR,
        verifyPin,
      ),
    ).rejects.toThrow(/Segregation of Duties/);
    await expect(
      service.signedVersionTransition(
        version.id,
        { targetStatus: 'RELEASED', signature: { justification: 'x', pin: 'right-pin' } },
        REVIEWER,
        verifyPin,
      ),
    ).rejects.toThrow(/Invalid transition/);
    expect(verifyPin).not.toHaveBeenCalled();
  });

  it('NONE: a confirmation suffices, and is still recorded without a PIN', async () => {
    const { product, version } = await draft('NONE');
    await service.signedVersionTransition(version.id, { targetStatus: 'APPROVED' }, REVIEWER, verifyPin);
    expect(verifyPin).not.toHaveBeenCalled();
    expect(await service.listProductSignatures(product.id)).toEqual([
      expect.objectContaining({ meaning: 'VERSION_APPROVED', gmpRelevant: false, reauthMethod: undefined }),
    ]);
  });

  it('release candidate and revert are not signed acts', async () => {
    const { product, version } = await draft('DIRECT');
    await service.signedVersionTransition(
      version.id,
      { targetStatus: 'APPROVED', signature: { justification: 'ok', pin: 'right-pin' } },
      REVIEWER,
      verifyPin,
    );
    verifyPin.mockClear();
    await service.signedVersionTransition(version.id, { targetStatus: 'RELEASE_CANDIDATE' }, AUTHOR, verifyPin);
    expect(verifyPin).not.toHaveBeenCalled();
    expect(await service.listProductSignatures(product.id)).toHaveLength(1);
  });

  it('GMP: a baseline approval is signed, and its author still may not approve it', async () => {
    const { product, version } = await draft('DIRECT');
    const baseline = await service.createProductBaseline(version.id, {}, AUTHOR);
    await expect(
      service.signedBaselineApproval(baseline.id, { justification: 'x', pin: 'right-pin' }, AUTHOR, verifyPin),
    ).rejects.toThrow(/Segregation of Duties/);
    expect(verifyPin).not.toHaveBeenCalled();
    const approved = await service.signedBaselineApproval(
      baseline.id,
      { justification: 'Snapshot matches the reviewed version.', pin: 'right-pin' },
      REVIEWER,
      verifyPin,
    );
    expect(approved.status).toBe('APPROVED');
    expect((await service.listProductSignatures(product.id)).map(s => s.meaning)).toEqual([
      'BASELINE_APPROVED',
    ]);
  });
});
