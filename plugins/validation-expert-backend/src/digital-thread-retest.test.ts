/**
 * Digital thread retest gate in Validation Manager.
 */
import { ConflictError } from '@backstage/errors';
import { MemoryValidationRunRepository } from './repository';
import {
  ValidationExpertService,
  assertContextExecutable,
} from './service';
import { createDefaultRunnerRegistry } from './runners';
import path from 'path';
import { resolveValidationRoot } from './parsers';
import type { AssignProductRequest, ApprovedURSReference } from './types';

const root = resolveValidationRoot(
  path.resolve(__dirname, '../../../validation'),
);

function makeReference(): ApprovedURSReference {
  return {
    requirementSetId: 'URS-DP-PROOF',
    baselineId: 'baseline-urs-1',
    baselineVersion: '1.0',
    businessCapabilityIds: [],
    approvalStatus: 'APPROVED',
    sourceSystem: 'urs-composer',
    requirementIds: ['URS-1', 'URS-KEEP'],
    createdAt: new Date().toISOString(),
  };
}

describe('Digital thread retest gate', () => {
  it('blocks test start while RETEST_REQUIRED is open', async () => {
    const repository = new MemoryValidationRunRepository();
    const service = new ValidationExpertService({
      validationRoot: root,
      repository,
      runners: createDefaultRunnerRegistry(),
      ursBaselineResolver: {
        async resolveApprovedBaseline() {
          return { reference: makeReference() };
        },
        async resolveBaselineRequirements() {
          return [];
        },
      },
      productResolver: {
        async resolveProductRef(request: AssignProductRequest) {
          return {
            productId: request.productId,
            productVersionId: request.productVersionId,
            productBaselineId: request.productBaselineId,
            productName: 'Demo',
            productVersion: '2.0',
            productBaselineVersion: '1.0',
            assignedAt: new Date().toISOString(),
          };
        },
      },
    } as any);

    const created = await service.createContextFromApprovedUrs(
      { requirementSetId: 'URS-DP-PROOF', baselineId: 'baseline-urs-1' },
      'user:default/author',
    );

    const { context } = await service.assignProduct(
      created.context.id,
      {
        ursBaselineId: 'baseline-urs-1',
        productId: 'product-1',
        productVersionId: 'version-2',
        productBaselineId: 'baseline-2',
        manifestHash: 'c'.repeat(64),
        commitSha: 'abc123',
        changeAssessment: {
          id: 'CIA-1',
          retestRequiredRequirementIds: ['URS-1'],
          carriedForwardRequirementIds: ['URS-KEEP'],
        },
      },
      'user:default/author',
    );

    expect(context.retestItems?.some(i => i.status === 'RETEST_REQUIRED')).toBe(
      true,
    );
    expect(
      context.retestItems?.some(i => i.status === 'CARRIED_FORWARD'),
    ).toBe(true);
    expect(context.productRef?.manifestHash).toBe('c'.repeat(64));

    expect(() => assertContextExecutable(context)).toThrow(ConflictError);

    await expect(
      service.createRun({
        type: 'IQ',
        createdBy: { userEntityRef: 'user:default/author' },
        contextId: context.id,
      }),
    ).rejects.toThrow(/RETEST_REQUIRED/);
  });
});
