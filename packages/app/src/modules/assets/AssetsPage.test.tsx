import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TestApiProvider, mockApis } from '@backstage/frontend-test-utils';
import { configApiRef, discoveryApiRef, fetchApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { UnifiedThemeProvider } from '@backstage/theme';
import { AssetsPage } from './AssetsPage';
import { pharmaDataFactoryTheme } from '../theme/theme';

describe('AssetsPage', () => {
  it('renders seeded filler hierarchy from the AAS API', async () => {
    const fetchApi = {
      fetch: async () => ({
        ok: true,
        json: async () => [
          {
            id: 'filler-01',
            displayName: 'Filler 01',
            context: { site: 'basel', area: 'packaging', line: 'line-01' },
            properties: [{ id: 'speed', name: 'Rotational Speed' }],
          },
        ],
      }),
    };
    render(
      <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
        <MemoryRouter>
          <TestApiProvider
            apis={[
              [configApiRef, mockApis.config()],
              [discoveryApiRef, { getBaseUrl: async () => 'http://aas' }],
              [fetchApiRef, fetchApi as never],
              [
                identityApiRef,
                {
                  getBackstageIdentity: async () => ({
                    type: 'user' as const,
                    userEntityRef: 'user:default/guest',
                    ownershipEntityRefs: ['group:default/platform-admins'],
                  }),
                },
              ],
            ]}
          >
            <AssetsPage />
          </TestApiProvider>
        </MemoryRouter>
      </UnifiedThemeProvider>,
    );
    expect(await screen.findByText('Filler 01')).toBeInTheDocument();
    expect(screen.getAllByText(/PROTOTYPE/).length).toBeGreaterThan(0);
    expect(screen.getByText('Rotational Speed')).toBeInTheDocument();
    expect(screen.getByText('Create asset')).toBeInTheDocument();
  });
});
