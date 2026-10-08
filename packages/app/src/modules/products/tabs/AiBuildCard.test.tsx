/**
 * NXD-153. The AI build card: assignments listed with their status, a new one
 * issued with an optional note, refreshed from GitHub; refused for a version
 * that is not a draft.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AiBuildCard, assignmentLines } from './AiBuildCard';
import type { AiBuildAssignment } from '../api';

const base: AiBuildAssignment = {
  id: 'a1',
  productVersionId: 'v1',
  versionLabel: '1.0',
  status: 'DISPATCHED',
  requirements: [
    {
      requirementRef: 'URS-EPM-001',
      ursRequirementVersionId: 'rv1',
      contentHash: 'h1',
    },
    {
      requirementRef: 'URS-EPM-002',
      ursRequirementVersionId: 'rv2',
      contentHash: 'h2',
    },
  ],
  modelId: 'claude-opus-5-5',
  payloadHash: 'sha256:x',
  branch: 'nexora/ai-a1',
  issuedBy: 'user:default/pm',
  issuedAt: '2026-10-08T14:00:00Z',
  updatedAt: '2026-10-08T14:00:00Z',
};

describe('AiBuildCard (NXD-153)', () => {
  it('names requirements, model, who, a refusal reason and the merge commit', () => {
    expect(
      assignmentLines({
        ...base,
        status: 'NOT_DISPATCHED',
        dispatchReason: 'no-ai-build-workflow',
        note: 'API first',
      }),
    ).toEqual([
      'URS-EPM-001, URS-EPM-002 · claude-opus-5-5 · issued by user:default/pm at 2026-10-08T14:00:00Z',
      'Not dispatched: the repository has no .github/workflows/nexora-ai-build.yml on its default branch.',
      'Note: API first',
    ]);
    expect(
      assignmentLines({
        ...base,
        status: 'MERGED',
        mergeCommitSha: 'abcdef1234567890',
        mergedAt: '2026-10-08T15:00:00Z',
      })[1],
    ).toBe('Merged as abcdef123456 at 2026-10-08T15:00:00Z.');
  });

  it('issues an assignment with the note and lists it first, then refreshes it', async () => {
    const issue = jest.fn(async () => base);
    const refresh = jest.fn(async () => ({
      ...base,
      status: 'PR_OPEN' as const,
      pullRequestNumber: 9,
      pullRequestUrl: 'https://github.com/o/r/pull/9',
    }));
    render(
      <AiBuildCard list={async () => []} issue={issue} refresh={refresh} />,
    );
    expect(
      await screen.findByText('No assignment for this version yet.'),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Note for the AI (optional)'), {
      target: { value: ' API first ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Assign to AI build' }));
    expect(await screen.findByText('Dispatched')).toBeInTheDocument();
    expect(issue).toHaveBeenCalledWith('API first');

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByText('Pull request open')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '#9' })).toHaveAttribute(
      'href',
      'https://github.com/o/r/pull/9',
    );
    expect(refresh).toHaveBeenCalledWith('a1');
  });

  it('offers no assignment for a version that is not a draft, and shows an error as an alert', async () => {
    const list = jest.fn(async () => {
      throw new Error('composer answered 503');
    });
    render(
      <AiBuildCard
        list={list}
        issue={jest.fn()}
        refresh={jest.fn()}
        blockedReason="Code is built for a draft version; 1.0 is RELEASED."
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'Assign to AI build' }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Code is built for a draft version; 1.0 is RELEASED.'),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'composer answered 503',
      ),
    );
  });
});
