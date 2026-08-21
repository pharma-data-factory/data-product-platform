import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Content,
  Header,
  InfoCard,
  Link,
  Page,
  Progress,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@material-ui/core';
import { formatJourneyError, isUnauthorizedError } from '@internal/platform-common';
import {
  DataProduct,
  catalogClassLabel,
  matchesQuery,
  toRelatedDataProducts,
} from '../model';
import { CertificationChip } from './CertificationChip';
import { CompatibilityChip } from './CompatibilityChip';
import { JourneyState } from './JourneyState';
import { QualityChip } from './QualityChip';
import { UpgradeChip } from './UpgradeChip';

export function DataProductsPage() {
  const catalogApi = useApi(catalogApiRef);
  const navigate = useNavigate();
  const [products, setProducts] = useState<DataProduct[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let active = true;
    catalogApi
      .getEntities({ filter: { kind: ['Component', 'API'] } })
      .then(response => {
        if (!active) {
          return;
        }
        setProducts(toRelatedDataProducts(response.items));
        setLoading(false);
      })
      .catch(err => {
        if (active) {
          setError(err);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalogApi]);

  const visible = useMemo(
    () => products.filter(product => matchesQuery(product, query)),
    [products, query],
  );

  return (
    <Page themeId="tool">
      <Header
        title="Data Products"
        subtitle="Governed Data Products you can operate from Nexora"
      />
      <Content>
        {loading && <Progress />}
        {error && (
          <JourneyState
            title={isUnauthorizedError(error) ? 'Unauthorized' : 'Unable to load Data Products'}
            message={formatJourneyError(error)}
          />
        )}
        {!loading && !error && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <InfoCard title="Discover">
                <Typography variant="body2" paragraph>
                  Search by name, owner, quality, contract, or repository.
                  SAMPLE and REFERENCE catalog entities are labeled and are
                  not generated GitHub repositories. Quality badges are technical
                  platform status only, not GxP validation.
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  label="Search or filter"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  placeholder="Name, owner, quality, contract version, repository"
                />
              </InfoCard>
            </Grid>
            {visible.length === 0 ? (
              <Grid item xs={12}>
                <JourneyState
                  title="Empty"
                  message={
                    products.length === 0
                      ? 'No Data Products are registered yet. Create one from the Marketplace.'
                      : 'No Data Products match this search.'
                  }
                />
              </Grid>
            ) : null}
            {visible.length > 0 && (
            <Grid item xs={12}>
              <InfoCard title={`${visible.length} data products`}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Data Product</TableCell>
                      <TableCell>Owner</TableCell>
                      <TableCell>Lifecycle</TableCell>
                      <TableCell>Version</TableCell>
                      <TableCell>Template version</TableCell>
                      <TableCell>Standard</TableCell>
                      <TableCell>SDK</TableCell>
                      <TableCell>Contract version</TableCell>
                      <TableCell>Quality</TableCell>
                      <TableCell>Certification</TableCell>
                      <TableCell>Upgrade</TableCell>
                      <TableCell>Compatibility</TableCell>
                      <TableCell>Repository</TableCell>
                      <TableCell>Documentation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {visible.map(product => (
                      <TableRow
                        key={product.name}
                        hover
                        style={{ cursor: 'pointer' }}
                        onClick={() =>
                          navigate(`/data-products/${product.name}`)
                        }
                      >
                        <TableCell>
                          {product.title}
                          {catalogClassLabel(product)
                            ? ` · ${catalogClassLabel(product)}`
                            : ''}
                        </TableCell>
                        <TableCell>{product.owner}</TableCell>
                        <TableCell>{product.lifecycle}</TableCell>
                        <TableCell>{product.version}</TableCell>
                        <TableCell>{product.templateVersion || '—'}</TableCell>
                        <TableCell>
                          {product.dataProductStandardVersion || '—'}
                        </TableCell>
                        <TableCell>
                          {product.dataProductSdkVersion || '—'}
                        </TableCell>
                        <TableCell>
                          {product.dataContractVersion || '—'}
                        </TableCell>
                        <TableCell>
                          <QualityChip status={product.qualityStatus} />
                        </TableCell>
                        <TableCell>
                          <CertificationChip
                            status={product.certificationStatus}
                          />
                        </TableCell>
                        <TableCell>
                          {product.upgrade ? (
                            <UpgradeChip status={product.upgrade.overall} />
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <CompatibilityChip
                            status={product.compatibilityStatus}
                          />
                        </TableCell>
                        <TableCell onClick={event => event.stopPropagation()}>
                          {product.repository ? (
                            <Link to={product.repository}>
                              {product.repository}
                            </Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell onClick={event => event.stopPropagation()}>
                          {product.documentation ? (
                            <Link to={product.documentation}>Docs</Link>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </InfoCard>
            </Grid>
            )}
          </Grid>
        )}
      </Content>
    </Page>
  );
}
