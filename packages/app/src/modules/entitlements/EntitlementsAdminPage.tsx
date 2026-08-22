import { useEffect, useState } from 'react';
import {
  Content,
  Header,
  InfoCard,
  Page,
  Progress,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Grid, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
import {
  canAdministerPlatform,
  formatJourneyError,
  isUnauthorizedError,
} from '@internal/platform-common';
import { JourneyState, usePlatformRole } from '@internal/plugin-data-products';
import {
  entitlementApiRef,
  type EntitlementSnapshot,
} from '@internal/plugin-marketplace';

export function EntitlementsAdminPage() {
  const api = useApi(entitlementApiRef);
  const { role } = usePlatformRole();
  const [data, setData] = useState<EntitlementSnapshot & { audit?: unknown[] }>();
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAdminEntitlements()
      .then(result => {
        setData(result);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, [api]);

  if (!canAdministerPlatform(role) && !loading) {
    return (
      <Page themeId="tool">
        <Header title="Entitlements" subtitle="Platform Admin only" />
        <Content>
          <JourneyState
            title="Unauthorized"
            message="Only Platform Admin can view organization entitlements administration."
          />
        </Content>
      </Page>
    );
  }

  return (
    <Page themeId="tool">
      <Header
        title="Entitlements"
        subtitle="Organization commercial capabilities. This is not a billing console."
      />
      <Content>
        {loading && <Progress />}
        {error && (
          <JourneyState
            title={isUnauthorizedError(error) ? 'Unauthorized' : 'Unable to load entitlements'}
            message={formatJourneyError(error)}
          />
        )}
        {data && (
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <InfoCard title="Organization">
                <StructuredMetadataTable
                  metadata={{
                    Organization: data.organizationId,
                    Edition: data.edition,
                    Source: data.source,
                    Provider: data.provider,
                  }}
                />
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  Local/dev entitlements come from configuration. They cannot
                  be edited from the browser. AWS credentials are never shown.
                </Typography>
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={8}>
              <InfoCard title="Entitlements">
                <div style={{ overflowX: 'auto', width: '100%' }}>
                <Table style={{ minWidth: 640 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Organization</TableCell>
                      <TableCell>Product</TableCell>
                      <TableCell>Edition</TableCell>
                      <TableCell>Source</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Valid From</TableCell>
                      <TableCell>Valid Until</TableCell>
                      <TableCell>External Reference</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.entitlements.map(row => (
                      <TableRow key={row.id}>
                        <TableCell>{row.organizationId}</TableCell>
                        <TableCell>{row.productId}</TableCell>
                        <TableCell>{data.edition}</TableCell>
                        <TableCell>{row.source}</TableCell>
                        <TableCell>{row.status}</TableCell>
                        <TableCell>{row.validFrom || '—'}</TableCell>
                        <TableCell>{row.validUntil || '—'}</TableCell>
                        <TableCell>{row.externalReference || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </InfoCard>
            </Grid>
          </Grid>
        )}
      </Content>
    </Page>
  );
}
