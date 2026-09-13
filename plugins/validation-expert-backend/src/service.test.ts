import path from 'path';
import {
  buildOverview,
  parseOqProtocol,
  parseRequirements,
  parseTraceability,
  resolveValidationRoot,
} from './parsers';
import { MemoryValidationRunRepository } from './repository';
import {
  CI_UNKNOWN_REPRESENTATION,
  createDefaultRunnerRegistry,
  mapUnknownCiRepresentation,
} from './runners';
import { ValidationExpertService } from './service';
import type { AssignProductRequest } from './types';

const root = resolveValidationRoot(
  path.resolve(__dirname, '../../../validation'),
);

const PRODUCT_REF = {
  ursBaselineId: 'baseline-1',
  productId: 'product-1',
  productVersionId: 'version-1',
  productBaselineId: 'baseline-1',
  manifestHash: 'a'.repeat(64),
};

/** Service with an APPROVED URS resolver and a mock product resolver. */
function makeService(healthBaseUrl?: string) {
  const repository = new MemoryValidationRunRepository();
  const service = new ValidationExpertService({
    validationRoot: root,
    repository,
    runners: createDefaultRunnerRegistry(),
    healthBaseUrl,
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

/** Context anchored to an APPROVED baseline with a validated product assignment. */
async function makeReadyContext(service: ValidationExpertService) {
  const { context } = await service.createContextFromApprovedUrs(
    { requirementSetId: 'URS-DP-PROOF', baselineId: 'baseline-1' },
    'user:default/author',
  );
  const { context: assigned } = await service.assignProduct(
    context.id,
    PRODUCT_REF,
    'user:default/author',
  );
  return assigned;
}

describe('validation expert parsers', () => {
  it('resolves the validation package and parses requirements', () => {
    const requirements = parseRequirements(root);
    expect(requirements.length).toBeGreaterThanOrEqual(38);
    expect(requirements.some(item => item.id === 'URS-AUTH-001')).toBe(true);
    expect(requirements.find(item => item.id === 'URS-AUTH-005')?.rejected).toBe(
      true,
    );
  });

  it('parses traceability with gap flags', () => {
    const rows = parseTraceability(root);
    expect(rows.length).toBeGreaterThanOrEqual(30);
    expect(rows[0].ursId).toMatch(/^URS-/);
    expect(rows[0].formalTests.length).toBeGreaterThan(0);
  });

  it('builds overview with NOT_VALIDATED status', () => {
    const overview = buildOverview(root);
    expect(overview.validationStatus).toBe('NOT_VALIDATED');
    expect(overview.candidateTag).toBe('platform-core-v1.0-rc2');
    expect(overview.requirementsBaselined.active).toBe(38);
  });

  it('parses OQ protocol tests', () => {
    const tests = parseOqProtocol(root);
    expect(tests.length).toBe(38);
    expect(tests.find(test => test.id === 'OQ-CI-004')).toBeTruthy();
  });
});

describe('validation runners', () => {
  it('maps UNKNOWN to DEGRADED / UNVERIFIED', () => {
    expect(mapUnknownCiRepresentation('UNKNOWN')).toBe(CI_UNKNOWN_REPRESENTATION);
    expect(mapUnknownCiRepresentation('PASSED')).toBe('PASSED');
  });

  it('executes IQ-001 candidate identity against the validation package', async () => {
    const registry = createDefaultRunnerRegistry();
    const runner = registry.find({
      id: 'IQ-001',
      title: 'Candidate identity',
      protocol: 'IQ',
      executionType: 'AUTOMATED_PLATFORM',
      requirementIds: [],
    });
    expect(runner).toBeTruthy();
    const result = await runner!.execute(
      {
        id: 'IQ-001',
        title: 'Candidate identity',
        protocol: 'IQ',
        executionType: 'AUTOMATED_PLATFORM',
        requirementIds: [],
      },
      {
        run: {
          id: 'IQ-RUN-0001',
          candidate: 'platform-core-v1.0-rc2',
          baselineId: 'PDF-PC-VAL-BL-1.0',
          type: 'IQ',
          status: 'RUNNING',
          createdAt: new Date().toISOString(),
          createdBy: { userEntityRef: 'user:default/tester' },
          executions: [],
        },
        validationRoot: root,
        executor: { userEntityRef: 'user:default/tester' },
      },
    );
    expect(result.status).toBe('PASS');
  });

  it('executes OQ-CI-004 mapping check', async () => {
    const registry = createDefaultRunnerRegistry();
    const runner = registry.find({
      id: 'OQ-CI-004',
      title: 'UNKNOWN display',
      protocol: 'OQ',
      executionType: 'AUTOMATED_PLATFORM',
      requirementIds: ['URS-GH-003'],
    });
    const result = await runner!.execute(
      {
        id: 'OQ-CI-004',
        title: 'UNKNOWN display',
        protocol: 'OQ',
        executionType: 'AUTOMATED_PLATFORM',
        requirementIds: ['URS-GH-003'],
      },
      {
        run: {
          id: 'OQ-RUN-0001',
          candidate: 'platform-core-v1.0-rc2',
          baselineId: 'PDF-PC-VAL-BL-1.0',
          type: 'OQ',
          status: 'RUNNING',
          createdAt: new Date().toISOString(),
          createdBy: { userEntityRef: 'user:default/tester' },
          executions: [],
        },
        validationRoot: root,
        executor: { userEntityRef: 'user:default/tester' },
      },
    );
    expect(result.status).toBe('PASS');
    expect(result.actualResult).toContain(CI_UNKNOWN_REPRESENTATION);
  });
});

describe('validation run service', () => {
  it('creates runs, captures executor, runs MVP automated tests, and records findings on fail path', async () => {
    const { service } = makeService('http://127.0.0.1:9');
    const context = await makeReadyContext(service);

    const executor = {
      userEntityRef: 'user:default/markus',
      identityProvider: 'github',
      displayName: 'markus',
    };

    const run = await service.createRun({
      type: 'OQ',
      createdBy: executor,
      contextId: context.id,
    });
    expect(run.id).toBe('OQ-RUN-0001');
    expect(run.createdBy.userEntityRef).toBe('user:default/markus');
    expect(run.contextId).toBe(context.id);
    expect(run.baselineId).toBe('baseline-1');
    expect(run.productVersionId).toBe('version-1');
    expect(run.manifestHash).toBe(PRODUCT_REF.manifestHash);

    const completed = await service.executeAutomated(run.id, executor);
    expect(completed.executions.length).toBeGreaterThan(0);
    expect(
      completed.executions.some(item => item.testId === 'OQ-CI-004' && item.status === 'PASS'),
    ).toBe(true);

    const manualRun = await service.createRun({
      type: 'OQ',
      createdBy: executor,
      contextId: context.id,
    });
    expect(manualRun.id).toBe('OQ-RUN-0002');

    const failed = await service.recordManualResult({
      runId: manualRun.id,
      testId: 'OQ-AUTH-001',
      status: 'FAIL',
      actualResult: 'Session missing',
      comment: 'Could not complete interactive sign-in',
      evidenceReference: 'runtime/manual/oq-auth-001.txt',
      executor,
    });
    expect(failed.status).toBe('FAIL');
    expect(failed.findingId).toBeTruthy();
    expect(
      (await service.getFindings()).some(item => item.id === failed.findingId),
    ).toBe(true);
    const evidence = (await service.getEvidence()).find(
      item => item.runId === manualRun.id && item.testId === 'OQ-AUTH-001',
    );
    expect(evidence).toMatchObject({
      ursBaselineId: 'baseline-1',
      productVersionId: 'version-1',
      productBaselineId: 'baseline-1',
      manifestHash: PRODUCT_REF.manifestHash,
    });

    await expect(
      service.recordManualResult({
        runId: manualRun.id,
        testId: 'OQ-AUTH-001',
        status: 'FAIL',
        actualResult: 'x',
        executor,
      }),
    ).rejects.toThrow(/immutable|Comment is required/i);
  });

  it('refuses anonymous executor identity', async () => {
    const { service } = makeService();
    const context = await makeReadyContext(service);
    const run = await service.createRun({
      type: 'OQ',
      createdBy: { userEntityRef: 'user:default/markus' },
      contextId: context.id,
    });
    await expect(
      service.recordManualResult({
        runId: run.id,
        testId: 'OQ-AUTH-001',
        status: 'PASS',
        actualResult: 'ok',
        executor: { userEntityRef: '' },
      }),
    ).rejects.toThrow(/Authenticated executor/);
  });

  it('rejects creating a run without a validation context', async () => {
    const { service } = makeService();
    await expect(
      service.createRun({
        type: 'OQ',
        createdBy: { userEntityRef: 'user:default/markus' },
      }),
    ).rejects.toThrow(/requires a run context|validation context with an assigned/i);
  });
});
