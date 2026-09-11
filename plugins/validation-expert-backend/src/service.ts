import type {
  ApprovedURSReference,
  CreateValidationContextRequest,
  ValidationContext,
  ValidationContextRequirement,
} from '@internal/platform-common';
import { createHash, randomUUID } from 'crypto';
import { NotFoundError } from '@backstage/errors';
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
import {
  computeContextCoverage,
  type ContextCoverage,
} from './coverage';
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

export type {
  ApprovedURSReference,
  ValidationContext,
  ValidationContextRequirement,
} from '@internal/platform-common';
export type { ContextCoverage, ContextCoverageRow, CoverageRowStatus } from './coverage';

/**
 * Boundary that resolves an APPROVED URS baseline for integration. Implemented
 * in the plugin via an explicit HTTP call to the URS Composer backend
 * (`GET /api/urs-composer/baselines/:id`). The Validation Expert never reads
 * URS PostgreSQL tables directly. In tests this can be backed by a real
 * URSService/repository against PostgreSQL.
 */
export interface UrsBaselineResolver {
  /**
   * Resolve an APPROVED URS baseline via the URS Composer public API.
   * `credentials` must be the calling user's Backstage credentials so the
   * HTTP boundary can issue an on-behalf-of plugin token.
   */
  resolveApprovedBaseline(
    request: CreateValidationContextRequest,
    credentials: unknown,
  ): Promise<{
    reference: ApprovedURSReference;
  }>;

  /**
   * Read-through of pinned baseline requirement content (title/statement).
   * Does not mutate URS; returns display DTOs only.
   */
  resolveBaselineRequirements(
    baselineId: string,
    credentials: unknown,
  ): Promise<ValidationContextRequirement[]>;
}


export class ValidationExpertService {
  constructor(
    private readonly options: {
      validationRoot: string;
      repository: ValidationRunRepository;
      runners: ValidationRunnerRegistry;
      healthBaseUrl?: string;
      ursBaselineResolver?: UrsBaselineResolver;
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

  async getFindings(): Promise<ValidationFinding[]> {
    const artifact = parseFindings(this.options.validationRoot);
    const runtime = await this.options.repository.listFindings();
    return [...artifact, ...runtime];
  }

  async getEvidence(): Promise<ValidationEvidenceItem[]> {
    const artifact = listArtifactEvidence(this.options.validationRoot).map(item => ({
      id: item.id,
      testId: item.testId,
      evidenceType: item.evidenceType,
      reference: item.reference,
      createdAt: 'artifact',
      source: 'artifact' as const,
    }));
    return [...artifact, ...(await this.options.repository.listEvidence())];
  }

  listRuns() {
    return this.options.repository.listRuns();
  }

  getRun(runId: string) {
    return this.options.repository.getRun(runId);
  }

  async createRun(input: {
    candidate: string;
    type: ProtocolType;
    createdBy: ExecutorIdentity;
    contextId?: string;
  }): Promise<ValidationRun> {
    let candidateCommit: string | undefined;
    try {
      const manifest = loadRc2Manifest(this.options.validationRoot);
      const git = manifest.git as { tag?: string; commit?: string } | undefined;
      if (typeof git?.commit === 'string') {
        candidateCommit = git.commit;
      }
    } catch {
      // Manifest is optional metadata for context-anchored runs.
    }

    let baselineId: string;
    let contextId: string | undefined;

    if (input.contextId) {
      const context = await this.options.repository.getContext(input.contextId);
      if (!context) {
        throw new NotFoundError(
          `Validation context ${input.contextId} not found`,
        );
      }
      contextId = context.id;
      baselineId = context.source.baselineId;
    } else {
      const baseline = loadBaselineYaml(this.options.validationRoot);
      baselineId = String(baseline.baseline_id ?? 'PDF-PC-VAL-BL-1.0');
    }

    return this.options.repository.createRun({
      type: input.type,
      candidate: input.candidate,
      candidateCommit,
      baselineId,
      contextId,
      createdBy: input.createdBy,
    });
  }

  async listRunsForContext(contextId: string): Promise<ValidationRun[]> {
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    const runs = await this.options.repository.listRuns();
    return runs.filter(run => run.contextId === context.id);
  }

  /**
   * Traceability-lite: which context requirement IDs are touched by linked run
   * executions (via protocol test → requirementIds) and/or findings.
   */
  async getContextCoverage(contextId: string): Promise<ContextCoverage> {
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }

    const protocolRequirementIdsByTestId = new Map<string, string[]>();
    for (const type of ['IQ', 'OQ', 'UAT'] as ProtocolType[]) {
      for (const test of this.getProtocol(type)) {
        protocolRequirementIdsByTestId.set(test.id, test.requirementIds ?? []);
      }
    }

    const runs = await this.listRunsForContext(contextId);
    const findings = await this.getFindings();

    return computeContextCoverage({
      contextId: context.id,
      expectedRequirementIds: context.source.requirementIds ?? [],
      runs,
      protocolRequirementIdsByTestId,
      findings,
    });
  }

  // ============================================================================
  // URS → Validation integration contexts
  // ============================================================================

  listContexts(): Promise<ValidationContext[]> {
    return this.options.repository.listContexts();
  }

  getContext(contextId: string): Promise<ValidationContext | undefined> {
    return this.options.repository.getContext(contextId);
  }

  /**
   * Read-through of URS baseline requirement content for a validation context.
   * Uses the stored baseline identity; does not mutate URS and does not replace
   * the Markdown workbench path.
   */
  async getContextRequirements(
    contextId: string,
    credentials: unknown,
  ): Promise<{
    contextId: string;
    baselineId: string;
    baselineVersion: string;
    requirementSetId: string;
    items: ValidationContextRequirement[];
    source: string;
    note: string;
  }> {
    if (!this.options.ursBaselineResolver) {
      throw new Error(
        'ursBaselineResolver is not configured; integration endpoint unavailable',
      );
    }
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    const items = await this.options.ursBaselineResolver.resolveBaselineRequirements(
      context.source.baselineId,
      credentials,
    );
    return {
      contextId: context.id,
      baselineId: context.source.baselineId,
      baselineVersion: context.source.baselineVersion,
      requirementSetId: context.source.requirementSetId,
      items,
      source: context.source.sourceSystem || 'urs-composer',
      note: 'Read-through of pinned baseline requirement versions. Not a GxP validation claim.',
    };
  }

  /**
   * Create a validation context from an APPROVED URS baseline, or return the
   * existing context for the same (requirementSetId, baselineId) pair.
   *
   * ENTRY GATE (enforced here, not only in the UI): the baseline must resolve
   * as APPROVED. DRAFT / IN_REVIEW(SUBMITTED) / REJECTED are denied.
   */
  async createContextFromApprovedUrs(
    request: CreateValidationContextRequest,
    actor: string,
    credentials?: unknown,
  ): Promise<{ context: ValidationContext; created: boolean }> {
    if (!this.options.ursBaselineResolver) {
      throw new Error(
        'ursBaselineResolver is not configured; integration endpoint unavailable',
      );
    }
    const existing = await this.options.repository.findContextBySource(
      request.requirementSetId,
      request.baselineId,
    );
    if (existing) {
      return { context: existing, created: false };
    }

    const { reference } = await this.options.ursBaselineResolver.resolveApprovedBaseline(
      request,
      credentials,
    );
    // Entry gate enforced in the service (not only the resolver / UI): the
    // resolved reference MUST be an APPROVED URS baseline.
    if (String(reference.approvalStatus ?? '').toUpperCase() !== 'APPROVED') {
      throw new Error(
        `URS baseline ${request.baselineId} is ${reference.approvalStatus || 'UNKNOWN'}; a validation context may only be created from an APPROVED baseline`,
      );
    }
    const context: ValidationContext = {
      id: `VALIDATION-CTX-${Date.now().toString(36).toUpperCase()}`,
      source: reference,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      createdBy: actor,
    };
    await this.options.repository.addContext(context);
    return { context, created: true };
  }

  async executeAutomated(runId: string, executor: ExecutorIdentity): Promise<ValidationRun> {
    const run = await this.requireMutableRun(runId);
    run.status = 'RUNNING';
    run.startedAt = run.startedAt ?? new Date().toISOString();
    await this.options.repository.saveRun(run);

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
    const run = await this.requireMutableRun(runId);
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
    await this.options.repository.saveRun(run);
    return execution;
  }

  async recordManualResult(input: {
    runId: string;
    testId: string;
    status: 'PASS' | 'FAIL' | 'BLOCKED';
    actualResult: string;
    comment?: string;
    evidenceReference?: string;
    executor: ExecutorIdentity;
  }): Promise<ValidationTestExecution> {
    if (!input.executor?.userEntityRef) {
      throw new Error('Authenticated executor is required');
    }
    if (input.status === 'FAIL' && !input.comment?.trim()) {
      throw new Error('Comment is required when recording FAIL');
    }

    const run = await this.requireMutableRun(input.runId);
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
      const evidence = await this.addEvidence({
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
      const finding = await this.createFindingFromFailure({
        run,
        testId: input.testId,
        expectedResult: protocolTest.expectedResult,
        actualResult: input.actualResult,
        requirementIds: protocolTest.requirementIds,
      });
      execution.findingId = finding.id;
    }

    await this.options.repository.saveRun(run);
    await this.completeIfSettled(run.id);
    return execution;
  }

  private async executeWithRunner(
    runId: string,
    definition: ValidationTestDefinition,
    executor: ExecutorIdentity,
    expectedResult?: string,
  ): Promise<ValidationTestExecution> {
    const run = await this.requireMutableRun(runId);
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
    await this.options.repository.saveRun(run);

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
      const evidence = await this.addEvidence({
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
      const finding = await this.createFindingFromFailure({
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

    await this.options.repository.saveRun(run);
    return execution;
  }

  private async createFindingFromFailure(input: {
    run: ValidationRun;
    testId: string;
    expectedResult?: string;
    actualResult: string;
    requirementIds: string[];
    severity?: string;
    description?: string;
  }): Promise<ValidationFinding> {
    const findings = await this.options.repository.listFindings();
    const count = findings.filter(item => item.source === 'runtime').length;
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
    await this.options.repository.addFinding(finding);
    return finding;
  }

  private async addEvidence(input: {
    runId: string;
    testExecutionId: string;
    testId: string;
    evidenceType: string;
    reference: string;
    createdBy: string;
    candidate: string;
  }): Promise<ValidationEvidenceItem> {
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
    await this.options.repository.addEvidence(item);
    return item;
  }

  private async requireMutableRun(runId: string): Promise<ValidationRun> {
    const run = await this.options.repository.getRun(runId);
    if (!run) {
      throw new Error(`Unknown run ${runId}`);
    }
    if (run.status === 'COMPLETED') {
      throw new Error(`Run ${runId} is immutable`);
    }
    return run;
  }

  private async completeIfSettled(runId: string): Promise<ValidationRun> {
    const run = await this.options.repository.getRun(runId);
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
      await this.options.repository.saveRun(run);
    }
    return (await this.options.repository.getRun(runId))!;
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
