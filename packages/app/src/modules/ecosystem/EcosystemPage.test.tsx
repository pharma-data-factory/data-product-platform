import { render, screen } from '@testing-library/react';
import { LandingApiProvider } from '../identity/landingTestUtils';
import { LANDING_LOCALE_STORAGE_KEY } from '../identity/landingI18n';
import { EcosystemPage } from './EcosystemPage';

describe('ecosystem pages', () => {
  beforeEach(() => {
    window.localStorage.removeItem(LANDING_LOCALE_STORAGE_KEY);
  });

  it('renders the solutions index on /solutions', () => {
    render(<LandingApiProvider><EcosystemPage pathname="/solutions" /></LandingApiProvider>);

    expect(
      screen.getByRole('heading', { name: /One platform\. Five ways in\./i }),
    ).toBeInTheDocument();
    // Nav and the solutions card both link to Life Sciences.
    expect(
      screen
        .getAllByRole('link', { name: /Life Sciences/ })
        .some(link => link.getAttribute('href') === '/solutions/life-sciences'),
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link', { name: /Technology Partners/ })
        .some(link => link.getAttribute('href') === '/solutions/partners'),
    ).toBe(true);
  });

  it('renders a per-audience solution page with its mapped section', () => {
    render(<LandingApiProvider><EcosystemPage pathname="/solutions/partners" /></LandingApiProvider>);

    expect(
      screen.getByRole('heading', { name: 'Technology Partners' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Marketplace')).toBeInTheDocument();
  });

  it('renders the academy page', () => {
    render(<LandingApiProvider><EcosystemPage pathname="/academy" /></LandingApiProvider>);

    expect(screen.getByLabelText('Nexora Academy')).toBeInTheDocument();
  });

  it('renders the trust page', () => {
    render(<LandingApiProvider><EcosystemPage pathname="/trust" /></LandingApiProvider>);

    expect(screen.getByLabelText('Trust and governance')).toBeInTheDocument();
  });

  it('renders the ecosystem page with the marketplace', () => {
    render(<LandingApiProvider><EcosystemPage pathname="/ecosystem" /></LandingApiProvider>);

    expect(screen.getByLabelText('Ecosystem')).toBeInTheDocument();
    expect(screen.getByLabelText('Marketplace')).toBeInTheDocument();
  });

  it('renders the enterprise page', () => {
    render(<LandingApiProvider><EcosystemPage pathname="/enterprise" /></LandingApiProvider>);

    expect(screen.getByLabelText('Enterprise')).toBeInTheDocument();
  });
});
