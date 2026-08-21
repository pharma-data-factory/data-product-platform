import { fireEvent, render, screen, within } from '@testing-library/react';
import { FitsTogetherSection } from './FitsTogetherSection';
import {
  AUTHENTICATED_ARCHITECTURE_LINKS,
  COMMERCIAL_EDITION_STORY,
  FILLER_TO_OEE_STEPS,
  LAYER_COMPARISON,
  LAYER_ROLE_CARDS,
} from './platformStoryData';

describe('FitsTogetherSection', () => {
  it('renders layer explanation cards', () => {
    render(<FitsTogetherSection onSignIn={() => undefined} />);

    expect(screen.getByLabelText('How Nexora fits together')).toBeInTheDocument();
    const layers = screen.getByLabelText('What each layer does');
    for (const card of LAYER_ROLE_CARDS) {
      expect(within(layers).getByText(card.title)).toBeInTheDocument();
    }
  });

  it('renders the AAS vs UNS vs Data Product comparison', () => {
    render(<FitsTogetherSection />);
    const table = screen.getByLabelText('AAS vs UNS vs Data Product comparison');

    for (const row of LAYER_COMPARISON) {
      expect(within(table).getByText(row.title)).toBeInTheDocument();
      expect(within(table).getByText(row.question)).toBeInTheDocument();
    }
  });

  it('renders the Filler 01 to OEE customer story with certified OEE and future consumers', () => {
    render(<FitsTogetherSection />);
    const story = screen.getByLabelText('From Filler 01 to OEE');

    expect(FILLER_TO_OEE_STEPS).toHaveLength(6);
    expect(within(story).getByText(/AAS knows the asset/i)).toBeInTheDocument();
    expect(within(story).getByText(/OEE Golden Path 1\.0 composes Wave 1/i)).toBeInTheDocument();
    expect(within(story).getByText(/AI Assistant is a future consumer/i)).toBeInTheDocument();
    expect(within(story).getAllByLabelText('Status CERTIFIED').length).toBeGreaterThanOrEqual(3);
    expect(within(story).getAllByLabelText('Status FUTURE').length).toBeGreaterThanOrEqual(1);
  });

  it('connects architecture to editions without claiming SaaS is available', () => {
    render(<FitsTogetherSection />);
    const commercial = screen.getByLabelText('Commercial distribution');

    expect(commercial).toHaveTextContent('BUILD ONCE');
    expect(commercial).toHaveTextContent('CERTIFY');
    expect(commercial).toHaveTextContent('RELEASE');
    expect(commercial).toHaveTextContent('DISTRIBUTE');
    for (const edition of COMMERCIAL_EDITION_STORY) {
      expect(screen.getByText(edition.title)).toBeInTheDocument();
    }
    expect(screen.getByText(/SaaS is future/i)).toBeInTheDocument();
    expect(screen.queryByText(/SaaS is available/i)).not.toBeInTheDocument();
  });

  it('provides architecture CTAs including Sign In', () => {
    const onSignIn = jest.fn();
    render(<FitsTogetherSection onSignIn={onSignIn} />);
    const actions = screen.getByLabelText('Architecture story actions');

    expect(within(actions).getByRole('link', { name: 'Explore Platform Architecture' })).toHaveAttribute(
      'href',
      '/platform/architecture',
    );
    expect(within(actions).getByRole('link', { name: 'Explore Golden Paths' })).toHaveAttribute(
      'href',
      '#golden-paths',
    );
    fireEvent.click(within(actions).getByRole('button', { name: 'Sign In' }));
    expect(onSignIn).toHaveBeenCalled();
  });

  it('marks authenticated Developer Hub routes', () => {
    render(<FitsTogetherSection />);
    const links = screen.getByLabelText('Authenticated architecture links');

    expect(screen.getByText(/require Sign In/i)).toBeInTheDocument();
    for (const link of AUTHENTICATED_ARCHITECTURE_LINKS) {
      expect(within(links).getByRole('link', { name: link.label })).toHaveAttribute('href', link.href);
    }
  });

  it('explains the stack in text instead of the hero architecture diagram', () => {
    const { container } = render(<FitsTogetherSection />);

    expect(
      screen.queryByRole('img', { name: /Nexora control plane/i }),
    ).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.getByText(/Those systems of record stay/i)).toBeInTheDocument();
  });
});
