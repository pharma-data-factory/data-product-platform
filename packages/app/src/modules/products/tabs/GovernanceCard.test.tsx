import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Product } from '@internal/platform-common';
import { GovernanceCard } from './GovernanceCard';

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1',
    name: 'oee-line-3',
    lifecycle: 'EXPERIMENTAL',
    ...overrides,
  } as Product;
}

describe('GovernanceCard owner field (NXD-161)', () => {
  it('shows an unset owner as unset, with the example outside the field', () => {
    render(<GovernanceCard product={product()} onSave={jest.fn()} />);
    const owner = screen.getByLabelText('Owner');
    expect(owner).toHaveValue('');
    expect(owner).not.toHaveAttribute('placeholder');
    expect(
      screen.getByText(
        'Not set. Who is answerable, e.g. group:default/platform-team',
      ),
    ).toBeInTheDocument();
  });

  it('describes a set owner without the warning', () => {
    render(
      <GovernanceCard
        product={product({ owner: 'group:default/data-product-owners' })}
        onSave={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('Owner')).toHaveValue(
      'group:default/data-product-owners',
    );
    expect(
      screen.getByText('Who is answerable for this product'),
    ).toBeInTheDocument();
  });
});
