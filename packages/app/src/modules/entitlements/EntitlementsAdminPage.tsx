import { useEffect, useState } from 'react';
import { Progress, StructuredMetadataTable } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  NexoraSection,
  NexoraToolPage,
  StatusBadge,
  nexoraThemeColor,
  useNexoraToolStyles,
} from '@internal/plugin-nexora-common';
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

const useLabelStyles = makeStyles({
  note: {
    color: nexoraThemeColor.textMuted,
    fontSize: 13,
    lineHeight: 1.5,
    marginTop: 12,
  },
});

export function EntitlementsAdminPage() {
  const classes = useNexoraToolStyles();
  const labelClasses = useLabelStyles();
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
      <NexoraToolPage
        eyebrow="Admin"
        title="Entitlements"
        copy="Organization commercial capabilities. This is not a billing console."
      >
        <JourneyState
          title="Unauthorized"
          message="Only Platform Admin can view organization entitlements administration."
        />
      </NexoraToolPage>
    );
  }

  return (
    <NexoraToolPage
      eyebrow="Admin"
      title="Entitlements"
      principle="Commercial capabilities, not billing."
      copy="Organization commercial capabilities and entitlement records for the Nexora control plane."
      secondary="Local/dev entitlements come from configuration. AWS credentials are never shown."
    >
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
            <NexoraSection title="Organization">
              <StructuredMetadataTable
                metadata={{
                  Organization: data.organizationId,
                  Edition: data.edition,
                  Source: data.source,
                  Provider: data.provider,
                }}
              />
              <Typography className={labelClasses.note}>
                Local/dev entitlements come from configuration. They cannot be
                edited from the browser.
              </Typography>
            </NexoraSection>
          </Grid>
          <Grid item xs={12} md={8}>
            <NexoraSection title="Entitlements">
              <div className={classes.tableWrap}>
                <table className={classes.table}>
                  <thead>
                    <tr>
                      <th>Organization</th>
                      <th>Product</th>
                      <th>Edition</th>
                      <th>Source</th>
                      <th>Status</th>
                      <th>Valid From</th>
                      <th>Valid Until</th>
                      <th>External Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.entitlements.map(row => (
                      <tr key={row.id}>
                        <td>{row.organizationId}</td>
                        <td>{row.productId}</td>
                        <td>{data.edition}</td>
                        <td>{row.source}</td>
                        <td>
                          <StatusBadge state={row.status} kind="entitlement" />
                        </td>
                        <td>{row.validFrom || '—'}</td>
                        <td>{row.validUntil || '—'}</td>
                        <td>{row.externalReference || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </NexoraSection>
          </Grid>
        </Grid>
      )}
    </NexoraToolPage>
  );
}
