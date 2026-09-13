import { useEffect, useMemo, useState } from 'react';
import { Link, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Chip, TextField, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  NexoraAsset,
  equipmentPath,
  filterAssets,
  groupAssetsByHierarchy,
  toNexoraAsset,
  uniqueValues,
} from '@internal/platform-common';
import {
  NEXORA_BORDER,
  NEXORA_MUTED,
  NexoraSection,
  NexoraToolPage,
  filterChipSx,
  nexoraThemeColor,
  useNexoraToolStyles,
} from '@internal/plugin-nexora-common';

const useStyles = makeStyles(theme => ({
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  filterChip: filterChipSx(theme, false),
  filterChipSelected: filterChipSx(theme, true),
  search: {
    marginBottom: 12,
  },
  area: {
    marginTop: 16,
  },
  areaTitle: {
    color: nexoraThemeColor.text,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 15,
    fontWeight: 600,
    marginBottom: 4,
  },
  line: {
    marginTop: 10,
  },
  lineTitle: {
    color: nexoraThemeColor.textMuted,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  grid: {
    display: 'grid',
    gap: 12,
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
  },
  equipmentCard: {
    background: '#F8FAFC',
    border: `1px solid ${NEXORA_BORDER}`,
    borderRadius: 12,
    padding: '12px 14px',
  },
  equipmentType: {
    color: NEXORA_MUTED,
    fontSize: 13,
    marginTop: 4,
  },
  empty: {
    color: nexoraThemeColor.text,
    fontSize: 14,
  },
}));

export function EquipmentPage() {
  const classes = useStyles();
  const tool = useNexoraToolStyles();
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
    <NexoraToolPage
      eyebrow="Industrial · Catalog"
      title="Asset & Equipment Explorer"
      principle="Shopfloor topology from the Catalog."
      copy="Site → Area → Line → Equipment. This is not an EAM, MES, or SCADA system."
      secondary="Local development uses SAMPLE catalog entities and the mock industrial provider — not live shopfloor data."
    >
      <TextField
        className={classes.search}
        label="Search equipment"
        value={query}
        onChange={event => setQuery(event.target.value)}
        fullWidth
        variant="outlined"
        size="small"
      />
      <div className={classes.filters} aria-label="Equipment filters">
        <FilterChips
          label="Site"
          value={site}
          options={uniqueValues(assets, 'site')}
          onChange={setSite}
          idleClass={classes.filterChip}
          selectedClass={classes.filterChipSelected}
        />
        <FilterChips
          label="Area"
          value={area}
          options={uniqueValues(assets, 'area')}
          onChange={setArea}
          idleClass={classes.filterChip}
          selectedClass={classes.filterChipSelected}
        />
        <FilterChips
          label="Line"
          value={line}
          options={uniqueValues(assets, 'line')}
          onChange={setLine}
          idleClass={classes.filterChip}
          selectedClass={classes.filterChipSelected}
        />
        <FilterChips
          label="Type"
          value={equipmentType}
          options={uniqueValues(assets, 'equipmentType')}
          onChange={setEquipmentType}
          idleClass={classes.filterChip}
          selectedClass={classes.filterChipSelected}
        />
      </div>
      {loading && <Progress />}
      {!loading && visible.length === 0 && (
        <Typography className={classes.empty}>
          No equipment entities match the current filters.
        </Typography>
      )}
      {tree.map(siteNode => (
        <NexoraSection key={siteNode.site} title={siteNode.site} testId={siteNode.site}>
          <div aria-label={siteNode.site}>
            {siteNode.areas.map(areaNode => (
              <div key={areaNode.area} className={classes.area}>
                <div className={classes.areaTitle}>{areaNode.area}</div>
                {areaNode.lines.map(lineNode => (
                  <div key={lineNode.line} className={classes.line}>
                    <div className={classes.lineTitle}>{lineNode.line}</div>
                    <div className={classes.grid}>
                      {lineNode.equipment.map(asset => (
                        <div key={asset.name} className={classes.equipmentCard}>
                          <Link className={tool.link} to={equipmentPath(asset.name)}>
                            {asset.title}
                          </Link>
                          <div className={classes.equipmentType}>
                            {asset.equipmentType || 'equipment'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </NexoraSection>
      ))}
    </NexoraToolPage>
  );
}

function FilterChips({
  label,
  value,
  options,
  onChange,
  idleClass,
  selectedClass,
}: {
  label: string;
  value?: string;
  options: string[];
  onChange: (next?: string) => void;
  idleClass: string;
  selectedClass: string;
}) {
  if (options.length === 0) {
    return null;
  }
  return (
    <>
      <Chip
        label={`All ${label}`}
        clickable
        className={!value ? selectedClass : idleClass}
        onClick={() => onChange(undefined)}
      />
      {options.map(option => (
        <Chip
          key={option}
          label={option}
          clickable
          className={value === option ? selectedClass : idleClass}
          onClick={() => onChange(option)}
        />
      ))}
    </>
  );
}
