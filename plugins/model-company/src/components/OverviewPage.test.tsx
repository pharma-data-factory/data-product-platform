import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ModelCompanyChrome } from './shared';

describe('ModelCompanyChrome', () => {
  it('renders synthetic and non-gxp labels', () => {
    render(
      <MemoryRouter>
        <ModelCompanyChrome title="Model Pharma Plant">
          <div>body</div>
        </ModelCompanyChrome>
      </MemoryRouter>,
    );
    expect(screen.getByText('SYNTHETIC')).toBeInTheDocument();
    expect(screen.getByText('NON-GXP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute(
      'href',
      '/model-company',
    );
    expect(screen.getByRole('button', { name: 'Factory' })).toHaveAttribute(
      'href',
      '/model-company/factory',
    );
    expect(screen.getByRole('button', { name: 'Material Flow' })).toHaveAttribute(
      'href',
      '/model-company/material-flow',
    );
  });
});
