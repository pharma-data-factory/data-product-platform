import { render, screen, within } from '@testing-library/react';
import {
  ARCHITECTURE_BENEFITS,
  ArchitecturePrinciple,
  CORE_SYSTEMS,
  FACTORY_CAPABILITIES,
  INTERFACES,
  prefersReducedMotion,
} from './ArchitecturePrinciple';
import { AAS_CAPABILITIES, AAS_UNS_MAPPING, PLATFORM_COMPONENT_GROUPS } from './platformStoryData';

function mockMatchMedia(reducedMotion: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches: reducedMotion && /prefers-reduced-motion:\s*reduce/i.test(query),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe('ArchitecturePrinciple', () => {
  beforeEach(() => {
    mockMatchMedia(false);
  });

  it('renders the architecture section without a static image', () => {
    const { container } = render(<ArchitecturePrinciple />);
    const section = screen.getByLabelText('Architecture principle');

    expect(section).toBeInTheDocument();
    expect(
      screen.getByRole('heading', {
        name: /From stable core systems to governed Data Products\./i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/HOW IT FITS TOGETHER/i)).toBeInTheDocument();
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg.pdf-arch-svg')).not.toBeNull();
  });

  it('renders the stable IT/OT core systems', () => {
    render(<ArchitecturePrinciple />);
    const core = screen.getByLabelText('Standard and stable IT/OT core');

    for (const system of CORE_SYSTEMS) {
      expect(within(core).getByText(system)).toBeInTheDocument();
    }
    expect(screen.getByText('Standard & stable IT/OT core')).toBeInTheDocument();
    expect(screen.getByText(/Systems of Record remain stable/i)).toBeInTheDocument();
  });

  it('renders AAS semantics without implying a historian', () => {
    render(<ArchitecturePrinciple />);
    const aas = screen.getByLabelText('Asset Administration Shell');

    expect(within(aas).getByText(/AAS explains what an asset is/i)).toBeInTheDocument();
    expect(within(aas).getByText(/does not store time-series/i)).toBeInTheDocument();
    for (const capability of AAS_CAPABILITIES) {
      expect(within(aas).getByText(capability)).toBeInTheDocument();
    }
    expect(screen.getByLabelText('Filler 01 asset example')).toHaveTextContent('Filler 01');
    expect(screen.getByLabelText('Filler 01 asset example')).toHaveTextContent('Speed');
  });

  it('renders the governed interface layer without implying database access', () => {
    render(<ArchitecturePrinciple />);
    const interfaces = screen.getByLabelText('Governed interfaces');

    for (const label of INTERFACES) {
      expect(within(interfaces).getAllByText(label).length).toBeGreaterThan(0);
    }
    expect(within(interfaces).getByText('OPC UA')).toBeInTheDocument();
    expect(within(interfaces).getByText('Kafka')).toBeInTheDocument();
    expect(screen.getByLabelText('AAS to UNS mapping')).toHaveTextContent(AAS_UNS_MAPPING.topic);
    expect(screen.getByText(/AAS = meaning/i)).toBeInTheDocument();
    expect(screen.queryByText(/database/i)).not.toBeInTheDocument();
  });

  it('renders Platform Components with real status labels', () => {
    render(<ArchitecturePrinciple />);
    const components = screen.getByLabelText('Platform Components');

    expect(within(components).getByText('REST Source')).toBeInTheDocument();
    expect(within(components).getByText('Unified Namespace')).toBeInTheDocument();
    expect(within(components).getByText('Time-Series Storage')).toBeInTheDocument();
    expect(within(components).getByText('RAG')).toBeInTheDocument();
    expect(within(screen.getByLabelText('INTELLIGENCE')).getAllByLabelText('Status PLANNED').length).toBeGreaterThan(0);
    expect(within(screen.getByLabelText('INTEGRATION')).getByLabelText('Status DEVELOPMENT')).toBeInTheDocument();
    expect(PLATFORM_COMPONENT_GROUPS).toHaveLength(4);
  });

  it('renders Golden Path composition including certified OEE', () => {
    render(<ArchitecturePrinciple />);
    const golden = screen.getByLabelText('Golden Path composition');

    expect(within(golden).getByText('MQTT Temperature Data Product')).toBeInTheDocument();
    expect(within(golden).getByText('REST Equipment Data Product')).toBeInTheDocument();
    expect(within(golden).getByText('OEE')).toBeInTheDocument();
    expect(within(screen.getByLabelText('OEE Golden Path composition')).getByText('OEE Domain Logic')).toBeInTheDocument();
    expect(
      within(screen.getByLabelText('OEE Golden Path composition')).getAllByLabelText('Status CERTIFIED').length,
    ).toBeGreaterThan(0);
  });

  it('renders the Nexora enablement layer', () => {
    render(<ArchitecturePrinciple />);
    const factory = screen.getByLabelText('Nexora');

    expect(within(factory).getAllByText('Nexora').length).toBeGreaterThan(0);
    for (const capability of FACTORY_CAPABILITIES) {
      expect(within(factory).getByText(capability)).toBeInTheDocument();
    }
    expect(within(factory).getByText(/does not process all operational data/i)).toBeInTheDocument();
  });

  it('renders certified and illustrative Data Product cards', () => {
    render(<ArchitecturePrinciple />);

    expect(screen.getByLabelText('Temperature Data Product')).toBeInTheDocument();
    expect(screen.getByLabelText('Equipment Data Product')).toBeInTheDocument();
    expect(screen.getByLabelText('Quality Data Product')).toBeInTheDocument();
    expect(screen.getByLabelText('OEE Data Product')).toBeInTheDocument();
    expect(screen.getByLabelText('Cold Chain Data Product')).toBeInTheDocument();

    expect(screen.getByText('MQTT · Certified')).toBeInTheDocument();
    expect(screen.getByText('REST · Certified')).toBeInTheDocument();
    expect(screen.getByText('MQTT+REST · Certified')).toBeInTheDocument();
    expect(screen.getAllByText('Illustrative').length).toBe(2);
    expect(screen.getByText('v1.0')).toBeInTheDocument();
    expect(screen.getByText('v1.1')).toBeInTheDocument();
  });

  it('renders the final architectural message and benefits', () => {
    render(<ArchitecturePrinciple />);

    expect(
      screen.getByText(
        /Keep core systems standard\.\s*Compose digital capabilities\.\s*Deliver governed Data Products\./i,
      ),
    ).toBeInTheDocument();
    const benefits = screen.getByLabelText('Architecture benefits');
    for (const benefit of ARCHITECTURE_BENEFITS) {
      expect(within(benefits).getByText(benefit)).toBeInTheDocument();
    }
    expect(screen.queryByText(/never change/i)).not.toBeInTheDocument();
  });

  it('supports prefers-reduced-motion by rendering the complete architecture', () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);

    const { container } = render(<ArchitecturePrinciple />);
    const section = screen.getByLabelText('Architecture principle');

    expect(section.innerHTML).toMatch(/prefers-reduced-motion:\s*reduce/);
    expect(screen.getByLabelText('Standard and stable IT/OT core')).toBeInTheDocument();
    expect(screen.getByLabelText('Governed interfaces')).toBeInTheDocument();
    expect(screen.getByLabelText('Asset Administration Shell')).toBeInTheDocument();
    expect(screen.getByLabelText('Platform Components')).toBeInTheDocument();
    expect(screen.getByLabelText('Nexora')).toBeInTheDocument();
    expect(screen.getByLabelText('Temperature Data Product')).toBeInTheDocument();
    expect(screen.getByText('v1.1')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Keep core systems standard\.\s*Compose digital capabilities\.\s*Deliver governed Data Products\./i,
      ),
    ).toBeInTheDocument();
    expect(container.querySelector('.pdf-arch-layer.pdf-arch-on')).not.toBeNull();
    expect(container.querySelector('.pdf-arch-finale.pdf-arch-on')).not.toBeNull();
  });
});
