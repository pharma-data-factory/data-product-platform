import type {
  ApprovedURSReference,
  AssignProductRequest,
  CreateValidationContextRequest,
  ValidationContext,
  ValidationContextAuditEvent,
  ValidationContextProductRef,
  ValidationContextRequirement,
  ValidationContextStatus,
} from '@internal/platform-common';
import { createHash, randomUUID } from 'crypto';
import { ConflictError, NotFoundError } from '@backstage/errors';
import type { ValidationRunRepository } from './repository';
import type { ProductComposerResolver } from './product-resolver';
import {
  buildOverview,
  listArtifactEvidence,
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
 * Validation context state machine. Executable states (tests + evidence) are
 * READY_FOR_VALIDATION and ACTIVE; everything below or beyond requires an
 * explicit transition first.
 */
export const CONTEXT_TRANSITIONS: Record<ValidationContextStatus, ValidationContextStatus[]> = {
  DRAFT: ['WAITING_FOR_SOLUTION', 'READY_FOR_VALIDATION'],
  WAITING_FOR_SOLUTION: ['READY_FOR_VALIDATION'],
  READY_FOR_VALIDATION: ['WAITING_FOR_SOLUTION', 'ACTIVE', 'SUPERSEDED'],
  ACTIVE: [
    'READY_FOR_VALIDATION',
    'WAITING_FOR_SOLUTION',
    'UNDER_REVIEW',
    'SUPERSEDED',
  ],
  UNDER_REVIEW: ['APPROVED', 'REJECTED', 'SUPERSEDED'],
  APPROVED: ['SUPERSEDED'],
  REJECTED: ['READY_FOR_VALIDATION', 'SUPERSEDED'],
  SUPERSEDED: [],
};

export const EXECUTABLE_CONTEXT_STATUSES: ValidationContextStatus[] = [
  'READY_FOR_VALIDATION',
  'ACTIVE',
];

export function assertContextExecutable(context: ValidationContext): void {
  if (!EXECUTABLE_CONTEXT_STATUSES.includes(context.status)) {
    throw new ConflictError(
      `Validation context ${context.id} is ${context.status}; tests and evidence require READY_FOR_VALIDATION or ACTIVE`,
    );
  }
  const ref = context.productRef;
  if (!ref?.productId || !ref.productVersionId || !ref.productBaselineId) {
    throw new ConflictError(
      `Validation context ${context.id} has no assigned product/version/baseline`,
    );
  }
}

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
      productResolver?: ProductComposerResolver;
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

  /**
   * Register technical CI Quality Gate evidence without a formal IQ/OQ run.
   * Idempotent on checksum derived from idempotencyKey.
   * Technical metadata only — not GxP / Part 11 validation.
   *
   * ENTRY GATE: the reference must carry productId / productVersionId /
   * productBaselineId and resolve to a READY_FOR_VALIDATION/ACTIVE validation
   * context for that product version + baseline. Evidence without an active
   * product-bound instance is rejected.
   */
  async registerTechnicalEvidence(input: {
    evidenceType: string;
    reference: string;
    createdBy: string;
    candidate?: string;
    idempotencyKey: string;
  }): Promise<{ item: ValidationEvidenceItem; created: boolean }> {
    const evidenceType = input.evidenceType.trim();
    const reference = input.reference.trim();
    const idempotencyKey = input.idempotencyKey.trim();
    if (!evidenceType || !reference || !idempotencyKey) {
      throw new Error(
        'evidenceType, reference, and idempotencyKey are required',
      );
    }
    if (evidenceType !== 'ci-quality-gate') {
      throw new Error(
        `Unsupported technical evidenceType '${evidenceType}' (allowed: ci-quality-gate)`,
      );
    }

    let parsed: { productId?: string; productVersionId?: string; productBaselineId?: string; ursBaselineId?: string };
    try {
      parsed = JSON.parse(reference) as typeof parsed;
    } catch {
      throw new Error('Technical evidence reference must be a JSON document');
    }
    const productId = String(parsed.productId ?? '').trim();
    const productVersionId = String(parsed.productVersionId ?? '').trim();
    const productBaselineId = String(parsed.productBaselineId ?? '').trim();
    if (!productId || !productVersionId || !productBaselineId) {
      throw new ConflictError(
        'Technical evidence must reference productId, productVersionId, and productBaselineId of an assigned product solution',
      );
    }

    const context = await this.options.repository.findContextByProductRef(
      productVersionId,
      productBaselineId,
    );
    if (!context) {
      throw new ConflictError(
        `No READY_FOR_VALIDATION/ACTIVE validation context is assigned to ProductVersion ${productVersionId} + ProductBaseline ${productBaselineId}`,
      );
    }
    assertContextExecutable(context);

    const checksum = createHash('sha256')
      .update(`technical:${idempotencyKey}`)
      .digest('hex')
      .slice(0, 32);

    const existing = (await this.options.repository.listEvidence()).find(
      item => item.checksum === checksum && item.evidenceType === evidenceType,
    );
    if (existing) {
      return { item: existing, created: false };
    }

    const item: ValidationEvidenceItem = {
      id: randomUUID(),
      evidenceType,
      reference,
      checksum,
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      candidate: input.candidate,
      productId,
      productVersionId,
      productBaselineId,
      ursBaselineId:
        String(parsed.ursBaselineId ?? '').trim() ||
        context.source.baselineId,
      source: 'runtime',
    };
    await this.options.repository.addEvidence(item);
    await this.auditContextEvent(
      context.id,
      'TECHNICAL_EVIDENCE_REGISTERED',
      input.createdBy,
      { evidenceId: item.id, idempotencyKey },
    );
    return { item, created: true };
  }

  listRuns() {
    return this.options.repository.listRuns();
  }

  getRun(runId: string) {
    return this.options.repository.getRun(runId);
  }

  /**
   * Create a test run. A run may only be created from a validation context
   * that is READY_FOR_VALIDATION or ACTIVE with a validated product
   * assignment; the product refs are snapshotted immutably onto the run.
   * `candidate` is a display label only and defaults to the assigned product
   * version.
   */
  async createRun(input: {
    candidate?: string;
    type: ProtocolType;
    createdBy: ExecutorIdentity;
    contextId?: string;
  }): Promise<ValidationRun> {
    if (!input.contextId) {
      throw new ConflictError(
        'A validation context with an assigned product/version is required to create a run',
      );
    }
    const context = await this.options.repository.getContext(input.contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${input.contextId} not found`);
    }
    assertContextExecutable(context);
    const productRef = context.productRef as ValidationContextProductRef;

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

    const candidate =
      String(input.candidate ?? '').trim() ||
      [productRef.productName, productRef.productVersion]
        .filter(Boolean)
        .join('@') ||
      productRef.productVersionId;

    const run = await this.options.repository.createRun({
      type: input.type,
      candidate,
      candidateCommit,
      baselineId: context.source.baselineId,
      contextId: context.id,
      productId: productRef.productId,
      productVersionId: productRef.productVersionId,
      productBaselineId: productRef.productBaselineId,
      createdBy: input.createdBy,
    });

    if (context.status === 'READY_FOR_VALIDATION') {
      await this.transitionContext(
        context.id,
        'ACTIVE',
        input.createdBy.userEntityRef,
        'CONTEXT_ACTIVATED',
        { runId: run.id },
      );
    } else {
      await this.auditContextEvent(
        context.id,
        'RUN_CREATED',
        input.createdBy.userEntityRef,
        { runId: run.id, type: run.type },
      );
    }
    return run;
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
   *
   * STATE GATE: a context created from URS alone starts as
   * WAITING_FOR_SOLUTION. No tests or evidence are possible until a product
   * solution is assigned via assignProduct.
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
      id: `VALIDATION-CTX-${randomUUID().slice(0, 8).toUpperCase()}`,
      source: reference,
      status: 'WAITING_FOR_SOLUTION',
      createdAt: new Date().toISOString(),
      createdBy: actor,
    };
    await this.options.repository.addContext(context);
    await this.auditContextEvent(context.id, 'CONTEXT_CREATED', actor);
    return { context, created: true };
  }

  /**
   * Assign a Product Composer solution (product + version + baseline) to a
   * validation context. The assignment is validated against the Product
   * Composer contract: Product exists, ProductVersion belongs to the Product,
   * ProductBaseline belongs to the ProductVersion and is APPROVED.
   *
   * Switching productVersion or productBaseline once the context is ACTIVE (or
   * beyond) SUPERSEDES the context and creates a fresh requalification
   * context. Existing evidence is never re-linked.
   */
  async assignProduct(
    contextId: string,
    request: AssignProductRequest,
    actor: string,
    credentials?: unknown,
  ): Promise<{ context: ValidationContext; created: boolean }> {
    if (!this.options.productResolver) {
      throw new Error(
        'productResolver is not configured; product assignment unavailable',
      );
    }
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    if (context.status === 'SUPERSEDED') {
      throw new ConflictError(
        `Validation context ${contextId} is SUPERSEDED and immutable`,
      );
    }

    const resolved = await this.options.productResolver.resolveProductRef(
      request,
      context.source.baselineId,
      credentials,
    );

    const sameRef =
      context.productRef?.productVersionId === request.productVersionId &&
      context.productRef?.productBaselineId === request.productBaselineId;
    if (sameRef) {
      return { context, created: false };
    }

    const needsSupersession =
      context.productRef &&
      ['ACTIVE', 'UNDER_REVIEW', 'APPROVED'].includes(context.status);
    if (needsSupersession) {
      await this.transitionContext(
        context.id,
        'SUPERSEDED',
        actor,
        'CONTEXT_SUPERSEDED',
        {
          reason: 'product version/baseline switched after activation',
          previous: {
            productVersionId: context.productRef?.productVersionId,
            productBaselineId: context.productRef?.productBaselineId,
          },
        },
      );

      const requalification: ValidationContext = {
        id: `VALIDATION-CTX-${randomUUID().slice(0, 8).toUpperCase()}`,
        source: context.source,
        status: 'READY_FOR_VALIDATION',
        productRef: {
          ...resolved,
          assignedAt: new Date().toISOString(),
          assignedBy: actor,
        },
        createdAt: new Date().toISOString(),
        createdBy: actor,
      };
      await this.options.repository.addContext(requalification);
      await this.auditContextEvent(
        requalification.id,
        'CONTEXT_CREATED_FOR_REQUALIFICATION',
        actor,
        { supersededContextId: context.id },
      );
      return { context: requalification, created: true };
    }

    const assigned: ValidationContext = {
      ...context,
      productRef: {
        ...resolved,
        assignedAt: new Date().toISOString(),
        assignedBy: actor,
      },
    };
    const updated = await this.transitionContext(
      assigned.id,
      'READY_FOR_VALIDATION',
      actor,
      'PRODUCT_ASSIGNED',
      {
        productId: request.productId,
        productVersionId: request.productVersionId,
        productBaselineId: request.productBaselineId,
      },
      assigned,
    );
    return { context: updated, created: false };
  }

  /**
   * Remove the product assignment. The context falls back to
   * WAITING_FOR_SOLUTION and tests/evidence are blocked again. Not allowed
   * once the context is under review or approved.
   */
  async removeProduct(contextId: string, actor: string): Promise<ValidationContext> {
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    if (!context.productRef) {
      throw new ConflictError(
        `Validation context ${contextId} has no product assignment`,
      );
    }
    if (['UNDER_REVIEW', 'APPROVED', 'SUPERSEDED'].includes(context.status)) {
      throw new ConflictError(
        `Validation context ${contextId} is ${context.status}; product assignment cannot be removed`,
      );
    }
    return this.transitionContext(
      context.id,
      'WAITING_FOR_SOLUTION',
      actor,
      'PRODUCT_REMOVED',
      {
        previous: {
          productVersionId: context.productRef.productVersionId,
          productBaselineId: context.productRef.productBaselineId,
        },
      },
      context,
    );
  }

  /**
   * Submit an ACTIVE context for review. Server-side traceability gate: every
   * pinned requirement must be covered by linked run executions/findings, at
   * least one run must be COMPLETED, and no FAIL/BLOCKED executions or open
   * findings may remain.
   */
  async submitReview(contextId: string, actor: string): Promise<ValidationContext> {
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    if (context.status !== 'ACTIVE') {
      throw new ConflictError(
        `Validation context ${contextId} is ${context.status}; only ACTIVE contexts can be submitted for review`,
      );
    }
    if (!(context.source.requirementIds ?? []).length) {
      throw new ConflictError(
        `Validation context ${contextId} carries no requirement IDs; traceability cannot be verified`,
      );
    }

    const coverage = await this.getContextCoverage(contextId);
    if (coverage.uncovered.length > 0) {
      throw new ConflictError(
        `Traceability incomplete: ${coverage.uncovered.length} requirement(s) not covered by any test execution or finding (${coverage.uncovered.join(', ')})`,
      );
    }

    const runs = await this.listRunsForContext(contextId);
    const completed = runs.filter(run => run.status === 'COMPLETED');
    if (completed.length === 0) {
      throw new ConflictError(
        'At least one COMPLETED run is required before review',
      );
    }
    const unresolved = completed.some(run =>
      run.executions.some(
        execution =>
          execution.status === 'FAIL' || execution.status === 'BLOCKED',
      ),
    );
    if (unresolved) {
      throw new ConflictError(
        'FAIL/BLOCKED test executions must be resolved before review',
      );
    }
    const findings = await this.getFindings();
    const openFindings = findings.filter(
      finding =>
        finding.source === 'runtime' &&
        finding.status === 'OPEN' &&
        runs.some(run => run.id === finding.runId),
    );
    if (openFindings.length > 0) {
      throw new ConflictError(
        'Open findings must be CLOSED or REMEDIATED before review',
      );
    }

    return this.transitionContext(
      context.id,
      'UNDER_REVIEW',
      actor,
      'REVIEW_SUBMITTED',
      { covered: coverage.covered.length, expected: coverage.expected.length },
      context,
    );
  }

  /** Human approval of an UNDER_REVIEW context. Never automatic. */
  async approveContext(contextId: string, actor: string): Promise<ValidationContext> {
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    if (context.status !== 'UNDER_REVIEW') {
      throw new ConflictError(
        `Validation context ${contextId} is ${context.status}; only UNDER_REVIEW contexts can be approved`,
      );
    }
    return this.transitionContext(
      context.id,
      'APPROVED',
      actor,
      'CONTEXT_APPROVED',
      undefined,
      context,
    );
  }

  /** Human rejection of an UNDER_REVIEW context (back to rework). */
  async rejectContext(contextId: string, actor: string): Promise<ValidationContext> {
    const context = await this.options.repository.getContext(contextId);
    if (!context) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    if (context.status !== 'UNDER_REVIEW') {
      throw new ConflictError(
        `Validation context ${contextId} is ${context.status}; only UNDER_REVIEW contexts can be rejected`,
      );
    }
    return this.transitionContext(
      context.id,
      'REJECTED',
      actor,
      'CONTEXT_REJECTED',
      undefined,
      context,
    );
  }

  listContextAudit(contextId: string): Promise<ValidationContextAuditEvent[]> {
    return this.options.repository.listContextAuditEvents(contextId);
  }

  async executeAutomated(runId: string, executor: ExecutorIdentity): Promise<ValidationRun> {
    const run = await this.requireMutableRun(runId);
    await this.requireRunContextExecutable(run);
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
    await this.requireRunContextExecutable(run);
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
    await this.auditRunContextEvent(run, 'TEST_STARTED', executor, { testId });
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
    await this.requireRunContextExecutable(run);
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
        run,
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
        run,
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
    run: ValidationRun;
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
      productId: input.run.productId,
      productVersionId: input.run.productVersionId,
      productBaselineId: input.run.productBaselineId,
      ursBaselineId: input.run.baselineId,
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

  /**
   * Server-side guard: a run may only execute while its context is
   * READY_FOR_VALIDATION or ACTIVE with all three product references present.
   * Legacy runs without a context anchor cannot execute.
   */
  private async requireRunContextExecutable(run: ValidationRun): Promise<void> {
    if (!run.contextId) {
      throw new ConflictError(
        `Run ${run.id} is not anchored to a validation context; execution requires an assigned product/version`,
      );
    }
    const context = await this.options.repository.getContext(run.contextId);
    if (!context) {
      throw new NotFoundError(
        `Validation context ${run.contextId} of run ${run.id} not found`,
      );
    }
    assertContextExecutable(context);
  }

  private async transitionContext(
    contextId: string,
    target: ValidationContextStatus,
    actor: string,
    eventType: string,
    details?: Record<string, unknown>,
    context?: ValidationContext,
  ): Promise<ValidationContext> {
    const current =
      context ?? (await this.options.repository.getContext(contextId));
    if (!current) {
      throw new NotFoundError(`Validation context ${contextId} not found`);
    }
    const allowed = CONTEXT_TRANSITIONS[current.status] ?? [];
    if (!allowed.includes(target)) {
      throw new ConflictError(
        `Invalid validation context transition ${current.status} → ${target}`,
      );
    }
    const updated: ValidationContext = { ...current, status: target };
    if (target === 'WAITING_FOR_SOLUTION') {
      updated.productRef = undefined;
    }
    await this.options.repository.updateContext(updated);
    await this.auditContextEvent(updated.id, eventType, actor, details);
    return updated;
  }

  private async auditContextEvent(
    contextId: string,
    eventType: string,
    actor: string,
    details?: Record<string, unknown>,
  ): Promise<void> {
    const event: ValidationContextAuditEvent = {
      id: randomUUID(),
      contextId,
      eventType,
      actor: actor || 'unknown',
      details,
      createdAt: new Date().toISOString(),
    };
    await this.options.repository.addContextAuditEvent(event);
  }

  private async auditRunContextEvent(
    run: ValidationRun,
    eventType: string,
    executor: ExecutorIdentity,
    details?: Record<string, unknown>,
  ): Promise<void> {
    if (!run.contextId) {
      return;
    }
    await this.auditContextEvent(
      run.contextId,
      eventType,
      executor.userEntityRef,
      { runId: run.id, ...(details ?? {}) },
    );
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
