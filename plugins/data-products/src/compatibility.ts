import policy from './compatibility-policy.json';

export const COMPATIBILITY_STATUSES = [
  'COMPATIBLE',
  'BREAKING_CHANGE',
  'UNKNOWN',
] as const;

export type CompatibilityStatus = (typeof COMPATIBILITY_STATUSES)[number];

export interface ContractConsumer {
  name: string;
  consumesContract: string;
  compatibleVersions: string[];
  active?: boolean;
}

export interface CompatibilityFinding {
  rule: string;
  breaking: boolean;
  message: string;
}

export interface JsonSchemaLike {
  version?: string;
  required?: string[];
  properties?: Record<string, { type?: string | string[] }>;
}

export interface CompatibilityReport {
  status: CompatibilityStatus;
  contract: string;
  fromVersion: string;
  toVersion: string;
  findings: CompatibilityFinding[];
  blockedConsumers: string[];
}

export interface CompatibilityRule {
  id: string;
  when: string;
  result: CompatibilityStatus;
  message: string;
  note?: string;
}

export function loadCompatibilityPolicy(): {
  version: number;
  rules: CompatibilityRule[];
} {
  return {
    version: policy.version,
    rules: policy.rules.map(rule => ({
      ...rule,
      result: rule.result as CompatibilityStatus,
    })),
  };
}

function ruleById(ruleId: string): CompatibilityRule {
  const match = loadCompatibilityPolicy().rules.find(rule => rule.id === ruleId);
  if (!match) {
    throw new Error(`Unknown compatibility rule ${ruleId}`);
  }
  return match;
}

function interpolate(
  template: string,
  values: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/g, (_match, key: string) => values[key] ?? '');
}

function finding(
  ruleId: string,
  values: Record<string, string> = {},
): CompatibilityFinding {
  const rule = ruleById(ruleId);
  return {
    rule: ruleId,
    breaking: rule.result === 'BREAKING_CHANGE',
    message: interpolate(rule.message, values),
  };
}

export function parseSemver(version: string): {
  major: number;
  minor: number;
  patch: number;
} | undefined {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) {
    return undefined;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function versionSatisfies(
  version: string,
  ranges: string[],
): boolean {
  const parsed = parseSemver(version);
  if (!parsed || ranges.length === 0) {
    return false;
  }
  return ranges.some(range => {
    const trimmed = range.trim();
    if (trimmed === '*') {
      return true;
    }
    const majorX = /^(\d+)\.x$/i.exec(trimmed);
    if (majorX) {
      return parsed.major === Number(majorX[1]);
    }
    const exact = parseSemver(trimmed);
    return Boolean(exact && exact.major === parsed.major && exact.minor === parsed.minor && exact.patch === parsed.patch);
  });
}

function typeOf(property?: { type?: string | string[] }): string {
  if (!property?.type) {
    return 'unknown';
  }
  return Array.isArray(property.type) ? property.type.join(',') : property.type;
}

export function compareSchemas(
  previous: JsonSchemaLike,
  next: JsonSchemaLike,
): CompatibilityFinding[] {
  const findings: CompatibilityFinding[] = [];
  const previousVersion = previous.version ?? '';
  const nextVersion = next.version ?? '';
  const previousSemver = parseSemver(previousVersion);
  const nextSemver = parseSemver(nextVersion);

  if (previousSemver && nextSemver && nextSemver.major !== previousSemver.major) {
    findings.push(
      finding('major_version_change', {
        previousVersion,
        nextVersion,
      }),
    );
  } else if (
    previousSemver &&
    nextSemver &&
    (nextSemver.minor !== previousSemver.minor ||
      nextSemver.patch !== previousSemver.patch)
  ) {
    findings.push(
      finding('minor_or_patch_version_change', {
        previousVersion,
        nextVersion,
      }),
    );
  }

  const previousRequired = previous.required ?? [];
  const nextRequired = next.required ?? [];
  const previousProperties = previous.properties ?? {};
  const nextProperties = next.properties ?? {};

  for (const field of previousRequired) {
    if (!nextRequired.includes(field) || !(field in nextProperties)) {
      findings.push(finding('removed_required_field', { field }));
    }
  }

  for (const field of Object.keys(previousProperties)) {
    if (field in nextProperties) {
      const previousType = typeOf(previousProperties[field]);
      const nextType = typeOf(nextProperties[field]);
      if (previousType !== nextType) {
        findings.push(
          finding('changed_field_type', {
            field,
            previousType,
            nextType,
          }),
        );
      }
    }
  }

  for (const field of Object.keys(nextProperties)) {
    if (field in previousProperties) {
      continue;
    }
    if (nextRequired.includes(field)) {
      findings.push(finding('new_required_field', { field }));
    } else {
      findings.push(finding('new_optional_field', { field }));
    }
  }

  return findings;
}

export function evaluateCompatibility(input: {
  contract?: string;
  previous: JsonSchemaLike;
  next: JsonSchemaLike;
  consumers?: ContractConsumer[];
}): CompatibilityReport {
  const contract = input.contract ?? 'unknown';
  const findings = compareSchemas(input.previous, input.next);
  const nextVersion = input.next.version ?? '';
  const activeConsumers = (input.consumers ?? []).filter(
    consumer => consumer.active !== false,
  );
  const relevantConsumers = activeConsumers.filter(
    consumer => !input.contract || consumer.consumesContract === contract,
  );

  const blockedConsumers = new Set<string>();
  const hasBreakingSchemaChange = findings.some(item => item.breaking);

  if (relevantConsumers.length === 0) {
    return {
      status: hasBreakingSchemaChange ? 'BREAKING_CHANGE' : 'UNKNOWN',
      contract,
      fromVersion: input.previous.version ?? '',
      toVersion: nextVersion,
      findings,
      blockedConsumers: [],
    };
  }

  for (const consumer of relevantConsumers) {
    if (!versionSatisfies(nextVersion, consumer.compatibleVersions)) {
      findings.push(
        finding('consumer_version_mismatch', {
          name: consumer.name,
          ranges: consumer.compatibleVersions.join(', '),
          nextVersion,
        }),
      );
      blockedConsumers.add(consumer.name);
    } else if (hasBreakingSchemaChange) {
      blockedConsumers.add(consumer.name);
    }
  }

  return {
    status: blockedConsumers.size > 0 ? 'BREAKING_CHANGE' : 'COMPATIBLE',
    contract,
    fromVersion: input.previous.version ?? '',
    toVersion: nextVersion,
    findings,
    blockedConsumers: [...blockedConsumers],
  };
}

export function compatibilityGateShouldFail(report: CompatibilityReport): boolean {
  return (
    report.status === 'BREAKING_CHANGE' && report.blockedConsumers.length > 0
  );
}
