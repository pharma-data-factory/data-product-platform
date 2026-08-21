import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { PlatformComplianceCard } from './PlatformComplianceCard';
import { DataProduct } from '../model';

const product: DataProduct = {
  name: 'cold-room-temperature',
  title: 'Cold Room Temperature',
  description: 'MQTT temperature product',
  owner: 'guests',
  version: '1.0.0',
  lifecycle: 'experimental',
  domain: 'manufacturing',
  sourceSystems: ['mqtt'],
  interfaces: ['REST'],
  apis: ['cold-room-temperature--temperature-event'],
  dataContracts: [],
  dataContractVersion: '1.1.0',
  qualityStatus: 'TESTED',
  requiredChecks: ['lint', 'test'],
  compatibleVersions: [],
  dependsOn: [],
  usedBy: [],
  compatibilityStatus: 'UNKNOWN',
  dependencies: [],
  certificationStatus: 'DEVELOPMENT',
  entityRef: 'component:default/cold-room-temperature',
};

describe('Platform Compliance documentation', () => {
  it('links the Data Product Standard from Platform Compliance', () => {
    render(
      <MemoryRouter>
        <PlatformComplianceCard product={product} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Platform Compliance')).toBeInTheDocument();
    expect(screen.getByText('Data Product Standard')).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/engineering/standard',
    );
  });
});
