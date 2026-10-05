/**
 * The approval dialog (NXD-128): a signature with justification and PIN for
 * a GMP-relevant product, a confirmation for NONE, and the server's refusal
 * verbatim.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ApprovalDialog, requiresSignature } from './ApprovalDialog';

describe('ApprovalDialog (NXD-128)', () => {
  it('only an explicit NONE is exempt', () => {
    expect(requiresSignature('NONE')).toBe(false);
    expect(requiresSignature('INDIRECT')).toBe(true);
    expect(requiresSignature(undefined)).toBe(true);
  });

  it('GMP: signs only with a justification and a PIN', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <ApprovalDialog act="VERSION_RELEASED" subject="oee 1.0" gxpRelevance="DIRECT" onConfirm={onConfirm} onClose={jest.fn()} />,
    );
    expect(screen.getByText(/I release this product version for use/)).toBeInTheDocument();
    const sign = screen.getByRole('button', { name: 'Sign' });
    expect(sign).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Justification/), { target: { value: 'Gate green.' } });
    expect(sign).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Signing PIN/), { target: { value: 'pin-4711' } });
    fireEvent.click(sign);
    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({ justification: 'Gate green.', pin: 'pin-4711' }),
    );
  });

  it('NONE: confirms without a PIN', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    render(
      <ApprovalDialog act="VERSION_APPROVED" subject="x 1.0" gxpRelevance="NONE" onConfirm={onConfirm} onClose={jest.fn()} />,
    );
    expect(screen.queryByLabelText(/Signing PIN/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith({ justification: undefined, pin: undefined }));
  });

  it("shows the server's refusal", async () => {
    const onConfirm = jest.fn().mockRejectedValue(new Error('Re-authentication failed. Signature rejected.'));
    render(
      <ApprovalDialog act="BASELINE_APPROVED" subject="x 1.0" gxpRelevance="INDIRECT" onConfirm={onConfirm} onClose={jest.fn()} />,
    );
    fireEvent.change(screen.getByLabelText(/Justification/), { target: { value: 'ok' } });
    fireEvent.change(screen.getByLabelText(/Signing PIN/), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Re-authentication failed');
  });
});
