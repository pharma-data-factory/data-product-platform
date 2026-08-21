import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Content, Header, Link, Page, Progress } from '@backstage/core-components';
import { Typography } from '@material-ui/core';
import { AasAsset, useAasClient } from './aasClient';

export function PropertyDetailPage() {
  const { assetId = '', propertyId = '' } = useParams();
  const client = useAasClient();
  const [asset, setAsset] = useState<AasAsset>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    client
      .getAsset(assetId)
      .then(setAsset)
      .catch(err => setError(err instanceof Error ? err.message : 'Not found'));
  }, [assetId, client]);

  const prop = asset?.properties.find(item => item.id === propertyId);
  if (error) {
    return (
      <Page themeId="home">
        <Header title="Property" />
        <Content>
          <Typography color="error">{error}</Typography>
        </Content>
      </Page>
    );
  }
  if (!asset || !prop) {
    return (
      <Page themeId="home">
        <Header title="Property" />
        <Content>
          <Progress />
        </Content>
      </Page>
    );
  }

  const semantic = prop.semanticId?.keys?.[0]?.value || '—';
  return (
    <Page themeId="home">
      <Header title={prop.name} subtitle={`${asset.displayName} / ${prop.id}`} />
      <Content>
        <Typography>Sensor name: {prop.name}</Typography>
        <Typography>Semantic meaning: {semantic}</Typography>
        <Typography>Data type: {prop.dataType}</Typography>
        <Typography>Unit: {prop.unit || '—'}</Typography>
        <Typography>
          Limits: {prop.minValue ?? '—'} – {prop.maxValue ?? '—'}
        </Typography>
        <Typography>Protocol: {prop.connectivity?.protocol || '—'}</Typography>
        <Typography>
          Endpoint / Topic:{' '}
          {prop.connectivity?.topic || prop.connectivity?.endpoint || '—'}
        </Typography>
        <Typography>Contract: {prop.connectivity?.contract || '—'}</Typography>
        <Typography>
          Contract Version: {prop.connectivity?.contractVersion || '—'}
        </Typography>
        <Typography>
          Parent Asset: <Link to={`/assets/${asset.id}`}>{asset.displayName}</Link>
        </Typography>
        {prop.connectivity?.contract === 'machine-state-event' && (
          <Typography>
            Contract:{' '}
            <Link to="/docs/default/component/data-product-platform/oee/contracts">
              machine-state-event
            </Link>
          </Typography>
        )}
        <Typography>
          Unified Namespace:{' '}
          <Link to="/platform-components/unified-namespace">component:default/unified-namespace</Link>
        </Typography>
      </Content>
    </Page>
  );
}
