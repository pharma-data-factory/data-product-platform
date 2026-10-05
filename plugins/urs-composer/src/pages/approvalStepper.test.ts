/**
 * The approval stepper's two rules, without a DOM.
 *
 * Same reasoning as `reviewChain.test.tsx`: the page is 1600 lines, and what
 * is worth pinning here is which step the reviewer is offered a decision on —
 * a 21 CFR Part 11 approval chain, where offering the wrong one is not a
 * cosmetic bug.
 *
 * The case that motivated the file is the first one below. Every step of a
 * fresh instance is PENDING, because the backend only marks a step ACTIVE when
 * it advances past the previous one — so the page's old
 * `findIndex(s => s.status === 'ACTIVE')` returned -1 and the Approve button,
 * gated on the same flag, rendered on no step at all. NXD-072.
 */

import {
  activeApprovalStepIndex,
  approvalInstanceSummary,
  holdsApprovalStepRole,
  isApprovalStepDue,
} from './approvalStepper';
import { ApprovalInstance, ApprovalStepInstance } from '../api/types';

function step(
  sequence: number,
  status: string,
  overrides: Partial<ApprovalStepInstance> = {},
): ApprovalStepInstance {
  return {
    id: `step-${sequence}`,
    sequence,
    role: `ROLE_${sequence}`,
    status,
    required: true,
    ...overrides,
  };
}

function instance(
  status: string,
  currentStepSequence: number,
  steps: ApprovalStepInstance[],
): ApprovalInstance {
  return {
    id: 'instance-1',
    baselineId: 'baseline-1',
    workflowId: 'standard-gxp-urs',
    status,
    currentStepSequence,
    steps,
    startedBy: 'user:default/author',
    startedAt: '2026-09-28T00:00:00.000Z',
  };
}

describe('activeApprovalStepIndex', () => {
  it('points at the first step of a chain nobody has acted on', () => {
    const chain = instance('NOT_STARTED', 1, [
      step(1, 'PENDING'),
      step(2, 'PENDING'),
      step(3, 'PENDING'),
    ]);
    expect(activeApprovalStepIndex(chain)).toBe(0);
  });

  it('points at the due step mid-chain, not the one just approved', () => {
    const chain = instance('IN_PROGRESS', 2, [
      step(1, 'APPROVED'),
      step(2, 'ACTIVE'),
      step(3, 'PENDING'),
    ]);
    expect(activeApprovalStepIndex(chain)).toBe(1);
  });

  it('reads a completed chain as walked through, not stopped on its last row', () => {
    const chain = instance('APPROVED', 3, [
      step(1, 'APPROVED'),
      step(2, 'APPROVED'),
      step(3, 'APPROVED'),
    ]);
    expect(activeApprovalStepIndex(chain)).toBe(3);
  });

  it('resolves by sequence, not by array position', () => {
    const chain = instance('IN_PROGRESS', 20, [
      step(10, 'APPROVED'),
      step(20, 'ACTIVE'),
      step(30, 'PENDING'),
    ]);
    expect(activeApprovalStepIndex(chain)).toBe(1);
  });

  // -1 renders as "no step reached yet" on a chain that has demonstrably been
  // reached. There is no state in which that is the right picture.
  it('never answers -1, even when the sequence matches no step', () => {
    const chain = instance('IN_PROGRESS', 99, [
      step(1, 'APPROVED'),
      step(2, 'PENDING'),
    ]);
    expect(activeApprovalStepIndex(chain)).toBe(0);
  });
});

describe('isApprovalStepDue', () => {
  it('offers a decision on the first step of a fresh chain', () => {
    // The whole point. Under the old ACTIVE-flag rule this was false for every
    // step, so a submitted baseline offered the reviewer nothing to do.
    const steps = [step(1, 'PENDING'), step(2, 'PENDING')];
    const chain = instance('NOT_STARTED', 1, steps);
    expect(isApprovalStepDue(steps[0], chain)).toBe(true);
    expect(isApprovalStepDue(steps[1], chain)).toBe(false);
  });

  it('offers a decision on an ACTIVE step once the chain has advanced', () => {
    const steps = [step(1, 'APPROVED'), step(2, 'ACTIVE')];
    const chain = instance('IN_PROGRESS', 2, steps);
    expect(isApprovalStepDue(steps[0], chain)).toBe(false);
    expect(isApprovalStepDue(steps[1], chain)).toBe(true);
  });

  it('offers nothing on a completed chain', () => {
    const steps = [step(1, 'APPROVED'), step(2, 'APPROVED')];
    const chain = instance('APPROVED', 2, steps);
    expect(steps.some(s => isApprovalStepDue(s, chain))).toBe(false);
  });

  it('offers nothing on a rejected or cancelled chain', () => {
    const steps = [step(1, 'REJECTED'), step(2, 'PENDING')];
    for (const status of ['REJECTED', 'CANCELLED']) {
      const chain = instance(status, 1, steps);
      expect(steps.some(s => isApprovalStepDue(s, chain))).toBe(false);
    }
  });

  // Belt and braces: if the sequence still points at a step somebody has
  // already decided, that step is not due regardless.
  it('offers nothing on a step that is already decided', () => {
    const decided = step(1, 'APPROVED');
    const chain = instance('IN_PROGRESS', 1, [decided, step(2, 'PENDING')]);
    expect(isApprovalStepDue(decided, chain)).toBe(false);
  });
});

describe('approvalInstanceSummary (NXD-104)', () => {
  it('names the step a submitted chain is waiting for, instead of "NOT_STARTED"', () => {
    const chain = instance('NOT_STARTED', 1, [
      step(1, 'PENDING', { role: 'BUSINESS_REVIEWER' }),
      step(2, 'PENDING', { role: 'PRODUCT_MANAGER' }),
    ]);
    expect(approvalInstanceSummary(chain)).toBe(
      'Waiting for step 1 (BUSINESS_REVIEWER) · submitted by user:default/author',
    );
  });

  it('follows the chain as it advances', () => {
    const chain = instance('IN_PROGRESS', 2, [
      step(1, 'APPROVED', { role: 'BUSINESS_REVIEWER' }),
      step(2, 'ACTIVE', { role: 'PRODUCT_MANAGER' }),
    ]);
    expect(approvalInstanceSummary(chain)).toBe(
      'Waiting for step 2 (PRODUCT_MANAGER) · submitted by user:default/author',
    );
  });

  it('says a settled chain is settled', () => {
    expect(approvalInstanceSummary(instance('APPROVED', 3, []))).toBe(
      'Approved · submitted by user:default/author',
    );
    expect(approvalInstanceSummary(instance('REJECTED', 1, []))).toBe(
      'Rejected · submitted by user:default/author',
    );
    expect(approvalInstanceSummary(instance('CANCELLED', 1, []))).toBe(
      'Cancelled · submitted by user:default/author',
    );
  });
});

describe('holdsApprovalStepRole (NXD-104)', () => {
  const reviewerStep = step(1, 'PENDING', { role: 'BUSINESS_REVIEWER' });

  it('is true only for a user holding the step role', () => {
    expect(holdsApprovalStepRole(reviewerStep, ['BUSINESS_REVIEWER'])).toBe(
      true,
    );
    expect(
      holdsApprovalStepRole(reviewerStep, ['AUTHOR', 'PRODUCT_MANAGER']),
    ).toBe(false);
    expect(holdsApprovalStepRole(reviewerStep, [])).toBe(false);
  });

  it('does not let ADMIN stand in for the step role, as the server does not', () => {
    expect(holdsApprovalStepRole(reviewerStep, ['ADMIN'])).toBe(false);
  });

  it('offers the step when the roles could not be loaded, leaving the decision to the server', () => {
    expect(holdsApprovalStepRole(reviewerStep, null)).toBe(true);
  });
});
