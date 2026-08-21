import {
  InfoCard,
  Link,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { Typography } from '@material-ui/core';
import { documentationHref } from '@internal/platform-common';
import { DataProduct } from '../model';
import { contractCatalogPath } from '../navigation';
import { QualityChip } from './QualityChip';

export function QualityAndContractCard({ product }: { product: DataProduct }) {
  const contractPath = contractCatalogPath(product);
  return (
    <InfoCard title="Quality">
      <QualityChip status={product.qualityStatus} />
      <div style={{ marginTop: 16 }}>
        <StructuredMetadataTable
          metadata={{
            'Data Contract': product.dataContract || 'Not registered',
            'Contract':
              product.contractTitle ||
              product.contractLogicalName ||
              'Not registered',
            'Contract API': product.providesContract ||
              product.consumesContract ||
              'Not registered',
            'Contract Version': product.dataContractVersion || 'Not registered',
            'Template': product.templateName || 'Not registered',
            'Template Version': product.templateVersion || 'Not registered',
            'Data Product Standard':
              product.dataProductStandardVersion || 'Not registered',
            'SDK Version': product.dataProductSdkVersion || 'Not registered',
            'Quality Status': product.qualityStatus,
            'Quality endpoint URL':
              product.qualityEndpoint || 'Not registered',
            'Required checks':
              product.requiredChecks.join(', ') || 'Not specified',
            'Source system': product.sourceSystems.join(', ') || 'None',
            Protocol: product.protocol || 'Not specified',
            Interface: product.interfaces.join(', ') || 'None',
          }}
        />
      </div>
      {contractPath && (
        <Typography variant="body2" style={{ marginTop: 12 }}>
          <Link to={contractPath}>View Data Contract</Link>
        </Typography>
      )}
      <Typography variant="body2" style={{ marginTop: 12 }}>
        <Link to={documentationHref('contracts')}>Contract documentation</Link>
      </Typography>
      <Typography variant="body2" style={{ marginTop: 12 }}>
        Technical quality metadata only. This is not GxP or regulatory
        validation.
      </Typography>
    </InfoCard>
  );
}
