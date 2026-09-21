/**
 * ValidationDecision — Phase 5 (P5-S1).
 *
 * The terminal step of the validation lifecycle. An independent expert records
 * their verdict on a ValidationContext (APPROVED / CONDITIONAL / REJECTED).
 *
 * Invariants:
 *   - Context must exist
 *   - Status must be one of the three valid values
 *   - Justification is required
 *   - Segregation of Duties: decider must differ from context creator
 *   - Only one decision per context (no re-deciding)
 */

import { MemoryValidationRunRepository } from './repository';
import { ValidationExpertService } from './service';

const CONTEXT_ID = 'ctx-001';
const CREATOR = 'user:default/alice';
const EXPERT = 'user:default/bob';      // independent expert, ≠ creator

function makeService() {
  const repo = new MemoryValidationRunRepository();
  // Manually add a context to the in-memory store.
  // The private property is accessed via type casting only in tests.
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
    runnerRegistry: { getRunner: () => undefined } as any,
    basePath: '/unused',
  });
  return { service, repo };
}

describe('ValidationDecision', () => {
  it('creates an APPROVED decision', async () => {
    const { service } = makeService();
    const decision = await service.createValidationDecision(
      CONTEXT_ID,
      { status: 'APPROVED', justification: 'All IQ/OQ/UAT protocols passed.' },
      EXPERT,
    );
    expect(decision.status).toBe('APPROVED');
    expect(decision.contextId).toBe(CONTEXT_ID);
    expect(decision.decidedBy).toBe(EXPERT);
    expect(decision.justification).toBe('All IQ/OQ/UAT protocols passed.');
  });

  it('creates a CONDITIONAL decision with conditions', async () => {
    const { service } = makeService();
    const decision = await service.createValidationDecision(
      CONTEXT_ID,
      {
        status: 'CONDITIONAL',
        justification: 'Approved pending resolution of finding F-001.',
        conditions: 'Close finding F-001 within 30 days.',
      },
      EXPERT,
    );
    expect(decision.status).toBe('CONDITIONAL');
    expect(decision.conditions).toBe('Close finding F-001 within 30 days.');
  });

  it('creates a REJECTED decision', async () => {
    const { service } = makeService();
    const decision = await service.createValidationDecision(
      CONTEXT_ID,
      { status: 'REJECTED', justification: 'OQ protocol incomplete.' },
      EXPERT,
    );
    expect(decision.status).toBe('REJECTED');
  });

  it('rejects an unknown decision status', async () => {
    const { service } = makeService();
    await expect(
      service.createValidationDecision(
        CONTEXT_ID,
        { status: 'PENDING', justification: 'ok' },
        EXPERT,
      ),
    ).rejects.toThrow(/Invalid decision status/i);
  });

  it('rejects a blank justification', async () => {
    const { service } = makeService();
    await expect(
      service.createValidationDecision(CONTEXT_ID, { status: 'APPROVED', justification: '  ' }, EXPERT),
    ).rejects.toThrow(/justification is required/i);
  });

  it('enforces Segregation of Duties — creator cannot decide', async () => {
    const { service } = makeService();
    await expect(
      service.createValidationDecision(
        CONTEXT_ID,
        { status: 'APPROVED', justification: 'Self-approved.' },
        CREATOR, // same person who created the context
      ),
    ).rejects.toThrow(/Segregation of Duties/i);
  });

  it('allows only one decision per context', async () => {
    const { service } = makeService();
    await service.createValidationDecision(
      CONTEXT_ID,
      { status: 'APPROVED', justification: 'First decision.' },
      EXPERT,
    );
    await expect(
      service.createValidationDecision(
        CONTEXT_ID,
        { status: 'REJECTED', justification: 'Trying again.' },
        EXPERT,
      ),
    ).rejects.toThrow(/already has a decision/i);
  });

  it('returns the decision via getValidationDecision', async () => {
    const { service } = makeService();
    expect(await service.getValidationDecision(CONTEXT_ID)).toBeUndefined();
    await service.createValidationDecision(
      CONTEXT_ID,
      { status: 'APPROVED', justification: 'Passed.' },
      EXPERT,
    );
    const found = await service.getValidationDecision(CONTEXT_ID);
    expect(found?.status).toBe('APPROVED');
    expect(found?.decidedBy).toBe(EXPERT);
  });

  it('throws NotFoundError for a non-existent context', async () => {
    const { service } = makeService();
    await expect(
      service.createValidationDecision(
        'does-not-exist',
        { status: 'APPROVED', justification: 'ok' },
        EXPERT,
      ),
    ).rejects.toThrow(/not found/i);
  });
});
