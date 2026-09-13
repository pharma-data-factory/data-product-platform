import fs from 'fs';
import path from 'path';
import type {
  ExecutorIdentity,
  FindingStatus,
  ProtocolType,
  ValidationContext,
  ValidationContextAuditEvent,
  ValidationEvidenceItem,
  ValidationFinding,
  ValidationRun,
  ValidationTestExecution,
} from './types';

/**
 * Persistence contract for Validation Expert runtime evidence.
 * All methods are async so PostgreSQL (Knex) and file/memory stores share one interface.
 */
export interface ValidationRunRepository {
  listRuns(): Promise<ValidationRun[]>;
  getRun(runId: string): Promise<ValidationRun | undefined>;
  createRun(input: {
    type: ProtocolType;
    candidate: string;
    candidateCommit?: string;
    baselineId: string;
    contextId?: string;
    productId?: string;
    productVersionId?: string;
    productBaselineId?: string;
    createdBy: ExecutorIdentity;
  }): Promise<ValidationRun>;
  saveRun(run: ValidationRun): Promise<void>;
  listFindings(): Promise<ValidationFinding[]>;
  addFinding(finding: ValidationFinding): Promise<void>;
  updateFindingStatus(id: string, status: FindingStatus): Promise<void>;
  listEvidence(): Promise<ValidationEvidenceItem[]>;
  addEvidence(item: ValidationEvidenceItem): Promise<void>;
  // URS → Validation integration contexts
  listContexts(): Promise<ValidationContext[]>;
  getContext(contextId: string): Promise<ValidationContext | undefined>;
  findContextBySource(
    requirementSetId: string,
    baselineId: string,
  ): Promise<ValidationContext | undefined>;
  findContextByProductRef(
    productVersionId: string,
    productBaselineId: string,
  ): Promise<ValidationContext | undefined>;
  addContext(context: ValidationContext): Promise<void>;
  updateContext(context: ValidationContext): Promise<void>;
  // Context audit events
  listContextAuditEvents(contextId: string): Promise<ValidationContextAuditEvent[]>;
  addContextAuditEvent(event: ValidationContextAuditEvent): Promise<void>;
}

interface StoreShape {
  runs: ValidationRun[];
  findings: ValidationFinding[];
  evidence: ValidationEvidenceItem[];
  contexts: ValidationContext[];
  contextAudit: ValidationContextAuditEvent[];
  counters: Record<string, number>;
}

function emptyStore(): StoreShape {
  return {
    runs: [],
    findings: [],
    evidence: [],
    contexts: [],
    contextAudit: [],
    counters: {},
  };
}

export class MemoryValidationRunRepository implements ValidationRunRepository {
  private store: StoreShape = emptyStore();

  async listRuns(): Promise<ValidationRun[]> {
    return this.store.runs.map(cloneRun);
  }

  async getRun(runId: string): Promise<ValidationRun | undefined> {
    const found = this.store.runs.find(run => run.id === runId);
    return found ? cloneRun(found) : undefined;
  }

  async createRun(input: {
    type: ProtocolType;
    candidate: string;
    candidateCommit?: string;
    baselineId: string;
    contextId?: string;
    productId?: string;
    productVersionId?: string;
    productBaselineId?: string;
    createdBy: ExecutorIdentity;
  }): Promise<ValidationRun> {
    const key = input.type;
    const next = (this.store.counters[key] ?? 0) + 1;
    this.store.counters[key] = next;
    const run: ValidationRun = {
      id: `${input.type}-RUN-${String(next).padStart(4, '0')}`,
      candidate: input.candidate,
      candidateCommit: input.candidateCommit,
      baselineId: input.baselineId,
      contextId: input.contextId,
      productId: input.productId,
      productVersionId: input.productVersionId,
      productBaselineId: input.productBaselineId,
      type: input.type,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      executions: [],
    };
    this.store.runs.push(run);
    return cloneRun(run);
  }

  async saveRun(run: ValidationRun): Promise<void> {
    const index = this.store.runs.findIndex(item => item.id === run.id);
    if (index < 0) {
      throw new Error(`Unknown run ${run.id}`);
    }
    const existing = this.store.runs[index];
    if (existing.status === 'COMPLETED') {
      throw new Error(`Run ${run.id} is immutable after completion`);
    }
    this.store.runs[index] = cloneRun(run);
  }

  async listFindings(): Promise<ValidationFinding[]> {
    return this.store.findings.map(item => ({ ...item }));
  }

  async addFinding(finding: ValidationFinding): Promise<void> {
    this.store.findings.push({ ...finding });
  }

  async updateFindingStatus(id: string, status: FindingStatus): Promise<void> {
    const found = this.store.findings.find(item => item.id === id);
    if (!found) {
      throw new Error(`Unknown finding ${id}`);
    }
    found.status = status;
  }

  async listEvidence(): Promise<ValidationEvidenceItem[]> {
    return this.store.evidence.map(item => ({ ...item }));
  }

  async addEvidence(item: ValidationEvidenceItem): Promise<void> {
    this.store.evidence.push({ ...item });
  }

  async listContexts(): Promise<ValidationContext[]> {
    return this.store.contexts.map(cloneContext);
  }

  async getContext(contextId: string): Promise<ValidationContext | undefined> {
    const found = this.store.contexts.find(ctx => ctx.id === contextId);
    return found ? cloneContext(found) : undefined;
  }

  async findContextBySource(
    requirementSetId: string,
    baselineId: string,
  ): Promise<ValidationContext | undefined> {
    const found = this.store.contexts.find(
      ctx =>
        ctx.source.requirementSetId === requirementSetId &&
        ctx.source.baselineId === baselineId &&
        ctx.status !== 'SUPERSEDED',
    );
    return found ? cloneContext(found) : undefined;
  }

  async findContextByProductRef(
    productVersionId: string,
    productBaselineId: string,
  ): Promise<ValidationContext | undefined> {
    const found = this.store.contexts.find(
      ctx =>
        ctx.productRef?.productVersionId === productVersionId &&
        ctx.productRef?.productBaselineId === productBaselineId &&
        ctx.status !== 'SUPERSEDED',
    );
    return found ? cloneContext(found) : undefined;
  }

  async addContext(context: ValidationContext): Promise<void> {
    if (this.store.contexts.some(ctx => ctx.id === context.id)) {
      throw new Error(`Context ${context.id} already exists`);
    }
    this.store.contexts.push(cloneContext(context));
  }

  async updateContext(context: ValidationContext): Promise<void> {
    const index = this.store.contexts.findIndex(ctx => ctx.id === context.id);
    if (index < 0) {
      throw new Error(`Unknown context ${context.id}`);
    }
    this.store.contexts[index] = cloneContext(context);
  }

  async listContextAuditEvents(
    contextId: string,
  ): Promise<ValidationContextAuditEvent[]> {
    return this.store.contextAudit
      .filter(event => event.contextId === contextId)
      .map(event => ({ ...event, details: { ...event.details } }));
  }

  async addContextAuditEvent(event: ValidationContextAuditEvent): Promise<void> {
    this.store.contextAudit.push({
      ...event,
      details: event.details ? { ...event.details } : undefined,
    });
  }
}

export class FileValidationRunRepository implements ValidationRunRepository {
  private readonly memory = new MemoryValidationRunRepository();

  constructor(private readonly filePath: string) {
    this.load();
  }

  private load(): void {
    if (!fs.existsSync(this.filePath)) {
      return;
    }
    const raw = JSON.parse(fs.readFileSync(this.filePath, 'utf8')) as StoreShape;
    for (const run of raw.runs ?? []) {
      (this.memory as unknown as { store: StoreShape }).store.runs.push(run);
    }
    const store = (this.memory as unknown as { store: StoreShape }).store;
    store.findings = raw.findings ?? [];
    store.evidence = raw.evidence ?? [];
    store.contexts = raw.contexts ?? [];
    store.contextAudit = raw.contextAudit ?? [];
    store.counters = raw.counters ?? {};
  }

  private persist(): void {
    const store = (this.memory as unknown as { store: StoreShape }).store;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  }

  async listRuns(): Promise<ValidationRun[]> {
    return this.memory.listRuns();
  }

  async getRun(runId: string): Promise<ValidationRun | undefined> {
    return this.memory.getRun(runId);
  }

  async createRun(input: {
    type: ProtocolType;
    candidate: string;
    candidateCommit?: string;
    baselineId: string;
    contextId?: string;
    productId?: string;
    productVersionId?: string;
    productBaselineId?: string;
    createdBy: ExecutorIdentity;
  }): Promise<ValidationRun> {
    const run = await this.memory.createRun(input);
    this.persist();
    return run;
  }

  async saveRun(run: ValidationRun): Promise<void> {
    await this.memory.saveRun(run);
    this.persist();
  }

  async listFindings(): Promise<ValidationFinding[]> {
    return this.memory.listFindings();
  }

  async addFinding(finding: ValidationFinding): Promise<void> {
    await this.memory.addFinding(finding);
    this.persist();
  }

  async updateFindingStatus(id: string, status: FindingStatus): Promise<void> {
    await this.memory.updateFindingStatus(id, status);
    this.persist();
  }

  async listEvidence(): Promise<ValidationEvidenceItem[]> {
    return this.memory.listEvidence();
  }

  async addEvidence(item: ValidationEvidenceItem): Promise<void> {
    await this.memory.addEvidence(item);
    this.persist();
  }

  async listContexts(): Promise<ValidationContext[]> {
    return this.memory.listContexts();
  }

  async getContext(contextId: string): Promise<ValidationContext | undefined> {
    return this.memory.getContext(contextId);
  }

  async findContextBySource(
    requirementSetId: string,
    baselineId: string,
  ): Promise<ValidationContext | undefined> {
    return this.memory.findContextBySource(requirementSetId, baselineId);
  }

  async findContextByProductRef(
    productVersionId: string,
    productBaselineId: string,
  ): Promise<ValidationContext | undefined> {
    return this.memory.findContextByProductRef(productVersionId, productBaselineId);
  }

  async addContext(context: ValidationContext): Promise<void> {
    await this.memory.addContext(context);
    this.persist();
  }

  async updateContext(context: ValidationContext): Promise<void> {
    await this.memory.updateContext(context);
    this.persist();
  }

  async listContextAuditEvents(
    contextId: string,
  ): Promise<ValidationContextAuditEvent[]> {
    return this.memory.listContextAuditEvents(contextId);
  }

  async addContextAuditEvent(event: ValidationContextAuditEvent): Promise<void> {
    await this.memory.addContextAuditEvent(event);
    this.persist();
  }
}

function cloneRun(run: ValidationRun): ValidationRun {
  return {
    ...run,
    createdBy: { ...run.createdBy },
    executions: run.executions.map(cloneExecution),
  };
}

function cloneContext(context: ValidationContext): ValidationContext {
  return {
    ...context,
    source: {
      ...context.source,
      businessCapabilityIds: [...context.source.businessCapabilityIds],
      requirementIds: [...context.source.requirementIds],
    },
    productRef: context.productRef ? { ...context.productRef } : undefined,
  };
}

function cloneExecution(execution: ValidationTestExecution): ValidationTestExecution {
  return {
    ...execution,
    executor: execution.executor ? { ...execution.executor } : undefined,
    evidenceIds: [...execution.evidenceIds],
  };
}
