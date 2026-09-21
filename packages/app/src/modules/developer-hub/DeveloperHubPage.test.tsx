import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TestApiProvider, mockApis } from '@backstage/frontend-test-utils';
import { artifactRegistryApiEntry } from '../__testUtils__/artifactRegistry';
import { configApiRef, identityApiRef } from '@backstage/core-plugin-api';
import { UnifiedThemeProvider } from '@backstage/theme';
import { DeveloperHubPage } from './DeveloperHubPage';
import { pharmaDataFactoryTheme } from '../theme/theme';

jest.setTimeout(20000);

async function renderHub(groups: string[], user = 'developer') {
  await act(async () => {
    render(
      <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
        <MemoryRouter>
          <TestApiProvider
            apis={[
              [configApiRef, mockApis.config()],
            artifactRegistryApiEntry,
              artifactRegistryApiEntry,
              [
                identityApiRef,
                {
                  getBackstageIdentity: async () => ({
                    type: 'user' as const,
                    userEntityRef: `user:default/${user}`,
                    ownershipEntityRefs: [
                      `user:default/${user}`,
                      ...groups.map(group => `group:default/${group}`),
                    ],
                  }),
                  getProfileInfo: async () => ({ displayName: user }),
                },
              ],
            ]}
          >
            <DeveloperHubPage />
          </TestApiProvider>
        </MemoryRouter>
      </UnifiedThemeProvider>,
    );
  });
}

describe('Developer Hub', () => {
  it('renders the /developer dashboard with Getting Started and the first journey', async () => {
    await renderHub(['data-product-developers']);

    expect(screen.getByLabelText('Developer Hub')).toBeInTheDocument();
    expect(screen.getByText('Developer Hub')).toBeInTheDocument();
    expect(screen.getByLabelText('GETTING STARTED')).toBeInTheDocument();
    expect(screen.getByLabelText('ARCHITECTURE')).toBeInTheDocument();
    expect(screen.getByLabelText('COMMERCIAL')).toBeInTheDocument();
    expect(screen.getByLabelText('BUILD')).toBeInTheDocument();
    expect(screen.getByLabelText('DELIVER')).toBeInTheDocument();
    expect(screen.getByLabelText('HOW-TO')).toBeInTheDocument();
    expect(screen.getByText('Platform Overview')).toBeInTheDocument();
    expect(screen.getByText('Development Environment')).toBeInTheDocument();
    expect(screen.getByText('GitHub Setup')).toBeInTheDocument();
    expect(screen.getAllByText('Build Your First Data Product').length).toBeGreaterThan(0);
    expect(screen.getByText('01. Sign In')).toBeInTheDocument();
    expect(screen.getByText('16. Inspect Dependencies')).toBeInTheDocument();
    expect(screen.getByText('17. Open TechDocs')).toBeInTheDocument();
    expect(screen.getAllByText('Why').length).toBe(17);
    expect(screen.getAllByText('Learn more').length).toBe(17);
    expect(screen.getByText('Search all documentation')).toHaveAttribute('href', '/search');
    expect(screen.getByText('Browse Platform Components')).toHaveAttribute(
      'href',
      '/platform-components',
    );
    expect(screen.getAllByText('What is a Platform Component?').length).toBeGreaterThan(0);
    expect(screen.getByText('Build with Platform Components')).toBeInTheDocument();
    expect(screen.getByText('Two development routes')).toBeInTheDocument();
    expect(screen.getByText(/Route A — Existing Golden Path/)).toBeInTheDocument();
    expect(screen.getByText(/Route B — New domain product/)).toBeInTheDocument();
    expect(screen.getAllByText('How to reuse a Component').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('OEE Built With')).toBeInTheDocument();
    expect(screen.getByText('View Composition')).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/oee/composition',
    );
    expect(
      screen.getByLabelText(
        'Component Library composes into an existing Golden Path such as OEE, or a new use case in Composer such as Equipment Use Log as a design-first example',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/OEE not implemented/i)).not.toBeInTheDocument();
    expect(screen.getByText('Developer Decision Model')).toBeInTheDocument();
    expect(screen.getByText('Equipment Use Log composition example')).toBeInTheDocument();
    expect(screen.getByText('Composition Builder')).toBeInTheDocument();
    expect(screen.getByText('Product model')).toBeInTheDocument();
    expect(screen.getByText('Browse Component Library')).toBeInTheDocument();
    expect(screen.getByText('Platform Component vs Backstage Plugin')).toBeInTheDocument();
    expect(screen.getByText('Platform Component Certification')).toBeInTheDocument();
    expect(screen.getByText('Wave 1 Certified Components')).toBeInTheDocument();
    expect(screen.getByText('Certification Checklist')).toBeInTheDocument();
    expect(screen.getByText('Security Limitations')).toBeInTheDocument();
    expect(screen.getByText('Component Upgrade Policy')).toBeInTheDocument();
    expect(screen.getByText('Contract Documentation')).toBeInTheDocument();
    expect(screen.getAllByText('Golden Path').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Build on Nexora')).toBeInTheDocument();
    expect(screen.getByText('Adopt. Build. Partner.')).toBeInTheDocument();
    expect(screen.getByText('Extension Catalog').closest('a')).toHaveAttribute(
      'href',
      '/plugin-directory',
    );
  });

  it('links architecture and Golden Path docs without duplicating the public story', async () => {
    await renderHub(['data-product-developers']);

    expect(screen.getAllByText('Explore the Architecture')[0]).toHaveAttribute(
      'href',
      '/platform/architecture',
    );
    expect(screen.getByText('How developers build').closest('a')).toHaveAttribute(
      'href',
      '/platform/architecture/developer',
    );
    expect(screen.getByText('AAS Developer Docs').closest('a')).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/aas/index',
    );
    expect(screen.getByText('Platform Architecture').closest('a')).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/architecture/platform',
    );
    expect(screen.getByText('Unified Namespace Docs').closest('a')).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/uns/index',
    );
    expect(screen.getByText('Marketplace').closest('a')).toHaveAttribute('href', '/marketplace');
    expect(screen.getByText('Data Products UI').closest('a')).toHaveAttribute(
      'href',
      '/data-products',
    );
    expect(screen.getByRole('link', { name: 'MQTT Temperature Data Product' })).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/how-to/mqtt-temperature',
    );
    expect(screen.getByRole('link', { name: 'REST Equipment Data Product' })).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/how-to/rest-equipment',
    );
    expect(screen.getByText('System of Record vs Data Product')).toBeInTheDocument();
    expect(screen.getByText('Handle a Breaking Change')).toBeInTheDocument();
    expect(screen.getByText('Debug CI')).toBeInTheDocument();
    expect(
      screen.getAllByText(/Keep Core Systems Standard. Innovate Through Data Products./i)
        .length,
    ).toBeGreaterThan(0);
  });

  it('hides developer-only create actions for Viewer', async () => {
    await renderHub(['platform-viewers'], 'viewer');

    expect(screen.getByText('Search all documentation')).toBeInTheDocument();
    expect(screen.queryByText('Create Data Product')).not.toBeInTheDocument();
    expect(screen.getAllByText('View in Marketplace').length).toBe(3);
    expect(screen.queryByText('Open MQTT Temperature')).not.toBeInTheDocument();
  });

  it('shows developer-only actions for Developer', async () => {
    await renderHub(['data-product-developers']);

    const create = screen.getByText('Create Data Product').closest('a');
    expect(create).toHaveAttribute('href', '/create');
    expect(screen.getAllByText('Compose Data Product').some(node => node.closest('a')?.getAttribute('href') === '/compose')).toBe(true);
    expect(screen.getByText('Open MQTT Temperature').closest('a')).toHaveAttribute(
      'href',
      '/marketplace/mqtt-temperature-data-product',
    );
    expect(screen.getAllByText('Open in Marketplace').length).toBe(3);
  });
});
