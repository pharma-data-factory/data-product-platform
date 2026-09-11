import { computeContextCoverage } from './coverage';
import type { ValidationFinding, ValidationRun } from './types';

describe('computeContextCoverage', () => {
  const protocol = new Map<string, string[]>([
    ['IQ-T-001', ['URS-A', 'URS-B']],
    ['OQ-T-002', ['URS-B']],
    ['OQ-T-EXTRA', ['URS-X']],
  ]);

  function run(
    id: string,
    executions: ValidationRun['executions'],
  ): ValidationRun {
    return {
      id,
      candidate: 'c',
      baselineId: 'bl',
      contextId: 'ctx-1',
      type: 'IQ',
      status: 'RUNNING',
      createdAt: '2026-09-11T00:00:00.000Z',
      createdBy: { userEntityRef: 'user:default/a' },
      executions,
    };
  }

  it('marks expected IDs covered when a terminal execution maps via protocol', () => {
    const result = computeContextCoverage({
      contextId: 'ctx-1',
      expectedRequirementIds: ['URS-A', 'URS-B', 'URS-C'],
      runs: [
        run('IQ-RUN-1', [
          {
            id: 'e1',
            runId: 'IQ-RUN-1',
            testId: 'IQ-T-001',
            type: 'MANUAL',
            status: 'PASS',
            evidenceIds: [],
          },
        ]),
      ],
      protocolRequirementIdsByTestId: protocol,
      findings: [],
    });

    expect(result.covered).toEqual(['URS-A', 'URS-B']);
    expect(result.uncovered).toEqual(['URS-C']);
    expect(result.extra).toEqual([]);
    expect(
      result.byRequirement.find(row => row.requirementId === 'URS-A'),
    ).toMatchObject({
      status: 'covered',
      testIds: ['IQ-T-001'],
      runIds: ['IQ-RUN-1'],
    });
    expect(
      result.byRequirement.find(row => row.requirementId === 'URS-C')?.status,
    ).toBe('uncovered');
  });

  it('ignores non-terminal executions', () => {
    const result = computeContextCoverage({
      contextId: 'ctx-1',
      expectedRequirementIds: ['URS-A'],
      runs: [
        run('IQ-RUN-1', [
          {
            id: 'e1',
            runId: 'IQ-RUN-1',
            testId: 'IQ-T-001',
            type: 'MANUAL',
            status: 'RUNNING',
            evidenceIds: [],
          },
        ]),
      ],
      protocolRequirementIdsByTestId: protocol,
      findings: [],
    });
    expect(result.covered).toEqual([]);
    expect(result.uncovered).toEqual(['URS-A']);
  });

  it('unions findings on context runs and reports extra IDs', () => {
    const findings: ValidationFinding[] = [
      {
        id: 'F-1',
        runId: 'OQ-RUN-1',
        testId: 'OQ-T-EXTRA',
        severity: 'MAJOR',
        description: 'x',
        status: 'OPEN',
        requirementIds: ['URS-X'],
        source: 'runtime',
      },
    ];

    const result = computeContextCoverage({
      contextId: 'ctx-1',
      expectedRequirementIds: ['URS-B'],
      runs: [
        run('OQ-RUN-1', [
          {
            id: 'e2',
            runId: 'OQ-RUN-1',
            testId: 'OQ-T-002',
            type: 'MANUAL',
            status: 'FAIL',
            evidenceIds: [],
          },
        ]),
      ],
      protocolRequirementIdsByTestId: protocol,
      findings,
    });

    expect(result.covered).toEqual(['URS-B']);
    expect(result.extra).toEqual(['URS-X']);
    expect(
      result.byRequirement.find(row => row.requirementId === 'URS-X'),
    ).toMatchObject({
      status: 'extra',
      findingIds: ['F-1'],
      testIds: ['OQ-T-EXTRA'],
    });
    expect(result.note).toMatch(/Not a GxP/i);
  });
});
