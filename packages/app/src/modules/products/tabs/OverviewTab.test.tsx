import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { OverviewTab } from './OverviewTab';

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

describe('OverviewTab release by a second person (NXD-164)', () => {
  it('names who may not release a release candidate, before anyone tries', async () => {
    renderTab({
      status: 'RELEASE_CANDIDATE',
      approvedBy: 'user:default/demo-pm',
    });
    expect(
      await screen.findByText(
        "Release is a second person's act: anyone with release rights except user:default/demo-pm, who approved this version.",
      ),
    ).toBeInTheDocument();
  });

  it('says nothing of it before the version is a release candidate', async () => {
    renderTab({ status: 'APPROVED', approvedBy: 'user:default/demo-pm' });
    await screen.findByText(/Release readiness/);
    expect(screen.queryByText(/second person's act/)).toBeNull();
  });
});
