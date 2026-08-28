import { useCallback, useEffect, useState } from 'react';
import { Progress, StructuredMetadataTable } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Button, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  NEXORA_MUTED,
  NEXORA_NAVY,
  NexoraSection,
  NexoraToolPage,
  outlineButtonSx,
  primaryButtonSx,
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
  type MarketplaceIntegrationStatus,
  type MarketplaceLinkView,
} from '@internal/plugin-marketplace';

const useActionStyles = makeStyles({
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  primaryAction: {
    ...primaryButtonSx,
    minWidth: 0,
    padding: '6px 12px',
  },
  outlineAction: {
    ...outlineButtonSx,
    minWidth: 0,
  },
  status: {
    color: NEXORA_NAVY,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  mutedLabel: {
    color: NEXORA_MUTED,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.06em',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
});

export function MarketplaceIntegrationPage() {
  const classes = useNexoraToolStyles();
  const actionClasses = useActionStyles();
  const api = useApi(entitlementApiRef);
  const { role } = usePlatformRole();
  const [data, setData] = useState<MarketplaceIntegrationStatus>();
  const [links, setLinks] = useState<MarketplaceLinkView[]>([]);
  const [error, setError] = useState<Error>();
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    Promise.all([api.getIntegration(), api.getMarketplaceLinks()])
      .then(([integration, linkData]) => {
        setData(integration);
        setLinks(linkData.links);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });
  }, [api]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (!canAdministerPlatform(role) && !loading) {
    return (
      <NexoraToolPage
        eyebrow="Admin"
        title="Marketplace Integration"
        copy="AWS Marketplace adapter status. No secrets are displayed."
      >
        <JourneyState
          title="Unauthorized"
          message="Only Platform Admin can view Marketplace integration diagnostics."
        />
      </NexoraToolPage>
    );
  }

  return (
    <NexoraToolPage
      eyebrow="Admin"
      title="Marketplace Integration"
      principle="Commercial adapter diagnostics only."
      copy="AWS Marketplace adapter status and organization link governance."
      secondary="No secrets, tokens, or credentials are displayed in this view."
    >
      {loading && <Progress />}
      {error && (
        <JourneyState
          title={isUnauthorizedError(error) ? 'Unauthorized' : 'Unable to load integration'}
          message={formatJourneyError(error)}
        />
      )}
      {data && (
        <NexoraSection title="Adapter">
          <StructuredMetadataTable
            metadata={{
              Provider: data.provider,
              Status: data.status,
              Environment: data.environment || '—',
              'Fail closed': data.failClosed ? 'yes' : 'no',
              'Legal distribution': data.legalDistributionStatus || 'BLOCKED',
              'Registration endpoint': data.registrationEndpoint || '—',
              Region: data.region || '—',
              'Product code': data.productCode || '—',
              'Organization links': String(
                data.organizationLinkCount ?? links.length,
              ),
              'Last ResolveCustomer category':
                data.lastResolveCustomerCategory || '—',
              'Last successful lookup': data.lastSuccessfulLookup || '—',
              'Last failed lookup': data.lastFailedLookup || '—',
              'Error category': data.errorCategory || '—',
            }}
          />
          <div className={actionClasses.mutedLabel} style={{ marginTop: 16 }}>
            Configured product mappings
          </div>
          {data.mappings.map(mapping => (
            <Typography key={mapping.productId} variant="body2">
              {mapping.productId} — {mapping.availability}
              {mapping.catalogRef ? ` — ${mapping.catalogRef}` : ''}
            </Typography>
          ))}
          <Typography variant="body2" style={{ marginTop: 12 }}>
            {data.failClosed
              ? 'AWS mode is fail-closed. An AWS API failure does not grant local or INTERNAL entitlements.'
              : 'Local development uses LocalEntitlementProvider. NOT CONFIGURED is expected until a test listing exists.'}
          </Typography>
        </NexoraSection>
      )}
      {data && (
        <NexoraSection title="Organization links">
          <Typography variant="body2" style={{ marginBottom: 12 }}>
            Approve or disable a verified Marketplace identity. Links cannot
            create tenants or choose an organization from an untrusted browser
            POST.
          </Typography>
          <div className={classes.tableWrap}>
            <table className={classes.table}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Organization</th>
                  <th>AWS account</th>
                  <th>License ARN</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map(link => (
                  <tr key={link.id}>
                    <td>
                      <span className={actionClasses.status}>{link.status}</span>
                    </td>
                    <td>{link.organizationId || '—'}</td>
                    <td>{link.awsAccountId || '—'}</td>
                    <td>{link.licenseArn || '—'}</td>
                    <td>
                      <div className={actionClasses.actions}>
                        {link.status !== 'APPROVED' && (
                          <Button
                            size="small"
                            className={actionClasses.primaryAction}
                            onClick={() =>
                              api
                                .approveMarketplaceLink(link.id)
                                .then(() => refresh())
                                .catch(err =>
                                  setError(
                                    err instanceof Error
                                      ? err
                                      : new Error(String(err)),
                                  ),
                                )
                            }
                          >
                            Approve
                          </Button>
                        )}
                        {link.status !== 'DISABLED' && (
                          <Button
                            size="small"
                            className={actionClasses.outlineAction}
                            onClick={() =>
                              api
                                .disableMarketplaceLink(link.id)
                                .then(() => refresh())
                                .catch(err =>
                                  setError(
                                    err instanceof Error
                                      ? err
                                      : new Error(String(err)),
                                  ),
                                )
                            }
                          >
                            Disable
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </NexoraSection>
      )}
    </NexoraToolPage>
  );
}
