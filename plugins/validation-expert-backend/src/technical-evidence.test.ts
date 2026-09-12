import path from 'path';
import { MemoryValidationRunRepository } from './repository';
import { createDefaultRunnerRegistry } from './runners';
import { ValidationExpertService } from './service';
import { resolveValidationRoot } from './parsers';

const root = resolveValidationRoot(
  path.resolve(__dirname, '../../../validation'),
);

describe('registerTechnicalEvidence', () => {
  it('creates technical CI evidence without a validation run', async () => {
    const repository = new MemoryValidationRunRepository();
    const service = new ValidationExpertService({
      validationRoot: root,
      repository,
      runners: createDefaultRunnerRegistry(),
    });

    const first = await service.registerTechnicalEvidence({
      evidenceType: 'ci-quality-gate',
      reference: JSON.stringify({
        kind: 'ci-quality-gate',
        ursBaselineId: 'urs-1',
        manifestContentHash: 'abc',
        disclaimer: 'technical-control-not-gxp',
      }),
      createdBy: 'user:default/alice',
      candidate: 'demo-product',
      idempotencyKey: 'v1:abc:sha1',
    });

    expect(first.created).toBe(true);
    expect(first.item.runId).toBeUndefined();
    expect(first.item.testId).toBeUndefined();
    expect(first.item.evidenceType).toBe('ci-quality-gate');
    expect(first.item.source).toBe('runtime');

    const second = await service.registerTechnicalEvidence({
      evidenceType: 'ci-quality-gate',
      reference: JSON.stringify({ kind: 'ci-quality-gate' }),
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
  });

  it('rejects unsupported evidence types', async () => {
    const repository = new MemoryValidationRunRepository();
    const service = new ValidationExpertService({
      validationRoot: root,
      repository,
      runners: createDefaultRunnerRegistry(),
    });
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
