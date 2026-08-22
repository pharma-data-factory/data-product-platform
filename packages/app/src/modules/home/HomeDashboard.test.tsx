import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeDashboard } from './HomeDashboard';
import type { DataProduct } from '@internal/plugin-data-products';

const product: DataProduct = {
  name: 'sample-mqtt-temperature-product',
  title: 'MQTT Temperature Data Product',
  description: 'Temperature events',
  owner: 'group:default/platform-team',
  version: '1.0.0',
  lifecycle: 'experimental',
  domain: 'manufacturing',
  sourceSystems: ['mqtt'],
  interfaces: ['REST'],
  apis: [],
  dataContracts: [],
  dataContractVersion: '1.1.0',
  qualityStatus: 'TESTED',
  requiredChecks: [],
  compatibleVersions: [],
  dependsOn: [],
  usedBy: [],
  compatibilityStatus: 'COMPATIBLE',
  dependencies: [],
  certificationStatus: 'DEVELOPMENT',
  entityRef: 'component:default/sample-mqtt-temperature-product',
};

describe('authenticated home', () => {
  it('renders Viewer quick actions', () => {
    render(
      <MemoryRouter>
        <HomeDashboard
          platformRole="VIEWER"
          displayName="Viewer"
          githubLogin="viewer"
          products={[product]}
          recentlyUsed={[product]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Open Developer Hub')).toBeInTheDocument();
    expect(screen.getByText('Explore Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Browse Data Products')).toBeInTheDocument();
    expect(screen.getByText('Search Documentation')).toBeInTheDocument();
    expect(screen.getByText('Release Catalog')).toBeInTheDocument();
    expect(screen.getByText('Golden Paths (6)')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Search Golden Paths...' })).toBeInTheDocument();
    expect(screen.getByTestId('golden-path-category-filter')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Explore MQTT Temperature' })).toBeInTheDocument();
    expect(screen.getByText('What it is')).toBeInTheDocument();
    expect(screen.getByText('Why it exists as a product')).toBeInTheDocument();
    expect(screen.queryByText('Create Data Product')).not.toBeInTheDocument();
    expect(screen.getByText('My Data Products')).toBeInTheDocument();
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
    expect(screen.getByText('Quality & CI')).toBeInTheDocument();
    expect(screen.getByText('Platform updates')).toBeInTheDocument();
    expect(screen.getByText('CI Quality Gate')).toBeInTheDocument();
    expect(screen.getAllByText('SAMPLE').length).toBeGreaterThan(0);
    expect(screen.getByText(/Role: Viewer/i)).toBeInTheDocument();
    expect(screen.getByText(/GitHub: viewer/i)).toBeInTheDocument();
    expect(screen.queryByText('View Catalog')).not.toBeInTheDocument();
  });

  it('renders Developer, Owner, and Admin actions', () => {
    const { rerender } = render(
      <MemoryRouter>
        <HomeDashboard
          platformRole="DEVELOPER"
          products={[]}
          recentlyUsed={[]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Create Data Product')).toBeInTheDocument();
    expect(screen.getByText('Explore Marketplace')).toBeInTheDocument();
    expect(
      screen.getByText('You have no Data Products yet. Create one from the Marketplace.'),
    ).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <HomeDashboard
          platformRole="DATA_PRODUCT_OWNER"
          products={[]}
          recentlyUsed={[]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Create Data Product')).toBeInTheDocument();
    expect(screen.getByText('Browse Data Products')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <HomeDashboard
          platformRole="PLATFORM_ADMIN"
          products={[]}
          recentlyUsed={[]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Manage Platform')).toBeInTheDocument();
    expect(screen.getByText('Create Data Product')).toBeInTheDocument();
  });

  it('does not grant Viewer messaging on the authenticated home', () => {
    render(
      <MemoryRouter>
        <HomeDashboard
          platformRole="VIEWER"
          displayName="Viewer"
          githubLogin="viewer"
          products={[]}
          recentlyUsed={[]}
        />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Viewer access/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/do not have an approved platform role/i),
    ).not.toBeInTheDocument();
  });
});
