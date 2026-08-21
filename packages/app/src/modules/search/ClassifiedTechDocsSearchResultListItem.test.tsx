import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ClassifiedTechDocsSearchResultListItem } from './ClassifiedTechDocsSearchResultListItem';

describe('classified TechDocs search results', () => {
  it('labels TechDocs hits without a second search index', () => {
    render(
      <MemoryRouter>
        <ClassifiedTechDocsSearchResultListItem
          result={{
            location:
              '/docs/default/component/data-product-platform/architecture/platform',
            title: 'Platform Architecture',
            text: 'Control Plane',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Architecture')).toBeInTheDocument();
    expect(screen.getByText('Platform Architecture')).toHaveAttribute(
      'href',
      '/docs/default/component/data-product-platform/architecture/platform',
    );
  });

  it('labels contract TechDocs hits as Contract Documentation', () => {
    render(
      <MemoryRouter>
        <ClassifiedTechDocsSearchResultListItem
          result={{
            location:
              '/docs/default/component/data-product-platform/contracts/temperature-event',
            title: 'Temperature Event Contract',
          }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Contract Documentation')).toBeInTheDocument();
  });
});
