/**
 * TraceMap tests — adapter builds the graph and renders it via NexoraGraphMap.
 */

import { renderWithApp } from '../../__testUtils__';
import { screen } from '@testing-library/react';
import { TraceMap } from './TraceMap';

// React Flow requires ResizeObserver/DOMMatrix APIs that jsdom does not ship.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeAll(() => {
  (globalThis as any).ResizeObserver =
    (globalThis as any).ResizeObserver ?? ResizeObserverMock;
});

const props = {
  capabilityNames: { 'business-capability:make/material-dispensing': 'Material Dispensing' },
  businessNeed:
    'Dispensing operators must weigh and dispense the correct raw material.',
  requirements: [
    { id: 'URS-WD-001', title: 'Weighing event ingestion', acCount: 2 },
    { id: 'URS-WD-002', title: 'Material identification', acCount: 1 },
  ],
  solutionName: 'Weigh & Dispense Station',
};

describe('TraceMap', () => {
  test('renders capability, need, requirements and solution as nodes', () => {
    const { container } = renderWithApp(<TraceMap {...props} />);

    expect(screen.getByTestId('trace-map')).toBeInTheDocument();
    expect(screen.getByText('Material Dispensing')).toBeInTheDocument();
    expect(
      screen.getByText('business-capability:make/material-dispensing'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Dispensing operators must weigh and dispense the correct raw material.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Weighing event ingestion')).toBeInTheDocument();
    expect(screen.getByText('URS-WD-001')).toBeInTheDocument();
    expect(screen.getByText('AC: 2')).toBeInTheDocument();
    expect(screen.getByText('Material identification')).toBeInTheDocument();
    expect(screen.getByText('URS-WD-002')).toBeInTheDocument();
    expect(screen.getByText('AC: 1')).toBeInTheDocument();
    expect(screen.getByText('Weigh & Dispense Station')).toBeInTheDocument();

    // 1 capability→need + 2 need→requirement + 2 requirement→solution
    expect(container.querySelectorAll('.react-flow__edge')).toHaveLength(5);
  });

  test('renders placeholders when the set is empty', () => {
    renderWithApp(
      <TraceMap
        capabilityNames={{}}
        businessNeed=""
        requirements={[]}
        solutionName=""
      />,
    );

    expect(screen.getByText('No capabilities linked')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(screen.getByText('No requirements')).toBeInTheDocument();
  });
});
