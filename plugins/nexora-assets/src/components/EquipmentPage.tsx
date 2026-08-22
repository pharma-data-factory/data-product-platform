import { useEffect, useMemo, useState } from 'react';
import { Content, Link, Page, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Chip, Grid, TextField, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  NexoraAsset,
  equipmentPath,
  filterAssets,
  groupAssetsByHierarchy,
  toNexoraAsset,
  uniqueValues,
} from '@internal/platform-common';

const useStyles = makeStyles({
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tree: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  group: {
    border: '1px solid #E8EEF2',
    borderRadius: 12,
    padding: 16,
  },
});

export function EquipmentPage() {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);
  const [assets, setAssets] = useState<NexoraAsset[]>([]);
  const [query, setQuery] = useState('');
  const [site, setSite] = useState<string>();
  const [area, setArea] = useState<string>();
  const [line, setLine] = useState<string>();
  const [equipmentType, setEquipmentType] = useState<string>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    catalogApi
      .getEntities({ filter: { kind: ['Component'] } })
      .then(response => {
        setAssets(
          response.items
            .map(toNexoraAsset)
            .filter((item): item is NexoraAsset => Boolean(item)),
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [catalogApi]);

  const visible = useMemo(
    () => filterAssets(assets, { query, site, area, line, equipmentType }),
    [assets, query, site, area, line, equipmentType],
  );
  const tree = groupAssetsByHierarchy(visible);

  return (
    <Page themeId="tool">
      <Content>
        <Typography variant="h4" gutterBottom>
          Asset & Equipment Explorer
        </Typography>
        <Typography variant="body2" color="textSecondary" paragraph>
          Catalog view of shopfloor equipment. This is not an EAM, MES, or
          SCADA system. Local development uses SAMPLE catalog entities and
          the mock industrial provider — not live shopfloor data.
        </Typography>
        <TextField
          label="Search equipment"
          value={query}
          onChange={event => setQuery(event.target.value)}
          fullWidth
          variant="outlined"
          size="small"
          style={{ marginBottom: 12 }}
        />
        <div className={classes.filters} aria-label="Equipment filters">
          <FilterChips
            label="Site"
            value={site}
            options={uniqueValues(assets, 'site')}
            onChange={setSite}
          />
          <FilterChips
            label="Area"
            value={area}
            options={uniqueValues(assets, 'area')}
            onChange={setArea}
          />
          <FilterChips
            label="Line"
            value={line}
            options={uniqueValues(assets, 'line')}
            onChange={setLine}
          />
          <FilterChips
            label="Type"
            value={equipmentType}
            options={uniqueValues(assets, 'equipmentType')}
            onChange={setEquipmentType}
          />
        </div>
        {loading && <Progress />}
        {!loading && visible.length === 0 && (
          <Typography>No equipment entities match the current filters.</Typography>
        )}
        <div className={classes.tree}>
          {tree.map(siteNode => (
            <section key={siteNode.site} className={classes.group} aria-label={siteNode.site}>
              <Typography variant="h6">{siteNode.site}</Typography>
              {siteNode.areas.map(areaNode => (
                <div key={areaNode.area} style={{ marginTop: 12 }}>
                  <Typography variant="subtitle1">{areaNode.area}</Typography>
                  {areaNode.lines.map(lineNode => (
                    <div key={lineNode.line} style={{ marginTop: 8 }}>
                      <Typography variant="body2" color="textSecondary">
                        {lineNode.line}
                      </Typography>
                      <Grid container spacing={2} style={{ marginTop: 4 }}>
                        {lineNode.equipment.map(asset => (
                          <Grid item xs={12} sm={6} md={4} key={asset.name}>
                            <Link to={equipmentPath(asset.name)}>{asset.title}</Link>
                            <Typography variant="body2" color="textSecondary">
                              {asset.equipmentType || 'equipment'}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                    </div>
                  ))}
                </div>
              ))}
            </section>
          ))}
        </div>
      </Content>
    </Page>
  );
}

function FilterChips({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (next?: string) => void;
}) {
  if (options.length === 0) {
    return null;
  }
  return (
    <>
      <Chip
        label={`All ${label}`}
        clickable
        color={!value ? 'primary' : 'default'}
        onClick={() => onChange(undefined)}
      />
      {options.map(option => (
        <Chip
          key={option}
          label={option}
          clickable
          color={value === option ? 'primary' : 'default'}
          onClick={() => onChange(option)}
        />
      ))}
    </>
  );
}
