/**
 * P0 Product-/Version-Gating im Validation Manager — mandatory test cases
 *
 * 1. Context from an approved URS alone starts WAITING_FOR_SOLUTION.
 * 2. Run start without an assigned product version is rejected.
 * 3. Technical and manual evidence without a live product-bound context is rejected.
 * 4. ProductVersion not belonging to the Product is rejected (HTTP boundary).
 * 5. Approval/review without complete URS → Product → Test → Evidence traceability is rejected.
 * 6. Switching product version/baseline after ACTIVE supersedes the context.
 */
import { ConflictError } from '@backstage/errors';
import { MemoryValidationRunRepository } from './repository';
import { ValidationExpertService } from './service';
import { createHttpProductComposerResolver } from './product-resolver';
import { createDefaultRunnerRegistry } from './runners';
import path from 'path';
import { resolveValidationRoot } from './parsers';
import type { AssignProductRequest, ApprovedURSReference } from './types';

const root = resolveValidationRoot(
  path.resolve(__dirname, '../../../validation'),
);

const PRODUCT_V1 = {
  productId: 'product-1',
  productVersionId: 'version-1',
  productBaselineId: 'baseline-1',
};

const PRODUCT_V2 = {
  productId: 'product-1',
  productVersionId: 'version-2',
  productBaselineId: 'baseline-2',
};

function makeReference(
  overrides: Partial<ApprovedURSReference> = {},
): ApprovedURSReference {
  return {
    requirementSetId: 'URS-DP-PROOF',
    baselineId: 'baseline-urs-1',
    baselineVersion: '1.0',
    requirementSetTitle: 'Proof Requirement Set',
    businessCapabilityIds: [],
    approvalStatus: 'APPROVED',
    approvedAt: new Date().toISOString(),
    approvedBy: 'user:default/approver',
    sourceSystem: 'urs-composer',
    requirementIds: ['URS-DP-PROOF-001', 'URS-DP-PROOF-002'],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeService() {
  const repository = new MemoryValidationRunRepository();
  const service = new ValidationExpertService({
    validationRoot: root,
    repository,
    runners: createDefaultRunnerRegistry(),
    ursBaselineResolver: {
      async resolveApprovedBaseline(request: { baselineId: string }) {
        return { reference: makeReference({ baselineId: request.baselineId }) };
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
          productName: 'Platform Core',
          productVersion: request.productVersionId === 'version-2' ? '2.0' : '1.0',
          productBaselineVersion: '1.0',
          assignedAt: new Date().toISOString(),
        };
      },
    },
  } as any);
  return { service, repository };
}

async function makeContext(service: ValidationExpertService) {
  return (
    await service.createContextFromApprovedUrs(
      { requirementSetId: 'URS-DP-PROOF', baselineId: 'baseline-urs-1' },
      'user:default/author',
    )
  ).context;
}

describe('P0 product/version gating', () => {
  it('1: context from an APPROVED URS without a product starts WAITING_FOR_SOLUTION', async () => {
    const { service } = makeService();
    const context = await makeContext(service);
    expect(context.status).toBe('WAITING_FOR_SOLUTION');
    expect(context.productRef).toBeUndefined();
  });

  it('2: run start without an assigned product version is rejected', async () => {
    const { service } = makeService();
    const context = await makeContext(service);
    // Context exists but has no product assignment → executable guard fires.
    await expect(
      service.createRun({
        type: 'IQ',
        createdBy: { userEntityRef: 'user:default/author' },
        contextId: context.id,
      }),
    ).rejects.toThrow(/WAITING_FOR_SOLUTION/);
    // No context at all → hard reject.
    await expect(
      service.createRun({
        type: 'IQ',
        createdBy: { userEntityRef: 'user:default/author' },
      }),
    ).rejects.toThrow(/validation context with an assigned/);
  });

  it('3: technical and manual evidence without a live product-bound context is rejected', async () => {
    const { service } = makeService();

    // Technical evidence: no context assigned to the product refs.
    await expect(
      service.registerTechnicalEvidence({
        evidenceType: 'ci-quality-gate',
        reference: JSON.stringify({
          kind: 'ci-quality-gate',
          ...PRODUCT_V1,
        }),
        createdBy: 'user:default/ci',
        idempotencyKey: 'k1',
      }),
    ).rejects.toThrow(/No READY_FOR_VALIDATION\/ACTIVE validation context/);

    // Manual evidence: run exists but the product assignment was removed.
    const context = await makeContext(service);
    const { context: assigned } = await service.assignProduct(
      context.id,
      PRODUCT_V1,
      'user:default/author',
    );
    expect(assigned.status).toBe('READY_FOR_VALIDATION');
    const run = await service.createRun({
      type: 'OQ',
      createdBy: { userEntityRef: 'user:default/author' },
      contextId: context.id,
    });
    const backToWaiting = await service.removeProduct(
      context.id,
      'user:default/author',
    );
    expect(backToWaiting.status).toBe('WAITING_FOR_SOLUTION');
    await expect(
      service.recordManualResult({
        runId: run.id,
        testId: 'OQ-AUTH-001',
        status: 'PASS',
        actualResult: 'ok',
        executor: { userEntityRef: 'user:default/author' },
      }),
    ).rejects.toThrow(/WAITING_FOR_SOLUTION/);
    await expect(
      service.executeAutomated(run.id, {
        userEntityRef: 'user:default/author',
      }),
    ).rejects.toThrow(/WAITING_FOR_SOLUTION/);
  });

  it('4: ProductVersion not belonging to the Product is rejected at the HTTP boundary', async () => {
    const discovery = {
      getBaseUrl: jest.fn().mockResolvedValue('http://composer.test'),
    };
    const auth = {
      getPluginRequestToken: jest.fn().mockResolvedValue({ token: 'token-1' }),
    };
    const fetchImpl = jest.fn(async (url: string) => {
      const u = String(url);
      if (u.endsWith('/products/product-1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'product-1', name: 'Platform Core' }),
        };
      }
      if (u.endsWith('/products/product-1/versions')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { id: 'version-1', productId: 'product-1', version: '1.0', status: 'RELEASED' },
          ],
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    const resolver = createHttpProductComposerResolver({
      discovery,
      auth,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    await expect(
      resolver.resolveProductRef(
        {
          productId: 'product-1',
          productVersionId: 'version-foreign',
          productBaselineId: 'baseline-1',
        },
        'baseline-urs-1',
        { principal: { userEntityRef: 'user:default/author' } },
      ),
    ).rejects.toThrow(ConflictError);
    await expect(
      resolver.resolveProductRef(
        {
          productId: 'product-1',
          productVersionId: 'version-foreign',
          productBaselineId: 'baseline-1',
        },
        'baseline-urs-1',
        { principal: { userEntityRef: 'user:default/author' } },
      ),
    ).rejects.toThrow(/does not belong to Product/);
  });

  it('4b: the HTTP boundary resolves a valid assignment and rejects non-APPROVED baselines', async () => {
    const discovery = {
      getBaseUrl: jest.fn().mockResolvedValue('http://composer.test'),
    };
    const auth = {
      getPluginRequestToken: jest.fn().mockResolvedValue({ token: 'token-1' }),
    };
    const fetchImpl = jest.fn(async (url: string) => {
      const u = String(url);
      if (u.endsWith('/products/product-1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ id: 'product-1', name: 'Platform Core' }),
        };
      }
      if (u.endsWith('/products/product-1/versions')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { id: 'version-1', productId: 'product-1', version: '1.0', status: 'RELEASED' },
          ],
        };
      }
      if (u.endsWith('/baselines/baseline-1')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            id: 'baseline-1',
            productVersionId: 'version-1',
            baselineVersion: '1.0',
            status: 'APPROVED',
            ursBaselineId: 'baseline-urs-1',
          }),
        };
      }
      return { ok: false, status: 404, json: async () => ({}) };
    });
    const resolver = createHttpProductComposerResolver({
      discovery,
      auth,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });

    const ref = await resolver.resolveProductRef(
      PRODUCT_V1,
      'baseline-urs-1',
      { principal: { userEntityRef: 'user:default/author' } },
    );
    expect(ref.productName).toBe('Platform Core');
    expect(ref.productVersion).toBe('1.0');
    expect(ref.productBaselineVersion).toBe('1.0');

    // Non-APPROVED baseline → rejected.
    fetchImpl.mockImplementation(async (url: string) => {
      const u = String(url);
      if (u.endsWith('/products/product-1')) {
        return { ok: true, status: 200, json: async () => ({ name: 'Platform Core' }) };
      }
      if (u.endsWith('/products/product-1/versions')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { id: 'version-1', productId: 'product-1', version: '1.0' },
          ],
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          id: 'baseline-1',
          productVersionId: 'version-1',
          baselineVersion: '1.0',
          status: 'DRAFT',
        }),
      };
    });
    await expect(
      resolver.resolveProductRef(
        PRODUCT_V1,
        'baseline-urs-1',
        { principal: { userEntityRef: 'user:default/author' } },
      ),
    ).rejects.toThrow(/may only be assigned an APPROVED product baseline/);
  });

  it('5: approval without complete URS → Product → Test → Evidence traceability is rejected', async () => {
    const { service } = makeService();
    const context = await makeContext(service);

    // Not ACTIVE → submit-review rejected.
    await expect(
      service.submitReview(context.id, 'user:default/reviewer'),
    ).rejects.toThrow(/only ACTIVE contexts/);

    const { context: assigned } = await service.assignProduct(
      context.id,
      PRODUCT_V1,
      'user:default/author',
    );
    expect(assigned.status).toBe('READY_FOR_VALIDATION');
    const run = await service.createRun({
      type: 'IQ',
      createdBy: { userEntityRef: 'user:default/author' },
      contextId: context.id,
    });
    // ACTIVE now, but no test execution evidence → traceability incomplete.
    expect((await service.getContext(context.id))!.status).toBe('ACTIVE');
    await expect(
      service.submitReview(context.id, 'user:default/reviewer'),
    ).rejects.toThrow(/Traceability incomplete/);

    // No COMPLETED run → rejected even if coverage happened to line up.
    await expect(
      service.approveContext(context.id, 'user:default/reviewer'),
    ).rejects.toThrow(/only UNDER_REVIEW contexts/);
    expect(run.status).not.toBe('COMPLETED');
  });

  it('6: switching product version after ACTIVE supersedes the context and creates a requalification context', async () => {
    const { service, repository } = makeService();
    const context = await makeContext(service);
    const { context: assigned } = await service.assignProduct(
      context.id,
      PRODUCT_V1,
      'user:default/author',
    );
    expect(assigned.status).toBe('READY_FOR_VALIDATION');

    const run = await service.createRun({
      type: 'IQ',
      createdBy: { userEntityRef: 'user:default/author' },
      contextId: context.id,
    });
    expect((await service.getContext(context.id))!.status).toBe('ACTIVE');

    const result = await service.assignProduct(
      context.id,
      PRODUCT_V2,
      'user:default/author',
    );
    expect(result.created).toBe(true);
    expect(result.context.id).not.toBe(context.id);
    expect(result.context.status).toBe('READY_FOR_VALIDATION');
    expect(result.context.productRef?.productVersionId).toBe('version-2');

    const superseded = await service.getContext(context.id);
    expect(superseded!.status).toBe('SUPERSEDED');
    // Existing evidence/run stays on the old version — never re-linked.
    expect(run.productVersionId).toBe('version-1');
    expect(await repository.listContexts()).toHaveLength(2);

    const audit = await service.listContextAudit(context.id);
    expect(audit.some(event => event.eventType === 'CONTEXT_SUPERSEDED')).toBe(true);
    const newAudit = await service.listContextAudit(result.context.id);
    expect(
      newAudit.some(event => event.eventType === 'CONTEXT_CREATED_FOR_REQUALIFICATION'),
    ).toBe(true);

    // The superseded context is immutable.
    await expect(
      service.assignProduct(context.id, PRODUCT_V2, 'user:default/author'),
    ).rejects.toThrow(/SUPERSEDED and immutable/);
  });

  it('6b: removing the product assignment blocks further runs until reassignment', async () => {
    const { service } = makeService();
    const context = await makeContext(service);
    const { context: assigned } = await service.assignProduct(
      context.id,
      PRODUCT_V1,
      'user:default/author',
    );
    expect(assigned.status).toBe('READY_FOR_VALIDATION');
    const backToWaiting = await service.removeProduct(
      context.id,
      'user:default/author',
    );
    expect(backToWaiting.status).toBe('WAITING_FOR_SOLUTION');
    expect(backToWaiting.productRef).toBeUndefined();
    await expect(
      service.createRun({
        type: 'IQ',
        createdBy: { userEntityRef: 'user:default/author' },
        contextId: context.id,
      }),
    ).rejects.toThrow(/WAITING_FOR_SOLUTION/);
    const audit = await service.listContextAudit(context.id);
    expect(audit.some(event => event.eventType === 'PRODUCT_REMOVED')).toBe(true);
  });
});
