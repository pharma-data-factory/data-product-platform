import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Content,
  Header,
  Page,
  Progress,
  Link,
} from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  canManageAas,
  resolvePlatformRole,
} from '@internal/platform-common';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL_LIGHT } from '../theme/tokens';
import { AasAsset, useAasClient } from './aasClient';
import {
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';

const useStyles = makeStyles({
  hero: {
    background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
    borderRadius: 16,
    color: NEXORA_GREY[50],
    marginBottom: 24,
    padding: '28px',
  },
  eyebrow: {
    color: PHARMA_TEAL_LIGHT,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
  },
  tree: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 20,
  },
  node: {
    cursor: 'pointer',
    padding: '6px 0',
  },
});

export function AssetsPage() {
  const classes = useStyles();
  const navigate = useNavigate();
  const identityApi = useApi(identityApiRef);
  const client = useAasClient();
  const [assets, setAssets] = useState<AasAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [canManage, setCanManage] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    id: '',
    displayName: '',
    assetType: '',
    site: '',
    area: '',
    line: '',
  });

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setCanManage(canManageAas(resolvePlatformRole(identity.ownershipEntityRefs)));
    });
    client
      .listAssets()
      .then(items => {
        setAssets(items);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Unable to load assets');
        setLoading(false);
      });
  }, [client, identityApi]);

  const grouped = useMemo(() => {
    const tree: Record<string, Record<string, AasAsset[]>> = {};
    for (const asset of assets) {
      const site = asset.context.site || 'unspecified-site';
      const area = asset.context.area || 'unspecified-area';
      tree[site] = tree[site] || {};
      tree[site][area] = tree[site][area] || [];
      tree[site][area].push(asset);
    }
    return tree;
  }, [assets]);

  return (
    <Page themeId="home">
      <Header
        title="Assets & Sensors"
        subtitle="PROTOTYPE · in-memory Control Plane adapter · not production persistence"
      />
      <Content>
        <div className={classes.hero}>
          <div className={classes.eyebrow}>AAS Foundation · PROTOTYPE</div>
          <Typography variant="h4">What this asset means</Typography>
          <Typography>
            Semantic identity and connectivity mappings. This Control Plane
            adapter stores assets in memory and is not the production AAS
            runtime. Target: Assets UI → AAS backend client → AAS Foundation
            Service → persistent repository. Operational values stay in Unified
            Namespace and Time-Series Storage.
          </Typography>
        </div>
        {canManage && (
          <Button color="primary" variant="contained" onClick={() => setOpen(true)}>
            Create asset
          </Button>
        )}
        {loading && <Progress />}
        {error && <Typography color="error">{error}</Typography>}
        {!loading && !error && (
          <div className={classes.tree}>
            {Object.entries(grouped).map(([site, areas]) => (
              <div key={site}>
                <Typography variant="h6">{site}</Typography>
                {Object.entries(areas).map(([area, items]) => (
                  <div key={area} style={{ marginLeft: 16 }}>
                    <Typography variant="subtitle1">{area}</Typography>
                    {items.map(asset => (
                      <div
                        key={asset.id}
                        className={classes.node}
                        style={{ marginLeft: 16 }}
                      >
                        <Link to={`/assets/${asset.id}`}>{asset.displayName}</Link>
                        <div>
                          {asset.properties.map(prop => (
                            <div key={prop.id} style={{ marginLeft: 16 }}>
                              <Link
                                to={`/assets/${asset.id}/properties/${prop.id}`}
                              >
                                {prop.name}
                              </Link>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
        <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogTitle>Create Asset Administration Shell</DialogTitle>
          <DialogContent>
            {['id', 'displayName', 'assetType', 'site', 'area', 'line'].map(field => (
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
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              color="primary"
              onClick={async () => {
                await client.createAsset(form);
                setOpen(false);
                navigate(`/assets/${form.id}`);
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
