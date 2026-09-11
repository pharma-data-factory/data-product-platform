import { renderWithApp } from '../../__testUtils__';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ESignatureDialog } from './ESignatureDialog';
import { SignatureMeaning } from '../../api/types';

const renderDialog = (props: {
  meaning?: SignatureMeaning;
  onConfirm: jest.Mock;
  onClose?: jest.Mock;
  open?: boolean;
}) =>
  renderWithApp(
    <ESignatureDialog
      open={props.open ?? true}
      meaning={props.meaning ?? SignatureMeaning.REVIEWED}
      subject="REQ-004 v2.0"
      onConfirm={props.onConfirm}
      onClose={props.onClose ?? jest.fn()}
    />,
  );

const pinField = () => screen.getByLabelText('Signing PIN');

describe('ESignatureDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('states what the signature means, who signs and what is signed', async () => {
    renderDialog({ onConfirm: jest.fn() });

    // The signed-in user, whoever the app resolves, has to be on screen: a
    // signature nobody can attribute is not a signature.
    expect(await screen.findByText(/^user:default\//)).toBeInTheDocument();
    expect(screen.getByText('REQ-004 v2.0')).toBeInTheDocument();
    expect(
      screen.getByText(/I confirm that I have reviewed this content/),
    ).toBeInTheDocument();
  });

  test('the wording follows the meaning being signed', async () => {
    renderDialog({
      meaning: SignatureMeaning.APPROVED_QA,
      onConfirm: jest.fn(),
    });

    expect(
      await screen.findByText(/on behalf of Quality Assurance/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/I confirm that I authored/),
    ).not.toBeInTheDocument();
  });

  test('cannot be confirmed until a PIN is entered', async () => {
    const onConfirm = jest.fn();
    renderDialog({ onConfirm });

    const sign = await screen.findByRole('button', { name: 'Sign' });
    expect(sign).toBeDisabled();

    fireEvent.change(pinField(), { target: { value: '123456' } });

    expect(sign).not.toBeDisabled();
  });

  test('whitespace alone does not count as a PIN', async () => {
    renderDialog({ onConfirm: jest.fn() });

    fireEvent.change(await pinField(), { target: { value: '   ' } });

    expect(screen.getByRole('button', { name: 'Sign' })).toBeDisabled();
  });

  test('passes the PIN and comment on, and omits an empty comment', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    renderDialog({ onConfirm });

    fireEvent.change(await pinField(), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({
        pin: '123456',
        comment: undefined,
      }),
    );
  });

  test('keeps a comment the signer wrote', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    renderDialog({ onConfirm });

    fireEvent.change(await pinField(), { target: { value: '123456' } });
    fireEvent.change(screen.getByLabelText(/Comment/), {
      target: { value: 'Checked against SOP-12' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));

    await waitFor(() =>
      expect(onConfirm).toHaveBeenCalledWith({
        pin: '123456',
        comment: 'Checked against SOP-12',
      }),
    );
  });

  test('shows why signing was refused and stays open', async () => {
    const onConfirm = jest
      .fn()
      .mockRejectedValue(new Error('Invalid signing PIN'));
    renderDialog({ onConfirm });

    fireEvent.change(await pinField(), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));

    expect(await screen.findByText('Invalid signing PIN')).toBeInTheDocument();
    // Still on the dialog, so the signer can correct the PIN.
    expect(screen.getByRole('button', { name: 'Sign' })).toBeInTheDocument();
  });
});
