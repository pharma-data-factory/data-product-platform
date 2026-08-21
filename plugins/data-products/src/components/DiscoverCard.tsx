import { InfoCard, Link } from '@backstage/core-components';
import { Typography } from '@material-ui/core';
import { DataProduct } from '../model';
import { dataProductDiscoverLinks } from '../navigation';

export function DiscoverCard({ product }: { product: DataProduct }) {
  const links = dataProductDiscoverLinks(product);

  return (
    <InfoCard title="Discover">
      <Typography variant="body2" paragraph>
        Repository, documentation, Catalog Graph, and the Data Contract for
        this product.
      </Typography>
      {links.map(link => (
        <Typography key={link.id} variant="body2">
          <Link to={link.to}>{link.label}</Link>
        </Typography>
      ))}
    </InfoCard>
  );
}
