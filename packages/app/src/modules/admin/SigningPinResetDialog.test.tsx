/**
 * NXD-138. The administrator's PIN reset: a reason is required, the request
 * names the seat and the reason and carries no PIN, and a refusal is shown in
 * the server's words.
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { discoveryApiRef, fetchApiRef } from '@backstage/core-plugin-api';
import { SigningPinResetDialog } from './SigningPinResetDialog';

function renderDialog(fetch: jest.Mock, onReset = jest.fn(), onClose = jest.fn()) {
  render(
    <TestApiProvider
      apis={[
        [fetchApiRef, { fetch }],
        [discoveryApiRef, { getBaseUrl: async () => 'http://x/api/urs-composer' }],
      ]}
    >
      <SigningPinResetDialog userName="demo-pm" onClose={onClose} onReset={onReset} />
    </TestApiProvider>,
  );
  return { onReset, onClose };
}

describe('SigningPinResetDialog (NXD-138)', () => {
  it('needs a reason, then clears with the seat and reason and no PIN', async () => {
    const fetch = jest.fn().mockResolvedValue({ ok: true, status: 204 });
    const { onReset, onClose } = renderDialog(fetch);

    expect(screen.queryByLabelText(/PIN/)).not.toBeInTheDocument();
    const button = screen.getByRole('button', { name: 'Reset PIN' });
    expect(button).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/Reason/), {
      target: { value: 'Forgotten PIN, ticket 4711' },
    });
    fireEvent.click(button);

    await waitFor(() => expect(onReset).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('http://x/api/urs-composer/signing-pin/reset');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      userEntityRef: 'user:default/demo-pm',
      reason: 'Forgotten PIN, ticket 4711',
    });
  });

  it('shows the refusal verbatim', async () => {
    const fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ error: 'user:default/demo-pm has no signing PIN to reset.' }),
    });
    const { onReset } = renderDialog(fetch);

    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Tidy' } });
    fireEvent.click(screen.getByRole('button', { name: 'Reset PIN' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'user:default/demo-pm has no signing PIN to reset.',
    );
    expect(onReset).not.toHaveBeenCalled();
  });
});
