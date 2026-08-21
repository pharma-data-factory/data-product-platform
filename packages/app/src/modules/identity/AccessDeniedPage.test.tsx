import { fireEvent, render, screen } from '@testing-library/react';
import { AccessDeniedPage } from './AccessDeniedPage';
import { ACCESS_DENIED_MESSAGE } from './authErrors';

describe('AccessDeniedPage', () => {
  it('shows the official access-denied message without technical details', () => {
    render(<AccessDeniedPage />);

    expect(
      screen.getByRole('heading', { name: /Access not granted/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toContain(
      ACCESS_DENIED_MESSAGE,
    );
    expect(screen.getByRole('status').textContent).toMatch(
      /Contact your platform administrator/i,
    );
    expect(screen.queryByText(/stack|catalog|Backstage|OAuth/i)).not.toBeInTheDocument();
  });

  it('offers Sign Out and a return to the public landing', () => {
    const onSignOut = jest.fn();
    const onBack = jest.fn();
    render(<AccessDeniedPage onSignOut={onSignOut} onBack={onBack} />);

    fireEvent.click(screen.getByRole('button', { name: /Sign Out/i }));
    fireEvent.click(
      screen.getByRole('button', { name: /Return to landing page/i }),
    );

    expect(onSignOut).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
