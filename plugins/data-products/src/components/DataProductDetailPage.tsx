import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Content,
  Header,
  InfoCard,
  Link,
  Page,
  Progress,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Grid, Typography } from '@material-ui/core';
import {
  documentationHref,
  formatJourneyError,
  isUnauthorizedError,
} from '@internal/platform-common';
import { DataProduct, catalogClassLabel, toRelatedDataProducts } from '../model';
import { CertificationChip } from './CertificationChip';
import { CompatibilityChip } from './CompatibilityChip';
import { DependencyCard } from './DependencyCard';
import { DiscoverCard } from './DiscoverCard';
import { CiQualityGateCard } from './CiQualityGateCard';
import { JourneyState } from './JourneyState';
import { PlatformComplianceCard } from './PlatformComplianceCard';
import { QualityAndContractCard } from './QualityAndContractCard';
import { UpgradeChip } from './UpgradeChip';

export function DataProductDetailPage() {
  const { name } = useParams();
  const catalogApi = useApi(catalogApiRef);
  const [product, setProduct] = useState<DataProduct>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!name) {
      return () => {
        active = false;
      };
    }
    setLoading(true);
    catalogApi
      .getEntities({ filter: { kind: ['Component', 'API'] } })
      .then(response => {
        const products = toRelatedDataProducts(response.items);
        const match = products.find(item => item.name === name);
        if (!match) {
          throw new Error(`Data Product ${name} was not found`);
        }
        if (!active) {
          return;
        }
        setProduct(match);
        rememberRecent(match.name);
        setLoading(false);
      })
      .catch(err => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalogApi, name]);

  const unauthorized = error ? isUnauthorizedError(error) : false;

  return (
    <Page themeId="tool">
      <Header
        title={product?.title ?? 'Data Product'}
        subtitle={product?.description}
        type="Data Products"
        typeLink="/data-products"
      />
      <Content>
        {loading && <Progress />}
        {!loading && error && (
          <JourneyState
            title={unauthorized ? 'Unauthorized' : 'Unable to load Data Product'}
            message={formatJourneyError(error)}
          />
        )}
        {!loading && !error && !product && (
          <JourneyState
            title="Empty"
            message="This Data Product is not in the catalog yet."
          />
        )}
        {product && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={8} id="overview">
              <InfoCard title="Overview">
                {catalogClassLabel(product) && (
                  <Typography variant="body2" style={{ marginBottom: 12 }}>
                    {catalogClassLabel(product)} catalog entity. It is not an
                    operational Data Product generated from a Golden Path.
                  </Typography>
                )}
                <StructuredMetadataTable
                  metadata={{
                    Name: product.title,
                    Owner: product.owner,
                    Domain: product.domain,
                    Lifecycle: product.lifecycle,
                    Certification: product.certificationStatus,
                  }}
                />
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  Technical platform status only. This is not GxP or regulatory
                  validation.
                </Typography>
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={4}>
              <InfoCard title="Certification">
                <CertificationChip status={product.certificationStatus} />
                {catalogClassLabel(product) && (
                  <Typography variant="body2" style={{ marginTop: 12 }}>
                    {catalogClassLabel(product)}
                  </Typography>
                )}
              </InfoCard>
            </Grid>
            <Grid item xs={12} id="health">
              <Typography variant="h6" style={{ marginBottom: 8 }}>
                Health
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <QualityAndContractCard product={product} />
            </Grid>
            <Grid item xs={12} md={6} id="ci-quality-gate">
              <CiQualityGateCard entityRef={product.entityRef} />
            </Grid>
            <Grid item xs={12} id="platform-compliance">
              <PlatformComplianceCard product={product} />
            </Grid>
            {product.upgrade && (
              <Grid item xs={12} md={4}>
                <InfoCard title="Upgrade Status">
                  <UpgradeChip status={product.upgrade.overall} />
                  <Typography variant="body2" style={{ marginTop: 12 }}>
                    <Link to={documentationHref('versioning')}>
                      Versioning and upgrades
                    </Link>
                  </Typography>
                  <Typography variant="body2" style={{ marginTop: 12 }}>
                    <Link to={documentationHref('upgrade-guide')}>
                      Upgrade Guide
                    </Link>
                  </Typography>
                  {product.templateName && (
                    <Typography variant="body2" style={{ marginTop: 12 }}>
                      <Link to={`/releases/${product.templateName}`}>
                        Current Golden Path release
                      </Link>
                    </Typography>
                  )}
                </InfoCard>
              </Grid>
            )}
            <Grid item xs={12} id="contract">
              <InfoCard title="Contract">
                <CompatibilityChip status={product.compatibilityStatus} />
                <div style={{ marginTop: 16 }}>
                  <StructuredMetadataTable
                    metadata={{
                      Contract:
                        product.contractTitle ||
                        product.contractLogicalName ||
                        product.dataContract ||
                        'Not registered',
                      Version: product.dataContractVersion || 'Not registered',
                      Compatibility: product.compatibilityStatus,
                    }}
                  />
                </div>
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  <Link to={documentationHref('contracts')}>
                    Contract documentation
                  </Link>
                </Typography>
              </InfoCard>
            </Grid>
            <Grid item xs={12} id="dependencies">
              <DependencyCard product={product} />
            </Grid>
            <Grid item xs={12} md={6} id="discover">
              <DiscoverCard product={product} />
            </Grid>
          </Grid>
        )}
      </Content>
    </Page>
  );
}

function rememberRecent(name: string) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const key = 'pharma-data-factory.recent-products';
    const current = JSON.parse(window.localStorage.getItem(key) || '[]') as string[];
    window.localStorage.setItem(
      key,
      JSON.stringify([name, ...current.filter(item => item !== name)].slice(0, 5)),
    );
  } catch {
    return;
  }
}
