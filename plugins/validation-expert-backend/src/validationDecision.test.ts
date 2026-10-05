/**
 * The validation decision as the outcome of electronic signatures (NXD-119;
 * before that, Phase 5 P5-S1 wrote a decision directly).
 *
 * The rule, after GAMP 5 and EU GMP Annex 11/15: when a GMP-relevant product
 * depends on the baseline, the validation expert signs and then QA approves;
 * otherwise one signature from either suffices; a rejection ends it. Pinned
 * here with the checks that keep a signature honest: the signer's own role,
 * Segregation of Duties, the order, and the PIN — verified last, so a refused
 * signature costs no attempt.
 */

import { NotAllowedError } from '@backstage/errors';
import { MemoryValidationRunRepository } from './repository';
import { ValidationExpertService, type GmpClassifier } from './service';

const CONTEXT_ID = 'ctx-001';
const CREATOR = 'user:default/alice';
const EXPERT = 'user:default/vera-validator';
const QA = 'user:default/quinn-quality';
const VERSION_AUTHOR = 'user:default/dana-author';

function classifierFor(gxpRelevance: string | undefined): GmpClassifier {
  return async () => ({
    products: [{ id: 'p-1', name: 'OEE', gxpRelevance }],
    versionCreators: [VERSION_AUTHOR],
  });
}

function makeService(gmpClassifier?: GmpClassifier) {
  const repo = new MemoryValidationRunRepository();
  (repo as any).store.contexts.push({
    id: CONTEXT_ID,
    source: {
      requirementSetId: 'rs-001',
      baselineId: 'urs-baseline-001',
      baselineVersion: '1.0',
      businessCapabilityIds: [],
      requirementIds: [],
      approvalStatus: 'APPROVED',
      sourceSystem: 'urs-composer',
      createdAt: new Date().toISOString(),
    },
    status: 'CLOSED',
    createdAt: new Date().toISOString(),
    createdBy: CREATOR,
  });
  const service = new ValidationExpertService({
    repository: repo,
    runners: { getRunner: () => undefined } as any,
    validationRoot: '/unused',
    gmpClassifier,
  });
  return { service, repo };
}

const verifyPin = jest.fn(async (pin: string) => {
  if (pin !== 'right-pin') {
    throw new NotAllowedError('Re-authentication failed. Signature rejected.');
  }
  return 'signature-pin';
});

const expert = { ref: EXPERT, roles: ['VALIDATION_EXPERT' as const], verifyPin };
const qa = { ref: QA, roles: ['QUALITY_ASSURANCE' as const], verifyPin };

const approve = (role: 'VALIDATION_EXPERT' | 'QUALITY_ASSURANCE') => ({
  role,
  verdict: 'APPROVED' as const,
  justification: 'IQ/OQ/UAT passed; coverage complete.',
  pin: 'right-pin',
});

beforeEach(() => verifyPin.mockClear());

describe('validation decision signatures (NXD-119)', () => {
  it('GMP: the expert signs, QA approves, then the decision exists with gmpRule', async () => {
    const { service } = makeService(classifierFor('DIRECT'));

    const afterExpert = await service.signValidationDecision(
      CONTEXT_ID,
      approve('VALIDATION_EXPERT'),
      expert,
    );
    expect(afterExpert.gmpRelevant).toBe(true);
    expect(afterExpert.progress.nextRoles).toEqual(['QUALITY_ASSURANCE']);
    expect(afterExpert.decision).toBeUndefined();

    const afterQa = await service.signValidationDecision(
      CONTEXT_ID,
      approve('QUALITY_ASSURANCE'),
      qa,
    );
    expect(afterQa.decision).toMatchObject({
      status: 'APPROVED',
      decidedBy: QA,
      gmpRule: true,
    });
    expect(afterQa.decision?.signatures?.map(s => [s.role, s.signedBy])).toEqual([
      ['VALIDATION_EXPERT', EXPERT],
      ['QUALITY_ASSURANCE', QA],
    ]);
    expect(afterQa.signatures.every(s => s.reauthMethod === 'signature-pin')).toBe(true);
  });

  it('GMP: QA cannot sign before the validation expert', async () => {
    const { service, repo } = makeService(classifierFor('INDIRECT'));
    await expect(
      service.signValidationDecision(CONTEXT_ID, approve('QUALITY_ASSURANCE'), qa),
    ).rejects.toThrow(/validation expert signs first, then QA/);
    expect(await repo.listSignatures(CONTEXT_ID)).toEqual([]);
    expect(verifyPin).not.toHaveBeenCalled();
  });

  it('not GMP: one signature decides, and the decision is not under the GMP rule', async () => {
    const { service } = makeService(classifierFor('NONE'));
    const state = await service.signValidationDecision(
      CONTEXT_ID,
      approve('QUALITY_ASSURANCE'),
      qa,
    );
    expect(state.gmpRelevant).toBe(false);
    expect(state.decision).toMatchObject({ status: 'APPROVED', gmpRule: false });
  });

  it('a rejection by the expert ends the decision as REJECTED', async () => {
    const { service } = makeService(classifierFor('DIRECT'));
    const state = await service.signValidationDecision(
      CONTEXT_ID,
      { ...approve('VALIDATION_EXPERT'), verdict: 'REJECTED' },
      expert,
    );
    expect(state.decision?.status).toBe('REJECTED');
    await expect(
      service.signValidationDecision(CONTEXT_ID, approve('QUALITY_ASSURANCE'), qa),
    ).rejects.toThrow(/already decided/);
  });

  it('refuses a role the signer does not hold', async () => {
    const { service } = makeService(classifierFor('DIRECT'));
    await expect(
      service.signValidationDecision(CONTEXT_ID, approve('VALIDATION_EXPERT'), qa),
    ).rejects.toThrow(/requires membership in validation-experts/);
  });

  it('Segregation of Duties: not the context creator, not a version creator, not twice', async () => {
    const { service } = makeService(classifierFor('DIRECT'));
    await expect(
      service.signValidationDecision(CONTEXT_ID, approve('VALIDATION_EXPERT'), {
        ...expert,
        ref: CREATOR,
      }),
    ).rejects.toThrow(/creator of a validation context/);
    await expect(
      service.signValidationDecision(CONTEXT_ID, approve('VALIDATION_EXPERT'), {
        ...expert,
        ref: VERSION_AUTHOR,
      }),
    ).rejects.toThrow(/creator of a product version/);

    // One person holding both roles still signs once.
    const both = {
      ref: EXPERT,
      roles: ['VALIDATION_EXPERT' as const, 'QUALITY_ASSURANCE' as const],
      verifyPin,
    };
    await service.signValidationDecision(CONTEXT_ID, approve('VALIDATION_EXPERT'), both);
    await expect(
      service.signValidationDecision(CONTEXT_ID, approve('QUALITY_ASSURANCE'), both),
    ).rejects.toThrow(/must come from someone else/);
  });

  it('a wrong PIN records nothing', async () => {
    const { service, repo } = makeService(classifierFor('DIRECT'));
    await expect(
      service.signValidationDecision(
        CONTEXT_ID,
        { ...approve('VALIDATION_EXPERT'), pin: 'wrong' },
        expert,
      ),
    ).rejects.toThrow(/Re-authentication failed/);
    expect(await repo.listSignatures(CONTEXT_ID)).toEqual([]);
  });

  it('requires a justification and a verdict', async () => {
    const { service } = makeService(classifierFor('DIRECT'));
    await expect(
      service.signValidationDecision(
        CONTEXT_ID,
        { ...approve('VALIDATION_EXPERT'), justification: '  ' },
        expert,
      ),
    ).rejects.toThrow(/justification is required/);
    await expect(
      service.signValidationDecision(
        CONTEXT_ID,
        { ...approve('VALIDATION_EXPERT'), verdict: 'CONDITIONAL' as never },
        expert,
      ),
    ).rejects.toThrow(/APPROVED or REJECTED/);
  });

  it('applies the GMP rule when the classification is missing or fails', async () => {
    const missing = makeService(undefined);
    expect((await missing.service.getDecisionState(CONTEXT_ID)).gmpRelevant).toBe(true);

    const failing = makeService(async () => {
      throw new Error('composer unreachable');
    });
    const state = await failing.service.getDecisionState(CONTEXT_ID);
    expect(state.gmpRelevant).toBe(true);
    expect(state.classificationError).toMatch(/composer unreachable/);
  });

  it('a product without a GxP answer counts as GMP-relevant', async () => {
    const { service } = makeService(classifierFor(undefined));
    expect((await service.getDecisionState(CONTEXT_ID)).progress.nextRoles).toEqual([
      'VALIDATION_EXPERT',
    ]);
  });

  it('refuses an unknown context', async () => {
    const { service } = makeService(classifierFor('DIRECT'));
    await expect(
      service.signValidationDecision('no-ctx', approve('VALIDATION_EXPERT'), expert),
    ).rejects.toThrow(/not found/);
  });
});
