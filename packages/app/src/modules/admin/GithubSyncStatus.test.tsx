import { fireEvent, render, screen } from '@testing-library/react';
import {
  GithubSyncBanner,
  GithubSyncChips,
  GithubSyncStatusResponse,
  syncRowsFor,
  teamsWithFailures,
} from './GithubSyncStatus';

const status: GithubSyncStatusResponse = {
  enabled: true,
  organization: 'pharma-data-factory',
  teams: { 'data-product-developers': 'nexora-developers' },
  lastRun: {
    startedAt: '2026-10-02T10:00:00Z',
    finishedAt: '2026-10-02T10:00:05Z',
    teams: [
      {
        team: 'nexora-developers',
        ok: true,
        added: ['ann'],
        invited: [],
        removed: [],
        unmanaged: [],
        failed: [{ user: 'outsider', reason: 'not-in-org' }],
      },
      {
        team: 'nexora-admins',
        ok: false,
        reason: 'not-found',
        added: [],
        invited: [],
        removed: [],
        unmanaged: [],
        failed: [],
      },
      {
        team: 'nexora-owners',
        ok: true,
        added: [],
        invited: [],
        removed: [],
        unmanaged: [],
        failed: [],
      },
    ],
  },
  states: [
    {
      userId: 'ann',
      teamSlug: 'nexora-developers',
      status: 'active',
      lastChecked: '2026-10-02T10:00:05Z',
    },
    {
      userId: 'outsider',
      teamSlug: 'nexora-developers',
      status: 'not_in_org',
      lastChecked: '2026-10-02T10:00:05Z',
      lastError: 'not-in-org: Validation Failed',
    },
  ],
};

describe('GitHub sync status (NXD-108)', () => {
  it('selects the rows for one login, case-insensitively', () => {
    expect(syncRowsFor(status, 'Ann').map(r => r.status)).toEqual(['active']);
    expect(syncRowsFor(status, 'nobody')).toEqual([]);
    expect(syncRowsFor(null, 'ann')).toEqual([]);
  });

  it('counts teams that could not be read or had a refused call', () => {
    expect(teamsWithFailures(status).map(t => t.team)).toEqual([
      'nexora-developers',
      'nexora-admins',
    ]);
  });

  it('shows one chip per team with the state in words', () => {
    render(<GithubSyncChips rows={syncRowsFor(status, 'outsider')} />);
    expect(screen.getByText('nexora-developers: not in org')).toBeTruthy();
  });

  it('says so when a user is in no synced team', () => {
    render(<GithubSyncChips rows={[]} />);
    expect(screen.getByText('GitHub: no team')).toBeTruthy();
  });

  it('names the failing teams and starts a run on demand', () => {
    const onRun = jest.fn();
    render(<GithubSyncBanner status={status} running={false} onRun={onRun} />);

    expect(
      screen.getByText('GitHub team sync — pharma-data-factory'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        /2 team\(s\) with failures: nexora-developers \(1 refused\), nexora-admins \(not-found\)/,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(/URS approval roles are\s+never synced/),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Sync now' }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('disables the button while a run is being started', () => {
    render(<GithubSyncBanner status={status} running onRun={jest.fn()} />);
    expect(
      (screen.getByRole('button', { name: 'Starting…' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it('reports a backend instance that has not run yet', () => {
    render(
      <GithubSyncBanner
        status={{ ...status, lastRun: null }}
        running={false}
        onRun={jest.fn()}
      />,
    );
    expect(
      screen.getByText(/No run recorded on this backend instance yet/),
    ).toBeTruthy();
  });
});
