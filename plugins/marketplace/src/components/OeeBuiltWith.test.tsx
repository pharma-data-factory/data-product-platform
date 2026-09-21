import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { TestApiProvider, mockApis } from '@backstage/frontend-test-utils';
import { configApiRef } from '@backstage/core-plugin-api';
import { OeeBuiltWith } from './OeeBuiltWith';
import { BuiltWithSummary } from '@internal/platform-common';

const summary: BuiltWithSummary = {
  productLabel: 'OEE Golden Path',
  reusableCount: 6,
  certifiedCount: 6,
  items: [
    {
      name: 'rest-source',
      title: 'REST Source',
      version: '1.0.0',
      certificationStatus: 'CERTIFIED',
      entityRef: 'component:default/rest-source',
    },
    {
      name: 'mqtt-consumer',
      title: 'MQTT Consumer',
      version: '1.0.0',
      certificationStatus: 'CERTIFIED',
      entityRef: 'component:default/mqtt-consumer',
    },
    {
      name: 'timeseries',
      title: 'Time-Series Storage',
      version: '1.0.0',
      certificationStatus: 'CERTIFIED',
      entityRef: 'component:default/timeseries',
    },
    {
      name: 'rest-api',
      title: 'REST API',
      version: '1.0.0',
      certificationStatus: 'CERTIFIED',
      entityRef: 'component:default/rest-api',
    },
    {
      name: 'health',
      title: 'Health',
      version: '1.0.0',
      certificationStatus: 'CERTIFIED',
      entityRef: 'component:default/health',
    },
    {
      name: 'observability',
      title: 'Observability',
      version: '1.0.0',
      certificationStatus: 'CERTIFIED',
      entityRef: 'component:default/observability',
    },
  ],
};

describe('OeeBuiltWith', () => {
  it('renders derived Wave 1 chips, CERTIFIED count, composition visual, and composition link', () => {
    render(
      <MemoryRouter>
        <TestApiProvider apis={[[configApiRef, mockApis.config()]]}>
          <OeeBuiltWith summary={summary} />
        </TestApiProvider>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('OEE Built With')).toBeInTheDocument();
    expect(screen.getByText('OEE Golden Path')).toBeInTheDocument();
    expect(screen.getByText('REST Source 1.0.0')).toHaveAttribute(
      'href',
      '/platform-components/rest-source',
    );
    expect(
      screen.getByText('6 reusable components · 6 technically CERTIFIED'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(
        'REST Source, MQTT Consumer, Time-Series Storage, REST API, Health, Observability compose into OEE domain logic and OEE Data Product',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('View Composition')).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/oee/composition',
    );
  });
});
