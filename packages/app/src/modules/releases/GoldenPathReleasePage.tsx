import { useParams } from 'react-router-dom';
import {
  Content,
  InfoCard,
  Link,
  Page,
  StructuredMetadataTable,
} from '@backstage/core-components';
import { Grid, Typography } from '@material-ui/core';
import {
  currentRelease,
  distributionStatusLines,
  documentationHref,
  releasesForTemplate,
} from '@internal/platform-common';
import { JourneyState } from '@internal/plugin-data-products';

export function GoldenPathReleasePage() {
  const { templateId } = useParams();
  const release = templateId ? currentRelease(templateId) : undefined;
  const history = templateId ? releasesForTemplate(templateId) : [];

  return (
    <Page themeId="tool">
      <Content>
        {!release && (
          <JourneyState
            title="Empty"
            message="No official Golden Path release matches this identifier."
          />
        )}
        {release && (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h4">{release.name}</Typography>
            </Grid>
            <Grid item xs={12} md={8}>
              <InfoCard title="Current release">
                <StructuredMetadataTable
                  metadata={{
                    Version: release.version,
                    'Release status': release.status,
                    Certification: release.certification.status,
                    Standard: release.certification.standard,
                    SDK: release.certification.sdk,
                    Released: release.release.date,
                  }}
                />
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  CERTIFIED is technical conformance. RELEASED is approval for
                  consumption. Neither is GxP validation.
                </Typography>
              </InfoCard>
              <InfoCard title="Changelog">
                <Typography variant="subtitle2">Breaking changes</Typography>
                <Typography variant="body2">
                  {release.changelog.breaking.join('; ') || 'None'}
                </Typography>
                <Typography variant="subtitle2">New capabilities</Typography>
                <Typography variant="body2">
                  {release.changelog.capabilities.join('; ') || 'None'}
                </Typography>
                <Typography variant="subtitle2">Fixes</Typography>
                <Typography variant="body2">
                  {release.changelog.fixes.join('; ') || 'None'}
                </Typography>
                <Typography variant="subtitle2">Migration notes</Typography>
                <Typography variant="body2">{release.changelog.migration}</Typography>
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  <Link
                    to={`/docs/default/component/data-product-platform/${release.release.notes
                      .replace(/^docs\//, '')
                      .replace(/\.md$/, '')}`}
                  >
                    Release notes
                  </Link>
                </Typography>
              </InfoCard>
            </Grid>
            <Grid item xs={12} md={4}>
              <InfoCard title="Distribution">
                {distributionStatusLines(release.distribution).map(row => (
                  <Typography key={row.channel} variant="body2">
                    {row.label} — {row.availability}
                    {row.offered ||
                    row.availability === 'AVAILABLE' ||
                    row.availability === 'AVAILABLE FOR PILOT'
                      ? ''
                      : '. Not available'}
                  </Typography>
                ))}
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  Distribution is not entitlement. Platform Edition and SaaS
                  must not be treated as shipped.
                </Typography>
              </InfoCard>
              <InfoCard title="Release history">
                {history.map(entry => (
                  <Typography key={entry.version} variant="body2">
                    {entry.version}
                    {entry.version === release.version ? ' CURRENT' : ''}
                    {`  ${entry.status}`}
                  </Typography>
                ))}
              </InfoCard>
              <InfoCard title="Create">
                <Typography variant="body2">
                  <Link to={`/marketplace/${release.template}`}>
                    Open in Marketplace
                  </Link>
                </Typography>
                <Typography variant="body2" style={{ marginTop: 12 }}>
                  <Link to={documentationHref('howto-release')}>
                    Release a Golden Path
                  </Link>
                </Typography>
              </InfoCard>
            </Grid>
          </Grid>
        )}
      </Content>
    </Page>
  );
}
