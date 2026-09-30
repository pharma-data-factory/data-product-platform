/**
 * NXD-096. Two ways the wizard lost typed work without asking.
 *
 * Cancel navigated away at once, dirty or not; deleting a requirement or an
 * acceptance criterion was immediate and final.
 */

import { useState } from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithApp } from '../../__testUtils__';
import { ursComposerApiRef } from '../../api/ursComposerApi';
import { CreateWizard } from './CreateWizard';
import { AcceptanceCriteriaStep } from './steps/AcceptanceCriteriaStep';
import { RequirementsStep } from './steps/RequirementsStep';
import { initializeWizardState, URSWizardState } from './wizardState';

// The wizard is a heavy render; under a parallel full run a case took longer
// than the 5 s default and failed while passing alone.
jest.setTimeout(15000);

const api = {
  listCapabilities: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  listRequirementSets: jest.fn().mockResolvedValue({ items: [], total: 0 }),
  createRequirementSet: jest.fn(),
  updateRequirementSet: jest.fn(),
};

function requirement(n: number, criteria: string[] = []) {
  return {
    tempId: `tmp-${n}`,
    title: `Requirement title ${n}`,
    statement: `The system shall do thing ${n}.`,
    acceptanceCriteria: criteria.map((title, i) => ({
      tempId: `ac-${n}-${i}`,
      title,
    })),
  };
}

/** Holds wizard state the way CreateWizard does, so undo sees real updates. */
function Harness({
  initial,
  Step,
  onState,
}: {
  initial: URSWizardState;
  Step: typeof RequirementsStep;
  onState: (state: URSWizardState) => void;
}) {
  const [state, setState] = useState(initial);
  return (
    <Step
      state={state}
      onStateChange={updates =>
        setState(prev => {
          const next = { ...prev, ...updates };
          onState(next);
          return next;
        })
      }
    />
  );
}

describe('Cancel with unsaved changes', () => {
  const lastStep = (dirty: boolean): URSWizardState => ({
    ...initializeWizardState(),
    currentStep: 7,
    dirty,
  });

  it('asks before discarding, and keeping editing stays put', async () => {
    const onCancel = jest.fn();
    await renderWithApp(
      <CreateWizard initialState={lastStep(true)} onCancel={onCancel} />,
      { apis: [[ursComposerApiRef, api as any]] },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      await screen.findByRole('dialog', { name: 'Discard unsaved changes?' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('leaves once the user confirms the discard', async () => {
    const onCancel = jest.fn();
    await renderWithApp(
      <CreateWizard initialState={lastStep(true)} onCancel={onCancel} />,
      { apis: [[ursComposerApiRef, api as any]] },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Discard changes' }),
    );
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not ask when there is nothing to lose', async () => {
    const onCancel = jest.fn();
    await renderWithApp(
      <CreateWizard initialState={lastStep(false)} onCancel={onCancel} />,
      { apis: [[ursComposerApiRef, api as any]] },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Undo after delete', () => {
  it('restores a deleted requirement at its position', async () => {
    let latest: URSWizardState | undefined;
    await renderWithApp(
      <Harness
        initial={{
          ...initializeWizardState(),
          requirements: [requirement(1), requirement(2), requirement(3)],
        }}
        Step={RequirementsStep}
        onState={state => (latest = state)}
      />,
      { apis: [[ursComposerApiRef, api as any]] },
    );

    fireEvent.click(screen.getByRole('button', { name: 'Delete requirement 2' }));
    expect(latest?.requirements.map(r => r.tempId)).toEqual(['tmp-1', 'tmp-3']);
    expect(
      await screen.findByText('Requirement 2 "Requirement title 2" deleted'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(latest?.requirements.map(r => r.tempId)).toEqual([
      'tmp-1',
      'tmp-2',
      'tmp-3',
    ]);
    expect(latest?.requirements[1].statement).toBe('The system shall do thing 2.');
  });

  it('restores a deleted acceptance criterion without touching the others', async () => {
    let latest: URSWizardState | undefined;
    const initial: URSWizardState = {
      ...initializeWizardState(),
      requirements: [requirement(1, ['first', 'second']), requirement(2, ['other'])],
    };
    await renderWithApp(
      <Harness
        initial={initial}
        Step={AcceptanceCriteriaStep as typeof RequirementsStep}
        onState={state => (latest = state)}
      />,
      { apis: [[ursComposerApiRef, api as any]] },
    );

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Delete acceptance criterion 1 of requirement 1',
      }),
    );
    expect(latest?.requirements[0].acceptanceCriteria?.map(c => c.title)).toEqual([
      'second',
    ]);
    // The delete used to assign into the requirement held in state.
    expect(initial.requirements[0].acceptanceCriteria).toHaveLength(2);

    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(latest?.requirements[0].acceptanceCriteria?.map(c => c.title)).toEqual([
      'first',
      'second',
    ]);
    expect(latest?.requirements[1].acceptanceCriteria?.map(c => c.title)).toEqual([
      'other',
    ]);
  });
});
