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
      screen.getByText('DATA PRODUCTS. BUILT FOR LIFE SCIENCE.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /Keep core systems standardized\.\s*Deliver Data Products around them\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /open platform for Data Products and integrations in life science and industrial environments/i,
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Sign In/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /See how it works/i })).toHaveAttribute(
      'href',
      '#how-it-works',
    );
    expect(screen.getAllByRole('link', { name: /Explore platform/i })[0]).toHaveAttribute(
      'href',
      '#golden-paths',
    );
    expect(screen.getAllByRole('link', { name: /Book a Demo/i })[0]).toHaveAttribute(
      'href',
      '#contact',
    );
    expect(screen.getByLabelText(/How Data Products are consumed/i)).toBeInTheDocument();
    expect(
      within(
        screen.getByLabelText(/Nexora Control Plane beside ERP, MES, LIMS/i),
      ).getByText('NEXORA'),
    ).toBeInTheDocument();
    for (const protocol of ['APIs', 'Events', 'MQTT', 'REST', 'Files / Streams']) {
      expect(screen.getAllByText(protocol).length).toBeGreaterThan(0);
    }
    for (const system of ['ERP', 'MES', 'LIMS', 'EWM', 'Historian', 'CMO']) {
      expect(screen.getAllByText(system).length).toBeGreaterThan(0);
    }
    expect(screen.getByText('Protect the standard')).toBeInTheDocument();
    expect(screen.getByText('Secure & compliant')).toBeInTheDocument();
    expect(screen.getByText(/This is not GxP, CSV, or regulatory validation/i)).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('267')).toBeInTheDocument();
    expect(screen.queryByText(/Data Products: 32/i)).not.toBeInTheDocument();
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
    for (const step of ['Keep the core', 'Generate the product', 'Consume the contract']) {
      expect(screen.getByRole('heading', { name: step })).toBeInTheDocument();
    }
    expect(
      screen.getAllByText(/ERP, MES, LIMS and EWM stay systems of record/i).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText('Connect')).not.toBeInTheDocument();
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
    expect(screen.getByText('Golden Paths (6)')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search Golden Paths...' })).toBeInTheDocument();
    expect(screen.getByTestId('golden-path-category-filter')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'OEE Data Product' })).toBeInTheDocument();
    expect(
      within(screen.getByRole('heading', { name: 'OEE Data Product' }).closest('article')!).getByLabelText(
        'Version 1.0',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Overall Equipment Effectiveness for one asset and one time window/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getAllByRole('heading', { name: 'MQTT Temperature Data Product' }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'REST Equipment Data Product' })).toBeInTheDocument();
    expect(screen.getByText('What it is')).toBeInTheDocument();
    expect(screen.getByText('Why it exists as a product')).toBeInTheDocument();
    expect(screen.getAllByText('CERTIFIED').length).toBeGreaterThanOrEqual(3);
    expect(screen.getAllByText('PLANNED').length).toBeGreaterThanOrEqual(3);
    expect(screen.getByRole('button', { name: 'Explore MQTT Temperature' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore REST Equipment' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore OEE' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore Snowflake' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore SAP' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore Cold Chain' })).toBeInTheDocument();
    expect(screen.queryByText(/Planned \/ future Golden Paths/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Explore OEE' }));
    const detail = screen.getByLabelText('OEE Data Product details');
    expect(within(detail).getByLabelText('Version 1.0')).toBeInTheDocument();
    expect(within(detail).getByText('What it is')).toBeInTheDocument();
    expect(within(detail).getByText('Why it exists as a product')).toBeInTheDocument();
    expect(within(detail).getByText('How the path works')).toBeInTheDocument();
    expect(within(detail).getByText('Typical plant use')).toBeInTheDocument();
    expect(
      within(detail).getByText(/Overall Equipment Effectiveness/i),
    ).toBeInTheDocument();
    expect(within(detail).getByText('Availability')).toBeInTheDocument();
    expect(within(detail).getByText('Performance')).toBeInTheDocument();
    expect(within(detail).getByText('Quality')).toBeInTheDocument();
    expect(
      within(detail).getByText(/ideal cycle time from production context/i),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText(/Plants still compute OEE inside MES customizing/i),
    ).toBeInTheDocument();
    expect(
      within(detail).getByText(/Hourly OEE for a filling or packaging line/i),
    ).toBeInTheDocument();
    expect(within(detail).getByText('Loss analysis')).toBeInTheDocument();
    expect(within(detail).getByText('Microstops')).toBeInTheDocument();
    expect(within(detail).getByText('Reason Hierarchy')).toBeInTheDocument();
    expect(within(detail).getByText('MTBF / MTTR')).toBeInTheDocument();
    expect(within(detail).getByText('Quality Loss')).toBeInTheDocument();
    expect(within(detail).getByText('IN 1.0')).toBeInTheDocument();
    expect(within(detail).getAllByText('FOUNDATION').length).toBeGreaterThan(0);
    expect(
      within(detail).getByText(/not a Six Big Losses, SMED, or GxP model/i),
    ).toBeInTheDocument();
    expect(within(detail).getByText(/not GxP/i)).toBeInTheDocument();
  });

  it('keeps a short Home story and sends depth to existing pages', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getByLabelText('Why Nexora')).toBeInTheDocument();
    expect(screen.getByText(/Digital value without rewriting MES/i)).toBeInTheDocument();
    expect(
      screen.getByText(/life science — pharma, biotech, and CDMO — who need Temperature, Equipment and OEE products/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('How it works')).toBeInTheDocument();
    expect(screen.getByLabelText('Golden Path showcase')).toBeInTheDocument();
    expect(
      screen.getByText('Your team writes the domain logic. Nexora ships the rest.'),
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
    expect(screen.getAllByRole('link', { name: 'Plattform entdecken' })[0]).toHaveAttribute(
      'href',
      '#golden-paths',
    );
    expect(screen.getByText('Standard schützen')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Anmelden' }).length).toBeGreaterThan(0);
    expect(
      screen.getByRole('heading', {
        name: /Kernsysteme standardisiert halten\.\s*Data Products darum herum liefern\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Digitaler Nutzen, ohne MES umzuschreiben.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Kern halten' })).toBeInTheDocument();
    expect(screen.getByText('Template, Platform oder SaaS')).toBeInTheDocument();
    expect(screen.queryByText('Connect')).not.toBeInTheDocument();
    expect(screen.queryByText('What is a Data Product?')).not.toBeInTheDocument();
  });
});
