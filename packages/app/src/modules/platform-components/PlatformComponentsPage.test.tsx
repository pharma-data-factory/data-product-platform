import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TestApiProvider, mockApis } from '@backstage/frontend-test-utils';
import { configApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { UnifiedThemeProvider } from '@backstage/theme';
import { Entity } from '@backstage/catalog-model';
import { PlatformComponentsPage, cardTones } from './PlatformComponentsPage';
import { PlatformComponentDetailPage } from './PlatformComponentDetailPage';
import { pharmaDataFactoryTheme } from '../theme/theme';

jest.mock('@backstage/core-components', () => {
  const actual = jest.requireActual('@backstage/core-components');
  return {
    ...actual,
    Progress: () => null,
  };
});

afterEach(() => {
  cleanup();
});

jest.setTimeout(20000);

function platformComponent(partial: {
  name: string;
  title: string;
  description?: string;
  category: string;
  version?: string;
  certification: string;
  owner?: string;
}): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: partial.name,
      title: partial.title,
      description: partial.description || `${partial.title} building block`,
      annotations: {
        'dataprod.platform/kind': 'platform-component',
        'dataprod.platform/version': partial.version || '1.0.0',
        'dataprod.platform/category': partial.category,
        'dataprod.platform/certification-status': partial.certification,
        'dataprod.platform/compatible-standard-versions': '1.x',
      },
      links: [
        {
          url: '/docs/default/component/data-product-platform/platform-components/rest-source',
          title: 'Documentation',
        },
      ],
    },
    spec: {
      type: 'platform-component',
      lifecycle: 'production',
      owner: partial.owner || 'group:default/platform-team',
    },
  };
}

const catalogItems: Entity[] = [
  platformComponent({
    name: 'rest-source',
    title: 'REST Source',
    description:
      'Consume governed REST endpoints using the Nexora runtime standard.',
    category: 'integration',
    certification: 'CERTIFIED',
  }),
  platformComponent({
    name: 'mqtt-consumer',
    title: 'MQTT Consumer',
    category: 'integration',
    certification: 'CERTIFIED',
  }),
  platformComponent({
    name: 'timeseries',
    title: 'Time-Series Storage',
    category: 'data',
    certification: 'CERTIFIED',
  }),
  platformComponent({
    name: 'rest-api',
    title: 'REST API',
    category: 'integration',
    certification: 'CERTIFIED',
  }),
  platformComponent({
    name: 'health',
    title: 'Health',
    category: 'operations',
    certification: 'CERTIFIED',
  }),
  platformComponent({
    name: 'observability',
    title: 'Observability',
    category: 'operations',
    certification: 'CERTIFIED',
  }),
  platformComponent({
    name: 'kafka-consumer',
    title: 'Kafka Consumer',
    description: 'Reusable Kafka consumer',
    category: 'integration',
    certification: 'DEVELOPMENT',
  }),
  platformComponent({
    name: 'postgres',
    title: 'PostgreSQL',
    category: 'data',
    certification: 'DEVELOPMENT',
  }),
  platformComponent({
    name: 'audit',
    title: 'Audit',
    category: 'operations',
    certification: 'DEVELOPMENT',
  }),
  platformComponent({
    name: 'object-storage',
    title: 'Object Storage',
    category: 'data',
    certification: 'DEVELOPMENT',
  }),
  platformComponent({
    name: 'aas-foundation',
    title: 'AAS Foundation',
    category: 'asset-semantic',
    certification: 'DEVELOPMENT',
  }),
  platformComponent({
    name: 'kafka-producer',
    title: 'Kafka Producer',
    category: 'integration',
    certification: 'DEVELOPMENT',
  }),
  platformComponent({
    name: 'rag',
    title: 'RAG',
    category: 'intelligence',
    version: '0.0.0',
    certification: 'TESTED',
  }),
  platformComponent({
    name: 'document-loader',
    title: 'Document Loader',
    category: 'intelligence',
    version: '0.0.0',
    certification: 'PLANNED',
  }),
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'sample-rest-equipment-product',
      title: 'REST Equipment Data Product',
    },
    spec: {
      type: 'data-product',
      dependsOn: [],
    },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'sample-mqtt-temperature-product',
      title: 'MQTT Temperature Data Product',
    },
    spec: {
      type: 'data-product',
      dependsOn: [],
    },
  },
];

const catalogApi = {
  getEntities: async () => ({ items: catalogItems }),
};

async function renderRegistry() {
  await act(async () => {
    render(
      <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
        <MemoryRouter>
          <TestApiProvider
            apis={[
              [configApiRef, mockApis.config()],
              [catalogApiRef, catalogApi],
            ]}
          >
            <PlatformComponentsPage />
          </TestApiProvider>
        </MemoryRouter>
      </UnifiedThemeProvider>,
    );
  });
}

describe('Platform Components registry', () => {
  it('renders cards with search, filters, CERTIFIED and PLANNED styling', async () => {
    await renderRegistry();
    expect(await screen.findByText('REST Source')).toBeInTheDocument();
    expect(screen.getByText('Build the domain logic. Reuse the platform.')).toBeInTheDocument();
    expect(screen.getByLabelText('Search platform components')).toBeInTheDocument();
    expect(screen.getByTestId('component-card-rest-source')).toHaveAttribute(
      'data-status',
      'CERTIFIED',
    );
    expect(screen.getByTestId('component-card-rest-source')).toHaveAttribute(
      'data-runtime',
      'runtime',
    );
    expect(screen.getByTestId('component-card-rest-source')).toHaveAttribute(
      'data-tone',
      'certified',
    );
    expect(screen.getByTestId('component-card-document-loader')).toHaveAttribute(
      'data-status',
      'PLANNED',
    );
    expect(screen.getByTestId('component-card-document-loader')).toHaveAttribute(
      'data-tone',
      'planned catalogOnly',
    );
    expect(screen.getByTestId('component-card-kafka-consumer')).toHaveAttribute(
      'data-runtime',
      'catalog-only',
    );
    expect(screen.getByTestId('component-card-kafka-consumer')).toHaveAttribute(
      'data-tone',
      'development catalogOnly',
    );
    expect(screen.getByTestId('component-card-aas-foundation')).toHaveAttribute(
      'data-tone',
      'development',
    );
    expect(screen.getByTestId('component-card-rag')).toHaveAttribute(
      'data-tone',
      'tested catalogOnly',
    );
    expect(screen.getByTestId('component-card-postgres')).toHaveTextContent(
      /Catalog only/i,
    );
    expect(screen.getByTestId('component-card-audit')).toHaveTextContent(
      /Catalog only/i,
    );
    expect(screen.getByTestId('component-card-object-storage')).toHaveTextContent(
      /Catalog only/i,
    );
  });

  it('filters by search, category, status, and runtime', async () => {
    await renderRegistry();
    await screen.findByTestId('component-card-rest-source');

    fireEvent.change(screen.getByLabelText('Search platform components'), {
      target: { value: 'kafka' },
    });
    expect(screen.getByText('Kafka Consumer')).toBeInTheDocument();
    expect(screen.queryByText('REST Source')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Search platform components'), {
      target: { value: '' },
    });
    fireEvent.click(
      within(screen.getByLabelText('Component category filters')).getByText(
        'Intelligence',
      ),
    );
    expect(screen.getByText('Document Loader')).toBeInTheDocument();
    expect(screen.queryByText('Kafka Consumer')).not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByLabelText('Component category filters')).getByText('All'),
    );
    fireEvent.click(
      within(screen.getByLabelText('Component status filters')).getByText(
        'Certified',
      ),
    );
    expect(screen.getByText('REST Source')).toBeInTheDocument();
    expect(screen.queryByText('Document Loader')).not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByLabelText('Component status filters')).getByText('All'),
    );
    fireEvent.click(
      within(screen.getByLabelText('Component runtime filters')).getByText(
        'Catalog Only',
      ),
    );
    expect(screen.getByText('Kafka Consumer')).toBeInTheDocument();
    expect(screen.queryByText('REST Source')).not.toBeInTheDocument();

    fireEvent.click(
      within(screen.getByLabelText('Component runtime filters')).getByText('All'),
    );
    fireEvent.click(
      within(
        screen.getByLabelText('Component compatibility filters'),
      ).getByText('Data Product Standard 1.x'),
    );
    expect(screen.getByText('REST Source')).toBeInTheDocument();
    fireEvent.click(
      within(screen.getByLabelText('Component status filters')).getByText(
        'Tested',
      ),
    );
    expect(screen.getByText('RAG')).toBeInTheDocument();
    expect(screen.queryByText('REST Source')).not.toBeInTheDocument();
  });

  it('shows OEE as a runtime consumer and keeps MQTT/REST Golden Paths conceptual', async () => {
    await renderRegistry();
    const restSource = await screen.findByTestId('component-card-rest-source');
    expect(restSource).toHaveTextContent('OEE Data Product');
    expect(restSource).toHaveTextContent('REST Equipment');
    expect(restSource).toHaveTextContent('Planned / conceptual use');

    const mqtt = screen.getByTestId('component-card-mqtt-consumer');
    expect(mqtt).toHaveTextContent('OEE Data Product');
    expect(mqtt).toHaveTextContent('MQTT Temperature');
    expect(mqtt.textContent).toMatch(/Planned \/ conceptual use[\s\S]*MQTT Temperature/);
  });
});

describe('card tones', () => {
  it('keeps CERTIFIED runtime distinct from catalog-only 1.0.0 DEVELOPMENT', () => {
    const certified = cardTones({
      name: 'rest-source',
      certificationStatus: 'CERTIFIED',
      runtimeAvailability: 'runtime',
    } as Parameters<typeof cardTones>[0]);
    const kafka = cardTones({
      name: 'kafka-consumer',
      certificationStatus: 'DEVELOPMENT',
      runtimeAvailability: 'catalog-only',
    } as Parameters<typeof cardTones>[0]);
    const planned = cardTones({
      name: 'document-loader',
      certificationStatus: 'PLANNED',
      runtimeAvailability: 'catalog-only',
    } as Parameters<typeof cardTones>[0]);
    expect(certified).toEqual(['certified']);
    expect(kafka).toEqual(['development', 'catalogOnly']);
    expect(planned).toEqual(['planned', 'catalogOnly']);
    expect(certified).not.toEqual(kafka);
  });
});

describe('Platform Component detail', () => {
  it('shows real configuration keys, OEE import, docs, graph, and derived Used By', async () => {
    await act(async () => {
      render(
        <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
          <MemoryRouter initialEntries={['/platform-components/rest-source']}>
            <TestApiProvider
              apis={[
                [configApiRef, mockApis.config()],
                [catalogApiRef, catalogApi],
              ]}
            >
              <Routes>
                <Route
                  path="/platform-components/:name"
                  element={<PlatformComponentDetailPage />}
                />
              </Routes>
            </TestApiProvider>
          </MemoryRouter>
        </UnifiedThemeProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('REST Source').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('SOURCE_API_URL')).toBeInTheDocument();
    expect(screen.getByText('SOURCE_API_AUTH_SCHEME')).toBeInTheDocument();
    expect(
      screen.getByText('from pdf_rest_source import RestSource, RestSourceSettings'),
    ).toBeInTheDocument();
    expect(screen.getByText('View Documentation')).toBeInTheDocument();
    expect(screen.getByText('View Catalog Graph')).toHaveAttribute(
      'href',
      '/catalog-graph?rootEntityRefs=component%3Adefault%2Frest-source',
    );
    expect(screen.getAllByRole('link', { name: 'Use in Composition' })[0]).toHaveAttribute(
      'href',
      '/compose?component=rest-source',
    );
    expect(screen.getAllByText(/YAML/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Used by/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/OEE Data Product/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Planned \/ conceptual use/).length).toBeGreaterThan(0);
    expect(screen.getByText(/REST Equipment/)).toBeInTheDocument();
  });

  it('marks Kafka Consumer as catalog-only and not equivalent to CERTIFIED runtime', async () => {
    await act(async () => {
      render(
        <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
          <MemoryRouter initialEntries={['/platform-components/kafka-consumer']}>
            <TestApiProvider
              apis={[
                [configApiRef, mockApis.config()],
                [catalogApiRef, catalogApi],
              ]}
            >
              <Routes>
                <Route
                  path="/platform-components/:name"
                  element={<PlatformComponentDetailPage />}
                />
              </Routes>
            </TestApiProvider>
          </MemoryRouter>
        </UnifiedThemeProvider>,
      );
    });

    await waitFor(() => {
      expect(screen.getAllByText('Kafka Consumer').length).toBeGreaterThan(0);
    });
    expect(screen.getByText(/Catalog only · No reusable runtime package/)).toBeInTheDocument();
    expect(screen.getByText(/DEVELOPMENT — not certified/)).toBeInTheDocument();
    expect(screen.queryByText('SOURCE_API_URL')).not.toBeInTheDocument();
    expect(
      screen.getByText(/No Python import exists. This component has no reusable/),
    ).toBeInTheDocument();
  });
});
