import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Content,
  Header,
  Link,
  Page,
  Progress,
} from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@material-ui/core';
import {
  canManageAas,
  resolvePlatformRole,
} from '@internal/platform-common';
import { AasAsset, useAasClient } from './aasClient';

function specific(asset: AasAsset, name: string): string {
  return (
    asset.assetInformation.specificAssetIds.find(item => item.name === name)
      ?.value || '—'
  );
}

export function AssetDetailPage() {
  const { assetId = '' } = useParams();
  const client = useAasClient();
  const identityApi = useApi(identityApiRef);
  const catalogApi = useApi(catalogApiRef);
  const [asset, setAsset] = useState<AasAsset>();
  const [error, setError] = useState<string>();
  const [canManage, setCanManage] = useState(false);
  const [usedBy, setUsedBy] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: '',
    name: '',
    description: '',
    semanticId: '',
    dataType: 'number',
    unit: '',
    minValue: '',
    maxValue: '',
    protocol: 'MQTT',
    topic: '',
    endpoint: '',
    contract: '',
    contractVersion: '1.0.0',
  });

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setCanManage(canManageAas(resolvePlatformRole(identity.ownershipEntityRefs)));
    });
    client
      .getAsset(assetId)
      .then(setAsset)
      .catch(err => setError(err instanceof Error ? err.message : 'Not found'));
    catalogApi
      .getEntities({ filter: { kind: 'Component' } })
      .then(response => {
        setUsedBy(
          response.items
            .filter(entity =>
              JSON.stringify(entity.spec?.dependsOn ?? []).includes(
                'aas-foundation',
              ),
            )
            .map(entity => String(entity.metadata.title || entity.metadata.name)),
        );
      })
      .catch(() => setUsedBy([]));
  }, [assetId, catalogApi, client, identityApi]);

  if (error) {
    return (
      <Page themeId="home">
        <Header title="Asset" />
        <Content>
          <Typography color="error">{error}</Typography>
        </Content>
      </Page>
    );
  }
  if (!asset) {
    return (
      <Page themeId="home">
        <Header title="Asset" />
        <Content>
          <Progress />
        </Content>
      </Page>
    );
  }

  return (
    <Page themeId="home">
      <Header title={asset.displayName} subtitle={asset.id} />
      <Content>
        <Typography variant="h6">Overview</Typography>
        <Typography>Asset ID: {asset.id}</Typography>
        <Typography>
          Global Asset ID: {asset.assetInformation.globalAssetId}
        </Typography>
        <Typography>Type: {asset.assetInformation.assetType || '—'}</Typography>
        <Typography>Manufacturer: {specific(asset, 'manufacturer')}</Typography>
        <Typography>Model: {specific(asset, 'model')}</Typography>
        <Typography>Serial Number: {specific(asset, 'serialNumber')}</Typography>
        <Typography variant="h6">Context</Typography>
        <Typography>Site: {asset.context.site || '—'}</Typography>
        <Typography>Area: {asset.context.area || '—'}</Typography>
        <Typography>Line: {asset.context.line || '—'}</Typography>
        <Typography variant="h6">Submodels</Typography>
        {asset.submodels.map(item => (
          <Typography key={item.id}>{item.idShort}</Typography>
        ))}
        <Typography variant="h6">Sensors / Properties</Typography>
        {canManage && (
          <Button color="primary" onClick={() => setOpen(true)}>
            Add Sensor / Property
          </Button>
        )}
        {asset.properties.map(prop => (
          <div key={prop.id}>
            <Link to={`/assets/${asset.id}/properties/${prop.id}`}>{prop.name}</Link>
          </div>
        ))}
        <Typography variant="h6">Connectivity</Typography>
        {asset.properties
          .filter(prop => prop.connectivity)
          .map(prop => (
            <Typography key={prop.id}>
              {prop.id}: {prop.connectivity?.protocol}{' '}
              {prop.connectivity?.topic || prop.connectivity?.endpoint}
            </Typography>
          ))}
        <Typography variant="h6">Relationships</Typography>
        {asset.relationships.map(rel => (
          <Typography key={rel.id}>
            {rel.firstAssetId} {rel.semanticId} {rel.secondAssetId}
          </Typography>
        ))}
        <Typography variant="h6">Used by Data Products</Typography>
        {usedBy.length === 0 ? (
          <Typography>No Catalog Data Product currently depends on AAS Foundation.</Typography>
        ) : (
          usedBy.map(name => <Typography key={name}>{name}</Typography>)
        )}
        <Typography variant="h6">Technical metadata</Typography>
        <Typography>AAS revision: {asset.revision}</Typography>
        <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Sensor / Property</DialogTitle>
          <DialogContent>
            {[
              'id',
              'name',
              'description',
              'semanticId',
              'unit',
              'minValue',
              'maxValue',
              'topic',
              'endpoint',
              'contract',
              'contractVersion',
            ].map(field => (
              <TextField
                key={field}
                margin="dense"
                label={field}
                fullWidth
                value={(form as Record<string, string>)[field]}
                onChange={event =>
                  setForm(current => ({ ...current, [field]: event.target.value }))
                }
              />
            ))}
            <TextField
              select
              margin="dense"
              label="dataType"
              fullWidth
              value={form.dataType}
              onChange={event =>
                setForm(current => ({ ...current, dataType: event.target.value }))
              }
            >
              {['number', 'integer', 'string', 'boolean'].map(item => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              margin="dense"
              label="protocol"
              fullWidth
              value={form.protocol}
              onChange={event =>
                setForm(current => ({ ...current, protocol: event.target.value }))
              }
            >
              {['MQTT', 'REST', 'OPC_UA', 'FILE_STREAM', 'KAFKA'].map(item => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              color="primary"
              onClick={async () => {
                await client.addProperty(asset.id, {
                  id: form.id,
                  idShort: form.id,
                  name: form.name,
                  description: form.description,
                  dataType: form.dataType,
                  unit: form.unit || null,
                  minValue: form.minValue ? Number(form.minValue) : null,
                  maxValue: form.maxValue ? Number(form.maxValue) : null,
                  semanticId: form.semanticId
                    ? {
                        type: 'ExternalReference',
                        keys: [{ type: 'GlobalReference', value: form.semanticId }],
                      }
                    : null,
                  connectivity: {
                    protocol: form.protocol,
                    topic: form.topic || null,
                    endpoint: form.endpoint || null,
                    contract: form.contract || null,
                    contractVersion: form.contractVersion || null,
                  },
                });
                setOpen(false);
                setAsset(await client.getAsset(asset.id));
              }}
            >
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Content>
    </Page>
  );
}
