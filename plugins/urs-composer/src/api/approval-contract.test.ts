/**
 * The frontend half of the approval wire contract.
 *
 * The backend half (`plugins/urs-composer-backend/src/approval-contract.test.ts`)
 * proves the server sends the promised fields. This proves the client
 * declares them — and, more importantly, that it declares **nothing else as
 * required**.
 *
 * That second direction is the one that failed. `ApprovalInstance` declared
 * `currentStepId`, `createdAt` and `createdBy`; the backend sends
 * `currentStepSequence`, `startedAt` and `startedBy`. Two of the phantoms
 * were non-optional, so the type asserted a value that was `undefined` on
 * every response. No test could fail, because no test constructed a value
 * the way the server does — they all built fixtures that satisfied whatever
 * the type happened to say.
 *
 * So this file deliberately does the opposite: it starts from the contract
 * and asks whether the type accepts it, rather than starting from the type.
 */

import {
  APPROVAL_INSTANCE_OPTIONAL_FIELDS,
  APPROVAL_INSTANCE_REQUIRED_FIELDS,
  APPROVAL_STEP_REQUIRED_FIELDS,
  missingWireFields,
} from '@internal/platform-common';

import type { ApprovalInstance, ApprovalStepInstance } from './types';

/**
 * A response built from the contract and nothing else.
 *
 * The annotation is the compile-time half of this test. If the declared
 * type gains a required field that is not in the contract, this object stops
 * satisfying it and `tsc` fails — which is exactly what would have caught
 * `createdAt` and `createdBy` when they were added.
 */
const WIRE_RESPONSE: ApprovalInstance = {
  id: 'ai-1',
  workflowId: 'standard-gxp-urs',
  baselineId: 'b-1',
  status: 'IN_PROGRESS',
  currentStepSequence: 1,
  startedBy: 'user:default/author',
  startedAt: '2026-09-26T10:00:00.000Z',
  steps: [
    {
      id: 'step-1',
      sequence: 1,
      role: 'BUSINESS_REVIEWER',
      status: 'ACTIVE',
      required: true,
    },
  ],
};

describe('approval instance contract, client side', () => {
  it('accepts a response containing exactly the promised fields', () => {
    // Runtime mirror of the compile-time annotation above: nothing the
    // contract promises is missing from the object the type accepted.
    expect(
      missingWireFields(
        WIRE_RESPONSE as unknown as Record<string, unknown>,
        APPROVAL_INSTANCE_REQUIRED_FIELDS,
      ),
    ).toEqual([]);

    const step = WIRE_RESPONSE.steps[0] as unknown as Record<string, unknown>;
    expect(missingWireFields(step, APPROVAL_STEP_REQUIRED_FIELDS)).toEqual([]);
  });

  it('declares no required field the backend does not send', () => {
    // The defect, stated as a test. A response carrying only the contract's
    // fields is a complete response; anything else the type insists on is a
    // field the client would read as undefined.
    const declared = Object.keys(WIRE_RESPONSE).sort();
    expect(declared).toEqual([...APPROVAL_INSTANCE_REQUIRED_FIELDS].sort());
  });

  it('keeps the retired phantom fields retired', () => {
    // Named individually rather than by a generic rule, because these three
    // are the ones that were actually wrong and a reader of this test should
    // see why the file exists.
    for (const phantom of ['currentStepId', 'createdAt', 'createdBy']) {
      expect(WIRE_RESPONSE).not.toHaveProperty(phantom);
      expect(
        APPROVAL_INSTANCE_REQUIRED_FIELDS as readonly string[],
      ).not.toContain(phantom);
    }
  });

  it('treats the completion fields as optional, matching the server', () => {
    // An instance in flight has neither. The type must not require them, and
    // a client must not render them unconditionally.
    const inFlight: ApprovalInstance = { ...WIRE_RESPONSE };
    for (const field of APPROVAL_INSTANCE_OPTIONAL_FIELDS) {
      expect(inFlight).not.toHaveProperty(field);
    }

    const completed: ApprovalInstance = {
      ...WIRE_RESPONSE,
      status: 'APPROVED',
      completedBy: 'user:default/qa',
      completedAt: '2026-09-26T11:00:00.000Z',
    };
    expect(completed.completedAt).toBe('2026-09-26T11:00:00.000Z');
  });

  it('types currentStepSequence as the number the server sends', () => {
    // A `string` here would compile against an id and fail against the
    // sequence the server actually orders steps by.
    const sequence: number = WIRE_RESPONSE.currentStepSequence;
    const step: ApprovalStepInstance = WIRE_RESPONSE.steps[0];

    expect(sequence).toBe(step.sequence);
  });
});
