import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  normalizeFactory,
  flattenLines,
  flattenEquipment,
  aggregateAreaState,
  findLine,
} from '../../factoryModel';
import { buildValueStreamStages, FactoryFlow } from './FactoryFlow';
import { LineFlow } from './LineFlow';
import { StatusBadge } from './StatusBadge';
import { MaterialFlowView, GenealogyChain } from './MaterialFlow';
import { DataProductLink } from './DataProductLink';
import { EmptyState } from './EmptyState';
import { ScenarioControl } from './ScenarioControl';
import {
  autoinjectorLikeFixture,
  minimalFactoryFixture,
} from '../../__fixtures__/factories';

describe('factoryModel helpers', () => {
  it('normalizes minimal factory topology', () => {
    const sites = normalizeFactory(minimalFactoryFixture);
    expect(sites).toHaveLength(1);
    expect(sites[0].areas).toHaveLength(1);
    expect(flattenLines(sites)).toHaveLength(1);
    expect(flattenEquipment(sites)).toHaveLength(2);
    expect(findLine(sites, 'LINE-A1')?.name).toBe('Line Alpha');
  });

  it('aggregates area state from equipment runtimes', () => {
    const sites = normalizeFactory(minimalFactoryFixture);
    const area = sites[0].areas[0];
    const state = aggregateAreaState(area, {
      'EQ-01': { state: 'RUNNING' },
      'EQ-02': { state: 'BREAKDOWN' },
    });
    expect(state).toBe('BREAKDOWN');
  });
});

describe('genericity — same UI for alternate factories', () => {
  it('builds value-stream stages from minimal factory without Autoinjector ids', () => {
    const sites = normalizeFactory(minimalFactoryFixture);
    const stages = buildValueStreamStages(sites[0].areas, {}, []);
    expect(stages).toHaveLength(1);
    expect(stages[0].area.id).toBe('AREA-A');
    expect(stages[0].area.id).not.toMatch(/DRUG-PRODUCT|PKG-L01/);
  });

  it('renders FactoryFlow for minimal factory', () => {
    const sites = normalizeFactory(minimalFactoryFixture);
    const stages = buildValueStreamStages(
      sites[0].areas,
      {
        'EQ-01': { state: 'RUNNING' },
        'EQ-02': { state: 'IDLE' },
      },
      [],
    );
    render(
      <MemoryRouter>
        <FactoryFlow stages={stages} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Primary Area')).toBeInTheDocument();
    expect(screen.getByText('AREA-A')).toBeInTheDocument();
    expect(screen.queryByText('PKG-L01')).not.toBeInTheDocument();
  });

  it('renders LineFlow for minimal line equipment', () => {
    const sites = normalizeFactory(minimalFactoryFixture);
    const line = flattenLines(sites)[0];
    render(
      <MemoryRouter>
        <LineFlow
          line={line}
          runtimeById={{
            'EQ-01': { state: 'RUNNING', goodCount: 100 },
            'EQ-02': { state: 'IDLE' },
          }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('EQ-01')).toBeInTheDocument();
    expect(screen.getByText('EQ-02')).toBeInTheDocument();
  });

  it('also renders Autoinjector-like packaging stage with same FactoryFlow', () => {
    const sites = normalizeFactory(autoinjectorLikeFixture);
    const stages = buildValueStreamStages(
      sites[0].areas,
      { 'CHECKWEIGHER-01': { state: 'MICROSTOP' } },
      [
        {
          orderId: 'PO-1',
          material: 'FG',
          batch: 'FGB-1',
          targetQuantity: 48000,
          goodQuantity: 31840,
          status: 'IN_PROCESS',
          lineId: 'PKG-L01',
        },
      ],
    );
    render(
      <MemoryRouter>
        <FactoryFlow stages={stages} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Final Packaging')).toBeInTheDocument();
    expect(screen.getByText(/31[’']840/)).toBeInTheDocument();
  });
});

describe('StatusBadge', () => {
  it('exposes status text for accessibility (not color alone)', () => {
    render(<StatusBadge status="MICROSTOP" />);
    expect(screen.getByLabelText(/Status: MICROSTOP/i)).toBeInTheDocument();
    expect(screen.getByText(/MICROSTOP/i)).toBeInTheDocument();
  });
});

describe('Material flow & genealogy', () => {
  it('renders batch nodes and genealogy chain', () => {
    render(
      <MemoryRouter>
        <MaterialFlowView
          batches={[
            {
              batchId: 'B-1',
              materialId: 'MAT',
              orderId: 'O-1',
              status: 'IN_PROCESS',
              goodQuantity: 10,
            },
          ]}
          genealogy={[{ from: 'B-0', to: 'B-1', relation: 'feeds' }]}
          warehouse={[]}
          onSelectBatch={() => undefined}
        />
        <GenealogyChain
          batchId="B-1"
          genealogy={[
            { from: 'B-0', to: 'B-1', relation: 'feeds' },
            { from: 'B-1', to: 'HU-1', relation: 'packs' },
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('B-1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('B-0')).toBeInTheDocument();
    expect(screen.getByText('HU-1')).toBeInTheDocument();
  });
});

describe('DataProductLink & empty states', () => {
  it('builds contextual deep link', () => {
    render(
      <MemoryRouter>
        <DataProductLink
          productName="checkweigher-01-oee"
          site="SITE-1"
          line="L-1"
          equipment="EQ-1"
          label="Open OEE Data Product"
        />
      </MemoryRouter>,
    );
    const link = screen.getByRole('button', { name: /Open OEE Data Product/i });
    expect(link.getAttribute('href')).toContain('/data-products/checkweigher-01-oee');
    expect(link.getAttribute('href')).toContain('equipment=EQ-1');
  });

  it('shows disabled not-connected state', () => {
    render(
      <MemoryRouter>
        <DataProductLink disabled disabledReason="DATA PRODUCT NOT CONNECTED" />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText(/DATA PRODUCT NOT CONNECTED/i)).toBeDisabled();
  });

  it('renders empty state codes', () => {
    render(<EmptyState code="SIMULATION STOPPED" message="Start to continue." />);
    expect(screen.getByText('SIMULATION STOPPED')).toBeInTheDocument();
  });
});

describe('ScenarioControl', () => {
  it('lists scenarios and invokes run', () => {
    const onRun = jest.fn();
    render(
      <ScenarioControl
        scenarios={[{ id: 'SCN-X', name: 'Test Scenario', description: 'desc' }]}
        current="SCN-X"
        simulation="STOPPED"
        onRun={onRun}
        onStart={() => undefined}
        onStop={() => undefined}
        onReset={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Run scenario/i }));
    expect(onRun).toHaveBeenCalledWith('SCN-X');
  });
});
