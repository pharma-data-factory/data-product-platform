import '@testing-library/jest-dom';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TestApiProvider, mockApis } from '@backstage/frontend-test-utils';
import { artifactRegistryApiEntry } from '../__testUtils__/artifactRegistry';
import { configApiRef, discoveryApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { scaffolderApiRef } from '@backstage/plugin-scaffolder-react';
import { UnifiedThemeProvider } from '@backstage/theme';
import { Entity } from '@backstage/catalog-model';
import { ComposePage } from './ComposePage';
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
  category: string;
  certification: string;
  dependsOn?: string[];
}): Entity {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: partial.name,
      title: partial.title,
      description: `${partial.title} building block`,
      annotations: {
        'dataprod.platform/kind': 'platform-component',
        'dataprod.platform/version': '1.0.0',
        'dataprod.platform/category': partial.category,
        'dataprod.platform/certification-status': partial.certification,
        'dataprod.platform/compatible-standard-versions': '1.x',
      },
    },
    spec: {
      type: 'platform-component',
      lifecycle: 'production',
      owner: 'group:default/platform-team',
      dependsOn: partial.dependsOn,
    },
  };
}

const catalogItems: Entity[] = [
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
    name: 'rest-api',
    title: 'REST API',
    category: 'integration',
    certification: 'CERTIFIED',
    dependsOn: ['component:default/health', 'component:default/observability'],
  }),
  platformComponent({
    name: 'rest-source',
    title: 'REST Source',
    category: 'integration',
    certification: 'CERTIFIED',
    dependsOn: ['component:default/observability'],
  }),
  platformComponent({
    name: 'mqtt-consumer',
    title: 'MQTT Consumer',
    category: 'integration',
    certification: 'CERTIFIED',
    dependsOn: ['component:default/health', 'component:default/observability'],
  }),
  platformComponent({
    name: 'timeseries',
    title: 'Time-Series Storage',
    category: 'data',
    certification: 'CERTIFIED',
  }),
  platformComponent({
    name: 'kafka-consumer',
    title: 'Kafka Consumer',
    category: 'integration',
    certification: 'DEVELOPMENT',
  }),
  platformComponent({
    name: 'aas-foundation',
    title: 'AAS Foundation',
    category: 'asset-semantic',
    certification: 'DEVELOPMENT',
  }),
  platformComponent({
    name: 'document-loader',
    title: 'Document Loader',
    category: 'intelligence',
    certification: 'PLANNED',
  }),
];

async function renderCompose(path = '/compose', groups = ['data-product-developers']) {
  await act(async () => {
    render(
      <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
        <MemoryRouter initialEntries={[path]}>
          <TestApiProvider
            apis={[
              [configApiRef, mockApis.config()],
            artifactRegistryApiEntry,
              artifactRegistryApiEntry,
              [catalogApiRef, { getEntities: async () => ({ items: catalogItems }) }],
              [
                discoveryApiRef,
                {
                  getBaseUrl: async () =>
                    'http://localhost:7007/api/composer',
                },
              ],
              // Mounted for Generate; unused by most cases but required by useApi.
              [
                scaffolderApiRef,
                {
                  scaffold: async () => ({ taskId: 'test-task' }),
                } as never,
              ],
              [
                identityApiRef,
                {
                  getBackstageIdentity: async () => ({
                    type: 'user' as const,
                    userEntityRef: 'user:default/dev',
                    ownershipEntityRefs: [
                      'user:default/dev',
                      ...groups.map(group => `group:default/${group}`),
                    ],
                  }),
                  getProfileInfo: async () => ({ displayName: 'dev' }),
                },
              ],
            ]}
          >
            <Routes>
              <Route path="/compose" element={<ComposePage />} />
            </Routes>
          </TestApiProvider>
        </MemoryRouter>
      </UnifiedThemeProvider>,
    );
  });
  await screen.findByLabelText('Select Health');
  if (groups.includes('data-product-developers')) {
    await waitFor(() => {
      expect(screen.getByLabelText('Select Health')).not.toBeDisabled();
    });
  }
}

describe('Composition Builder', () => {
  it('lets a Developer open Composer and select certified runtimes', async () => {
    await renderCompose();
    expect(await screen.findByText('Build the domain logic. Reuse the platform.')).toBeInTheDocument();
    expect(screen.getByText('Composition ≠ Deployment', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('EXISTING PATTERN')).toBeInTheDocument();
    expect(screen.getByText('NEW USE CASE')).toBeInTheDocument();
    expect(screen.getByText('DESIGN FIRST')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByLabelText('Select Health')).not.toBeDisabled();
    });
    fireEvent.click(screen.getByLabelText('Select Health'));
    fireEvent.click(screen.getByLabelText('Select Observability'));
    fireEvent.click(screen.getByLabelText('Select REST API'));
    await waitFor(() => {
      expect(screen.getByTestId('composition-yaml')).toHaveTextContent(
        'kind: GoldenPathComposition',
      );
    });
    expect(screen.getByTestId('certification-summary')).toHaveTextContent('VALIDATED');
    expect(screen.getByTestId('certification-summary')).toHaveTextContent(
      'not a CERTIFIED Golden Path',
    );
    expect(screen.getByTestId('certification-summary')).toHaveTextContent(
      'not GMP validation',
    );
    expect(screen.getByTestId('certification-summary')).toHaveTextContent(
      'NOT_VALIDATED',
    );
    expect(screen.getByTestId('custom-composition')).toHaveTextContent(
      'CUSTOM COMPOSITION',
    );
  });

  it('keeps Viewer inspect-only and matches existing create policy', async () => {
    await renderCompose('/compose', ['platform-viewers']);
    await screen.findByLabelText('Select Health');
    expect(screen.getByLabelText('Select Health')).toBeDisabled();
    expect(
      screen.getByText(/Creating or editing a composition requires Developer/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Copy YAML' })).toBeDisabled();
  });

  it('blocks planned and catalog-only selections and marks DEVELOPMENT', async () => {
    await renderCompose();
    expect(await screen.findByTestId('compose-card-kafka-consumer')).toHaveAttribute(
      'data-kind',
      'disabled-catalog-only',
    );
    expect(screen.getByLabelText('Select Kafka Consumer')).toBeDisabled();
    expect(screen.getByTestId('compose-card-document-loader')).toHaveAttribute(
      'data-kind',
      'disabled-planned',
    );
    expect(screen.getByTestId('compose-card-aas-foundation')).toHaveAttribute(
      'data-kind',
      'selectable-development',
    );
    expect(screen.getByTestId('compose-card-kafka-consumer')).toHaveTextContent(
      /no reusable runtime implementation/i,
    );
  });

  it('loads the OEE reference from the canonical composition and offers the Golden Path', async () => {
    await renderCompose();
    // Preset id is the composition name ('oee-data-product-direct'), not a
    // domain literal — GP-2 closed. The link still targets the DATA_PRODUCT
    // ('oee-data-product') via the builtFromIndex reverse lookup.
    fireEvent.click(await screen.findByTestId('preset-oee-data-product-direct'));
    await waitFor(() => {
      expect(screen.getByTestId('certification-summary')).toHaveTextContent(
        '6 CERTIFIED',
      );
    });
    expect(screen.getByRole('link', { name: 'Continue to Golden Path' })).toHaveAttribute(
      'href',
      '/marketplace/oee-data-product',
    );
    expect(screen.getByTestId('composition-yaml')).toHaveTextContent(
      'ref: component:default/rest-source',
    );
    expect(screen.getByTestId('composition-yaml').textContent).not.toMatch(
      /password|token|secret/i,
    );
  });

  it('keeps Equipment Use Log as a design example', async () => {
    await renderCompose();
    fireEvent.click(await screen.findByTestId('preset-equipment-use-log'));
    expect(await screen.findByTestId('equipment-use-log-example')).toHaveTextContent(
      'DESIGN EXAMPLE',
    );
    expect(screen.getByLabelText('Select MQTT Consumer')).toBeChecked();
    expect(screen.getByLabelText('Select REST API')).toBeChecked();
    expect(screen.getByLabelText('Select REST Source')).not.toBeChecked();
    expect(screen.getByLabelText('Select Time-Series Storage')).not.toBeChecked();
    expect(screen.getByTestId('composition-yaml')).toHaveTextContent(
      'ref: component:default/mqtt-consumer',
    );
    expect(screen.getByTestId('composition-yaml')).not.toHaveTextContent(
      'timeseries',
    );
    expect(screen.getByTestId('composition-architecture')).toBeInTheDocument();
    expect(screen.getByTestId('custom-composition')).toHaveTextContent(
      'CUSTOM COMPOSITION',
    );
    expect(
      screen.queryByRole('link', { name: 'Continue to Golden Path' }),
    ).not.toBeInTheDocument();
  });

  it('preselects Use in Composition and ignores invalid query params', async () => {
    await renderCompose('/compose?component=rest-source');
    await waitFor(() => {
      expect(screen.getByLabelText('Select REST Source')).toBeChecked();
    });
    cleanup();
    await renderCompose('/compose?component=kafka-consumer');
    await waitFor(() => {
      expect(screen.getByLabelText('Select Kafka Consumer')).not.toBeChecked();
    });
    expect(screen.getAllByText(/no reusable runtime implementation/i).length).toBeGreaterThan(
      0,
    );
    cleanup();
    await renderCompose('/compose?component=../secret');
    await screen.findByRole('heading', { name: 'Compose Data Product' });
    expect(screen.getByText(/invalid component query was ignored/i)).toBeInTheDocument();
  });
});
