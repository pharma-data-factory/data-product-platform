import { fireEvent, render, screen, within } from '@testing-library/react';
import { ArchitecturePage } from './ArchitecturePage';
import {
  ARCHITECTURE_OVERVIEW_IMAGE_ALT,
  ARCHITECTURE_OVERVIEW_IMAGE_SRC,
  CATALOG_RELATIONSHIPS,
  DEVELOPER_FLOW_STEPS,
  EXAMPLE_DATA_PRODUCTS,
  FACTORY_CAPABILITIES,
  GOVERNED_INTERFACES,
  RUNTIME_CONSUMERS,
  RUNTIME_STEPS,
  SYSTEM_OF_RECORD_SYSTEMS,
} from './constants';

/** Diagram sections start collapsed; open one by its heading. */
function openDiagram(title: RegExp) {
  fireEvent.click(screen.getByRole('button', { name: title }));
}

/** Open every accordion that wraps a diagram on this page. */
function openAllDiagrams() {
  for (const title of [
    /How the layers fit together/i,
    /AAS explains what an asset is/i,
    /UNS governs operational data flow/i,
    /Reusable technical building blocks/i,
    /Golden Paths compose certified capabilities/i,
    /Independently governed Data Products/i,
    /Governance around independently running products/i,
    /RAG and Knowledge Graph remain planned/i,
    /From core systems to Data Products/i,
    /How an individual Data Product works/i,
    /Build once\. Govern by default\./i,
    /Contracts keep providers and consumers aligned/i,
  ]) {
    fireEvent.click(screen.getByRole('button', { name: title }));
  }
}

describe('ArchitecturePage', () => {
  it('renders the architecture route content with the overview image', () => {
    render(<ArchitecturePage standalone />);

    expect(
      screen.getByRole('heading', {
        name: /Keep Core Systems Standard\.\s*Innovate Through Data Products\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not replace ERP, MES, LIMS, EWM, Historians/i),
    ).toBeInTheDocument();
    const image = screen.getByRole('img', {
      name: ARCHITECTURE_OVERVIEW_IMAGE_ALT,
    });
    expect(image).toHaveAttribute('src', ARCHITECTURE_OVERVIEW_IMAGE_SRC);
    expect(image).toHaveAttribute('loading', 'eager');
    expect(
      screen.queryByRole('img', { name: /Nexora control plane around Golden Paths/i }),
    ).not.toBeInTheDocument();
  });

  it('renders the system architecture diagram', () => {
    render(<ArchitecturePage />);
    openDiagram(/From core systems to Data Products/i);
    const diagram = screen.getByLabelText(
      /System architecture from core systems through governed integration to Data Products/i,
    );

    for (const label of SYSTEM_OF_RECORD_SYSTEMS) {
      expect(within(diagram).getByText(label)).toBeInTheDocument();
    }
    for (const label of GOVERNED_INTERFACES) {
      expect(within(diagram).getByText(label)).toBeInTheDocument();
    }
    for (const label of FACTORY_CAPABILITIES) {
      expect(within(diagram).getAllByText(label).length).toBeGreaterThan(0);
    }
    for (const label of EXAMPLE_DATA_PRODUCTS) {
      expect(within(diagram).getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('renders the Data Product runtime diagram', () => {
    render(<ArchitecturePage />);
    openDiagram(/How an individual Data Product works/i);
    const diagram = screen.getByLabelText(
      /Data Product runtime from source system to consumers/i,
    );

    for (const step of RUNTIME_STEPS) {
      expect(within(diagram).getByText(step)).toBeInTheDocument();
    }
    for (const consumer of RUNTIME_CONSUMERS) {
      expect(within(diagram).getByText(consumer)).toBeInTheDocument();
    }
  });

  it('renders the developer flow', () => {
    render(<ArchitecturePage />);
    openDiagram(/Build once\. Govern by default\./i);
    const diagram = screen.getByLabelText(
      /Developer flow from Golden Path to catalog and documentation/i,
    );

    for (const step of DEVELOPER_FLOW_STEPS) {
      expect(within(diagram).getAllByText(step).length).toBeGreaterThan(0);
    }
    expect(
      screen.getAllByText('Build once. Govern by default.').length,
    ).toBeGreaterThan(0);
  });

  it('renders the contract and consumer diagram', () => {
    render(<ArchitecturePage />);
    openDiagram(/Contracts keep providers and consumers aligned/i);
    const diagram = screen.getByLabelText(
      /Data contract, catalog relationships, and compatibility examples/i,
    );

    expect(within(diagram).getByText('Provider Data Product')).toBeInTheDocument();
    expect(within(diagram).getByText('Data Contract')).toBeInTheDocument();
    expect(within(diagram).getByText('Consumers')).toBeInTheDocument();
    for (const relation of CATALOG_RELATIONSHIPS) {
      expect(within(diagram).getByText(relation)).toBeInTheDocument();
    }
    expect(within(diagram).getByText(/COMPATIBLE/)).toBeInTheDocument();
    expect(within(diagram).getByText(/BREAKING CHANGE/)).toBeInTheDocument();
  });

  it('keeps the system-of-record boundary explicit', () => {
    render(<ArchitecturePage />);

    // Boundary cards use the plural form; diagrams still say "Systems of record".
    expect(screen.getAllByText('SYSTEMS OF RECORD').length).toBeGreaterThan(0);
    expect(screen.getAllByText('DATA PRODUCT').length).toBeGreaterThan(0);
    expect(
      screen.getAllByText('NEXORA CONTROL PLANE').length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/does not connect to those databases directly/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/does not store all enterprise data/i).length,
    ).toBeGreaterThan(0);
    // The boundary card and the hero both state the foundation explicitly.
    expect(screen.getAllByText(/Built on Backstage/i).length).toBeGreaterThan(0);
  });

  it('includes diagram explanations and accessible labels', () => {
    render(<ArchitecturePage />);
    openAllDiagrams();

    expect(screen.getAllByText('WHAT IT DOES').length).toBe(12);
    expect(screen.getAllByText('WHY IT EXISTS').length).toBe(12);
    expect(screen.getAllByText('HOW IT CONNECTS').length).toBe(12);
    expect(screen.getAllByText('WHAT REMAINS DECOUPLED').length).toBe(12);
    expect(
      screen.getByLabelText('Architectural boundary and responsibility model'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Internal Developer Platform fundamentals'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Platform and architecture features'),
    ).toBeInTheDocument();
    expect(screen.getByText('SELF-SERVICE')).toBeInTheDocument();
    expect(screen.getByText('DISCOVER')).toBeInTheDocument();
    expect(screen.getByText('CREATE')).toBeInTheDocument();
    expect(screen.getByLabelText('Compatible contract change')).toBeInTheDocument();
    expect(screen.getByLabelText('Breaking contract change')).toBeInTheDocument();
  });

  it('uses responsive native diagram styling rather than Mermaid', () => {
    const { container } = render(<ArchitecturePage standalone />);
    openAllDiagrams();
    const image = screen.getByRole('img', {
      name: ARCHITECTURE_OVERVIEW_IMAGE_ALT,
    });

    expect(image).toHaveStyle({ width: '100%', height: 'auto' });
    expect(image).toHaveAttribute('width', '1376');
    expect(image).toHaveAttribute('height', '768');
    expect(container.querySelectorAll('.pdf-diag').length).toBeGreaterThanOrEqual(4);
    expect(container.querySelector('.pdf-diag-flow')).not.toBeNull();
    expect(container.textContent).toMatch(/@media \(max-width: 700px\)/);
    expect(container.querySelector('.mermaid')).toBeNull();
    expect(screen.queryByText(/mermaid/i)).not.toBeInTheDocument();
  });

  it('navigates back to the landing page from the architecture CTA', () => {
    render(<ArchitecturePage standalone onSignIn={() => undefined} />);

    expect(screen.getByRole('link', { name: 'Back to landing' })).toHaveAttribute(
      'href',
      '/',
    );
    expect(screen.getAllByRole('button', { name: /Sign In/i }).length).toBeGreaterThan(
      0,
    );
    expect(
      screen.getAllByRole('link', { name: 'Platform' }).every(link =>
        link.getAttribute('href') === '/platform/architecture',
      ),
    ).toBe(true);
    expect(screen.getByRole('link', { name: 'How developers build' })).toHaveAttribute(
      'href',
      '/platform/architecture/developer',
    );
    expect(screen.getByRole('link', { name: 'Explore Golden Paths' })).toHaveAttribute(
      'href',
      '/#golden-paths',
    );
  });

  it('explains AAS, UNS, Platform Components and future capabilities', () => {
    render(<ArchitecturePage />);
    openDiagram(/AAS explains what an asset is/i);
    openDiagram(/UNS governs operational data flow/i);
    openDiagram(/Reusable technical building blocks/i);
    openDiagram(/Golden Paths compose certified capabilities/i);
    openDiagram(/Governance around independently running products/i);
    openDiagram(/RAG and Knowledge Graph remain planned/i);

    expect(screen.getByRole('heading', { name: 'AAS explains what an asset is' })).toBeInTheDocument();
    expect(screen.getByLabelText('AAS versus Unified Namespace')).toBeInTheDocument();
    expect(screen.getByText(/AAS is not a historian/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'UNS governs operational data flow' })).toBeInTheDocument();
    expect(screen.getByLabelText('Platform Component composition groups and status')).toBeInTheDocument();
    expect(screen.getByLabelText('Golden Path lifecycle and examples')).toBeInTheDocument();
    expect(screen.getByLabelText('Control Plane versus data plane')).toBeInTheDocument();
    expect(screen.getByLabelText('Future Intelligence composition')).toBeInTheDocument();
    expect(screen.getAllByLabelText('Status PLANNED').length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText('Status FUTURE').length).toBeGreaterThan(0);
    expect(screen.getByText(/does not require the Control Plane at runtime/i)).toBeInTheDocument();
  });

  it('links authenticated Developer Hub routes from the public architecture page', () => {
    render(<ArchitecturePage standalone />);
    const links = screen.getByLabelText('Authenticated architecture links');

    expect(within(links).getByRole('link', { name: 'Developer Hub Architecture' })).toHaveAttribute(
      'href',
      '/developer',
    );
    expect(within(links).getByRole('link', { name: 'AAS Developer Docs' })).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/aas/index',
    );
    expect(within(links).getByRole('link', { name: 'Component Registry' })).toHaveAttribute(
      'href',
      '/platform-components',
    );
  });
});
