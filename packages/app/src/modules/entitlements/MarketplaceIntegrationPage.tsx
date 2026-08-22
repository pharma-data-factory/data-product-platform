import { useCallback, useEffect, useState } from 'react';
import {
  Content,
  Header,
  InfoCard,
  Page,
  Progress,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@material-ui/core';
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

export function MarketplaceIntegrationPage() {
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
      <Page themeId="tool">
        <Header title="Marketplace Integration" />
        <Content>
          <JourneyState
            title="Unauthorized"
            message="Only Platform Admin can view Marketplace integration diagnostics."
          />
        </Content>
      </Page>
    );
  }

  return (
    <Page themeId="tool">
      <Header
        title="Marketplace Integration"
        subtitle="AWS Marketplace adapter status. No secrets are displayed."
      />
      <Content>
        {loading && <Progress />}
        {error && (
          <JourneyState
            title={isUnauthorizedError(error) ? 'Unauthorized' : 'Unable to load integration'}
            message={formatJourneyError(error)}
          />
        )}
        {data && (
          <InfoCard title="Adapter">
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
                'Organization links': String(data.organizationLinkCount ?? links.length),
                'Last ResolveCustomer category':
                  data.lastResolveCustomerCategory || '—',
                'Last successful lookup': data.lastSuccessfulLookup || '—',
                'Last failed lookup': data.lastFailedLookup || '—',
                'Error category': data.errorCategory || '—',
              }}
            />
            <Typography variant="subtitle2" style={{ marginTop: 16 }}>
              Configured product mappings
            </Typography>
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
          </InfoCard>
        )}
        {data && (
          <InfoCard title="Organization links">
            <Typography variant="body2" style={{ marginBottom: 12 }}>
              Approve or disable a verified Marketplace identity. Links cannot
              create tenants or choose an organization from an untrusted
              browser POST.
            </Typography>
            <div style={{ overflowX: 'auto', width: '100%' }}>
            <Table style={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Organization</TableCell>
                  <TableCell>AWS account</TableCell>
                  <TableCell>License ARN</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {links.map(link => (
                  <TableRow key={link.id}>
                    <TableCell>{link.status}</TableCell>
                    <TableCell>{link.organizationId || '—'}</TableCell>
                    <TableCell>{link.awsAccountId || '—'}</TableCell>
                    <TableCell>{link.licenseArn || '—'}</TableCell>
                    <TableCell>
                      {link.status !== 'APPROVED' && (
                        <Button
                          size="small"
                          color="primary"
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
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </InfoCard>
        )}
      </Content>
    </Page>
  );
}
