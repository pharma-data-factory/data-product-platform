import { render, screen } from '@testing-library/react';
import { LoginPage } from './LoginPage';

describe('LoginPage', () => {
  it('renders the Pharma Data Factory login card with GitHub sign-in', () => {
    render(
      <LoginPage
        onGitHubSignIn={() => undefined}
        onBack={() => undefined}
      />,
    );

    expect(screen.getByText('pharma-data-factory')).toBeInTheDocument();
    expect(
      screen.getByText('DATA PRODUCTS. BUILT FOR PHARMA.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sign in to continue')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Continue with GitHub/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Continue as Guest')).not.toBeInTheDocument();
    expect(screen.queryByText(/Development only/i)).not.toBeInTheDocument();
  });

  it('shows Guest only as a development fallback', () => {
    render(
      <LoginPage
        guestEnabled
        onGitHubSignIn={() => undefined}
        onGuestSignIn={() => undefined}
      />,
    );

    expect(screen.getByText('Development only')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Continue as Guest/i }),
    ).toBeInTheDocument();
  });
});
