import fs from 'fs';
import path from 'path';
import type {
  ExecutorIdentity,
  FindingStatus,
  ProtocolType,
  ValidationEvidenceItem,
  ValidationFinding,
  ValidationRun,
  ValidationTestExecution,
} from './types';

export interface ValidationRunRepository {
  listRuns(): ValidationRun[];
  getRun(runId: string): ValidationRun | undefined;
  createRun(input: {
    type: ProtocolType;
    candidate: string;
    candidateCommit?: string;
    baselineId: string;
    createdBy: ExecutorIdentity;
  }): ValidationRun;
  saveRun(run: ValidationRun): void;
  listFindings(): ValidationFinding[];
  addFinding(finding: ValidationFinding): void;
  updateFindingStatus(id: string, status: FindingStatus): void;
  listEvidence(): ValidationEvidenceItem[];
  addEvidence(item: ValidationEvidenceItem): void;
}

interface StoreShape {
  runs: ValidationRun[];
  findings: ValidationFinding[];
  evidence: ValidationEvidenceItem[];
  counters: Record<string, number>;
}

function emptyStore(): StoreShape {
  return { runs: [], findings: [], evidence: [], counters: {} };
}

export class MemoryValidationRunRepository implements ValidationRunRepository {
  private store: StoreShape = emptyStore();

  listRuns(): ValidationRun[] {
    return this.store.runs.map(cloneRun);
  }

  getRun(runId: string): ValidationRun | undefined {
    const found = this.store.runs.find(run => run.id === runId);
    return found ? cloneRun(found) : undefined;
  }

  createRun(input: {
    type: ProtocolType;
    candidate: string;
    candidateCommit?: string;
    baselineId: string;
    createdBy: ExecutorIdentity;
  }): ValidationRun {
    const key = input.type;
    const next = (this.store.counters[key] ?? 0) + 1;
    this.store.counters[key] = next;
    const run: ValidationRun = {
      id: `${input.type}-RUN-${String(next).padStart(4, '0')}`,
      candidate: input.candidate,
      candidateCommit: input.candidateCommit,
      baselineId: input.baselineId,
      type: input.type,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      createdBy: input.createdBy,
      executions: [],
    };
    this.store.runs.push(run);
    return cloneRun(run);
  }

  saveRun(run: ValidationRun): void {
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

  listFindings(): ValidationFinding[] {
    return this.store.findings.map(item => ({ ...item }));
  }

  addFinding(finding: ValidationFinding): void {
    this.store.findings.push({ ...finding });
  }

  updateFindingStatus(id: string, status: FindingStatus): void {
    const found = this.store.findings.find(item => item.id === id);
    if (!found) {
      throw new Error(`Unknown finding ${id}`);
    }
    found.status = status;
  }

  listEvidence(): ValidationEvidenceItem[] {
    return this.store.evidence.map(item => ({ ...item }));
  }

  addEvidence(item: ValidationEvidenceItem): void {
    this.store.evidence.push({ ...item });
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
    store.counters = raw.counters ?? {};
  }

  private persist(): void {
    const store = (this.memory as unknown as { store: StoreShape }).store;
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.writeFileSync(this.filePath, `${JSON.stringify(store, null, 2)}\n`, 'utf8');
  }

  listRuns(): ValidationRun[] {
    return this.memory.listRuns();
  }

  getRun(runId: string): ValidationRun | undefined {
    return this.memory.getRun(runId);
  }

  createRun(input: {
    type: ProtocolType;
    candidate: string;
    candidateCommit?: string;
    baselineId: string;
    createdBy: ExecutorIdentity;
  }): ValidationRun {
    const run = this.memory.createRun(input);
    this.persist();
    return run;
  }

  saveRun(run: ValidationRun): void {
    this.memory.saveRun(run);
    this.persist();
  }

  listFindings(): ValidationFinding[] {
    return this.memory.listFindings();
  }

  addFinding(finding: ValidationFinding): void {
    this.memory.addFinding(finding);
    this.persist();
  }

  updateFindingStatus(id: string, status: FindingStatus): void {
    this.memory.updateFindingStatus(id, status);
    this.persist();
  }

  listEvidence(): ValidationEvidenceItem[] {
    return this.memory.listEvidence();
  }

  addEvidence(item: ValidationEvidenceItem): void {
    this.memory.addEvidence(item);
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

function cloneExecution(execution: ValidationTestExecution): ValidationTestExecution {
  return {
    ...execution,
    executor: execution.executor ? { ...execution.executor } : undefined,
    evidenceIds: [...execution.evidenceIds],
  };
}
