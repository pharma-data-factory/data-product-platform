import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { identityApiRef } from '@backstage/core-plugin-api';
import { IndustrialTestRoot } from '@internal/plugin-nexora-common';
import { PluginDirectoryPage } from './PluginDirectoryPage';
import { PluginDetailPage } from './PluginDetailPage';
import { pluginDirectoryApiRef } from '../api';

const validationExpert = {
  id: 'validation-expert',
  name: 'Validation Expert',
  version: '0.1.0',
  type: 'VALIDATION' as const,
  lifecycle: 'ENABLED' as const,
  source: 'MANIFEST',
  validationStatus: 'NOT_VALIDATED' as const,
  validationReference: 'validation-expert/VALIDATION-IMPACT.md',
  frontendRoute: '/validation-expert',
  backendRoute: '/api/validation-expert',
  frontendPackage: '@internal/plugin-validation-expert',
  backendPackage: '@internal/plugin-validation-expert-backend',
  permissions: ['validation.read', 'validation.run.start'],
  owner: 'platform-team',
  runtimeLoaded: true,
  frontendLoaded: true,
  backendLoaded: true,
};

const identityApi = {
  getBackstageIdentity: jest.fn().mockResolvedValue({
    ownershipEntityRefs: ['group:default/platform-admins'],
  }),
};

const api = {
  listPlugins: jest.fn().mockResolvedValue({
    items: [validationExpert],
    summary: {
      total: 1,
      enabled: 1,
      development: 0,
      disabled: 0,
      deprecated: 0,
      validationRelevant: 1,
      backstageCoreVersion: '1.53.0',
    },
  }),
  getPlugin: jest.fn().mockResolvedValue(validationExpert),
  getSummary: jest.fn(),
};

describe('Plugin Directory UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    api.listPlugins.mockResolvedValue({
      items: [validationExpert],
      summary: {
        total: 1,
        enabled: 1,
        development: 0,
        disabled: 0,
        deprecated: 0,
        validationRelevant: 1,
        backstageCoreVersion: '1.53.0',
      },
    });
    api.getPlugin.mockResolvedValue(validationExpert);
    identityApi.getBackstageIdentity.mockResolvedValue({
      ownershipEntityRefs: ['group:default/platform-admins'],
    });
  });

  it('renders directory summary and Validation Expert entry', async () => {
    render(
      <IndustrialTestRoot>
        <MemoryRouter>
          <TestApiProvider
            apis={[
              [pluginDirectoryApiRef, api as any],
              [identityApiRef, identityApi as any],
            ]}
          >
            <PluginDirectoryPage />
          </TestApiProvider>
        </MemoryRouter>
      </IndustrialTestRoot>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('summary-Installed Plugins')).toHaveTextContent(
        '1',
      );
    });
    expect(screen.getByTestId('plugin-link-validation-expert')).toHaveAttribute(
      'href',
      '/admin/plugins/validation-expert',
    );
  });

  it('filters by validation status', async () => {
    render(
      <IndustrialTestRoot>
        <MemoryRouter>
          <TestApiProvider
            apis={[
              [pluginDirectoryApiRef, api as any],
              [identityApiRef, identityApi as any],
            ]}
          >
            <PluginDirectoryPage />
          </TestApiProvider>
        </MemoryRouter>
      </IndustrialTestRoot>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('plugin-directory-table')).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByLabelText('Validation'));
    fireEvent.click(await screen.findByRole('option', { name: 'NOT_VALIDATED' }));

    await waitFor(() => {
      expect(api.listPlugins).toHaveBeenCalledWith(
        expect.objectContaining({ validationStatus: 'NOT_VALIDATED' }),
      );
    });
  });

  it('shows Validation Expert detail with NOT_VALIDATED', async () => {
    render(
      <IndustrialTestRoot>
        <MemoryRouter initialEntries={['/admin/plugins/validation-expert']}>
          <TestApiProvider
            apis={[
              [pluginDirectoryApiRef, api as any],
              [identityApiRef, identityApi as any],
            ]}
          >
            <Routes>
              <Route
                path="/admin/plugins/:pluginId"
                element={<PluginDetailPage />}
              />
            </Routes>
          </TestApiProvider>
        </MemoryRouter>
      </IndustrialTestRoot>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Validation Expert' }),
      ).toBeInTheDocument();
    });
    const validation = screen.getByTestId('validation-section');
    expect(within(validation).getByText('NOT_VALIDATED')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Open Validation Expert workbench/i }),
    ).toHaveAttribute('href', '/validation-expert');
    expect(screen.getByText('validation.read')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: '/validation-expert' }),
    ).toBeInTheDocument();
  });

  it('denies Viewer role', async () => {
    identityApi.getBackstageIdentity.mockResolvedValue({
      ownershipEntityRefs: ['group:default/platform-viewers'],
    });

    render(
      <IndustrialTestRoot>
        <MemoryRouter>
          <TestApiProvider
            apis={[
              [pluginDirectoryApiRef, api as any],
              [identityApiRef, identityApi as any],
            ]}
          >
            <PluginDirectoryPage />
          </TestApiProvider>
        </MemoryRouter>
      </IndustrialTestRoot>,
    );

    await waitFor(() => {
      expect(
        screen.getByText(/requires Developer role or higher/i),
      ).toBeInTheDocument();
    });
  });
});
