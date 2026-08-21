import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Content, Link, Page } from '@backstage/core-components';
import {
  Chip,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  documentationHref,
  filterReleaseCatalogRows,
  releaseCatalogRows,
} from '@internal/platform-common';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL_LIGHT } from '../theme/tokens';

const useStyles = makeStyles({
  hero: {
    background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
    borderRadius: 16,
    color: '#F8FAFC',
    marginBottom: 24,
    padding: '32px 28px',
  },
  eyebrow: {
    color: PHARMA_TEAL_LIGHT,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.16em',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 'clamp(28px, 4vw, 40px)',
    fontWeight: 600,
    margin: 0,
  },
  copy: {
    color: '#CBD5E1',
    fontSize: 16,
    maxWidth: 720,
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 20,
  },
  filters: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
});

export function ReleaseCatalogPage() {
  const classes = useStyles();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'Released' | 'Certified' | 'Deprecated'>('ALL');
  const rows = useMemo(
    () => filterReleaseCatalogRows(releaseCatalogRows(), filter),
    [filter],
  );

  return (
    <Page themeId="tool">
      <Content>
        <section className={classes.hero} aria-label="Release Catalog">
          <p className={classes.eyebrow}>Golden Path releases</p>
          <h1 className={classes.title}>Release Catalog</h1>
          <p className={classes.copy}>
            Official Golden Path versions from version-controlled release
            metadata. CERTIFIED means technical conformance. RELEASED means
            approved for consumption. Neither is GxP validation. Distribution
            is not entitlement.
          </p>
        </section>
        <div className={classes.card}>
          <Typography variant="body2" style={{ marginBottom: 12 }}>
            <Link to={documentationHref('release-management')}>
              Release management
            </Link>
            {' · '}
            <Link to={documentationHref('howto-release')}>
              Release a Golden Path
            </Link>
          </Typography>
          <div className={classes.filters} aria-label="Release filters">
            {(['ALL', 'Released', 'Certified', 'Deprecated'] as const).map(item => (
              <Chip
                key={item}
                label={item}
                color={filter === item ? 'primary' : 'default'}
                onClick={() => setFilter(item)}
              />
            ))}
          </div>
          <Grid container>
            <Grid item xs={12}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Golden Path</TableCell>
                    <TableCell>Version</TableCell>
                    <TableCell>Lifecycle</TableCell>
                    <TableCell>Certification</TableCell>
                    <TableCell>Standard</TableCell>
                    <TableCell>SDK</TableCell>
                    <TableCell>Release Date</TableCell>
                    <TableCell>Distribution</TableCell>
                    <TableCell>Upgrade Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map(row => (
                    <TableRow
                      key={`${row.template}@${row.version}`}
                      hover
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/releases/${row.template}`)}
                    >
                      <TableCell>{row.name}</TableCell>
                      <TableCell>
                        {row.version}
                        {row.current ? ' CURRENT' : ''}
                      </TableCell>
                      <TableCell>{row.lifecycle}</TableCell>
                      <TableCell>{row.certification}</TableCell>
                      <TableCell>{row.standard}</TableCell>
                      <TableCell>{row.sdk}</TableCell>
                      <TableCell>{row.releaseDate}</TableCell>
                      <TableCell>{row.distribution}</TableCell>
                      <TableCell>{row.upgradeStatus}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Grid>
          </Grid>
        </div>
      </Content>
    </Page>
  );
}
