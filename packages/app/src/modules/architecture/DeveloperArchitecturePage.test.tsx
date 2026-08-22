import { render, screen, within } from '@testing-library/react';
import { DeveloperArchitecturePage } from './DeveloperArchitecturePage';
import { DEVELOPER_ARCHITECTURE_PATH } from './constants';
import { DEVELOPER_BUILD_STEPS, MQTT_TEMPERATURE_COMPOSITION } from './developerArchitectureData';

describe('DeveloperArchitecturePage', () => {
  it('explains how a developer uses the architecture', () => {
    render(<DeveloperArchitecturePage standalone />);

    expect(screen.getByLabelText('Developer architecture overview')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: 'How a developer builds a Data Product.',
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/public architecture story explains why/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not replace that documentation/i),
    ).toBeInTheDocument();
  });

  it('renders the developer architecture diagram', () => {
    render(<DeveloperArchitecturePage />);
    const diagram = screen.getByRole('group', {
      name: /Developer architecture: Nexora Control Plane/i,
    });

    expect(diagram).toHaveClass('pdf-diag');
    expect(diagram.querySelector('svg')).toBeNull();
    expect(screen.getByText('Catalog')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('GOLDEN PATH')).toBeInTheDocument();
    expect(screen.getByText('composition manifest')).toBeInTheDocument();
    expect(screen.getByText('PLATFORM COMPONENTS')).toBeInTheDocument();
    expect(screen.getByText('GENERATED DATA PRODUCT')).toBeInTheDocument();
    expect(screen.getByText('INDEPENDENT RUNTIME')).toBeInTheDocument();
  });

  it('walks through the developer path and links existing TechDocs', () => {
    render(<DeveloperArchitecturePage />);
    const path = screen.getByLabelText('How developers use the architecture');

    expect(DEVELOPER_BUILD_STEPS).toHaveLength(8);
    expect(within(path).getByText('Choose a certified Golden Path')).toBeInTheDocument();
    expect(
      within(path).getByRole('link', { name: 'Build Your First Data Product (TechDocs)' }),
    ).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/developer/first-data-product',
    );
    expect(
      within(path).getByRole('link', { name: 'Composition docs (TechDocs)' }),
    ).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/platform-components/composition',
    );
    expect(
      within(path).getByRole('link', { name: 'AAS vs Unified Namespace (TechDocs)' }),
    ).toBeInTheDocument();
  });

  it('shows the MQTT Temperature composition manifest without claiming RAG', () => {
    render(<DeveloperArchitecturePage />);
    const manifest = screen.getByLabelText('MQTT Temperature composition manifest');

    expect(manifest).toHaveTextContent(MQTT_TEMPERATURE_COMPOSITION.name);
    expect(manifest).toHaveTextContent('component:default/mqtt-consumer');
    expect(screen.getByLabelText('Status CERTIFIED')).toBeInTheDocument();
    expect(screen.getByText(/OEE Golden Path 1\.0 is technically CERTIFIED/i)).toBeInTheDocument();
    expect(screen.getByText(/RAG and Knowledge Graph remain planned/i)).toBeInTheDocument();
    expect(screen.queryByText(/OEE is available/i)).not.toBeInTheDocument();
  });

  it('reuses Developer Hub and TechDocs instead of a second docs system', () => {
    render(<DeveloperArchitecturePage standalone onSignIn={() => undefined} />);
    const docs = screen.getByLabelText('Existing developer documentation');

    expect(within(docs).getByRole('link', { name: 'Developer Hub' })).toHaveAttribute(
      'href',
      '/developer',
    );
    expect(within(docs).getByRole('link', { name: 'Public architecture story' })).toHaveAttribute(
      'href',
      '/platform/architecture',
    );
    expect(screen.getByText(DEVELOPER_ARCHITECTURE_PATH)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Public architecture' })).toHaveAttribute(
      'href',
      '/platform/architecture',
    );
    expect(screen.getAllByRole('button', { name: /Sign In/i }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/mermaid/i)).not.toBeInTheDocument();
  });
});
