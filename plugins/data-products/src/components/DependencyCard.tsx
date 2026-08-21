import {
  InfoCard,
  Link,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { Typography } from '@material-ui/core';
import { documentationHref } from '@internal/platform-common';
import { DataProduct } from '../model';
import { CompatibilityChip } from './CompatibilityChip';

export function DependencyCard({ product }: { product: DataProduct }) {
  const provided = product.apis.length > 0 ? product.apis : [];
  const provides =
    provided.length > 0
      ? provided
          .map(api =>
            product.dataContractVersion && api === product.providesContract
              ? `${api} ${product.dataContractVersion}`
              : api,
          )
          .join(', ')
      : 'None';
  const consumes = product.consumesContract
    ? `${product.consumesContract} (${product.compatibleVersions.join(', ') || 'unspecified'})`
    : 'None';

  return (
    <InfoCard title="Dependencies">
      <CompatibilityChip status={product.compatibilityStatus} />
      <div style={{ marginTop: 16 }}>
        <StructuredMetadataTable
          metadata={{
            Provides: provides,
            Consumes: consumes,
            'Depends On': product.dependsOn.join(', ') || 'None',
            'Used By': product.usedBy.join(', ') || 'None',
          }}
        />
      </div>
      <Typography variant="body2" style={{ marginTop: 12 }}>
        Provides, consumes, depends on, and used-by relations for this Data
        Product. Compatibility uses consumer version ranges. This is not GxP
        or regulatory validation.
      </Typography>
      <Typography variant="body2" style={{ marginTop: 12 }}>
        <Link to={documentationHref('architecture-data-product')}>
          Data Product Architecture
        </Link>
      </Typography>
    </InfoCard>
  );
}
