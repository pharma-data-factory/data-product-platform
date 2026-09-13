import {
  mapFailedStages,
  mapGithubRunToPlatformStatus,
  shortSha,
  toPublicRunFields,
} from './mapCiStatus';
import { publicCiStatus } from './types';

describe('mapGithubRunToPlatformStatus', () => {
  it('maps in-progress runs to RUNNING', () => {
    expect(
      mapGithubRunToPlatformStatus({ status: 'in_progress', conclusion: null }),
    ).toBe('RUNNING');
    expect(
      mapGithubRunToPlatformStatus({ status: 'queued', conclusion: null }),
    ).toBe('RUNNING');
  });

  it('maps successful runs to PASSED', () => {
    expect(
      mapGithubRunToPlatformStatus({
        status: 'completed',
        conclusion: 'success',
      }),
    ).toBe('PASSED');
  });

  it('maps failed runs to FAILED', () => {
    expect(
      mapGithubRunToPlatformStatus({
        status: 'completed',
        conclusion: 'failure',
      }),
    ).toBe('FAILED');
    expect(
      mapGithubRunToPlatformStatus({
        status: 'completed',
        conclusion: 'timed_out',
      }),
    ).toBe('FAILED');
  });

  it('maps cancelled runs to CANCELLED', () => {
    expect(
      mapGithubRunToPlatformStatus({
        status: 'completed',
        conclusion: 'cancelled',
      }),
    ).toBe('CANCELLED');
  });

  it('maps unknown conclusions to UNKNOWN', () => {
    expect(
      mapGithubRunToPlatformStatus({
        status: 'completed',
        conclusion: null,
      }),
    ).toBe('UNKNOWN');
  });
});

describe('mapFailedStages', () => {
  it('maps failed quality-gate steps to platform stage names', () => {
    expect(
      mapFailedStages([
        {
          name: 'quality-gate',
          conclusion: 'failure',
          steps: [
            { name: 'Manifest pin check', conclusion: 'success' },
            { name: 'Lint', conclusion: 'success' },
            { name: 'Unit tests', conclusion: 'failure' },
            { name: 'Contract tests', conclusion: 'skipped' },
            { name: 'Data quality tests', conclusion: 'skipped' },
            { name: 'Compatibility tests', conclusion: 'skipped' },
            { name: 'Docker build', conclusion: 'skipped' },
          ],
        },
      ]),
    ).toEqual(['Unit Tests']);
  });

  it('maps failed Manifest pin check to Manifest Pins stage', () => {
    expect(
      mapFailedStages([
        {
          name: 'quality-gate',
          conclusion: 'failure',
          steps: [{ name: 'Manifest pin check', conclusion: 'failure' }],
        },
      ]),
    ).toEqual(['Manifest Pins']);
  });

  it('keeps quality-gate job names from mapping to Data Quality', () => {
    expect(
      mapFailedStages([
        {
          name: 'quality-gate',
          conclusion: 'failure',
          steps: [{ name: 'Install', conclusion: 'failure' }],
        },
      ]),
    ).toEqual([]);
  });
});

describe('public CI payload', () => {
  it('returns a short commit SHA and a GitHub Actions URL', () => {
    expect(
      toPublicRunFields({
        id: 99,
        name: 'CI',
        status: 'completed',
        conclusion: 'success',
        headBranch: 'main',
        headSha: 'a82f921abc1234567890',
        htmlUrl:
          'https://github.com/pharma-data-factory/cold-room-temperature/actions/runs/99',
        startedAt: '2026-08-17T06:00:00Z',
        completedAt: '2026-08-17T06:05:00Z',
      }),
    ).toEqual({
      workflowName: 'CI',
      githubStatus: 'completed',
      conclusion: 'success',
      branch: 'main',
      commitSha: 'a82f921',
      startedAt: '2026-08-17T06:00:00Z',
      completedAt: '2026-08-17T06:05:00Z',
      htmlUrl:
        'https://github.com/pharma-data-factory/cold-room-temperature/actions/runs/99',
    });
  });

  it('does not copy tokens or credentials into the public payload', () => {
    const leaked = {
      status: 'PASSED' as const,
      workflowName: 'CI',
      token: 'ghs_should-not-leak',
      headers: { Authorization: 'Bearer ghs_should-not-leak' },
      installationId: 123,
    };
    const published = publicCiStatus(leaked as never);
    expect(published).toEqual({
      status: 'PASSED',
      representation: 'PASSED',
      workflowName: 'CI',
    });
    expect(JSON.stringify(published)).not.toContain('ghs_');
    expect(JSON.stringify(published)).not.toContain('token');
    expect(JSON.stringify(published)).not.toContain('Authorization');
  });

  it('shortens commit SHAs to 7 characters', () => {
    expect(shortSha('a82f921abc1234567890')).toBe('a82f921');
  });

  it('represents UNKNOWN as DEGRADED / UNVERIFIED and never as PASSED', () => {
    const published = publicCiStatus({
      status: 'UNKNOWN',
      message: 'Not available',
      representation: 'PASSED',
    } as never);
    expect(published.status).toBe('UNKNOWN');
    expect(published.representation).toBe('DEGRADED / UNVERIFIED');
    expect(published.representation).not.toBe('PASSED');
  });
});
