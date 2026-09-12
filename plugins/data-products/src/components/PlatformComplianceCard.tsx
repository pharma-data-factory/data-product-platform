import {
  InfoCard,
  Link,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { Typography } from '@material-ui/core';
import { documentationHref } from '@internal/platform-common';
import { DataProduct } from '../model';
import { CertificationChip } from './CertificationChip';
import { UpgradeChip } from './UpgradeChip';

export function PlatformComplianceCard({ product }: { product: DataProduct }) {
  const upgrade = product.upgrade;
  return (
    <InfoCard title="Platform Compliance">
      <StructuredMetadataTable
        metadata={{
          'Standard Version': product.dataProductStandardVersion
            ? `${product.dataProductStandardVersion}  ${upgrade?.standard.status ?? ''}`
            : 'Not registered',
          'SDK Version': product.dataProductSdkVersion
            ? `${product.dataProductSdkVersion}  ${upgrade?.sdk.status ?? ''}`
            : 'Not registered',
          'Template Version': product.templateVersion
            ? `${product.templateVersion}  ${upgrade?.template.status ?? ''}`
            : 'Not registered',
          'Contract Version': product.dataContractVersion || 'Not registered',
          'Contract':
            product.contractTitle ||
            product.contractLogicalName ||
            product.providesContract ||
            'Not registered',
          'Manifest Content Hash': product.productManifestContentHash
            ? `${product.productManifestContentHash.slice(0, 16)}…`
            : 'Not pinned',
          'URS Baseline ID': product.ursBaselineId || 'Not pinned',
          'Product Baseline ID': product.productBaselineId || 'Not pinned',
        }}
      />
      <div style={{ marginTop: 16 }}>
        <Typography variant="subtitle2">Certification</Typography>
        <CertificationChip status={product.certificationStatus} />
        {upgrade && (
          <>
            <Typography variant="subtitle2" style={{ marginTop: 12 }}>
              Upgrade Status
            </Typography>
            <UpgradeChip status={upgrade.overall} />
          </>
        )}
      </div>
      <Typography variant="body2" style={{ marginTop: 12 }}>
        <Link to={documentationHref('standard')}>Data Product Standard</Link>
      </Typography>
      <Typography variant="body2" style={{ marginTop: 12 }}>
        Technical platform compliance only. This is not GxP or regulatory
        validation. The platform does not change repositories automatically.
      </Typography>
    </InfoCard>
  );
}
