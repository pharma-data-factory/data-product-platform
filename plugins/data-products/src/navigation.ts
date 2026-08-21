import { DataProduct } from './model';

export interface DiscoverLink {
  id: string;
  label: string;
  to: string;
}

export function contractEntityName(product: DataProduct): string | undefined {
  return product.providesContract || product.consumesContract;
}

export function contractCatalogPath(product: DataProduct): string | undefined {
  const name = contractEntityName(product);
  return name ? `/catalog/default/api/${name}` : undefined;
}

export function catalogGraphPath(product: DataProduct): string {
  return `/catalog-graph?rootEntityRefs=${encodeURIComponent(product.entityRef)}`;
}

export function dataProductDiscoverLinks(product: DataProduct): DiscoverLink[] {
  const links: DiscoverLink[] = [];
  if (product.repository) {
    links.push({ id: 'repository', label: 'Repository', to: product.repository });
  }
  if (product.techDocsUrl) {
    links.push({ id: 'techdocs', label: 'Documentation', to: product.techDocsUrl });
  }
  links.push({
    id: 'catalog-graph',
    label: 'Catalog Graph',
    to: catalogGraphPath(product),
  });
  const contractPath = contractCatalogPath(product);
  if (contractPath) {
    links.push({ id: 'api', label: 'API / Contract', to: contractPath });
  }
  return links;
}
