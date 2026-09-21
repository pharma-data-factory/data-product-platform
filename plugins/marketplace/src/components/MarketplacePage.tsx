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
import {
  filterChipSx,
  outlineButtonSx,
} from '@internal/plugin-nexora-common';
import { artifactRegistryApiRef } from '../artifactRegistryApi';
import { marketplaceCatalogSources } from '../catalog';
import { entitlementApiRef } from '../entitlementApi';
import { loadOfferings } from '../offeringSource';
import {
  MARKETPLACE_CATEGORIES,
  MarketplaceCategory,
  MarketplaceItem,
  enrichMarketplaceItems,
  filterMarketplaceItems,
  marketplaceCreateAllowed,
  marketplaceOfferingKind,
} from '../data';

const useStyles = makeStyles(theme => ({
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
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  filterChip: filterChipSx(theme, false),
  filterChipSelected: filterChipSx(theme, true),
  createAction: {
    ...outlineButtonSx(theme),
    display: 'inline-flex',
    whiteSpace: 'nowrap',
  },
  buildingBlock: {
    background: theme.palette.background.default,
    border: `1px solid ${theme.palette.divider}`,
    color: theme.palette.text.secondary,
    fontWeight: 600,
    height: 24,
    marginLeft: 8,
  },
}));

export function MarketplacePage() {
  const classes = useStyles();
  const navigate = useNavigate();
  const catalogApi = useApi(catalogApiRef);
  const entitlementApi = useApi(entitlementApiRef);
  const registryApi = useApi(artifactRegistryApiRef);
  const { role } = usePlatformRole();
  const isAdmin = canAdministerPlatform(role);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<MarketplaceCategory | 'All'>('All');
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let active = true;
    Promise.all([
      catalogApi.getEntities({
        filter: { kind: ['Component', 'API', 'Template'] },
      }),
      entitlementApi.getProducts().catch(() => undefined),
      loadOfferings(registryApi),
    ])
      .then(([response, productsSnapshot, offerings]) => {
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
            offerings,
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
          setItems([]);
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalogApi, entitlementApi, registryApi]);

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
              <div className={classes.filters}>
                <Chip
                  label="All"
                  clickable
                  className={
                    category === 'All'
                      ? classes.filterChipSelected
                      : classes.filterChip
                  }
                  onClick={() => setCategory('All')}
                />
                {MARKETPLACE_CATEGORIES.map(item => (
                  <Chip
                    key={item}
                    label={item}
                    clickable
                    className={
                      category === item
                        ? classes.filterChipSelected
                        : classes.filterChip
                    }
                    onClick={() => setCategory(item)}
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
                    <TableCell>Publisher</TableCell>
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
                            className={classes.buildingBlock}
                          />
                        )}
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell>{item.version}</TableCell>
                      <TableCell>
                        {item.externalPublisher
                          ? item.publisherTrustLevel === 'PARTNER'
                            ? '✓ Partner'
                            : '⚠ Community'
                          : item.provider}
                      </TableCell>
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
                            className={classes.createAction}
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
