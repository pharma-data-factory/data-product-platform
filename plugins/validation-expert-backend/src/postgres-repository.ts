/**
 * PostgreSQL ValidationRunRepository using Backstage DatabaseService + Knex.
 * Durable evidence store — still NOT VALIDATED / not a Part 11 claim.
 */

import { Knex } from 'knex';
import { up } from './db/migrations';
import type { ValidationRunRepository } from './repository';
import type {
  ExecutorIdentity,
  FindingStatus,
  ProtocolType,
  ValidationContext,
  ValidationEvidenceItem,
  ValidationFinding,
  ValidationRun,
  ValidationTestExecution,
} from './types';

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) {
    return fallback;
  }
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function mapRun(row: Record<string, unknown>): ValidationRun {
  return {
    id: String(row.id),
    candidate: String(row.candidate),
    candidateCommit: row.candidate_commit
      ? String(row.candidate_commit)
      : undefined,
    baselineId: String(row.baseline_id),
    contextId: row.context_id ? String(row.context_id) : undefined,
    type: String(row.type) as ProtocolType,
    status: String(row.status) as ValidationRun['status'],
    createdAt: String(row.created_at),
    createdBy: parseJson<ExecutorIdentity>(row.created_by, {
      userEntityRef: 'unknown',
    }),
    startedAt: row.started_at ? String(row.started_at) : undefined,
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    executions: parseJson<ValidationTestExecution[]>(row.executions, []),
  };
}

function mapFinding(row: Record<string, unknown>): ValidationFinding {
  return {
    id: String(row.id),
    runId: row.run_id ? String(row.run_id) : undefined,
    testId: String(row.test_id),
    severity: String(row.severity),
    description: String(row.description),
    status: String(row.status) as FindingStatus,
    requirementIds: parseJson<string[]>(row.requirement_ids, []),
    expectedResult: row.expected_result
      ? String(row.expected_result)
      : undefined,
    actualResult: row.actual_result ? String(row.actual_result) : undefined,
    source: String(row.source) as ValidationFinding['source'],
  };
}

function mapEvidence(row: Record<string, unknown>): ValidationEvidenceItem {
  return {
    id: String(row.id),
    runId: row.run_id ? String(row.run_id) : undefined,
    testId: row.test_id ? String(row.test_id) : undefined,
    testExecutionId: row.test_execution_id
      ? String(row.test_execution_id)
      : undefined,
    evidenceType: String(row.evidence_type),
    reference: String(row.reference),
    checksum: row.checksum ? String(row.checksum) : undefined,
    createdAt: String(row.created_at),
    createdBy: row.created_by ? String(row.created_by) : undefined,
    candidate: row.candidate ? String(row.candidate) : undefined,
    source: String(row.source) as ValidationEvidenceItem['source'],
  };
}

function mapContext(row: Record<string, unknown>): ValidationContext {
  const source = parseJson<ValidationContext['source']>(row.source, {
    requirementSetId: String(row.requirement_set_id),
    baselineId: String(row.baseline_id),
    baselineVersion: '',
    businessCapabilityIds: [],
    approvalStatus: 'APPROVED',
    sourceSystem: 'urs-composer',
    requirementIds: [],
    createdAt: String(row.created_at),
  });
  return {
    id: String(row.id),
    source: {
      ...source,
      businessCapabilityIds: [...(source.businessCapabilityIds ?? [])],
      requirementIds: [...(source.requirementIds ?? [])],
    },
    status: String(row.status) as ValidationContext['status'],
    createdAt: String(row.created_at),
    createdBy: String(row.created_by),
  };
}

export class PostgresValidationRunRepository implements ValidationRunRepository {
  private constructor(private readonly db: Knex) {}

  static async create(database: {
    getClient(): Promise<Knex> | Knex;
  }): Promise<PostgresValidationRunRepository> {
    const db = await database.getClient();
    await up(db);
    return new PostgresValidationRunRepository(db);
  }

  async listRuns(): Promise<ValidationRun[]> {
    const rows = await this.db('validation_runs').select().orderBy('created_at', 'asc');
    return rows.map((row: Record<string, unknown>) => mapRun(row));
  }

  async getRun(runId: string): Promise<ValidationRun | undefined> {
    const row = await this.db('validation_runs').where({ id: runId }).first();
    return row ? mapRun(row) : undefined;
  }

  async createRun(input: {
    type: ProtocolType;
    candidate: string;
    candidateCommit?: string;
    baselineId: string;
    contextId?: string;
    createdBy: ExecutorIdentity;
  }): Promise<ValidationRun> {
    return this.db.transaction(async trx => {
      const counter = await trx('validation_counters')
        .where({ counter_key: input.type })
        .forUpdate()
        .first();
      const next = Number(counter?.counter_value ?? 0) + 1;
      if (counter) {
        await trx('validation_counters')
          .where({ counter_key: input.type })
          .update({ counter_value: next });
      } else {
        await trx('validation_counters').insert({
          counter_key: input.type,
          counter_value: next,
        });
      }

      const run: ValidationRun = {
        id: `${input.type}-RUN-${String(next).padStart(4, '0')}`,
        candidate: input.candidate,
        candidateCommit: input.candidateCommit,
        baselineId: input.baselineId,
        contextId: input.contextId,
        type: input.type,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        createdBy: input.createdBy,
        executions: [],
      };

      await trx('validation_runs').insert({
        id: run.id,
        candidate: run.candidate,
        candidate_commit: run.candidateCommit ?? null,
        baseline_id: run.baselineId,
        context_id: run.contextId ?? null,
        type: run.type,
        status: run.status,
        created_at: run.createdAt,
        created_by: JSON.stringify(run.createdBy),
        started_at: null,
        completed_at: null,
        executions: JSON.stringify(run.executions),
      });

      return run;
    });
  }

  async saveRun(run: ValidationRun): Promise<void> {
    const existing = await this.getRun(run.id);
    if (!existing) {
      throw new Error(`Unknown run ${run.id}`);
    }
    if (existing.status === 'COMPLETED') {
      throw new Error(`Run ${run.id} is immutable after completion`);
    }
    const updated = await this.db('validation_runs')
      .where({ id: run.id })
      .andWhereNot({ status: 'COMPLETED' })
      .update({
        candidate: run.candidate,
        candidate_commit: run.candidateCommit ?? null,
        baseline_id: run.baselineId,
        context_id: run.contextId ?? null,
        type: run.type,
        status: run.status,
        created_at: run.createdAt,
        created_by: JSON.stringify(run.createdBy),
        started_at: run.startedAt ?? null,
        completed_at: run.completedAt ?? null,
        executions: JSON.stringify(run.executions),
      });
    if (updated === 0) {
      throw new Error(`Run ${run.id} is immutable after completion`);
    }
  }

  async listFindings(): Promise<ValidationFinding[]> {
    const rows = await this.db('validation_findings').select().orderBy('id', 'asc');
    return rows.map((row: Record<string, unknown>) => mapFinding(row));
  }

  async addFinding(finding: ValidationFinding): Promise<void> {
    await this.db('validation_findings').insert({
      id: finding.id,
      run_id: finding.runId ?? null,
      test_id: finding.testId,
      severity: finding.severity,
      description: finding.description,
      status: finding.status,
      requirement_ids: JSON.stringify(finding.requirementIds),
      expected_result: finding.expectedResult ?? null,
      actual_result: finding.actualResult ?? null,
      source: finding.source,
    });
  }

  async updateFindingStatus(id: string, status: FindingStatus): Promise<void> {
    const updated = await this.db('validation_findings')
      .where({ id })
      .update({ status });
    if (updated === 0) {
      throw new Error(`Unknown finding ${id}`);
    }
  }

  async listEvidence(): Promise<ValidationEvidenceItem[]> {
    const rows = await this.db('validation_evidence').select().orderBy('created_at', 'asc');
    return rows.map((row: Record<string, unknown>) => mapEvidence(row));
  }

  async addEvidence(item: ValidationEvidenceItem): Promise<void> {
    await this.db('validation_evidence').insert({
      id: item.id,
      run_id: item.runId ?? null,
      test_id: item.testId ?? null,
      test_execution_id: item.testExecutionId ?? null,
      evidence_type: item.evidenceType,
      reference: item.reference,
      checksum: item.checksum ?? null,
      created_at: item.createdAt,
      created_by: item.createdBy ?? null,
      candidate: item.candidate ?? null,
      source: item.source,
    });
  }

  async listContexts(): Promise<ValidationContext[]> {
    const rows = await this.db('validation_contexts').select().orderBy('created_at', 'asc');
    return rows.map((row: Record<string, unknown>) => mapContext(row));
  }

  async getContext(contextId: string): Promise<ValidationContext | undefined> {
    const row = await this.db('validation_contexts').where({ id: contextId }).first();
    return row ? mapContext(row) : undefined;
  }

  async findContextBySource(
    requirementSetId: string,
    baselineId: string,
  ): Promise<ValidationContext | undefined> {
    const row = await this.db('validation_contexts')
      .where({
        requirement_set_id: requirementSetId,
        baseline_id: baselineId,
      })
      .first();
    return row ? mapContext(row) : undefined;
  }

  async addContext(context: ValidationContext): Promise<void> {
    const existing = await this.getContext(context.id);
    if (existing) {
      throw new Error(`Context ${context.id} already exists`);
    }
    await this.db('validation_contexts').insert({
      id: context.id,
      source: JSON.stringify(context.source),
      requirement_set_id: context.source.requirementSetId,
      baseline_id: context.source.baselineId,
      status: context.status,
      created_at: context.createdAt,
      created_by: context.createdBy,
    });
  }
}
