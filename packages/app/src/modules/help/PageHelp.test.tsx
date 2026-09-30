import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { UnifiedThemeProvider, themes } from '@backstage/theme';
import { PageHelp } from './PageHelp';

function renderHelp(step: 'build' | 'release' | 'operate') {
  render(
    <UnifiedThemeProvider theme={themes.light}>
      <MemoryRouter>
        <PageHelp step={step} links={[{ label: 'Next: Operate', to: '/my-products' }]}>
          Nothing is built here.
        </PageHelp>
      </MemoryRouter>
    </UnifiedThemeProvider>,
  );
}

describe('PageHelp (NXD-103)', () => {
  it('marks the current step of Build → Release → Operate and links the others', () => {
    renderHelp('release');
    const journey = screen.getByRole('list', { name: 'Where this page fits' });
    const current = within(journey).getByText('Release');
    expect(current).toHaveAttribute('aria-current', 'step');
    expect(within(journey).getByRole('link', { name: 'Build' })).toHaveAttribute('href', '/build');
    expect(within(journey).getByRole('link', { name: 'Operate' })).toHaveAttribute(
      'href',
      '/my-products',
    );
    expect(within(journey).queryByRole('link', { name: 'Release' })).toBeNull();
  });

  it('says what the page does and where to go next', () => {
    renderHelp('release');
    const help = screen.getByRole('region', { name: 'About this page' });
    expect(help).toHaveTextContent('Nothing is built here.');
    expect(within(help).getByRole('link', { name: 'Next: Operate →' })).toHaveAttribute(
      'href',
      '/my-products',
    );
  });
});
