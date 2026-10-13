import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { identityApiRef } from '@backstage/core-plugin-api';
import { UnifiedThemeProvider } from '@backstage/theme';
import { RolesHelpPage, describeGroups } from './RolesHelpPage';
import { pharmaDataFactoryTheme } from '../theme/theme';

function renderPage(groups: string[]) {
  return render(
    <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
      <MemoryRouter>
        <TestApiProvider
          apis={[
            [
              identityApiRef,
              {
                getBackstageIdentity: async () => ({
                  type: 'user' as const,
                  userEntityRef: 'user:default/demo-pm',
                  ownershipEntityRefs: [
                    'user:default/demo-pm',
                    ...groups.map(g => `group:default/${g}`),
                  ],
                }),
              } as any,
            ],
          ]}
        >
          <RolesHelpPage />
        </TestApiProvider>
      </MemoryRouter>
    </UnifiedThemeProvider>,
  );
}

describe('RolesHelpPage (NXD-166)', () => {
  it('says what the signed-in person holds on both axes', async () => {
    renderPage(['data-product-owners', 'urs-product-managers']);
    expect(
      await screen.findByLabelText('Your access summary'),
    ).toHaveTextContent(
      'Signed in as user:default/demo-pm · platform role Data Product Owner · approval roles: Product manager',
    );
  });

  it('lists every platform role, every approval role, the duties and the demo seats', async () => {
    renderPage([]);
    await screen.findByLabelText('Your access summary');
    expect(
      within(
        screen.getByRole('table', { name: 'Platform roles' }),
      ).getAllByRole('row'),
    ).toHaveLength(6);
    const approvals = screen.getByRole('table', {
      name: 'Approval and signature roles',
    });
    // Rendered from the policy's table, not retyped.
    expect(
      within(approvals).getAllByText('validation.approve').length,
    ).toBeGreaterThan(0);
    expect(
      within(
        screen.getByRole('table', { name: 'Segregation of duties' }),
      ).getByText(
        /neither wrote the version, nor approved it, nor approved its product baseline/,
      ),
    ).toBeInTheDocument();
    const seats = screen.getByRole('table', { name: 'Demo seats' });
    expect(within(seats).getByText('demo-release')).toBeInTheDocument();
  });

  it('resolves a seat as the policy does: highest platform tier, titled approval roles', () => {
    expect(describeGroups(['platform-viewers', 'validation-experts'])).toEqual({
      role: 'VIEWER',
      domain: ['Validation expert'],
    });
    expect(describeGroups(['data-product-owners'])).toEqual({
      role: 'DATA_PRODUCT_OWNER',
      domain: [],
    });
  });
});
