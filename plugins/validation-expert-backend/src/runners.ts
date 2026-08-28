import fs from 'fs';
import path from 'path';
import type {
  ValidationRunContext,
  ValidationTestDefinition,
  ValidationTestResult,
  ValidationTestRunner,
} from './types';

/** DEC-CI-001 — must never present UNKNOWN as PASS. */
export const CI_UNKNOWN_REPRESENTATION = 'DEGRADED / UNVERIFIED';

export function mapUnknownCiRepresentation(status: string): string {
  return status === 'UNKNOWN' ? CI_UNKNOWN_REPRESENTATION : status;
}

export class CandidateIdentityRunner implements ValidationTestRunner {
  supports(test: ValidationTestDefinition): boolean {
    return test.id === 'IQ-001';
  }

  async execute(
    _test: ValidationTestDefinition,
    context: ValidationRunContext,
  ): Promise<ValidationTestResult> {
    const root = context.validationRoot;
    const baseline = path.join(root, 'baseline', 'BASELINE.yaml');
    const manifest = path.join(root, 'execution', 'RC2-Manifest.yaml');
    const missing: string[] = [];
    if (!fs.existsSync(baseline)) {
      missing.push('baseline/BASELINE.yaml');
    }
    if (!fs.existsSync(manifest)) {
      missing.push('execution/RC2-Manifest.yaml');
    }

    const manifestText = fs.existsSync(manifest)
      ? fs.readFileSync(manifest, 'utf8')
      : '';
    const tagOk = /tag:\s*platform-core-v1\.0-rc2/.test(manifestText);
    const statusOk = /validation_status:\s*NOT_VALIDATED/.test(manifestText);

    if (missing.length || !tagOk || !statusOk) {
      return {
        status: 'FAIL',
        actualResult: `Candidate identity check failed. missing=[${missing.join(
          ', ',
        )}] tagOk=${tagOk} validationStatusNotValidated=${statusOk}`,
        finding: {
          severity: 'Major',
          description: 'Candidate identity artifacts incomplete or incorrect.',
          requirementIds: ['URS-CFG-001', 'URS-SRC-001'],
        },
      };
    }

    return {
      status: 'PASS',
      actualResult:
        'RC2 manifest present with tag platform-core-v1.0-rc2 and validation_status NOT_VALIDATED; baseline file present.',
      evidenceReferences: [
        'validation/execution/RC2-Manifest.yaml',
        'validation/baseline/BASELINE.yaml',
      ],
    };
  }
}

export class HealthEndpointRunner implements ValidationTestRunner {
  supports(test: ValidationTestDefinition): boolean {
    return test.id === 'IQ-016';
  }

  async execute(
    _test: ValidationTestDefinition,
    context: ValidationRunContext,
  ): Promise<ValidationTestResult> {
    const base = (context.healthBaseUrl ?? 'http://127.0.0.1:7007').replace(/\/$/, '');
    const urls = [
      `${base}/.backstage/health/v1/readiness`,
      `${base}/api/validation-expert/health`,
    ];
    const results: string[] = [];
    let allOk = true;

    for (const url of urls) {
      try {
        const response = await fetch(url, { method: 'GET' });
        results.push(`${url} → ${response.status}`);
        if (response.status < 200 || response.status >= 300) {
          allOk = false;
        }
      } catch (error) {
        allOk = false;
        results.push(
          `${url} → ERROR ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }

    if (!allOk) {
      return {
        status: 'FAIL',
        actualResult: results.join('; '),
        finding: {
          severity: 'Major',
          description: 'One or more health endpoints did not return HTTP 2xx.',
          requirementIds: ['URS-CFG-001'],
        },
      };
    }

    return {
      status: 'PASS',
      actualResult: results.join('; '),
      evidenceReferences: results,
    };
  }
}

export class CiUnknownMappingRunner implements ValidationTestRunner {
  supports(test: ValidationTestDefinition): boolean {
    return test.id === 'OQ-CI-004' || test.id === 'OQ-CI-003';
  }

  async execute(
    test: ValidationTestDefinition,
    _context: ValidationRunContext,
  ): Promise<ValidationTestResult> {
    const representation = mapUnknownCiRepresentation('UNKNOWN');
    const neverPass = representation !== 'PASS' && representation !== 'PASSED';
    const expectedLabel = representation === CI_UNKNOWN_REPRESENTATION;

    if (test.id === 'OQ-CI-003') {
      if (!neverPass) {
        return {
          status: 'FAIL',
          actualResult: `UNKNOWN mapped to ${representation}`,
          finding: {
            severity: 'Critical',
            description: 'UNKNOWN must not be treated as PASS (DEC-CI-001).',
            requirementIds: ['URS-GH-003', 'URS-CI-001'],
          },
        };
      }
      return {
        status: 'PASS',
        actualResult: `UNKNOWN is not PASS; representation=${representation}`,
      };
    }

    if (!expectedLabel) {
      return {
        status: 'FAIL',
        actualResult: `Expected ${CI_UNKNOWN_REPRESENTATION}, got ${representation}`,
        finding: {
          severity: 'Major',
          description: 'UNKNOWN display mapping incorrect.',
          requirementIds: ['URS-GH-003'],
        },
      };
    }

    return {
      status: 'PASS',
      actualResult: `UNKNOWN represented as ${CI_UNKNOWN_REPRESENTATION}`,
    };
  }
}

export class ValidationRunnerRegistry {
  constructor(private readonly runners: ValidationTestRunner[]) {}

  find(test: ValidationTestDefinition): ValidationTestRunner | undefined {
    return this.runners.find(runner => runner.supports(test));
  }
}

export function createDefaultRunnerRegistry(): ValidationRunnerRegistry {
  return new ValidationRunnerRegistry([
    new CandidateIdentityRunner(),
    new HealthEndpointRunner(),
    new CiUnknownMappingRunner(),
  ]);
}
