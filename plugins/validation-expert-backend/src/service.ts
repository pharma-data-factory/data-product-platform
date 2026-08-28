import { createHash, randomUUID } from 'crypto';
import type { ValidationRunRepository } from './repository';
import {
  buildOverview,
  listArtifactEvidence,
  loadBaselineYaml,
  loadRc2Manifest,
  parseFindings,
  parseIqProtocol,
  parseOqProtocol,
  parseRequirements,
  parseRisks,
  parseTraceability,
  parseUatProtocol,
} from './parsers';
import type { ValidationRunnerRegistry } from './runners';
import type {
  ExecutorIdentity,
  ProtocolTest,
  ProtocolType,
  ValidationEvidenceItem,
  ValidationFinding,
  ValidationRun,
  ValidationTestDefinition,
  ValidationTestExecution,
} from './types';

export class ValidationExpertService {
  constructor(
    private readonly options: {
      validationRoot: string;
      repository: ValidationRunRepository;
      runners: ValidationRunnerRegistry;
      healthBaseUrl?: string;
    },
  ) {}

  getOverview() {
    return buildOverview(this.options.validationRoot);
  }

  getRequirements() {
    return parseRequirements(this.options.validationRoot);
  }

  getRequirement(id: string) {
    return this.getRequirements().find(item => item.id === id);
  }

  getTraceability() {
    return parseTraceability(this.options.validationRoot);
  }

  getRisks() {
    return parseRisks(this.options.validationRoot);
  }

  getProtocol(type: ProtocolType): ProtocolTest[] {
    if (type === 'IQ') {
      return parseIqProtocol(this.options.validationRoot);
    }
    if (type === 'OQ') {
      return parseOqProtocol(this.options.validationRoot);
    }
    return parseUatProtocol(this.options.validationRoot);
  }

  getFindings(): ValidationFinding[] {
    const artifact = parseFindings(this.options.validationRoot);
    const runtime = this.options.repository.listFindings();
    return [...artifact, ...runtime];
  }

  getEvidence(): ValidationEvidenceItem[] {
    const artifact = listArtifactEvidence(this.options.validationRoot).map(item => ({
      id: item.id,
      testId: item.testId,
      evidenceType: item.evidenceType,
      reference: item.reference,
      createdAt: 'artifact',
      source: 'artifact' as const,
    }));
    return [...artifact, ...this.options.repository.listEvidence()];
  }

  listRuns() {
    return this.options.repository.listRuns();
  }

  getRun(runId: string) {
    return this.options.repository.getRun(runId);
  }

  createRun(input: {
    candidate: string;
    type: ProtocolType;
    createdBy: ExecutorIdentity;
  }): ValidationRun {
    const baseline = loadBaselineYaml(this.options.validationRoot);
    const manifest = loadRc2Manifest(this.options.validationRoot);
    const git = manifest.git as { tag?: string; commit?: string } | undefined;
    return this.options.repository.createRun({
      type: input.type,
      candidate: input.candidate,
      candidateCommit: typeof git?.commit === 'string' ? git.commit : undefined,
      baselineId: String(baseline.baseline_id ?? 'PDF-PC-VAL-BL-1.0'),
      createdBy: input.createdBy,
    });
  }

  async executeAutomated(runId: string, executor: ExecutorIdentity): Promise<ValidationRun> {
    const run = this.requireMutableRun(runId);
    run.status = 'RUNNING';
    run.startedAt = run.startedAt ?? new Date().toISOString();
    this.options.repository.saveRun(run);

    const protocol = this.getProtocol(run.type);
    const automated = protocol.filter(test =>
      ['AUTOMATED_API', 'AUTOMATED_PLATFORM', 'AUTOMATED_SECURITY'].includes(
        test.executionType,
      ),
    );

    for (const test of automated) {
      const definition = toDefinition(test);
      const runner = this.options.runners.find(definition);
      if (!runner) {
        continue;
      }
      await this.executeWithRunner(run.id, definition, executor, test.expectedResult);
    }

    return this.completeIfSettled(runId);
  }

  async startTest(
    runId: string,
    testId: string,
    executor: ExecutorIdentity,
  ): Promise<ValidationTestExecution> {
    const run = this.requireMutableRun(runId);
    const protocolTest = this.getProtocol(run.type).find(item => item.id === testId);
    if (!protocolTest) {
      throw new Error(`Unknown test ${testId} for ${run.type}`);
    }
    if (protocolTest.executionType === 'EXTERNAL') {
      throw new Error('EXTERNAL tests cannot be auto-started or mocked as PASS');
    }

    const definition = toDefinition(protocolTest);
    if (
      protocolTest.executionType === 'AUTOMATED_API' ||
      protocolTest.executionType === 'AUTOMATED_PLATFORM' ||
      protocolTest.executionType === 'AUTOMATED_SECURITY'
    ) {
      return this.executeWithRunner(runId, definition, executor, protocolTest.expectedResult);
    }

    const execution: ValidationTestExecution = {
      id: randomUUID(),
      runId,
      testId,
      type: protocolTest.executionType,
      status: 'RUNNING',
      expectedResult: protocolTest.expectedResult,
      executor,
      startedAt: new Date().toISOString(),
      evidenceIds: [],
    };
    run.executions.push(execution);
    run.status = 'RUNNING';
    run.startedAt = run.startedAt ?? execution.startedAt;
    this.options.repository.saveRun(run);
    return execution;
  }

  recordManualResult(input: {
    runId: string;
    testId: string;
    status: 'PASS' | 'FAIL' | 'BLOCKED';
    actualResult: string;
    comment?: string;
    evidenceReference?: string;
    executor: ExecutorIdentity;
  }): ValidationTestExecution {
    if (!input.executor?.userEntityRef) {
      throw new Error('Authenticated executor is required');
    }
    if (input.status === 'FAIL' && !input.comment?.trim()) {
      throw new Error('Comment is required when recording FAIL');
    }

    const run = this.requireMutableRun(input.runId);
    const protocolTest = this.getProtocol(run.type).find(item => item.id === input.testId);
    if (!protocolTest) {
      throw new Error(`Unknown test ${input.testId}`);
    }
    if (protocolTest.executionType === 'EXTERNAL') {
      throw new Error('EXTERNAL tests cannot be recorded as mocked PASS');
    }

    let execution = [...run.executions]
      .reverse()
      .find(item => item.testId === input.testId && item.status === 'RUNNING');
    if (!execution) {
      execution = {
        id: randomUUID(),
        runId: input.runId,
        testId: input.testId,
        type: protocolTest.executionType,
        status: 'RUNNING',
        expectedResult: protocolTest.expectedResult,
        executor: input.executor,
        startedAt: new Date().toISOString(),
        evidenceIds: [],
      };
      run.executions.push(execution);
    }

    execution.status = input.status;
    execution.actualResult = input.actualResult;
    execution.comment = input.comment;
    execution.executor = input.executor;
    execution.completedAt = new Date().toISOString();

    if (input.evidenceReference) {
      const evidence = this.addEvidence({
        runId: run.id,
        testExecutionId: execution.id,
        testId: input.testId,
        evidenceType: 'manual-reference',
        reference: input.evidenceReference,
        createdBy: input.executor.userEntityRef,
        candidate: run.candidate,
      });
      execution.evidenceIds.push(evidence.id);
    }

    if (input.status === 'FAIL') {
      const finding = this.createFindingFromFailure({
        run,
        testId: input.testId,
        expectedResult: protocolTest.expectedResult,
        actualResult: input.actualResult,
        requirementIds: protocolTest.requirementIds,
      });
      execution.findingId = finding.id;
    }

    this.options.repository.saveRun(run);
    this.completeIfSettled(run.id);
    return execution;
  }

  private async executeWithRunner(
    runId: string,
    definition: ValidationTestDefinition,
    executor: ExecutorIdentity,
    expectedResult?: string,
  ): Promise<ValidationTestExecution> {
    const run = this.requireMutableRun(runId);
    const runner = this.options.runners.find(definition);
    if (!runner) {
      throw new Error(`No automated runner for ${definition.id}`);
    }

    const execution: ValidationTestExecution = {
      id: randomUUID(),
      runId,
      testId: definition.id,
      type: definition.executionType,
      status: 'RUNNING',
      expectedResult: expectedResult ?? definition.expectedResult,
      executor,
      startedAt: new Date().toISOString(),
      evidenceIds: [],
    };
    run.executions.push(execution);
    run.status = 'RUNNING';
    run.startedAt = run.startedAt ?? execution.startedAt;
    this.options.repository.saveRun(run);

    const result = await runner.execute(definition, {
      run,
      validationRoot: this.options.validationRoot,
      healthBaseUrl: this.options.healthBaseUrl,
      executor,
    });

    execution.status = result.status;
    execution.actualResult = result.actualResult;
    execution.completedAt = new Date().toISOString();

    for (const reference of result.evidenceReferences ?? []) {
      const evidence = this.addEvidence({
        runId: run.id,
        testExecutionId: execution.id,
        testId: definition.id,
        evidenceType: 'automated',
        reference,
        createdBy: executor.userEntityRef,
        candidate: run.candidate,
      });
      execution.evidenceIds.push(evidence.id);
    }

    if (result.status === 'FAIL' && result.finding) {
      const finding = this.createFindingFromFailure({
        run,
        testId: definition.id,
        expectedResult: execution.expectedResult,
        actualResult: result.actualResult,
        requirementIds: result.finding.requirementIds,
        severity: result.finding.severity,
        description: result.finding.description,
      });
      execution.findingId = finding.id;
    }

    this.options.repository.saveRun(run);
    return execution;
  }

  private createFindingFromFailure(input: {
    run: ValidationRun;
    testId: string;
    expectedResult?: string;
    actualResult: string;
    requirementIds: string[];
    severity?: string;
    description?: string;
  }): ValidationFinding {
    const count = this.options.repository.listFindings().filter(item => item.source === 'runtime')
      .length;
    const finding: ValidationFinding = {
      id: `${input.run.type}-FIND-${String(count + 1).padStart(3, '0')}`,
      runId: input.run.id,
      testId: input.testId,
      severity: input.severity ?? 'Major',
      description:
        input.description ??
        `Formal test ${input.testId} failed in run ${input.run.id}`,
      status: 'OPEN',
      requirementIds: input.requirementIds,
      expectedResult: input.expectedResult,
      actualResult: input.actualResult,
      source: 'runtime',
    };
    this.options.repository.addFinding(finding);
    return finding;
  }

  private addEvidence(input: {
    runId: string;
    testExecutionId: string;
    testId: string;
    evidenceType: string;
    reference: string;
    createdBy: string;
    candidate: string;
  }): ValidationEvidenceItem {
    const checksum = createHash('sha256').update(input.reference).digest('hex').slice(0, 16);
    const item: ValidationEvidenceItem = {
      id: randomUUID(),
      runId: input.runId,
      testExecutionId: input.testExecutionId,
      testId: input.testId,
      evidenceType: input.evidenceType,
      reference: input.reference,
      checksum,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      candidate: input.candidate,
      source: 'runtime',
    };
    this.options.repository.addEvidence(item);
    return item;
  }

  private requireMutableRun(runId: string): ValidationRun {
    const run = this.options.repository.getRun(runId);
    if (!run) {
      throw new Error(`Unknown run ${runId}`);
    }
    if (run.status === 'COMPLETED') {
      throw new Error(`Run ${runId} is immutable`);
    }
    return run;
  }

  private completeIfSettled(runId: string): ValidationRun {
    const run = this.options.repository.getRun(runId);
    if (!run) {
      throw new Error(`Unknown run ${runId}`);
    }
    if (run.status === 'COMPLETED') {
      return run;
    }
    const hasRunning = run.executions.some(item => item.status === 'RUNNING');
    if (!hasRunning && run.executions.length > 0) {
      run.status = 'COMPLETED';
      run.completedAt = new Date().toISOString();
      this.options.repository.saveRun(run);
    }
    return this.options.repository.getRun(runId)!;
  }
}

function toDefinition(test: ProtocolTest): ValidationTestDefinition {
  return {
    id: test.id,
    title: test.title,
    protocol: test.protocol,
    executionType: test.executionType,
    expectedResult: test.expectedResult,
    requirementIds: test.requirementIds,
  };
}
