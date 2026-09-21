/**
 * Dependencies panel — shows what a Data Product provides, consumes, depends
 * on, and who uses it. Phase 6 (P6-S4): "Used By" and "Depends On" entries
 * are now navigable links rather than plain text, so consumers can explore the
 * dependency graph directly from the detail page.
 */
import {
  InfoCard,
  Link,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { Box, Typography } from '@material-ui/core';
import { documentationHref } from '@internal/platform-common';
import { DataProduct } from '../model';
import { CompatibilityChip } from './CompatibilityChip';

/**
 * Converts a catalog entity ref or plain product name to a relative link to
 * the Data Product detail page.
 *
 * Handles:
 *  - `component:default/<name>` → /data-products/<name>
 *  - `<name>` (bare name, no colon) → /data-products/<name>
 */
function productDetailPath(ref: string): string {
  const name = ref.includes(':')
    ? ref.split('/').pop() ?? ref
    : ref;
  return `/data-products/${name}`;
}

function RefList({ refs, label }: { refs: string[]; label: string }) {
  if (refs.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary">
        None
      </Typography>
    );
  }
  return (
    <Box display="flex" flexWrap="wrap" style={{ gap: 4 }}>
      {refs.map(ref => (
        <Link key={ref} to={productDetailPath(ref)} style={{ marginRight: 4 }}>
          {ref.includes(':') ? (ref.split('/').pop() ?? ref) : ref}
        </Link>
      ))}
    </Box>
  );
}

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
          }}
        />
      </div>

      {product.dependsOn.length > 0 && (
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>
            Depends On
          </Typography>
          <RefList refs={product.dependsOn} label="Depends On" />
        </Box>
      )}

      {product.usedBy.length > 0 && (
        <Box mt={2}>
          <Typography variant="subtitle2" gutterBottom>
            Used By
          </Typography>
          <RefList refs={product.usedBy} label="Used By" />
        </Box>
      )}

      <Typography variant="body2" style={{ marginTop: 16 }}>
        Provides, consumes, depends on, and used-by relations for this Data
        Product. Compatibility uses consumer version ranges. This is not GxP
        or regulatory validation.
      </Typography>
      <Typography variant="body2" style={{ marginTop: 8 }}>
        <Link to={documentationHref('architecture-data-product')}>
          Data Product Architecture
        </Link>
      </Typography>
    </InfoCard>
  );
}
