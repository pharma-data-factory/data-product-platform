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
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  CertificationChip,
  JourneyState,
  QualityChip,
  usePlatformRole,
} from '@internal/plugin-data-products';
import {
  canAdministerPlatform,
  formatJourneyError,
  isUnauthorizedError,
} from '@internal/platform-common';
import { marketplaceCatalogSources } from '../catalog';
import { entitlementApiRef } from '../entitlementApi';
import {
  MARKETPLACE_CATEGORIES,
  MarketplaceCategory,
  MarketplaceItem,
  enrichMarketplaceItems,
  filterMarketplaceItems,
  marketplaceCreateAllowed,
  marketplaceItems,
  marketplaceOfferingKind,
} from '../data';

const useStyles = makeStyles({
  tableWrap: {
    overflowX: 'auto',
    width: '100%',
  },
  table: {
    minWidth: 720,
  },
  nameCell: {
    fontWeight: 600,
    minWidth: 200,
    whiteSpace: 'normal',
  },
});

export function MarketplacePage() {
  const classes = useStyles();
  const navigate = useNavigate();
  const catalogApi = useApi(catalogApiRef);
  const entitlementApi = useApi(entitlementApiRef);
  const { role } = usePlatformRole();
  const isAdmin = canAdministerPlatform(role);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory | 'All'>('All');
  const [items, setItems] = useState<MarketplaceItem[]>(marketplaceItems);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let active = true;
    Promise.all([
      catalogApi.getEntities({
        filter: { kind: ['Component', 'API', 'Template'] },
      }),
      entitlementApi.getProducts().catch(() => undefined),
    ])
      .then(([response, productsSnapshot]) => {
        if (!active) {
          return;
        }
        const { products, apis, templates } = marketplaceCatalogSources(
          response.items,
        );
        const entitledIds =
          productsSnapshot?.products
            .filter(product => product.entitled)
            .map(product => product.productId) ?? undefined;
        setItems(
          enrichMarketplaceItems(
            marketplaceItems,
            products,
            apis,
            templates,
            entitledIds,
          ).map(item => {
            const commercial = productsSnapshot?.products.find(
              product =>
                product.templateId === item.id ||
                product.marketplaceId === item.id,
            );
            if (commercial?.accessState === 'PENDING_ACCESS') {
              return {
                ...item,
                commercialStatus: 'PENDING_ACCESS',
                commercialCopy:
                  'Marketplace registration is pending organization linking',
              };
            }
            return item;
          }),
        );
        setLoading(false);
      })
      .catch(err => {
        if (active) {
          setItems(marketplaceItems);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalogApi, entitlementApi]);

  const visible = useMemo(
    () => filterMarketplaceItems(items, query, category),
    [items, query, category],
  );

  return (
    <Page themeId="tool">
      <Header
        title="Marketplace"
        subtitle="Discover certified Golden Paths and Data Products"
      />
      <Content>
        {loading && <Progress />}
        {error && (
          <JourneyState
            title={isUnauthorizedError(error) ? 'Unauthorized' : 'Unable to load Marketplace'}
            message={formatJourneyError(error)}
          />
        )}
        {!loading && visible.length === 0 && (
          <JourneyState
            title="Empty"
            message="No marketplace entries match this search."
          />
        )}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <InfoCard title="Discover">
              <Typography variant="body2" paragraph>
                Discover certified Golden Paths and Data Products. Platform
                Components, when listed, are building blocks, not Data
                Products. Commercial status is organization entitlement, not
                a storefront. There are no purchase buttons. AWS Marketplace
                is a future procurement channel, not this catalog.
              </Typography>
              {isAdmin && (
                <Typography variant="body2" paragraph>
                  Marketplace administration: catalog-driven entries and
                  template metadata. No billing or partner onboarding.
                </Typography>
              )}
              <TextField
                fullWidth
                variant="outlined"
                label="Search marketplace"
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
              <div style={{ marginTop: 16 }}>
                <Chip
                  label="All"
                  color={category === 'All' ? 'primary' : 'default'}
                  onClick={() => setCategory('All')}
                  style={{ marginRight: 8 }}
                />
                {MARKETPLACE_CATEGORIES.map(item => (
                  <Chip
                    key={item}
                    label={item}
                    color={category === item ? 'primary' : 'default'}
                    onClick={() => setCategory(item)}
                    style={{ marginRight: 8 }}
                  />
                ))}
              </div>
            </InfoCard>
          </Grid>
          {visible.length > 0 && (
            <Grid item xs={12}>
              <InfoCard title={`${visible.length} entries`}>
                <div className={classes.tableWrap}>
                <Table className={classes.table}>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Quality</TableCell>
                    <TableCell>Certification</TableCell>
                    <TableCell>Create</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.map(item => (
                    <TableRow
                      key={item.id}
                      hover
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/marketplace/${item.id}`)}
                    >
                      <TableCell className={classes.nameCell}>
                        {item.name}
                        {marketplaceOfferingKind(item) === 'BUILDING BLOCK' && (
                          <Chip
                            size="small"
                            label="BUILDING BLOCK"
                            style={{ marginLeft: 8 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.version}</TableCell>
                      <TableCell>
                        {item.qualityStatus ? (
                          <QualityChip status={item.qualityStatus} />
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <CertificationChip status={item.certificationStatus} />
                      </TableCell>
                      <TableCell>
                        {item.templateReference && marketplaceCreateAllowed(
                          item,
                          role,
                          item.commercialStatus === 'ENTITLED' ||
                            item.commercialStatus === undefined,
                        ) ? (
                          <Link
                            to={item.documentation}
                            onClick={event => event.stopPropagation()}
                          >
                            Create Data Product
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
                </div>
              </InfoCard>
            </Grid>
          )}
        </Grid>
      </Content>
    </Page>
  );
}
