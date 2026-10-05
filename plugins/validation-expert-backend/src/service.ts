import { ConflictError, InputError, NotAllowedError } from '@backstage/errors';
import {
  baselineNeedsGmpRule,
  isGmpRelevant,
  validationDecisionProgress,
  VALIDATION_SIGNATURE_ROLES,
} from '@internal/platform-common';
import type {
  ApprovedURSReference,
  CreateValidationContextRequest,
  ValidationContext,
  ValidationContextRequirement,
  ValidationDecision,
  ValidationDecisionSignature,
  ValidationDecisionState,
  ValidationGmpProduct,
  ValidationSignatureRequest,
  ValidationSignatureRole,
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
  parsePqProtocol,
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


/** NXD-119. Composer's answer for a URS baseline; throws when unreachable. */
export type GmpClassifier = (ursBaselineId: string) => Promise<{
  products: ValidationGmpProduct[];
  versionCreators: string[];
  /** NXD-124. Product versions bound to the baseline. */
  versions?: Array<{
    id: string;
    productId: string;
    productName: string;
    version: string;
    status: string;
    /** NXD-127: kept from signing the validation of this version. */
    createdBy?: string;
  }>;
}>;

/** NXD-124. A product version's newest test execution per case, per requirement. */
export type ProductEvidenceReader = (productVersionId: string) => Promise<{
  productVersionId: string;
  productName: string;
  version: string;
  ursBaselineId?: string;
  requirements: Array<{
    requirementRef: string;
    executions: Array<{
      testSuite: string;
      testCase: string;
      status: string;
      executedAt: string;
      executionArtifactUrl?: string;
    }>;
  }>;
}>;

/** Where the product evidence of a context stands (NXD-124). */
export interface ProductEvidenceStatus {
  runId: string;
  candidate: string;
  status: string;
  total: number;
  passed: number;
  /** Every context requirement has passing evidence in this run. */
  complete: boolean;
  completedAt?: string;
}

/** The product evidence review's test for one requirement. */
export const evidenceTestId = (requirementId: string) => `EVIDENCE-${requirementId}`;

export class ValidationExpertService {
  constructor(
    private readonly options: {
      validationRoot: string;
      repository: ValidationRunRepository;
      runners: ValidationRunnerRegistry;
      healthBaseUrl?: string;
      ursBaselineResolver?: UrsBaselineResolver;
      /**
       * NXD-119. Which products depend on a URS baseline and who created the
       * versions bound to it, from the Product Composer. Absent or failing,
       * the decision follows the GMP rule.
       */
      gmpClassifier?: GmpClassifier;
      /** NXD-124. The product's recorded test evidence, from the Composer. */
      productEvidenceReader?: ProductEvidenceReader;
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
    if (type === 'EVIDENCE') {
      // Not from the validation package: built per context (NXD-124).
      return [];
    }
    if (type === 'IQ') {
      return parseIqProtocol(this.options.validationRoot);
    }
    if (type === 'OQ') {
      return parseOqProtocol(this.options.validationRoot);
    }
    if (type === 'PQ') {
      // Phase 5 (P5-S4): PQ is optional. Returns [] when no PQ protocol file exists.
      return parsePqProtocol(this.options.validationRoot);
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
    for (const type of ['IQ', 'OQ', 'UAT', 'PQ'] as ProtocolType[]) {
      for (const test of this.getProtocol(type)) {
        protocolRequirementIdsByTestId.set(test.id, test.requirementIds ?? []);
      }
    }

    // NXD-124. A product evidence review's tests verify the context's own
    // requirements, one each.
    for (const requirementId of context.source.requirementIds ?? []) {
      protocolRequirementIdsByTestId.set(evidenceTestId(requirementId), [requirementId]);
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

  // ── Product evidence review (NXD-124) ────────────────────────────────────

  /**
   * Review a product version's recorded test evidence against the context's
   * requirements, as a completed run of type EVIDENCE.
   *
   * The platform protocols (IQ/OQ/UAT from the validation package) validate
   * Nexora itself; their tests name platform requirements and can never
   * touch a product's. This run has one test per context requirement: PASS
   * when the version has test evidence for it and the newest execution of
   * every test case passed; FAIL when any failed, or when there is none —
   * no evidence is not a pass.
   */
  async runProductEvidenceReview(
    contextId: string,
    productVersionId: string,
    executor: ExecutorIdentity,
  ): Promise<ValidationRun> {
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    if (!this.options.productEvidenceReader) {
      throw new ConflictError('Product evidence is not configured on this instance.');
    }
    const evidence = await this.options.productEvidenceReader(productVersionId);
    if (evidence.ursBaselineId !== context.source.baselineId) {
      throw new InputError(
        `${evidence.productName} ${evidence.version} is not bound to this context's ` +
          `URS baseline ${context.source.baselineId}.`,
      );
    }

    const run = await this.options.repository.createRun({
      type: 'EVIDENCE',
      candidate: `${evidence.productName} ${evidence.version}`,
      baselineId: context.source.baselineId,
      contextId: context.id,
      productVersionId,
      createdBy: executor,
    });
    const now = new Date().toISOString();
    const byRef = new Map(evidence.requirements.map(r => [r.requirementRef, r]));
    run.executions = (context.source.requirementIds ?? []).map(requirementId => {
      const executions = byRef.get(requirementId)?.executions ?? [];
      const failed = executions.filter(e => e.status !== 'PASSED');
      const runs = [
        ...new Set(executions.map(e => e.executionArtifactUrl).filter(Boolean)),
      ];
      let status: 'PASS' | 'FAIL';
      let actualResult: string;
      if (executions.length === 0) {
        status = 'FAIL';
        actualResult = 'No test evidence is recorded for this requirement.';
      } else if (failed.length > 0) {
        status = 'FAIL';
        actualResult =
          `${failed.length} of ${executions.length} test cases failed: ` +
          `${failed.slice(0, 5).map(e => e.testCase).join(', ')}` +
          `${failed.length > 5 ? ', …' : ''}.`;
      } else {
        status = 'PASS';
        actualResult = `${executions.length} test case${
          executions.length === 1 ? '' : 's'
        } passed${runs.length ? ` (CI ${runs.join(', ')})` : ''}.`;
      }
      return {
        id: randomUUID(),
        runId: run.id,
        testId: evidenceTestId(requirementId),
        type: 'EXTERNAL' as const,
        status,
        expectedResult:
          `Every test case naming ${requirementId} passed in the product's CI.`,
        actualResult,
        executor,
        startedAt: now,
        completedAt: now,
        evidenceIds: [],
      };
    });
    run.status = 'COMPLETED';
    run.startedAt = now;
    run.completedAt = now;
    await this.options.repository.saveRun(run);
    return (await this.options.repository.getRun(run.id))!;
  }

  /** The newest product evidence review of a version on a context (NXD-127). */
  async getProductEvidenceStatus(
    contextId: string,
    productVersionId: string,
  ): Promise<ProductEvidenceStatus | undefined> {
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    const runs = (await this.listRunsForContext(contextId))
      .filter(run => run.type === 'EVIDENCE' && run.productVersionId === productVersionId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const latest = runs[runs.length - 1];
    if (!latest) {
      return undefined;
    }
    const required = context.source.requirementIds ?? [];
    const passedIds = new Set(
      latest.executions.filter(e => e.status === 'PASS').map(e => e.testId),
    );
    const passed = required.filter(id => passedIds.has(evidenceTestId(id))).length;
    return {
      runId: latest.id,
      candidate: latest.candidate,
      status: latest.status,
      total: required.length,
      passed,
      complete:
        latest.status === 'COMPLETED' && required.length > 0 && passed === required.length,
      completedAt: latest.completedAt,
    };
  }

  // ── Validation Decision (Phase 5, P5-S1; signatures since NXD-119) ────────

  /**
   * Where the decision on a context stands: the GMP classification of the
   * products that depend on its baseline, the signatures so far, and which
   * role may sign next.
   */
  async getDecisionState(
    contextId: string,
    requestedVersionId?: string,
  ): Promise<ValidationDecisionState> {
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    const classification = await this.classify(context.source.baselineId);
    const versions = classification.versions ?? [];
    // NXD-127. Every view is of one product version; the newest bound one
    // unless another is asked for.
    const version = requestedVersionId
      ? versions.find(v => v.id === requestedVersionId)
      : versions[versions.length - 1];
    if (requestedVersionId && !version) {
      throw new InputError(
        `Product version ${requestedVersionId} is not bound to this context's URS baseline.`,
      );
    }
    const decisions = await this.options.repository.listDecisions(contextId);
    const gmpRelevant = version
      ? this.versionIsGmp(version, classification)
      : classification.gmpRelevant;
    const signatures = version
      ? (await this.options.repository.listSignatures(contextId)).filter(
          sig => sig.productVersionId === version.id,
        )
      : [];
    const decision = version
      ? await this.getValidationDecision(contextId, version.id)
      : undefined;
    const evidence = version
      ? await this.getProductEvidenceStatus(contextId, version.id)
      : undefined;
    return {
      contextId,
      ...(version ? { productVersionId: version.id } : {}),
      gmpRelevant,
      products: classification.products,
      versions,
      ...(evidence ? { evidence } : {}),
      ...(classification.error
        ? { classificationError: classification.error }
        : {}),
      signatures,
      progress: version
        ? validationDecisionProgress(gmpRelevant, signatures)
        : { complete: false, nextRoles: [] },
      ...(decision ? { decision } : {}),
      otherDecisions: decisions.filter(d => d.productVersionId !== version?.id),
    };
  }

  /**
   * Record one electronic signature on the validation decision for one
   * product version (NXD-119, per version since NXD-127), and the decision
   * itself once the rule is satisfied.
   *
   * The rule (GAMP 5, EU GMP Annex 11/15): for a GMP-relevant product the
   * validation expert signs and then QA approves; otherwise one signature
   * from either suffices. A rejection by either ends the decision. GMP
   * relevance is the version's own product's.
   *
   * Checked in this order, all before anything is written:
   * 1. the context exists; the version is bound to its baseline and not
   *    decided yet;
   * 2. the signer holds the role they sign as;
   * 3. Segregation of Duties — not the context's creator, not this version's
   *    creator, not already a signer of this version's decision;
   * 4. the rule allows this role now (QA does not sign before the expert);
   * 5. a verdict and a justification; for an approval, a complete product
   *    evidence review of this version;
   * 6. the signer's PIN, last, so a refused signature costs no attempt.
   */
  async signValidationDecision(
    contextId: string,
    request: ValidationSignatureRequest,
    signer: {
      ref: string;
      roles: readonly ValidationSignatureRole[];
      verifyPin: (pin: string) => Promise<string>;
    },
  ): Promise<ValidationDecisionState> {
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    const productVersionId = String(request.productVersionId ?? '').trim();
    if (!productVersionId) {
      throw new InputError(
        'productVersionId is required: a validation decision is for one product version.',
      );
    }
    const classification = await this.classify(context.source.baselineId);
    const version = (classification.versions ?? []).find(v => v.id === productVersionId);
    if (!version) {
      throw new InputError(
        classification.error
          ? `Cannot confirm that version ${productVersionId} is bound to this baseline: ${classification.error}`
          : `Product version ${productVersionId} is not bound to this context's URS baseline.`,
      );
    }
    if (await this.getValidationDecision(contextId, productVersionId)) {
      throw new ConflictError(
        `${version.productName} ${version.version} is already decided. A decision is not re-opened.`,
      );
    }

    const role = String(request.role ?? '') as ValidationSignatureRole;
    if (!(VALIDATION_SIGNATURE_ROLES as readonly string[]).includes(role)) {
      throw new InputError(
        `Invalid role "${request.role}". Expected one of: ${VALIDATION_SIGNATURE_ROLES.join(', ')}`,
      );
    }
    if (!signer.roles.includes(role)) {
      throw new NotAllowedError(
        `Signing as ${role} requires membership in ${
          role === 'VALIDATION_EXPERT' ? 'validation-experts' : 'urs-quality-reviewers'
        }.`,
      );
    }

    const signatures = (await this.options.repository.listSignatures(contextId)).filter(
      sig => sig.productVersionId === productVersionId,
    );
    if (context.createdBy && signer.ref === context.createdBy) {
      throw new NotAllowedError(
        'Segregation of Duties: the creator of a validation context cannot sign its decision.',
      );
    }
    if (version.createdBy && signer.ref === version.createdBy) {
      throw new NotAllowedError(
        'Segregation of Duties: the creator of a product version cannot sign its validation.',
      );
    }
    if (signatures.some(sig => sig.signedBy === signer.ref)) {
      throw new NotAllowedError(
        'Segregation of Duties: one person signs a validation decision once. ' +
          'The second signature must come from someone else.',
      );
    }

    const gmpRelevant = this.versionIsGmp(version, classification);
    const progress = validationDecisionProgress(gmpRelevant, signatures);
    if (!progress.nextRoles.includes(role)) {
      const why = gmpRelevant
        ? ' — for a GMP-relevant product the validation expert signs first, then QA.'
        : '.';
      throw new ConflictError(
        `${role} cannot sign now. Next: ${progress.nextRoles.join(' or ') || 'nothing'}${why}`,
      );
    }

    const verdict = String(request.verdict ?? '').toUpperCase();
    if (verdict !== 'APPROVED' && verdict !== 'REJECTED') {
      throw new InputError('verdict must be APPROVED or REJECTED.');
    }
    const justification = String(request.justification ?? '').trim();
    if (!justification) {
      throw new InputError('A justification is required for every signature.');
    }
    if (!request.pin) {
      throw new InputError('The signing PIN is required.');
    }
    // NXD-124. No approval without product evidence of this version.
    if (verdict === 'APPROVED') {
      const evidence = await this.getProductEvidenceStatus(contextId, productVersionId);
      if (!evidence?.complete) {
        throw new ConflictError(
          evidence
            ? `Approval needs passing product evidence for every requirement; ` +
                `the newest review ${evidence.runId} (${evidence.candidate}) passes ` +
                `${evidence.passed} of ${evidence.total}.`
            : `Approval needs a product evidence review of ${version.productName} ` +
                `${version.version}; none has been run.`,
        );
      }
    }

    const reauthMethod = await signer.verifyPin(String(request.pin));

    const signature: ValidationDecisionSignature = {
      id: randomUUID(),
      contextId,
      productVersionId,
      role,
      verdict,
      justification,
      signedBy: signer.ref,
      signedAt: new Date().toISOString(),
      reauthMethod,
    };
    await this.options.repository.addSignature(signature);

    const all = [...signatures, signature];
    const outcome = validationDecisionProgress(gmpRelevant, all);
    if (outcome.complete && outcome.status) {
      await this.options.repository.addDecision({
        id: randomUUID(),
        contextId,
        productVersionId,
        status: outcome.status,
        justification,
        decidedBy: signer.ref,
        decidedAt: signature.signedAt,
        gmpRule:
          outcome.status === 'APPROVED' &&
          all.some(sig => sig.role === 'VALIDATION_EXPERT' && sig.verdict === 'APPROVED') &&
          all.some(sig => sig.role === 'QUALITY_ASSURANCE' && sig.verdict === 'APPROVED'),
      });
    }
    return this.getDecisionState(contextId, productVersionId);
  }

  /** The decision for one product version on a context (NXD-127). */
  async getValidationDecision(
    contextId: string,
    productVersionId: string,
  ): Promise<ValidationDecision | undefined> {
    const decision = (await this.options.repository.listDecisions(contextId)).find(
      d => d.productVersionId === productVersionId,
    );
    if (!decision) {
      return undefined;
    }
    return {
      ...decision,
      signatures: (await this.options.repository.listSignatures(contextId)).filter(
        sig => sig.productVersionId === productVersionId,
      ),
    };
  }

  /**
   * GMP relevance of one version: its product's own answer (INDIRECT, DIRECT
   * or none given counts). Unknown product, or no classification at all,
   * follows the GMP rule.
   */
  private versionIsGmp(
    version: { productId: string },
    classification: { products: ValidationGmpProduct[]; error?: string },
  ): boolean {
    if (classification.error) {
      return true;
    }
    const product = classification.products.find(p => p.id === version.productId);
    return product ? isGmpRelevant(product.gxpRelevance) : true;
  }

  private async classify(ursBaselineId: string): Promise<{
    gmpRelevant: boolean;
    products: ValidationGmpProduct[];
    versionCreators: string[];
    versions?: Awaited<ReturnType<GmpClassifier>>['versions'];
    error?: string;
  }> {
    if (!this.options.gmpClassifier) {
      return {
        gmpRelevant: true,
        products: [],
        versionCreators: [],
        error: 'No product classification is configured; the GMP rule applies.',
      };
    }
    try {
      const result = await this.options.gmpClassifier(ursBaselineId);
      return {
        gmpRelevant: baselineNeedsGmpRule(result.products),
        products: result.products,
        versionCreators: result.versionCreators,
        versions: result.versions ?? [],
      };
    } catch (error) {
      return {
        gmpRelevant: true,
        products: [],
        versionCreators: [],
        error: `The product classification could not be read (${
          error instanceof Error ? error.message : String(error)
        }); the GMP rule applies.`,
      };
    }
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
