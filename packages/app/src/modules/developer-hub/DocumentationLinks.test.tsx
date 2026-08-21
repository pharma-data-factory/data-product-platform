import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DocumentationSearchKind } from './DocumentationLinks';

describe('search classification', () => {
  it('labels TechDocs hits without a second search index', () => {
    render(
      <MemoryRouter>
        <DocumentationSearchKind
          location="/docs/default/component/data-product-platform/architecture/platform"
          title="Platform Architecture"
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Architecture')).toBeInTheDocument();
  });

  it('distinguishes How-To, Golden Path, and Data Product documentation', () => {
    const { rerender } = render(
      <MemoryRouter>
        <DocumentationSearchKind location="/docs/default/component/data-product-platform/how-to/ci-failure" />
      </MemoryRouter>,
    );
    expect(screen.getByText('How-To')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <DocumentationSearchKind location="/docs/default/component/data-product-platform/fundamentals/golden-paths" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Golden Path')).toBeInTheDocument();

    rerender(
      <MemoryRouter>
        <DocumentationSearchKind
          location="/docs/default/component/cold-room-temperature"
          title="Cold Room Temperature"
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Data Product Documentation')).toBeInTheDocument();
  });
});
