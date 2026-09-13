import path from 'path';
import { MemoryValidationRunRepository } from './repository';
import { createDefaultRunnerRegistry } from './runners';
import { ValidationExpertService } from './service';
import { resolveValidationRoot } from './parsers';
import type { AssignProductRequest } from './types';

const root = resolveValidationRoot(
  path.resolve(__dirname, '../../../validation'),
);

const PRODUCT_REF = {
  ursBaselineId: 'urs-1',
  productId: 'product-1',
  productVersionId: 'version-1',
  productBaselineId: 'baseline-1',
  manifestHash: 'a'.repeat(64),
};

function makeReference(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    kind: 'ci-quality-gate',
    manifestContentHash: PRODUCT_REF.manifestHash,
    disclaimer: 'technical-control-not-gxp',
    ...PRODUCT_REF,
    ...overrides,
  });
}

function makeService() {
  const repository = new MemoryValidationRunRepository();
  const service = new ValidationExpertService({
    validationRoot: root,
    repository,
    runners: createDefaultRunnerRegistry(),
    ursBaselineResolver: {
      async resolveApprovedBaseline(request: { baselineId: string }) {
        return {
          reference: {
            requirementSetId: 'URS-DP-PROOF',
            baselineId: request.baselineId,
            baselineVersion: '1.0',
            requirementSetTitle: 'Proof Requirement Set',
            businessCapabilityIds: [],
            approvalStatus: 'APPROVED',
            approvedBy: 'user:default/approver',
            sourceSystem: 'urs-composer',
            requirementIds: ['URS-DP-PROOF-001'],
            createdAt: new Date().toISOString(),
          },
        };
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
          productVersion: '1.0',
          productBaselineVersion: '1.0',
          assignedAt: new Date().toISOString(),
        };
      },
    },
  } as any);
  return { service, repository };
}

async function makeReadyContext(service: ValidationExpertService) {
  const { context } = await service.createContextFromApprovedUrs(
    { requirementSetId: 'URS-DP-PROOF', baselineId: 'urs-1' },
    'user:default/alice',
  );
  const { context: assigned } = await service.assignProduct(
    context.id,
    PRODUCT_REF,
    'user:default/alice',
  );
  return assigned;
}

describe('registerTechnicalEvidence', () => {
  it('rejects technical evidence without a product-bound validation context', async () => {
    const { service } = makeService();
    await expect(
      service.registerTechnicalEvidence({
        evidenceType: 'ci-quality-gate',
        reference: makeReference(),
        createdBy: 'user:default/alice',
        candidate: 'demo-product',
        idempotencyKey: 'v1:abc:sha1',
      }),
    ).rejects.toThrow(/No READY_FOR_VALIDATION\/ACTIVE validation context/);
  });

  it('rejects technical evidence whose reference carries no product refs', async () => {
    const { service } = makeService();
    await makeReadyContext(service);
    await expect(
      service.registerTechnicalEvidence({
        evidenceType: 'ci-quality-gate',
        reference: JSON.stringify({ kind: 'ci-quality-gate' }),
        createdBy: 'user:default/alice',
        idempotencyKey: 'v1:abc:sha1',
      }),
    ).rejects.toThrow(/must reference productId, productVersionId, and productBaselineId/);
  });

  it('rejects technical evidence for a product version/baseline without a live context', async () => {
    const { service } = makeService();
    await makeReadyContext(service);
    await expect(
      service.registerTechnicalEvidence({
        evidenceType: 'ci-quality-gate',
        reference: makeReference({ productVersionId: 'version-other' }),
        createdBy: 'user:default/alice',
        idempotencyKey: 'v1:abc:sha1',
      }),
    ).rejects.toThrow(/No READY_FOR_VALIDATION\/ACTIVE validation context/);
  });

  it('creates technical CI evidence for an assigned product solution (idempotent)', async () => {
    const { service, repository } = makeService();
    const context = await makeReadyContext(service);

    const first = await service.registerTechnicalEvidence({
      evidenceType: 'ci-quality-gate',
      reference: makeReference(),
      createdBy: 'user:default/alice',
      candidate: 'demo-product',
      idempotencyKey: 'v1:abc:sha1',
    });

    expect(first.created).toBe(true);
    expect(first.item.runId).toBeUndefined();
    expect(first.item.testId).toBeUndefined();
    expect(first.item.evidenceType).toBe('ci-quality-gate');
    expect(first.item.source).toBe('runtime');
    expect(first.item.productId).toBe('product-1');
    expect(first.item.productVersionId).toBe('version-1');
    expect(first.item.productBaselineId).toBe('baseline-1');
    expect(first.item.ursBaselineId).toBe('urs-1');

    const second = await service.registerTechnicalEvidence({
      evidenceType: 'ci-quality-gate',
      reference: makeReference(),
      createdBy: 'user:default/alice',
      idempotencyKey: 'v1:abc:sha1',
    });
    expect(second.created).toBe(false);
    expect(second.item.id).toBe(first.item.id);

    const listed = await service.getEvidence();
    expect(
      listed.some(
        item =>
          item.id === first.item.id && item.evidenceType === 'ci-quality-gate',
      ),
    ).toBe(true);

    const audit = await service.listContextAudit(context.id);
    expect(audit.some(event => event.eventType === 'TECHNICAL_EVIDENCE_REGISTERED')).toBe(true);
    expect(await repository.listEvidence()).toHaveLength(1);
  });

  it('rejects unsupported evidence types', async () => {
    const { service } = makeService();
    await expect(
      service.registerTechnicalEvidence({
        evidenceType: 'formal-oq',
        reference: '{}',
        createdBy: 'user:default/alice',
        idempotencyKey: 'x',
      }),
    ).rejects.toThrow(/Unsupported technical evidenceType/);
  });
});
