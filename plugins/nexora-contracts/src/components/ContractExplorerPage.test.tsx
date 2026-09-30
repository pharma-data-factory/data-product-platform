/**
 * NXD-094. A catalog that could not be read is not an empty catalog.
 *
 * The page used `.catch(() => setLoading(false))`, so a 401 or a 500
 * rendered "No Data Products match the current filters."
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { TestApiProvider } from '@backstage/frontend-test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { IndustrialTestRoot } from '@internal/plugin-nexora-common';
import { ContractExplorerPage } from './ContractExplorerPage';

const oee = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'filler-01-oee',
    title: 'OEE Data Product',
    annotations: {
      'nexora.io/equipment-id': 'filler-01',
      'nexora.io/product-type': 'oee',
    },
  },
  spec: { type: 'data-product', owner: 'group:default/platform-team' },
};

async function renderPage(getEntities: jest.Mock) {
  await act(async () => {
    render(
      <IndustrialTestRoot>
        <MemoryRouter>
          <TestApiProvider apis={[[catalogApiRef, { getEntities } as never]]}>
            <ContractExplorerPage />
          </TestApiProvider>
        </MemoryRouter>
      </IndustrialTestRoot>,
    );
  });
}

describe('ContractExplorerPage when the catalog cannot be read (NXD-094)', () => {
  it('says the load failed, not that there is nothing, and recovers on retry', async () => {
    const getEntities = jest
      .fn()
      .mockRejectedValueOnce(new Error('Service Unavailable (503)'))
      .mockResolvedValueOnce({ items: [oee] });
    await renderPage(getEntities);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load Data Products',
    );
    expect(
      screen.queryByText('No Data Products match the current filters.'),
    ).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    });
    expect(screen.getByText('OEE Data Product')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('names a permission failure and offers no retry', async () => {
    await renderPage(jest.fn().mockRejectedValue(new Error('403 Forbidden')));

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Not permitted to view Data Products',
    );
    expect(
      screen.queryByRole('button', { name: 'Try again' }),
    ).not.toBeInTheDocument();
  });

  it('keeps the honest empty state for an empty catalog', async () => {
    await renderPage(jest.fn().mockResolvedValue({ items: [] }));

    expect(screen.getByText('No Data Products match the current filters.')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
