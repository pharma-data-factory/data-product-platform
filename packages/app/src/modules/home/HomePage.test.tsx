import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TestApiProvider, mockApis } from '@backstage/frontend-test-utils';
import { configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { UnifiedThemeProvider } from '@backstage/theme';
import { HomePage } from './HomePage';
import { pharmaDataFactoryTheme } from '../theme/theme';

jest.mock('@backstage/core-components', () => {
  const actual = jest.requireActual('@backstage/core-components');
  return {
    ...actual,
    Progress: () => null,
  };
});

describe('authenticated home', () => {
  it('keeps the role-aware dashboard when IdentityContext is the default MVP wrapper', async () => {
    await act(async () => {
      render(
        <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
          <MemoryRouter>
            <TestApiProvider
              apis={[
                [configApiRef, mockApis.config()],
                [
                  identityApiRef,
                  {
                    getBackstageIdentity: async () => ({
                      type: 'user' as const,
                      userEntityRef: 'user:default/viewer',
                      ownershipEntityRefs: [
                        'user:default/viewer',
                        'group:default/platform-viewers',
                      ],
                    }),
                    getProfileInfo: async () => ({
                      displayName: 'Viewer',
                    }),
                  },
                ],
                [
                  catalogApiRef,
                  {
                    getEntities: async () => ({ items: [] }),
                  },
                ],
              ]}
            >
              <HomePage />
            </TestApiProvider>
          </MemoryRouter>
        </UnifiedThemeProvider>,
      );
    });

    expect(await screen.findByText(/Role: Viewer/i)).toBeInTheDocument();
    expect(screen.getByText(/GitHub: viewer/i)).toBeInTheDocument();
    expect(screen.getByText('Explore Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Browse Data Products')).toBeInTheDocument();
    expect(screen.queryByText('Create Data Product')).not.toBeInTheDocument();
    expect(screen.getByText('My Data Products')).toBeInTheDocument();
    expect(screen.getByText('Recent activity')).toBeInTheDocument();
  });

  it('shows Access Denied when a GitHub identity has no approved platform group', async () => {
    await act(async () => {
      render(
        <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
          <MemoryRouter>
            <TestApiProvider
              apis={[
                [configApiRef, mockApis.config()],
                [
                  identityApiRef,
                  {
                    getBackstageIdentity: async () => ({
                      type: 'user' as const,
                      userEntityRef: 'user:default/new-github-user',
                      ownershipEntityRefs: ['user:default/new-github-user'],
                    }),
                    getProfileInfo: async () => ({
                      displayName: 'new-github-user',
                    }),
                    signOut: async () => undefined,
                  },
                ],
                [
                  catalogApiRef,
                  {
                    getEntities: async () => ({ items: [] }),
                  },
                ],
              ]}
            >
              <HomePage />
            </TestApiProvider>
          </MemoryRouter>
        </UnifiedThemeProvider>,
      );
    });

    expect(await screen.findByText('Access not granted')).toBeInTheDocument();
    expect(screen.getByRole('status').textContent).toMatch(
      /do not currently have access/i,
    );
    expect(screen.queryByText('Browse Marketplace')).not.toBeInTheDocument();
  });

  it('shows a professional error without raw internals', async () => {
    await act(async () => {
      render(
        <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
          <MemoryRouter>
            <TestApiProvider
              apis={[
                [configApiRef, mockApis.config()],
                [
                  identityApiRef,
                  {
                    getBackstageIdentity: async () => ({
                      type: 'user' as const,
                      userEntityRef: 'user:default/developer',
                      ownershipEntityRefs: [
                        'user:default/developer',
                        'group:default/data-product-developers',
                      ],
                    }),
                    getProfileInfo: async () => ({
                      displayName: 'Developer',
                    }),
                  },
                ],
                [
                  catalogApiRef,
                  {
                    getEntities: async () => {
                      throw new Error('403 Forbidden\n    at CatalogProcessor.run');
                    },
                  },
                ],
              ]}
            >
              <HomePage />
            </TestApiProvider>
          </MemoryRouter>
        </UnifiedThemeProvider>,
      );
    });

    expect(await screen.findByText('Unauthorized')).toBeInTheDocument();
    expect(screen.queryByText(/CatalogProcessor|stack/i)).not.toBeInTheDocument();
  });
});
