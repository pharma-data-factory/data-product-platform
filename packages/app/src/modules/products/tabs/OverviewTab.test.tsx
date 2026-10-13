import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OverviewTab, releaseExclusionText } from './OverviewTab';

function renderTab(version: Record<string, unknown>) {
  const selected: any = { id: 'v1', version: '1.0', revision: 1, ...version };
  return render(
    <OverviewTab
      product={{ id: 'p1', name: 'oee', lifecycle: 'EXPERIMENTAL' } as any}
      versions={[selected]}
      selectedVersion={selected}
      loadGate={jest.fn().mockResolvedValue({ passed: true, blockers: [] })}
      coverage={null}
      transitionLoading={false}
      actionError={null}
      baselines={[]}
      baselineBusy={false}
      baselineError={null}
      onCreateVersion={jest.fn()}
      onTransition={jest.fn()}
      onSaveGovernance={jest.fn()}
      onCreateBaseline={jest.fn()}
      onApproveBaseline={jest.fn()}
    />,
  );
}

describe('OverviewTab release by a further person (NXD-164/165)', () => {
  it('names who may not release a release candidate, before anyone tries', async () => {
    renderTab({
      status: 'RELEASE_CANDIDATE',
      createdBy: 'user:default/demo-author',
      approvedBy: 'user:default/demo-pm',
    });
    expect(
      await screen.findByText(
        'Release needs a further person: anyone with release rights except user:default/demo-author (author), user:default/demo-pm (approver of this version).',
      ),
    ).toBeInTheDocument();
  });

  it('adds the product baseline approver, once per person', () => {
    expect(
      releaseExclusionText(
        { createdBy: 'user:default/a', approvedBy: 'user:default/pm' } as any,
        [
          { status: 'APPROVED', approvedBy: 'user:default/pm' },
          { status: 'DRAFT' },
        ] as any,
      ),
    ).toBe(
      'Release needs a further person: anyone with release rights except user:default/a (author), user:default/pm (approver of this version, approver of the product baseline).',
    );
  });

  it('says nothing of it before the version is a release candidate', async () => {
    renderTab({ status: 'APPROVED', approvedBy: 'user:default/demo-pm' });
    await screen.findByText(/Release readiness/);
    expect(screen.queryByText(/Release needs a further person/)).toBeNull();
  });
});
