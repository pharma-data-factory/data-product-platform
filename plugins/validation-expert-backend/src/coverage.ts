/**
 * Context requirement coverage (traceability-lite).
 *
 * Joins Validation Context requirement IDs to run executions via protocol
 * test → requirementIds, plus optional findings. Not a GxP formal claim.
 */

import type {
  TestStatus,
  ValidationFinding,
  ValidationRun,
} from './types';

export type CoverageRowStatus = 'covered' | 'uncovered' | 'extra';

export interface ContextCoverageRow {
  requirementId: string;
  status: CoverageRowStatus;
  testIds: string[];
  runIds: string[];
  findingIds: string[];
}

export interface ContextCoverage {
  contextId: string;
  expected: string[];
  covered: string[];
  uncovered: string[];
  extra: string[];
  byRequirement: ContextCoverageRow[];
  note: string;
}

const TERMINAL_EXECUTION_STATUSES: ReadonlySet<TestStatus> = new Set([
  'PASS',
  'FAIL',
  'BLOCKED',
  'NOT_APPLICABLE_CURRENT_RELEASE',
]);

const COVERAGE_NOTE =
  'Lite join of context requirement IDs to protocol tests via run executions (and findings). Not a GxP validation claim.';

type TouchMeta = {
  testIds: Set<string>;
  runIds: Set<string>;
  findingIds: Set<string>;
};

function touch(
  map: Map<string, TouchMeta>,
  requirementId: string,
  patch: { testId?: string; runId?: string; findingId?: string },
) {
  const id = String(requirementId ?? '').trim();
  if (!id) {
    return;
  }
  let entry = map.get(id);
  if (!entry) {
    entry = {
      testIds: new Set(),
      runIds: new Set(),
      findingIds: new Set(),
    };
    map.set(id, entry);
  }
  if (patch.testId) {
    entry.testIds.add(patch.testId);
  }
  if (patch.runId) {
    entry.runIds.add(patch.runId);
  }
  if (patch.findingId) {
    entry.findingIds.add(patch.findingId);
  }
}

/**
 * Compute covered / uncovered / extra requirement IDs for a validation context.
 */
export function computeContextCoverage(input: {
  contextId: string;
  expectedRequirementIds: string[];
  runs: ValidationRun[];
  protocolRequirementIdsByTestId: Map<string, string[]>;
  findings: ValidationFinding[];
}): ContextCoverage {
  const expected = [
    ...new Set(
      (input.expectedRequirementIds ?? [])
        .map(id => String(id ?? '').trim())
        .filter(Boolean),
    ),
  ].sort();
  const expectedSet = new Set(expected);
  const runIds = new Set(input.runs.map(run => run.id));
  const touched = new Map<string, TouchMeta>();

  for (const run of input.runs) {
    for (const execution of run.executions ?? []) {
      if (!TERMINAL_EXECUTION_STATUSES.has(execution.status)) {
        continue;
      }
      const reqIds =
        input.protocolRequirementIdsByTestId.get(execution.testId) ?? [];
      for (const requirementId of reqIds) {
        touch(touched, requirementId, {
          testId: execution.testId,
          runId: run.id,
        });
      }
    }
  }

  for (const finding of input.findings) {
    if (!finding.runId || !runIds.has(finding.runId)) {
      continue;
    }
    for (const requirementId of finding.requirementIds ?? []) {
      touch(touched, requirementId, {
        testId: finding.testId,
        runId: finding.runId,
        findingId: finding.id,
      });
    }
  }

  const covered = expected.filter(id => touched.has(id));
  const uncovered = expected.filter(id => !touched.has(id));
  const extra = [...touched.keys()].filter(id => !expectedSet.has(id)).sort();

  const byRequirement: ContextCoverageRow[] = [
    ...expected.map(requirementId => {
      const meta = touched.get(requirementId);
      return {
        requirementId,
        status: (meta ? 'covered' : 'uncovered') as CoverageRowStatus,
        testIds: meta ? [...meta.testIds].sort() : [],
        runIds: meta ? [...meta.runIds].sort() : [],
        findingIds: meta ? [...meta.findingIds].sort() : [],
      };
    }),
    ...extra.map(requirementId => {
      const meta = touched.get(requirementId)!;
      return {
        requirementId,
        status: 'extra' as CoverageRowStatus,
        testIds: [...meta.testIds].sort(),
        runIds: [...meta.runIds].sort(),
        findingIds: [...meta.findingIds].sort(),
      };
    }),
  ];

  return {
    contextId: input.contextId,
    expected,
    covered,
    uncovered,
    extra,
    byRequirement,
    note: COVERAGE_NOTE,
  };
}
