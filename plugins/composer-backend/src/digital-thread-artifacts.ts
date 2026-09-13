/**
 * Builds immutable digital-thread files for Golden Path scaffold.
 * Git receives a snapshot only — URS Composer remains SoR.
 */

import type {
  PersistedProductManifest,
  ProductBaseline,
  ProductVersion,
} from './types';
import type {
  UrsBaselineContext,
  UrsRequirementSummary,
} from './urs-baseline-resolver';
import {
  DIGITAL_THREAD_REPO_PATHS,
  computeProductManifestFileHash,
  type ProductManifestFileDocument,
} from '@internal/platform-common';

export interface DigitalThreadScaffoldArtifacts {
  productManifestYaml: string;
  ursBaselineJson: string;
  ursBaselineMd: string;
  traceabilityMatrixYaml: string;
  agentsMd: string;
  paths: typeof DIGITAL_THREAD_REPO_PATHS;
  manifestFileHash: string;
}

function yamlEscape(value: string): string {
  if (/[:#{}[\],&*?|>!%@`]/.test(value) || value.includes('\n')) {
    return JSON.stringify(value);
  }
  return value;
}

function toSimpleYaml(doc: Record<string, unknown>, indent = 0): string {
  const pad = '  '.repeat(indent);
  const lines: string[] = [];
  for (const [key, value] of Object.entries(doc)) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${pad}${key}: []`);
        continue;
      }
      lines.push(`${pad}${key}:`);
      for (const item of value) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          lines.push(`${pad}-`);
          for (const [ik, iv] of Object.entries(item as Record<string, unknown>)) {
            lines.push(
              `${pad}  ${ik}: ${typeof iv === 'string' ? yamlEscape(iv) : JSON.stringify(iv)}`,
            );
          }
        } else {
          lines.push(
            `${pad}- ${typeof item === 'string' ? yamlEscape(item) : JSON.stringify(item)}`,
          );
        }
      }
    } else if (value && typeof value === 'object') {
      lines.push(`${pad}${key}:`);
      lines.push(toSimpleYaml(value as Record<string, unknown>, indent + 1));
    } else if (typeof value === 'string') {
      lines.push(`${pad}${key}: ${yamlEscape(value)}`);
    } else {
      lines.push(`${pad}${key}: ${JSON.stringify(value)}`);
    }
  }
  return lines.join('\n');
}

export function buildUrsBaselineMarkdown(options: {
  context: UrsBaselineContext;
  ursContentHash: string;
}): string {
  const { context, ursContentHash } = options;
  const lines = [
    '# URS Baseline Snapshot',
    '',
    '> Immutable export for the product repository. URS Composer is the system of record.',
    '',
    `- **requirementSetId:** \`${context.requirementSetId ?? ''}\``,
    `- **ursBaselineId:** \`${context.baselineId}\``,
    `- **ursVersion:** \`${context.baselineVersion}\``,
    `- **ursContentHash:** \`${ursContentHash}\``,
    '',
    '## Requirements',
    '',
  ];
  for (const req of context.requirements) {
    lines.push(`### ${req.id}`);
    lines.push('');
    lines.push(`**${req.title}**`);
    lines.push('');
    lines.push(req.statement || '');
    lines.push('');
  }
  if (context.requirements.length === 0) {
    lines.push('_No requirement summaries were available at export time._');
    lines.push('');
  }
  return lines.join('\n');
}

export function buildTraceabilityMatrixYaml(requirements: UrsRequirementSummary[]): string {
  const rows =
    requirements.length > 0
      ? requirements.map(req => ({
          ursRequirementId: req.id,
          designComponent: '',
          sourceOrPr: '',
          testId: '',
          evidenceRef: '',
          status: 'PENDING',
        }))
      : [
          {
            ursRequirementId: 'URS-XXX-001',
            designComponent: '',
            sourceOrPr: '',
            testId: '',
            evidenceRef: '',
            status: 'PENDING',
          },
        ];
  return [
    '# URS Requirement → Design/Component → Source/PR → Test → Evidence',
    '# Fill during implementation. Do not invent URS IDs.',
    toSimpleYaml({ matrix: rows }),
    '',
  ].join('\n');
}

export function buildAgentsMd(): string {
  return [
    '# AI / Developer Instructions — Controlled Data Product',
    '',
    'Before architecture, code, or test changes, first read:',
    '',
    '- `/docs/urs/URS-baseline.md`',
    '- `/product-manifest.yaml`',
    '',
    'Every relevant implementation and every test must be traceable to URS IDs',
    'in `/docs/urs/traceability-matrix.yaml`.',
    '',
    'Do not mutate `/docs/urs/URS-baseline.json` or `/docs/urs/URS-baseline.md`.',
    'Those files are an immutable snapshot of the approved URS baseline.',
    'URS Composer remains the system of record.',
    '',
  ].join('\n');
}

export function buildDigitalThreadScaffoldArtifacts(options: {
  version: ProductVersion;
  baseline: ProductBaseline;
  manifest: PersistedProductManifest;
  ursContext: UrsBaselineContext;
}): DigitalThreadScaffoldArtifacts {
  const { version, baseline, manifest, ursContext } = options;
  const fileDocBase = {
    productId: manifest.productId,
    productVersionId: version.id,
    productBaselineId: baseline.id,
    requirementSetId: baseline.requirementSetId || version.requirementSetId,
    ursBaselineId: baseline.ursBaselineId,
    ursVersion: baseline.ursVersion || version.ursVersion,
    ursContentHash: baseline.ursContentHash || version.ursContentHash,
    components: manifest.document.spec.components as unknown as Array<
      Record<string, unknown>
    >,
    contracts: manifest.document.spec.dataContracts as unknown as Array<
      Record<string, unknown>
    >,
    policies: (manifest.document.spec.policies ?? []) as unknown as Array<
      Record<string, unknown>
    >,
    qualityGates: (manifest.document.spec.qualityGates ?? []) as unknown as Array<
      Record<string, unknown>
    >,
  };
  const manifestFileHash = computeProductManifestFileHash(fileDocBase);
  const fileDoc: ProductManifestFileDocument = {
    ...fileDocBase,
    manifestContentHash: manifestFileHash,
  };

  const ursBaselineJson = JSON.stringify(
    {
      requirementSetId: fileDoc.requirementSetId,
      ursBaselineId: fileDoc.ursBaselineId,
      ursVersion: fileDoc.ursVersion,
      ursContentHash: fileDoc.ursContentHash,
      solutionName: ursContext.solutionName,
      businessNeed: ursContext.businessNeed,
      businessCapabilities: ursContext.businessCapabilities,
      requirements: ursContext.requirements,
      exportedAt: new Date().toISOString(),
      sourceSystem: 'urs-composer',
      note: 'Immutable snapshot for Git. URS Composer is the system of record.',
    },
    null,
    2,
  );

  return {
    productManifestYaml: `${toSimpleYaml(fileDoc as unknown as Record<string, unknown>)}\n`,
    ursBaselineJson: `${ursBaselineJson}\n`,
    ursBaselineMd: buildUrsBaselineMarkdown({
      context: ursContext,
      ursContentHash: fileDoc.ursContentHash,
    }),
    traceabilityMatrixYaml: buildTraceabilityMatrixYaml(ursContext.requirements),
    agentsMd: buildAgentsMd(),
    paths: DIGITAL_THREAD_REPO_PATHS,
    manifestFileHash,
  };
}
