import { render, screen } from '@testing-library/react';
import { LANDING_LOCALE_STORAGE_KEY } from '../identity/landingI18n';
import { EcosystemPage } from './EcosystemPage';

describe('ecosystem pages', () => {
  beforeEach(() => {
    window.localStorage.removeItem(LANDING_LOCALE_STORAGE_KEY);
  });

  it('renders the solutions index on /solutions', () => {
    render(<EcosystemPage pathname="/solutions" />);

    expect(
      screen.getByRole('heading', { name: /One platform\. Five ways in\./i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Life Sciences/ }),
    ).toHaveAttribute('href', '/solutions/life-sciences');
    expect(
      screen.getByRole('link', { name: /Technology Partners/ }),
    ).toHaveAttribute('href', '/solutions/partners');
  });

  it('renders a per-audience solution page with its mapped section', () => {
    render(<EcosystemPage pathname="/solutions/partners" />);

    expect(
      screen.getByRole('heading', { name: 'Technology Partners' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Marketplace')).toBeInTheDocument();
  });

  it('renders the academy page', () => {
    render(<EcosystemPage pathname="/academy" />);

    expect(screen.getByLabelText('Nexora Academy')).toBeInTheDocument();
  });

  it('renders the trust page', () => {
    render(<EcosystemPage pathname="/trust" />);

    expect(screen.getByLabelText('Trust and governance')).toBeInTheDocument();
  });

  it('renders the ecosystem page with the marketplace', () => {
    render(<EcosystemPage pathname="/ecosystem" />);

    expect(screen.getByLabelText('Ecosystem')).toBeInTheDocument();
    expect(screen.getByLabelText('Marketplace')).toBeInTheDocument();
  });

  it('renders the enterprise page', () => {
    render(<EcosystemPage pathname="/enterprise" />);

    expect(screen.getByLabelText('Enterprise')).toBeInTheDocument();
  });
});
