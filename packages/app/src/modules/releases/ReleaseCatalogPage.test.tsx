import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { UnifiedThemeProvider } from '@backstage/theme';
import { ReleaseCatalogPage } from './ReleaseCatalogPage';
import { GoldenPathReleasePage } from './GoldenPathReleasePage';
import { pharmaDataFactoryTheme } from '../theme/theme';

describe('Release Catalog', () => {
  it('lists official RELEASED Golden Paths with certification and distribution', () => {
    render(
      <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
        <MemoryRouter>
          <ReleaseCatalogPage />
        </MemoryRouter>
      </UnifiedThemeProvider>,
    );

    expect(screen.getByRole('heading', { name: 'Release Catalog' })).toBeInTheDocument();
    expect(screen.getByText('MQTT Temperature Data Product')).toBeInTheDocument();
    expect(screen.getByText('REST Equipment Data Product')).toBeInTheDocument();
    expect(screen.getAllByText('RELEASED').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CERTIFIED').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Internal, Template Edition/).length).toBeGreaterThan(0);
    expect(screen.queryByText('SAAS')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Release filters')).toBeInTheDocument();
  });
});

describe('Golden Path release detail', () => {
  it('shows current release, changelog, and Marketplace link', () => {
    render(
      <UnifiedThemeProvider theme={pharmaDataFactoryTheme}>
        <MemoryRouter initialEntries={['/releases/mqtt-temperature-data-product']}>
          <Routes>
            <Route path="/releases/:templateId" element={<GoldenPathReleasePage />} />
          </Routes>
        </MemoryRouter>
      </UnifiedThemeProvider>,
    );
    expect(screen.getByText('MQTT Temperature Data Product')).toBeInTheDocument();
    expect(screen.getByText('Current release')).toBeInTheDocument();
    expect(screen.getByText('Internal — AVAILABLE')).toBeInTheDocument();
    expect(screen.getByText('Template Edition — AVAILABLE FOR PILOT')).toBeInTheDocument();
    expect(screen.getByText(/Platform Edition — PLANNED/)).toBeInTheDocument();
    expect(screen.getByText(/SaaS — FUTURE/)).toBeInTheDocument();
    expect(screen.getByText('Open in Marketplace')).toHaveAttribute(
      'href',
      '/marketplace/mqtt-temperature-data-product',
    );
  });
});
