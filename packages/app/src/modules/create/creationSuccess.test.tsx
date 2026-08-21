import { creationSuccessActions } from './creationSuccess';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CreationFailurePage, CreationSuccessPage } from './CreationSuccessPage';

describe('creation success experience', () => {
  it('builds product, repository, CI, docs, and contract actions', () => {
    const result = creationSuccessActions({
      productName: 'cold-room-temperature',
      links: [
        {
          title: 'Repository',
          url: 'https://github.com/pharma-data-factory/cold-room-temperature',
        },
        {
          title: 'Open in catalog',
          entityRef: 'component:default/cold-room-temperature',
        },
      ],
    });

    expect(result.productName).toBe('cold-room-temperature');
    expect(result.repository).toBe(
      'https://github.com/pharma-data-factory/cold-room-temperature',
    );
    expect(result.actions.map(action => action.label)).toEqual([
      'View Data Product',
      'Open Repository',
      'View CI Pipeline',
      'Open Documentation',
      'View Data Contract',
    ]);
    expect(result.actions.find(action => action.id === 'ci')?.to).toBe(
      'https://github.com/pharma-data-factory/cold-room-temperature/actions',
    );
    expect(result.actions.find(action => action.id === 'product')?.to).toBe(
      '/data-products/cold-room-temperature',
    );
  });

  it('renders the success page without Scaffolder terminology', () => {
    const result = creationSuccessActions({
      productName: 'cold-room-temperature',
      remoteUrl: 'https://github.com/pharma-data-factory/cold-room-temperature',
    });
    render(
      <MemoryRouter>
        <CreationSuccessPage
          productName={result.productName}
          repository={result.repository}
          actions={result.actions}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Data Product created')).toBeInTheDocument();
    expect(screen.getByText('cold-room-temperature')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Repository: https://github.com/pharma-data-factory/cold-room-temperature',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('View Data Product')).toBeInTheDocument();
    expect(screen.queryByText(/Scaffolder|Entity Ref|Backstage/i)).not.toBeInTheDocument();
  });

  it('renders a professional failure state', () => {
    render(
      <MemoryRouter>
        <CreationFailurePage
          message="You do not have permission to view this page. Contact your platform administrator if you need access."
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Creation failed')).toBeInTheDocument();
    expect(screen.queryByText(/Scaffolder|stack|Backstage/i)).not.toBeInTheDocument();
  });
});
