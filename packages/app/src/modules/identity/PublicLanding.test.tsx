import { fireEvent, render, screen, within } from '@testing-library/react';
import { LANDING_LOCALE_STORAGE_KEY } from './landingI18n';
import { PublicLanding } from './PublicLanding';

describe('public landing', () => {
  beforeEach(() => {
    window.localStorage.removeItem(LANDING_LOCALE_STORAGE_KEY);
  });

  it('renders the Nexora commercial experience when unauthenticated', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getAllByText('NEXORA').length).toBeGreaterThan(0);
    expect(
      screen.getByText('DATA PRODUCTS. BUILT FOR PHARMA.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /Keep the core standard\.\s*Innovate through Data Products\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/without turning the operational core into a customization layer/i),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Sign In/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /See how it works/i })).toHaveAttribute(
      'href',
      '#how-it-works',
    );
    expect(screen.getAllByRole('link', { name: /See Golden Paths/i })[0]).toHaveAttribute(
      'href',
      '#golden-paths',
    );
    expect(screen.queryByText('Continue as Guest')).not.toBeInTheDocument();
    expect(screen.queryByText('Continue with GitHub')).not.toBeInTheDocument();
    expect(screen.queryByText(/Backstage/i)).not.toBeInTheDocument();
  });

  it('keeps public navigation to existing product pages', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getAllByRole('link', { name: 'Platform' })[0]).toHaveAttribute(
      'href',
      '/platform/architecture',
    );
    expect(screen.getAllByRole('link', { name: 'Golden Paths' })[0]).toHaveAttribute(
      'href',
      '#golden-paths',
    );
    expect(screen.getAllByRole('link', { name: 'Developers' })[0]).toHaveAttribute(
      'href',
      '/platform/architecture/developer',
    );
    expect(screen.getAllByRole('link', { name: 'Editions' })[0]).toHaveAttribute(
      'href',
      '#editions',
    );
    expect(screen.queryByRole('link', { name: 'How it Works' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Pricing' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Learn' })).not.toBeInTheDocument();
  });

  it('renders the industrial how-it-works path', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getByLabelText('How it works')).toBeInTheDocument();
    for (const step of [
      'Connect',
      'Understand',
      'Compose',
      'Build',
      'Govern',
      'Consume',
    ]) {
      expect(screen.getByRole('heading', { name: step })).toBeInTheDocument();
    }
    expect(
      screen.getByText('REST, MQTT, and IT/OT stay at the edge.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Discover')).not.toBeInTheDocument();
    expect(screen.queryByText('Publish')).not.toBeInTheDocument();
  });

  it('shows all three editions without hiding SaaS behind a toggle', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getByLabelText('Product editions')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Template, Platform, or SaaS' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Customer-hosted/i })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Template' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Platform' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SaaS' })).toBeInTheDocument();
    expect(screen.getAllByText('AVAILABLE FOR PILOT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PLANNED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('FUTURE').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Explore Templates' })).toHaveAttribute(
      'href',
      '#golden-paths',
    );
    expect(screen.getByRole('link', { name: 'Get in Touch' })).toHaveAttribute(
      'href',
      '#contact',
    );
    expect(screen.getByRole('button', { name: 'Coming Later' })).toBeDisabled();
    expect(
      screen.getByText(/SaaS is a future offering and is not available today/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/SaaS is available/i)).not.toBeInTheDocument();
    expect(screen.queryByText('INTERNAL DEVELOPER PLATFORM')).not.toBeInTheDocument();
  });

  it('renders the pricing model without inventing prices', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getByLabelText('Pricing model')).toBeInTheDocument();
    expect(screen.getByText('Per template')).toBeInTheDocument();
    expect(screen.getByText("Let's talk")).toBeInTheDocument();
    expect(screen.getByText('Coming later')).toBeInTheDocument();
    expect(screen.getByText('Contact us for enterprise pricing.')).toBeInTheDocument();
    expect(
      screen.getByText(/Ideal for teams with an existing engineering platform/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/Designed for future AWS Marketplace distribution/i),
    ).toHaveLength(1);
    expect(
      screen.queryByText(/Available on AWS Marketplace/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/€\d/)).not.toBeInTheDocument();
    expect(screen.queryByText(/EUR|USD/)).not.toBeInTheDocument();
  });

  it('proves certified Golden Paths without a future-template wall', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getByLabelText('Golden Path showcase')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'OEE Data Product' })).toBeInTheDocument();
    expect(
      screen.getByText('Built as an independent Data Product — not an MES customization.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'MQTT Temperature Data Product' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'REST Equipment Data Product' })).toBeInTheDocument();
    expect(screen.getAllByText('CERTIFIED').length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText('Snowflake')).not.toBeInTheDocument();
    expect(screen.queryByText('SAP')).not.toBeInTheDocument();
    expect(screen.queryByText('Cold Chain')).not.toBeInTheDocument();
    expect(screen.queryByText(/Planned \/ future Golden Paths/i)).not.toBeInTheDocument();
  });

  it('keeps a short Home story and sends depth to existing pages', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getByLabelText('Why it exists')).toBeInTheDocument();
    expect(screen.getByText(/Do not customize the operational core/i)).toBeInTheDocument();
    expect(
      screen.getByText(/pharmaceutical, biotech, and CDMO teams/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('How it works')).toBeInTheDocument();
    expect(screen.getByLabelText('Golden Path showcase')).toBeInTheDocument();
    expect(
      screen.getByText('Focus on domain value. Not platform plumbing.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'How developers build' }),
    ).toHaveAttribute('href', '/platform/architecture/developer');
    expect(screen.getByLabelText('Architecture overview')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Explore Architecture' }),
    ).toHaveAttribute('href', '/platform/architecture');
    expect(screen.getByLabelText('Product editions')).toBeInTheDocument();
    expect(screen.queryByLabelText('Architecture principle')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('How Nexora fits together')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('img', {
        name: /Nexora control plane around Golden Paths/i,
      }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('img', { name: /ERP · MES · LIMS · EWM · PLC/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Learn')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Platform capabilities')).not.toBeInTheDocument();
    expect(screen.queryByText('What is a Data Product?')).not.toBeInTheDocument();
    expect(screen.queryByText('AAS vs UNS vs Data Product')).not.toBeInTheDocument();
    expect(screen.queryByText('From Filler 01 to OEE')).not.toBeInTheDocument();
  });

  it('offers language selection, Book a Demo, and Sign In instead of a free-tier CTA', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getAllByRole('link', { name: 'Book a Demo' })[0]).toHaveAttribute(
      'href',
      '#contact',
    );
    expect(screen.getAllByRole('button', { name: 'Sign In' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('Start for Free')).not.toBeInTheDocument();
    expect(screen.queryByText('Español')).not.toBeInTheDocument();
    expect(screen.queryByText('Français')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    const languageMenu = screen.getByRole('menu', { name: 'Language' });
    expect(
      within(languageMenu).getByRole('menuitemradio', { name: 'English' }),
    ).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(languageMenu).getByRole('menuitemradio', { name: 'Deutsch' }));

    expect(screen.getAllByRole('link', { name: 'Demo vereinbaren' })[0]).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Anmelden' }).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', {
        name: /Kernsysteme standardisiert halten\.\s*Über Data Products innovieren\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Den operativen Kern nicht anpassen.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Verbinden' })).toBeInTheDocument();
    expect(screen.getByText('Template, Platform oder SaaS')).toBeInTheDocument();
    expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    expect(screen.queryByText('What is a Data Product?')).not.toBeInTheDocument();
  });
});
