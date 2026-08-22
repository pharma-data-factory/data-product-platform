import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { IndustrialTestRoot, nexoraContractApiRef } from '@internal/plugin-nexora-common';
import { ProductContractPage } from './ProductContractPage';

const oee = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'filler-01-oee',
    title: 'OEE Data Product',
    annotations: {
      'nexora.io/equipment-id': 'filler-01',
      'nexora.io/product-type': 'oee',
      'dataprod.platform/version': '1.0',
      'dataprod.platform/domain': 'manufacturing',
    },
  },
  spec: {
    type: 'data-product',
    owner: 'Manufacturing Data Team',
    lifecycle: 'production',
    providesApis: ['filler-01-oee-api'],
  },
};

const consumer = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'operations-dashboard', title: 'Operations Dashboard' },
  spec: {
    type: 'data-product',
    dependsOn: ['component:default/filler-01-oee'],
  },
};

const contractApi = {
  getContract: async () => ({
    status: 'ok' as const,
    data: {
      name: 'OEE Result Contract',
      version: '1.0',
      format: 'JSON Schema',
      compatibility: 'COMPATIBLE' as const,
      fields: ['equipmentId', 'oee', 'calculationStatus'],
      history: [
        { to: '1.0', status: 'COMPATIBLE' as const, current: true },
        { from: '0.9', to: '1.0', status: 'COMPATIBLE' as const },
      ],
      sourceLabel: 'Mock provider',
    },
  }),
  getCapabilities: async () => ({
    status: 'ok' as const,
    data: [
      { level: 'INCLUDED' as const, items: ['Quality Loss'] },
      { level: 'FOUNDATION' as const, items: ['Stop Classification'] },
      { level: 'PLANNED' as const, items: ['Pareto Analysis'] },
    ],
  }),
};

describe('Data Product & Contract Explorer', () => {
  it('renders contract metadata, consumers, and capability groups', async () => {
    await act(async () => {
      render(
        <IndustrialTestRoot>
        <MemoryRouter initialEntries={['/contracts/filler-01-oee']}>
          <TestApiProvider
            apis={[
              [
                catalogApiRef,
                { getEntities: async () => ({ items: [oee, consumer] }) } as never,
              ],
              [nexoraContractApiRef, contractApi as never],
            ]}
          >
            <Routes>
              <Route path="/contracts/:name" element={<ProductContractPage />} />
            </Routes>
          </TestApiProvider>
        </MemoryRouter>
        </IndustrialTestRoot>,
      );
    });
    expect(screen.getByText('OEE Data Product')).toBeInTheDocument();
    expect(screen.getByText('OEE Result Contract')).toBeInTheDocument();
    expect(screen.getByText('Operations Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Quality Loss')).toBeInTheDocument();
    expect(screen.getByText('FOUNDATION')).toBeInTheDocument();
    expect(screen.getByText('0.9 → 1.0 COMPATIBLE')).toBeInTheDocument();
  });

  it('handles a missing contract provider', async () => {
    await act(async () => {
      render(
        <IndustrialTestRoot>
        <MemoryRouter initialEntries={['/contracts/filler-01-oee']}>
          <TestApiProvider
            apis={[
              [catalogApiRef, { getEntities: async () => ({ items: [oee] }) } as never],
              [
                nexoraContractApiRef,
                {
                  getContract: async () => ({
                    status: 'unconfigured' as const,
                    message: 'No contract provider is configured. Compatibility is unknown.',
                  }),
                  getCapabilities: async () => ({ status: 'unconfigured' as const }),
                } as never,
              ],
            ]}
          >
            <Routes>
              <Route path="/contracts/:name" element={<ProductContractPage />} />
            </Routes>
          </TestApiProvider>
        </MemoryRouter>
        </IndustrialTestRoot>,
      );
    });
    expect(
      screen.getByText('No contract provider is configured. Compatibility is unknown.'),
    ).toBeInTheDocument();
  });
});
