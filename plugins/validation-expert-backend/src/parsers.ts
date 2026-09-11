import fs from 'fs';
import path from 'path';
import { resolvePackagePath } from '@backstage/backend-plugin-api';
import { parse as parseYaml } from 'yaml';
import type {
  ExecutionType,
  ProtocolTest,
  ProtocolType,
  TestStatus,
  TraceabilityRow,
  ValidationFinding,
  ValidationOverview,
  ValidationRequirement,
  ValidationRisk,
} from './types';

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function exists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

function parseFieldTable(section: string): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const line of section.split(/\r?\n/)) {
    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|$/);
    if (!match) {
      continue;
    }
    const key = match[1].trim();
    const value = match[2].trim();
    if (!key || key === 'Field' || key === '---' || key.startsWith('---')) {
      continue;
    }
    fields[key] = value;
  }
  return fields;
}

function splitCsv(value?: string): string[] {
  if (!value || value === 'n/a' || value === '—') {
    return [];
  }
  return value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);
}

function inferExecutionType(testId: string, title: string, procedure = ''): ExecutionType {
  const haystack = `${testId} ${title} ${procedure}`.toLowerCase();
  if (
    haystack.includes('github oauth') ||
    haystack.includes('interactive') ||
    haystack.includes('sign in') ||
    haystack.includes('browse catalog') ||
    testId.startsWith('UAT-')
  ) {
    if (haystack.includes('aws marketplace') || haystack.includes('external')) {
      return 'EXTERNAL';
    }
    return 'MANUAL';
  }
  if (haystack.includes('aws') || haystack.includes('marketplace subscription')) {
    return 'EXTERNAL';
  }
  if (haystack.includes('secret') || testId.includes('-SEC-')) {
    return 'AUTOMATED_SECURITY';
  }
  if (haystack.includes('http') || haystack.includes('health') || haystack.includes('unauthenticated')) {
    return 'AUTOMATED_API';
  }
  return 'AUTOMATED_PLATFORM';
}

function normalizeStatus(raw?: string): TestStatus {
  const value = (raw ?? 'NOT_EXECUTED').toUpperCase().replace(/\s+/g, '_');
  if (value.includes('NOT_APPLICABLE')) {
    return 'NOT_APPLICABLE_CURRENT_RELEASE';
  }
  if (value === 'PASS' || value === 'PASSED') {
    return 'PASS';
  }
  if (value === 'FAIL' || value === 'FAILED') {
    return 'FAIL';
  }
  if (value === 'BLOCKED') {
    return 'BLOCKED';
  }
  if (value === 'RUNNING') {
    return 'RUNNING';
  }
  return 'NOT_EXECUTED';
}

export function resolveValidationRoot(configured?: string): string {
  if (configured && path.isAbsolute(configured)) {
    return configured;
  }
  const relative = configured ?? 'validation';
  const candidates = [
    path.resolve(process.cwd(), relative),
    path.resolve(process.cwd(), '..', relative),
    path.resolve(process.cwd(), '../..', relative),
    resolvePackagePath('@internal/plugin-validation-expert-backend', '../../validation'),
  ];
  for (const candidate of candidates) {
    if (exists(path.join(candidate, 'baseline', 'BASELINE.yaml'))) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), relative);
}

export function loadBaselineYaml(root: string): Record<string, unknown> {
  const filePath = path.join(root, 'baseline', 'BASELINE.yaml');
  return parseYaml(readText(filePath)) as Record<string, unknown>;
}

export function loadRc2Manifest(root: string): Record<string, unknown> {
  const filePath = path.join(root, 'execution', 'RC2-Manifest.yaml');
  return parseYaml(readText(filePath)) as Record<string, unknown>;
}

export function parseRequirements(root: string): ValidationRequirement[] {
  const ursPath = path.join(root, 'baseline', 'URS.md');
  const text = readText(ursPath);
  const trace = parseTraceability(root);
  const byUrs = new Map(trace.map(row => [row.ursId, row]));

  const sections = text.split(/\n(?=### URS-)/);
  const requirements: ValidationRequirement[] = [];

  for (const section of sections) {
    const header = section.match(/^### (URS-[A-Z0-9-]+)/);
    if (!header) {
      continue;
    }
    const id = header[1];
    const fields = parseFieldTable(section);
    const rejected =
      (fields['Requirement state'] ?? '').toUpperCase() === 'REJECTED' ||
      id === 'URS-AUTH-005';
    const row = byUrs.get(id);
    const requirementText = fields.Requirement ?? '';
    requirements.push({
      id,
      title: requirementText.slice(0, 96) || id,
      requirement: requirementText,
      rationale: fields.Rationale,
      riskLevel: fields['Risk level'],
      baselineState: fields['Requirement state'] ?? (rejected ? 'REJECTED' : 'BASELINED'),
      implementation: fields.Implementation ?? 'NOT_VERIFIED',
      verification: fields.Verification ?? 'NOT_EXECUTED',
      humanDecision: fields['Human decision'],
      rejected,
      risks: row?.risks ?? splitCsv(fields['Risk level']),
      formalTests: row?.formalTests ?? [],
      sysId: row?.sysId,
      tdsId: row?.tdsId,
    });
  }

  return requirements;
}

export function parseTraceability(root: string): TraceabilityRow[] {
  const filePath = path.join(root, 'execution', 'Verification-Traceability.md');
  const text = readText(filePath);
  const rows: TraceabilityRow[] = [];

  for (const line of text.split(/\r?\n/)) {
    const match = line.match(
      /^\|\s*(URS-[A-Z0-9-]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]*)\|/,
    );
    if (!match) {
      continue;
    }
    const ursId = match[1].trim();
    const formalTests = splitCsv(match[5]);
    const evidence = match[6].trim();
    const gaps: string[] = [];
    if (formalTests.length === 0) {
      gaps.push('requirement_without_test');
    }
    if (/NOT_EXECUTED/i.test(evidence)) {
      gaps.push('missing_evidence');
    }
    if (/FAIL/i.test(evidence)) {
      gaps.push('failed_verification');
    }
    if (/BLOCKED/i.test(evidence)) {
      gaps.push('blocked_verification');
    }
    rows.push({
      ursId,
      sysId: match[2].trim(),
      tdsId: match[3].trim(),
      risks: splitCsv(match[4]),
      formalTests,
      evidence,
      notes: match[7]?.trim() || undefined,
      gaps,
    });
  }

  return rows;
}

export function parseRisks(root: string): ValidationRisk[] {
  const filePath = path.join(root, 'baseline', 'Risk-Assessment.md');
  const text = readText(filePath);
  const sections = text.split(/\n(?=## RA-\d+)/);
  const trace = parseTraceability(root);
  const risks: ValidationRisk[] = [];

  for (const section of sections) {
    const header = section.match(/^## (RA-\d+)\s*[—-]\s*(.+)$/m);
    if (!header) {
      continue;
    }
    const id = header[1];
    const title = header[2].trim();
    const fields = parseFieldTable(section);
    const related = splitCsv(
      fields['Related URS'] ?? fields['Related requirements'] ?? fields.Requirements,
    );
    const fromTrace = trace
      .filter(row => row.risks.includes(id))
      .flatMap(row => row.formalTests);
    risks.push({
      id,
      title,
      description:
        fields.Description ??
        fields['Risk description'] ??
        section
          .split(/\r?\n/)
          .slice(1, 6)
          .filter(line => !line.startsWith('|') && line.trim())
          .join(' ')
          .slice(0, 400),
      severity: fields.Severity ?? fields['Residual severity'] ?? fields.Level,
      relatedRequirements:
        related.length > 0
          ? related
          : trace.filter(row => row.risks.includes(id)).map(row => row.ursId),
      controls: fields.Controls ?? fields['Current controls'] ?? fields.Mitigation,
      formalTests: [...new Set(fromTrace)],
      status: fields.Status ?? fields['Acceptance status'] ?? 'NOT ACCEPTED',
    });
  }

  return risks;
}

function protocolHeaderPattern(protocol: ProtocolType): RegExp {
  if (protocol === 'IQ') {
    return /\n(?=### IQ-\d+)/;
  }
  if (protocol === 'OQ') {
    return /\n(?=### OQ-[A-Z0-9-]+)/;
  }
  return /\n(?=### UAT-\d+)/;
}

function protocolIdPattern(protocol: ProtocolType): RegExp {
  if (protocol === 'IQ') {
    return /^### (IQ-\d+)\s*[—-]\s*(.+)$/m;
  }
  if (protocol === 'OQ') {
    return /^### (OQ-[A-Z0-9-]+)\s*[—-]\s*(.+)$/m;
  }
  return /^### (UAT-\d+)\s*[—-]\s*(.+)$/m;
}

function normalizeFindingStatus(raw?: string): ValidationFinding['status'] {
  const status = (raw ?? 'OPEN').toUpperCase();
  if (status.includes('CLOSED')) {
    return 'CLOSED';
  }
  if (status.includes('REMEDIATED')) {
    return 'REMEDIATED_PENDING_RETEST';
  }
  return 'OPEN';
}

function parseProtocolFile(
  root: string,
  relativePath: string,
  protocol: ProtocolType,
): ProtocolTest[] {
  const filePath = path.join(root, relativePath);
  if (!exists(filePath)) {
    return [];
  }
  const text = readText(filePath);
  const headerPattern = protocolHeaderPattern(protocol);
  const idPattern = protocolIdPattern(protocol);

  const sections = text.split(headerPattern);
  const tests: ProtocolTest[] = [];
  let currentDomain: string | undefined;

  for (const section of sections) {
    const domainMatch = section.match(/^## ([^\n#]+)$/m);
    if (domainMatch && !section.match(idPattern)) {
      currentDomain = domainMatch[1].trim();
    }
    const header = section.match(idPattern);
    if (!header) {
      continue;
    }
    const fields = parseFieldTable(section);
    const id = fields['Test ID'] ?? header[1];
    const title = header[2].trim();
    const procedure = fields.Procedure ?? '';
    tests.push({
      id,
      title,
      protocol,
      requirementIds: splitCsv(fields['Requirement IDs'] ?? fields['Related URS']),
      riskIds: splitCsv(fields['Risk IDs']),
      procedure,
      expectedResult: fields['Expected Result'],
      evidenceRequired: fields['Evidence Required'],
      preconditions: fields.Preconditions,
      status: normalizeStatus(fields.Status ?? fields['Actual Result']),
      executionType: inferExecutionType(id, title, procedure),
      domain: currentDomain,
    });
  }

  return tests;
}

export function parseIqProtocol(root: string): ProtocolTest[] {
  const tests = parseProtocolFile(root, 'execution/IQ/IQ-Protocol.md', 'IQ');
  const summaryPath = path.join(root, 'execution', 'IQ', 'RC2-IQ-Execution-Summary.md');
  if (!exists(summaryPath)) {
    return tests;
  }
  const summary = readText(summaryPath);
  return tests.map(test => {
    const row = summary.match(
      new RegExp(`\\|\\s*${test.id}\\s*\\|\\s*([^|]+)\\s*\\|`, 'i'),
    );
    if (!row) {
      return test;
    }
    return { ...test, status: normalizeStatus(row[1]) };
  });
}

export function parseOqProtocol(root: string): ProtocolTest[] {
  return parseProtocolFile(root, 'execution/OQ/OQ-Protocol.md', 'OQ');
}

export function parseUatProtocol(root: string): ProtocolTest[] {
  return parseProtocolFile(root, 'execution/UAT/UAT-Protocol.md', 'UAT');
}

export function parseFindings(root: string): ValidationFinding[] {
  const dir = path.join(root, 'execution', 'findings');
  if (!exists(dir)) {
    return [];
  }
  const findings: ValidationFinding[] = [];
  for (const name of fs.readdirSync(dir)) {
    if (!name.endsWith('.md') || name === 'README.md') {
      continue;
    }
    const text = readText(path.join(dir, name));
    const fields = parseFieldTable(text);
    const id = fields.ID ?? fields['Finding ID'] ?? name.replace(/\.md$/, '');
    findings.push({
      id,
      testId: fields['Originating test'] ?? fields.Source ?? fields['Test ID'] ?? 'UNKNOWN',
      severity: fields.Severity ?? 'Major',
      description: fields.Description ?? fields.Summary ?? text.slice(0, 280),
      status: normalizeFindingStatus(fields.Status),
      requirementIds: splitCsv(fields['Requirement IDs'] ?? fields.URS),
      expectedResult: fields['Expected Result'],
      actualResult: fields['Actual Result'],
      source: 'artifact',
    });
  }
  return findings;
}

export function listArtifactEvidence(root: string): Array<{
  id: string;
  testId?: string;
  reference: string;
  evidenceType: string;
}> {
  const evidenceRoot = path.join(root, 'execution', 'evidence');
  if (!exists(evidenceRoot)) {
    return [];
  }
  const items: Array<{
    id: string;
    testId?: string;
    reference: string;
    evidenceType: string;
  }> = [];

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.name === 'README.md' || entry.name.startsWith('_')) {
        continue;
      }
      const relative = path.relative(root, full).replace(/\\/g, '/');
      const testMatch = entry.name.match(/^(IQ-\d+|OQ-[A-Z0-9-]+|UAT-\d+)/i);
      items.push({
        id: relative,
        testId: testMatch?.[1],
        reference: relative,
        evidenceType: path.extname(entry.name).replace('.', '') || 'file',
      });
    }
  };

  walk(evidenceRoot);
  return items;
}

export function buildOverview(root: string): ValidationOverview {
  const baseline = loadBaselineYaml(root);
  const manifest = loadRc2Manifest(root);
  const requirements = parseRequirements(root);
  const active = requirements.filter(item => !item.rejected);
  const trace = parseTraceability(root);
  const risks = parseRisks(root);
  const findings = parseFindings(root);
  const evidence = listArtifactEvidence(root);

  const iqSummaryPath = path.join(root, 'execution', 'IQ', 'RC2-IQ-Execution-Summary.md');
  let iqStatus = 'NOT_EXECUTED';
  if (exists(iqSummaryPath)) {
    const summary = readText(iqSummaryPath);
    if (/PASS WITH OPEN OBSERVATIONS/i.test(summary)) {
      iqStatus = 'PASS WITH OPEN OBSERVATIONS';
    } else if (/IQ EXECUTION RESULT:\s*FAIL/i.test(summary)) {
      iqStatus = 'FAIL';
    }
  }

  const oqTests = parseOqProtocol(root);
  const uatTests = parseUatProtocol(root);
  const oqExecuted = oqTests.some(test => test.status !== 'NOT_EXECUTED' && test.status !== 'NOT_APPLICABLE_CURRENT_RELEASE');
  const uatExecuted = uatTests.some(test => test.status !== 'NOT_EXECUTED');

  return {
    product: String(manifest.product ?? 'Platform Core'),
    candidate: String(manifest.candidate_version ?? '1.0-RC2'),
    candidateTag: String((manifest.git as { tag?: string } | undefined)?.tag ?? 'platform-core-v1.0-rc2'),
    baselineId: String(baseline.baseline_id ?? 'PDF-PC-VAL-BL-1.0'),
    validationStatus: String(
      manifest.validation_status ?? baseline.validation_status ?? 'NOT_VALIDATED',
    ),
    part11Status: String(manifest.part_11_status ?? baseline.part_11_status ?? 'NOT_CLAIMED'),
    gxpStatus: String(manifest.gxp_status ?? baseline.gxp_status ?? 'NOT_VALIDATED'),
    requirementsBaselined: {
      active: active.length,
      total: Number(baseline.requirement_count ?? active.length),
    },
    traceabilityPlanned: {
      covered: trace.filter(row => row.formalTests.length > 0).length,
      total: trace.length,
    },
    iqStatus,
    oqStatus: oqExecuted ? 'IN_PROGRESS' : 'READY',
    uatStatus: uatExecuted ? 'IN_PROGRESS' : 'NOT STARTED',
    openRisks: risks.filter(risk => !/ACCEPTED/i.test(risk.status) || /NOT ACCEPTED/i.test(risk.status)).length,
    openFindings: findings.filter(finding => finding.status === 'OPEN').length,
    evidenceCount: evidence.length,
    notes: [
      'Validation Expert v0.1 is a workbench over authoritative validation/ artifacts.',
      'Do not treat CERTIFIED, RELEASED, or IQ alone as product validation.',
    ],
  };
}
