/**
 * NXD-138. The PIN page asks for the current PIN exactly when there is one,
 * sends it, and tells a locked seat it cannot change its PIN.
 */

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithApp } from '../../__testUtils__';
import { ursComposerApiRef } from '../../api/ursComposerApi';
import { SigningPinDialog } from './SigningPinDialog';

function api(status: { enrolled: boolean; lockedUntil?: string }) {
  return {
    getSigningPinStatus: jest.fn().mockResolvedValue(status),
    setSigningPin: jest.fn().mockResolvedValue(undefined),
  };
}

async function render(mock: ReturnType<typeof api>, onClose = jest.fn()) {
  await renderWithApp(<SigningPinDialog open onClose={onClose} />, {
    apis: [[ursComposerApiRef, mock as any]],
  });
  await waitFor(() => expect(mock.getSigningPinStatus).toHaveBeenCalled());
  return onClose;
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

describe('SigningPinDialog (NXD-138)', () => {
  it('a first PIN asks for no current PIN and sends none', async () => {
    const mock = api({ enrolled: false });
    const onClose = await render(mock);

    expect(await screen.findByText('Set signing PIN')).toBeInTheDocument();
    expect(screen.queryByLabelText('Current signing PIN')).not.toBeInTheDocument();
    type('New signing PIN', 'first-pin-1');
    type('Confirm signing PIN', 'first-pin-1');
    fireEvent.click(screen.getByRole('button', { name: 'Save PIN' }));

    await waitFor(() =>
      expect(mock.setSigningPin).toHaveBeenCalledWith('first-pin-1', undefined),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('a change asks for the current PIN and sends it', async () => {
    const mock = api({ enrolled: true });
    await render(mock);

    expect(await screen.findByText('Change signing PIN')).toBeInTheDocument();
    type('New signing PIN', 'second-pin-2');
    type('Confirm signing PIN', 'second-pin-2');
    expect(screen.getByRole('button', { name: 'Save PIN' })).toBeDisabled();

    type('Current signing PIN', 'first-pin-1');
    fireEvent.click(screen.getByRole('button', { name: 'Save PIN' }));

    await waitFor(() =>
      expect(mock.setSigningPin).toHaveBeenCalledWith(
        'second-pin-2',
        'first-pin-1',
      ),
    );
  });

  it('shows the server’s refusal of a wrong current PIN verbatim', async () => {
    const mock = api({ enrolled: true });
    mock.setSigningPin.mockRejectedValueOnce(
      new Error('The current signing PIN is wrong. The PIN was not changed.'),
    );
    await render(mock);

    await screen.findByLabelText('Current signing PIN');
    type('Current signing PIN', 'wrong-pin-0');
    type('New signing PIN', 'second-pin-2');
    type('Confirm signing PIN', 'second-pin-2');
    fireEvent.click(screen.getByRole('button', { name: 'Save PIN' }));

    expect(
      await screen.findByText(/current signing PIN is wrong/),
    ).toBeInTheDocument();
  });

  it('a locked seat is told it cannot change the PIN, and is offered no save', async () => {
    const mock = api({
      enrolled: true,
      lockedUntil: '2026-10-07T12:15:00.000Z',
    });
    await render(mock);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /locked .* cannot be\s+changed.*platform administrator/,
    );
    expect(screen.queryByRole('button', { name: 'Save PIN' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('New signing PIN')).not.toBeInTheDocument();
  });
});
