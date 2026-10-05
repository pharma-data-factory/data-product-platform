/**
 * The validation decision panel (NXD-120; rule NXD-119). Pinned: the GMP
 * rule is stated, a signature is offered only to whoever holds the role that
 * is due, everyone else is told who signs next, and a refusal from the
 * server reaches the signer verbatim.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { DecisionPanel, nextStepText } from './DecisionPanel';
import { DecisionStateView, validationExpertApiRef } from '../api';

const CTX = 'VALIDATION-CTX-OEE';

function state(overrides: Partial<DecisionStateView> = {}): DecisionStateView {
  return {
    contextId: CTX,
    gmpRelevant: true,
    products: [{ id: 'p1', name: 'oee-line-3', gxpRelevance: 'DIRECT' }],
    productVersionId: 'v1',
    versions: [
      { id: 'v1', productId: 'p1', productName: 'oee-line-3', version: '1.0', status: 'DRAFT' },
      { id: 'v2', productId: 'p1', productName: 'oee-line-3', version: '1.1', status: 'DRAFT' },
    ],
    signatures: [],
    progress: { complete: false, nextRoles: ['VALIDATION_EXPERT'] },
    myRoles: [],
    ...overrides,
  };
}

const COMPLETE = {
  runId: 'EVIDENCE-RUN-0001',
  candidate: 'oee-line-3 1.0',
  status: 'COMPLETED',
  total: 5,
  passed: 5,
  complete: true,
};

function renderPanel(
  api: Record<string, jest.Mock>,
  extra: { canStartReview?: boolean; onRunCreated?: () => void } = {},
) {
  return render(
    <MemoryRouter>
      <TestApiProvider apis={[[validationExpertApiRef, api as any]]}>
        <DecisionPanel contextId={CTX} {...extra} />
      </TestApiProvider>
    </MemoryRouter>,
  );
}

describe('DecisionPanel (NXD-120)', () => {
  it('states the GMP rule and the product it comes from', async () => {
    renderPanel({ getDecisionState: jest.fn().mockResolvedValue(state()) });
    expect(await screen.findByText('GMP-relevant')).toBeInTheDocument();
    expect(screen.getByText(/oee-line-3 \(DIRECT\)/)).toBeInTheDocument();
    expect(
      screen.getByText('Waiting for the validation expert. QA approves after them.'),
    ).toBeInTheDocument();
  });

  it('offers no signature to someone without a signing role', async () => {
    renderPanel({ getDecisionState: jest.fn().mockResolvedValue(state()) });
    expect(
      await screen.findByText('Signing needs validation-experts membership.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sign as/ })).not.toBeInTheDocument();
  });

  it('tells QA it is not their turn before the expert has signed', async () => {
    renderPanel({
      getDecisionState: jest
        .fn()
        .mockResolvedValue(state({ myRoles: ['QUALITY_ASSURANCE'] })),
    });
    expect(
      await screen.findByText(/It is not your turn: Validation expert signs next/),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Sign as/ })).not.toBeInTheDocument();
  });

  it('lets the expert sign with verdict, justification and PIN, then reloads', async () => {
    const signed = state({
      signatures: [
        {
          id: 's1',
          contextId: CTX,
          role: 'VALIDATION_EXPERT',
          verdict: 'APPROVED',
          justification: 'IQ/OQ passed',
          signedBy: 'user:default/demo-validator',
          signedAt: '2026-10-05T14:00:00Z',
          reauthMethod: 'signature-pin',
        },
      ],
      progress: { complete: false, nextRoles: ['QUALITY_ASSURANCE'] },
      myRoles: ['VALIDATION_EXPERT'],
    });
    const api = {
      getDecisionState: jest
        .fn()
        .mockResolvedValueOnce(state({ myRoles: ['VALIDATION_EXPERT'], evidence: COMPLETE }))
        .mockResolvedValueOnce(signed),
      signDecision: jest.fn().mockResolvedValue(signed),
    };
    renderPanel(api);

    fireEvent.click(await screen.findByRole('button', { name: 'Sign as validation expert' }));
    const sign = screen.getByRole('button', { name: 'Sign' });
    expect(sign).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Justification/), {
      target: { value: 'IQ/OQ passed' },
    });
    fireEvent.change(screen.getByLabelText(/Signing PIN/), {
      target: { value: 'pin-4711' },
    });
    fireEvent.click(sign);

    await waitFor(() =>
      expect(api.signDecision).toHaveBeenCalledWith(CTX, {
        productVersionId: 'v1',
        role: 'VALIDATION_EXPERT',
        verdict: 'APPROVED',
        justification: 'IQ/OQ passed',
        pin: 'pin-4711',
      }),
    );
    expect(
      await screen.findByText('The validation expert has signed. Waiting for QA approval.'),
    ).toBeInTheDocument();
    expect(screen.getByText('user:default/demo-validator')).toBeInTheDocument();
  });

  it('shows the server’s refusal verbatim', async () => {
    const api = {
      getDecisionState: jest
        .fn()
        .mockResolvedValue(state({ myRoles: ['VALIDATION_EXPERT'] })),
      signDecision: jest
        .fn()
        .mockRejectedValue(new Error('Re-authentication failed. Signature rejected.')),
    };
    renderPanel(api);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign as validation expert' }));
    fireEvent.change(screen.getByLabelText(/Justification/), { target: { value: 'ok' } });
    fireEvent.change(screen.getByLabelText(/Signing PIN/), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Re-authentication failed. Signature rejected.',
    );
  });

  it('describes a decided validation', () => {
    expect(
      nextStepText(
        state({
          decision: {
            id: 'd',
            contextId: CTX,
            status: 'APPROVED',
            justification: 'ok',
            decidedBy: 'user:default/demo-quality',
            decidedAt: '2026-10-05T14:10:00Z',
            gmpRule: true,
          },
        }),
      ),
    ).toBe('Approved by the validation expert and QA.');
    expect(
      nextStepText(state({ gmpRelevant: false, progress: { complete: false, nextRoles: ['VALIDATION_EXPERT', 'QUALITY_ASSURANCE'] } })),
    ).toBe('Waiting for one signature: the validation expert or QA.');
  });

  it('allows only a rejection while the product evidence is incomplete (NXD-124)', async () => {
    renderPanel({
      getDecisionState: jest.fn().mockResolvedValue(
        state({
          myRoles: ['VALIDATION_EXPERT'],
          evidence: { ...COMPLETE, passed: 3, complete: false },
        }),
      ),
    });
    expect(
      await screen.findByText(/3 of 5 requirements passed — approval is not possible yet/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Sign as validation expert' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Approve')).toBeDisabled();
    expect(within(dialog).getByLabelText('Reject')).toBeChecked();
  });

  it('starts a product evidence review of a bound version and reloads (NXD-124)', async () => {
    const onRunCreated = jest.fn();
    const api = {
      getDecisionState: jest
        .fn()
        .mockResolvedValueOnce(state())
        .mockResolvedValueOnce(state({ evidence: COMPLETE })),
      startEvidenceReview: jest.fn().mockResolvedValue({ id: 'EVIDENCE-RUN-0001' }),
    };
    renderPanel(api, { canStartReview: true, onRunCreated });
    expect(await screen.findByText(/no review yet/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Run product evidence review' }));
    await waitFor(() => expect(api.startEvidenceReview).toHaveBeenCalledWith(CTX, 'v1'));
    expect(await screen.findByRole('link', { name: 'EVIDENCE-RUN-0001' })).toHaveAttribute(
      'href',
      '/validation-expert/runs/EVIDENCE-RUN-0001',
    );
    expect(onRunCreated).toHaveBeenCalled();
  });

  it('shows the decision of the version picked, and other decisions apart (NXD-127)', async () => {
    const api = {
      getDecisionState: jest
        .fn()
        .mockResolvedValueOnce(
          state({
            otherDecisions: [
              { id: 'legacy', contextId: CTX, status: 'APPROVED', justification: 'x', decidedBy: 'q', decidedAt: 't' },
            ],
          }),
        )
        .mockResolvedValueOnce(state({ productVersionId: 'v2' })),
    };
    renderPanel(api);
    expect(
      await screen.findByText(/recorded per baseline before NXD-127 \(covers no version\): APPROVED/),
    ).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByLabelText('Product version'));
    fireEvent.click(await screen.findByRole('option', { name: /oee-line-3 1.1/ }));
    await waitFor(() => expect(api.getDecisionState).toHaveBeenLastCalledWith(CTX, 'v2'));
  });
});

