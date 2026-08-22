import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  IndustrialTestRoot,
  nexoraConnectivityApiRef,
  nexoraDataQualityApiRef,
} from '@internal/plugin-nexora-common';
import { QualityDetailPage } from './QualityDetailPage';

const product = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'filler-01-oee',
    title: 'OEE Data Product',
    annotations: { 'nexora.io/product-type': 'oee' },
  },
  spec: { type: 'data-product' },
};

function renderQuality(quality: unknown, connectivity: unknown) {
  return act(async () => {
    render(
      <IndustrialTestRoot>
      <MemoryRouter initialEntries={['/quality/filler-01-oee']}>
        <TestApiProvider
          apis={[
            [catalogApiRef, { getEntities: async () => ({ items: [product] }) } as never],
            [nexoraDataQualityApiRef, { getQuality: async () => quality } as never],
            [
              nexoraConnectivityApiRef,
              { getConnectivity: async () => connectivity } as never,
            ],
          ]}
        >
          <Routes>
            <Route path="/quality/:name" element={<QualityDetailPage />} />
          </Routes>
        </TestApiProvider>
      </MemoryRouter>
      </IndustrialTestRoot>,
    );
  });
}

describe('Data Quality & Connectivity', () => {
  it('renders a healthy quality response and MQTT connectivity', async () => {
    await renderQuality(
      {
        status: 'ok',
        data: {
          freshness: { state: 'HEALTHY', label: 'Freshness', value: '3 sec' },
          completeness: { state: 'HEALTHY', label: 'Completeness', value: '99.8 %' },
          schema: { state: 'HEALTHY', label: 'Schema', value: 'Valid' },
          volume: { state: 'HEALTHY', label: 'Volume', value: 'Normal' },
        },
      },
      {
        status: 'ok',
        data: [{ kind: 'MQTT', name: 'MQTT', state: 'CONNECTED' }],
      },
    );
    expect(screen.getByText('Freshness')).toBeInTheDocument();
    expect(screen.getByText('99.8 %')).toBeInTheDocument();
    expect(screen.getByLabelText('connectivity status CONNECTED')).toBeInTheDocument();
  });

  it('renders warning and error checks', async () => {
    await renderQuality(
      {
        status: 'ok',
        data: {
          freshness: { state: 'ERROR', label: 'Freshness', value: 'stale' },
          completeness: { state: 'WARNING', label: 'Completeness', value: '97.1 %' },
        },
      },
      { status: 'unconfigured' },
    );
    expect(screen.getByLabelText('health status ERROR')).toBeInTheDocument();
    expect(screen.getByLabelText('health status WARNING')).toBeInTheDocument();
  });

  it('handles an unavailable provider', async () => {
    await renderQuality(
      { status: 'unavailable', message: 'Industrial provider is unavailable.' },
      { status: 'unavailable', message: 'Industrial provider is unavailable.' },
    );
    expect(screen.getAllByText('Industrial provider is unavailable.').length).toBeGreaterThan(0);
  });
});
