import { fireEvent, render, screen, within } from '@testing-library/react';
import { LANDING_LOCALE_STORAGE_KEY } from './landingI18n';
import { PublicLanding } from './PublicLanding';

function hasLink(name: string | RegExp, href: string): boolean {
  return screen
    .getAllByRole('link', { name })
    .some(link => link.getAttribute('href') === href);
}

describe('public landing', () => {
  beforeEach(() => {
    window.localStorage.removeItem(LANDING_LOCALE_STORAGE_KEY);
  });

  it('positions Nexora as the open manufacturing platform for life sciences', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getAllByText('NEXORA').length).toBeGreaterThan(0);
    expect(
      screen.getByText('THE OPEN MANUFACTURING PLATFORM FOR LIFE SCIENCES'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /Connect systems\.\s*Build capabilities\.\s*Share solutions\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/open, extensible manufacturing platform/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Not open-source software/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Sign In/i }).length).toBeGreaterThan(0);
  });

  it('wires the hero CTAs to on-page sections without dead links', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(hasLink('Explore the Platform', '#platform')).toBe(true);
    expect(hasLink('Explore Marketplace', '#marketplace')).toBe(true);
    expect(hasLink('Build a Plugin', '#build')).toBe(true);
    expect(hasLink('For Enterprises', '#enterprise')).toBe(true);
  });

  it('keeps public navigation across platform and ecosystem sections', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(hasLink('Platform', '/platform/architecture')).toBe(true);
    expect(hasLink('Solutions', '/solutions')).toBe(true);
    expect(hasLink('Ecosystem', '/ecosystem')).toBe(true);
    expect(hasLink('Academy', '/academy')).toBe(true);
    expect(hasLink('Trust', '/trust')).toBe(true);
    expect(hasLink('Enterprise', '/enterprise')).toBe(true);
  });

  it('renders the problem, platform and journey sections', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getByLabelText('The problem')).toBeInTheDocument();
    for (const system of ['MES', 'ERP', 'LIMS', 'SCADA', 'Historian', 'IoT']) {
      expect(screen.getAllByText(system).length).toBeGreaterThan(0);
    }

    expect(screen.getByLabelText('The Nexora platform')).toBeInTheDocument();
    for (const capability of ['CONNECT', 'CREATE', 'TRUST', 'GOVERN', 'DISCOVER', 'OPERATE']) {
      expect(screen.getByText(capability)).toBeInTheDocument();
    }

    expect(screen.getByLabelText('Choose your journey')).toBeInTheDocument();
    for (const audience of [
      'Life Sciences',
      'Enterprise IT',
      'Consultants & Integrators',
      'Technology Partners',
      'Developers',
    ]) {
      expect(screen.getByRole('heading', { name: audience })).toBeInTheDocument();
    }
  });

  it('presents the marketplace with real items and clearly labelled examples', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    const marketplace = screen.getByLabelText('Marketplace');
    expect(
      within(marketplace).getByRole('heading', { name: 'Discover. Install. Configure. Govern.' }),
    ).toBeInTheDocument();
    expect(within(marketplace).getByText('Live on the marketplace today')).toBeInTheDocument();
    expect(within(marketplace).getByText('Example — coming to the marketplace')).toBeInTheDocument();

    for (const liveItem of ['OEE Data Product', 'AAS Asset Administration Shell', 'MQTT Connector']) {
      expect(within(marketplace).getByRole('heading', { name: liveItem })).toBeInTheDocument();
    }
    expect(within(marketplace).getAllByText('CERTIFIED').length).toBeGreaterThan(0);

    expect(within(marketplace).getByRole('heading', { name: 'SAP Manufacturing Connector' })).toBeInTheDocument();
    expect(within(marketplace).getAllByText('EXAMPLE').length).toBeGreaterThan(0);

    expect(within(marketplace).getByRole('link', { name: 'Open the Marketplace' })).toHaveAttribute(
      'href',
      '/marketplace',
    );
  });

  it('renders the build surface, trust model, academy and flywheel', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getByLabelText('Build on Nexora')).toBeInTheDocument();
    for (const artifact of ['Plugins', 'Connectors', 'Applications', 'Data Products', 'Workflows', 'Templates']) {
      expect(screen.getAllByText(artifact).length).toBeGreaterThan(0);
    }
    for (const dev of ['SDK', 'APIs', 'Golden Paths', 'Developer Portal', 'Documentation']) {
      expect(screen.getAllByText(dev).length).toBeGreaterThan(0);
    }
    expect(hasLink('Start Building', '/platform/architecture/developer')).toBe(true);

    expect(screen.getByLabelText('Trust and governance')).toBeInTheDocument();
    for (const level of ['Community', 'Verified', 'Enterprise Ready', 'Validation Ready']) {
      expect(screen.getByRole('heading', { name: level })).toBeInTheDocument();
    }
    expect(screen.getByText('AI-assisted validation readiness')).toBeInTheDocument();
    expect(screen.getByText(/does not perform validation/i)).toBeInTheDocument();
    expect(screen.getByText('Evidence generation')).toBeInTheDocument();

    expect(screen.getByLabelText('Nexora Academy')).toBeInTheDocument();
    expect(screen.getByText('Build your first Nexora Plugin')).toBeInTheDocument();
    expect(screen.getByText(/not available in the current release/i)).toBeInTheDocument();

    expect(screen.getByLabelText('Ecosystem')).toBeInTheDocument();
    expect(screen.getByText('The ecosystem grows')).toBeInTheDocument();
  });

  it('renders enterprise services and a four-path final CTA', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getByLabelText('Enterprise')).toBeInTheDocument();
    expect(screen.getByText('Private marketplace')).toBeInTheDocument();
    expect(hasLink('Talk to us', '#contact')).toBe(true);

    expect(screen.getByRole('heading', { name: 'Choose your path.' })).toBeInTheDocument();
    for (const [label, href] of [
      ['Use Nexora', '#journey'],
      ['Build on Nexora', '#build'],
      ['Publish on Nexora', '#marketplace'],
      ['Partner with Nexora', '#enterprise'],
    ]) {
      expect(hasLink(label, href)).toBe(true);
    }
  });

  it('keeps certified Golden Paths and the three editions as proof', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    const goldenPaths = screen.getByLabelText('Golden Path showcase');
    expect(within(goldenPaths).getByRole('heading', { name: 'OEE Data Product' })).toBeInTheDocument();

    const editions = screen.getByLabelText('Product editions');
    expect(within(editions).getByRole('heading', { name: 'Template' })).toBeInTheDocument();
    expect(within(editions).getByRole('heading', { name: 'Platform' })).toBeInTheDocument();
    expect(within(editions).getByRole('heading', { name: 'SaaS' })).toBeInTheDocument();
  });

  it('offers language selection and does not claim open source or GxP validation', () => {
    render(<PublicLanding onSignIn={() => undefined} />);

    expect(screen.getAllByRole('link', { name: 'Book a Demo' })[0]).toHaveAttribute('href', '#contact');
    expect(screen.queryByText('Start for Free')).not.toBeInTheDocument();
    expect(screen.queryByText(/Backstage/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/open-source Backstage framework/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/validates GxP/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Language' }));
    const languageMenu = screen.getByRole('menu', { name: 'Language' });
    fireEvent.click(within(languageMenu).getByRole('menuitemradio', { name: 'Deutsch' }));

    expect(
      screen.getByRole('heading', {
        name: /Systeme verbinden\.\s*Fähigkeiten bauen\.\s*Lösungen teilen\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('DIE OFFENE MANUFACTURING-PLATTFORM FÜR LIFE SCIENCES')).toBeInTheDocument();
    expect(hasLink('Marketplace entdecken', '#marketplace')).toBe(true);
    expect(screen.getByText('Technologie-Partner')).toBeInTheDocument();
    expect(screen.getByText(/Keine Open-Source-Software/)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Wählen Sie Ihren Weg.' })).toBeInTheDocument();
  });
});
