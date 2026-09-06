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

const other: DataProduct = {
  ...product,
  name: 'other-product',
  title: 'Other Product',
};

describe('authenticated home', () => {
  it('shows the build CTA and core actions for developers', () => {
    render(
      <MemoryRouter>
        <HomeDashboard
          platformRole="DEVELOPER"
          displayName="Developer"
          products={[product]}
          recentlyUsed={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Welcome, Developer')).toBeInTheDocument();
    expect(screen.getByText('Build a Data Product')).toBeInTheDocument();
    expect(screen.getByText('What can I do?')).toBeInTheDocument();
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByText('My Products')).toBeInTheDocument();
    expect(screen.getByText('Validate')).toBeInTheDocument();
    expect(screen.queryByText('Marketplace')).not.toBeInTheDocument();
    expect(screen.queryByText('Model Company')).not.toBeInTheDocument();
    expect(screen.getByText('My Data Products')).toBeInTheDocument();
    expect(screen.getByText('MQTT Temperature Data Product')).toBeInTheDocument();
  });

  it('points viewers at the Marketplace instead of Build', () => {
    render(
      <MemoryRouter>
        <HomeDashboard
          platformRole="VIEWER"
          displayName="Viewer"
          products={[]}
          recentlyUsed={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Explore Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Model Company')).toBeInTheDocument();
    expect(screen.queryByText('Build')).not.toBeInTheDocument();
    expect(screen.queryByText('Build a Data Product')).not.toBeInTheDocument();
    expect(screen.queryByText('Manage Platform')).not.toBeInTheDocument();
  });

  it('points platform admins at platform management', () => {
    render(
      <MemoryRouter>
        <HomeDashboard
          platformRole="PLATFORM_ADMIN"
          products={[]}
          recentlyUsed={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Manage Platform')).toBeInTheDocument();
    expect(screen.queryByText('Build a Data Product')).not.toBeInTheDocument();
  });

  it('caps the product list at six and shows a view-all link', () => {
    const many: DataProduct[] = Array.from({ length: 10 }, (_, i) => ({
      ...product,
      name: `product-${i}`,
      title: `Product ${i}`,
    }));

    render(
      <MemoryRouter>
        <HomeDashboard
          platformRole="PLATFORM_ADMIN"
          products={many}
          recentlyUsed={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/^Product \d$/)).toHaveLength(6);
    expect(screen.getByText('View all Data Products →')).toBeInTheDocument();
  });

  it('shows recently used products as cards without duplicating them in the list', () => {
    render(
      <MemoryRouter>
        <HomeDashboard
          platformRole="DEVELOPER"
          products={[product, other]}
          recentlyUsed={[product]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Continue where you left off')).toBeInTheDocument();
    expect(screen.getByText('MQTT Temperature Data Product')).toBeInTheDocument();
    expect(screen.getByText('Other Product')).toBeInTheDocument();
    expect(screen.queryByText('View all Data Products →')).not.toBeInTheDocument();
  });

  it('renders the empty state when there are no products', () => {
    render(
      <MemoryRouter>
        <HomeDashboard
          platformRole="VIEWER"
          displayName="Viewer"
          products={[]}
          recentlyUsed={[]}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText(/No Data Products yet/i)).toBeInTheDocument();
  });
});
