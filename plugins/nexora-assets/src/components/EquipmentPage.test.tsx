import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { EquipmentPage } from './EquipmentPage';
import { EquipmentDetailPage } from './EquipmentDetailPage';
import {
  IndustrialTestRoot,
  nexoraConnectivityApiRef,
  nexoraEquipmentStateApiRef,
  nexoraMetricsApiRef,
} from '@internal/plugin-nexora-common';

const filler = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'filler-01',
    title: 'FILLER-01',
    annotations: {
      'nexora.io/equipment-id': 'filler-01',
      'nexora.io/site': 'basel',
      'nexora.io/area': 'packaging',
      'nexora.io/line': 'line-04',
      'nexora.io/equipment-type': 'filler',
    },
  },
  spec: {
    type: 'equipment',
    owner: 'group:default/platform-team',
    lifecycle: 'production',
    dependsOn: ['resource:default/mqtt-factory-broker', 'system:default/mes'],
  },
};

const dispenser = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'dispenser-01',
    title: 'DISPENSER-01',
    annotations: {
      'nexora.io/equipment-id': 'dispenser-01',
      'nexora.io/site': 'basel',
      'nexora.io/area': 'packaging',
      'nexora.io/line': 'line-04',
      'nexora.io/equipment-type': 'dispenser',
    },
  },
  spec: { type: 'equipment', dependsOn: ['resource:default/opcua-dispenser'] },
};

const oee = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'filler-01-oee',
    title: 'OEE Data Product',
    annotations: {
      'nexora.io/equipment-id': 'filler-01',
      'nexora.io/product-type': 'oee',
    },
  },
  spec: { type: 'data-product', dependsOn: ['component:default/filler-01'] },
};

const mqtt = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Resource',
  metadata: { name: 'mqtt-factory-broker', title: 'MQTT' },
  spec: { type: 'MQTT' },
};

const mes = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'System',
  metadata: { name: 'mes', title: 'MES' },
  spec: {},
};

const catalog = {
  getEntities: async () => ({ items: [filler, dispenser, oee, mqtt, mes] }),
};

const metrics = {
  getMetrics: async () => ({
    status: 'ok' as const,
    data: [
      { id: 'oee', label: 'Current OEE', value: 82.4, unit: '%' },
      { id: 'last-weight', label: 'Last Weight', value: 24.997, unit: 'kg' },
    ],
  }),
};

const connectivity = {
  getConnectivity: async () => ({
    status: 'ok' as const,
    data: [{ kind: 'MQTT', name: 'MQTT', state: 'CONNECTED' as const }],
  }),
};

const state = {
  getState: async () => ({
    status: 'ok' as const,
    data: { state: 'RUNNING' as const, updatedAt: '3 sec ago' },
  }),
};

async function renderDetail(path: string, metricApi: unknown = metrics, stateApi: unknown = state) {
  await act(async () => {
    render(
      <IndustrialTestRoot>
      <MemoryRouter initialEntries={[path]}>
        <TestApiProvider
          apis={[
            [catalogApiRef, catalog as never],
            [nexoraMetricsApiRef, metricApi as never],
            [nexoraConnectivityApiRef, connectivity as never],
            [nexoraEquipmentStateApiRef, stateApi as never],
          ]}
        >
          <Routes>
            <Route path="/equipment/:name" element={<EquipmentDetailPage />} />
          </Routes>
        </TestApiProvider>
      </MemoryRouter>
      </IndustrialTestRoot>,
    );
  });
}

describe('Asset & Equipment Explorer', () => {
  it('renders the Site → Area → Line tree', async () => {
    await act(async () => {
      render(
        <IndustrialTestRoot>
        <MemoryRouter>
          <TestApiProvider apis={[[catalogApiRef, catalog as never]]}>
            <EquipmentPage />
          </TestApiProvider>
        </MemoryRouter>
        </IndustrialTestRoot>,
      );
    });
    expect(screen.getByLabelText('basel')).toBeInTheDocument();
    expect(screen.getAllByText('packaging').length).toBeGreaterThan(0);
    expect(screen.getAllByText('line-04').length).toBeGreaterThan(0);
    expect(screen.getByText('FILLER-01')).toBeInTheDocument();
  });

  it('renders equipment metadata and related Data Products', async () => {
    await renderDetail('/equipment/filler-01');
    expect(screen.getByRole('heading', { name: 'FILLER-01' })).toBeInTheDocument();
    expect(screen.getByText('basel')).toBeInTheDocument();
    expect(screen.getByText('OEE Data Product')).toBeInTheDocument();
    expect(screen.getAllByText('MQTT').length).toBeGreaterThan(0);
    expect(screen.getByText('MES')).toBeInTheDocument();
    expect(screen.getByText('Current OEE')).toBeInTheDocument();
  });

  it('handles missing runtime integrations', async () => {
    await renderDetail(
      '/equipment/filler-01',
      { getMetrics: async () => ({ status: 'unconfigured' as const }) },
      {
        getState: async () => ({
          status: 'unconfigured' as const,
          message: 'No runtime state integration configured.',
        }),
      },
    );
    expect(
      screen.getByText('No runtime state integration configured.'),
    ).toBeInTheDocument();
  });

  it('renders generic W&D metrics for a dispenser', async () => {
    await renderDetail('/equipment/dispenser-01');
    expect(screen.getByRole('heading', { name: 'DISPENSER-01' })).toBeInTheDocument();
    expect(screen.getByText('Last Weight')).toBeInTheDocument();
  });
});
