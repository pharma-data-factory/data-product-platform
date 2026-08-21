import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Content, Link, Page, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { Chip, Grid, TextField, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  LIBRARY_COMPATIBILITY_FILTERS,
  LIBRARY_RUNTIME_FILTERS,
  LIBRARY_STATUS_FILTERS,
  LibraryCompatibilityFilter,
  LibraryPlatformComponent,
  LibraryRuntimeFilter,
  LibraryStatusFilter,
  PLATFORM_COMPONENT_CATEGORIES,
  PLATFORM_COMPONENT_CATEGORY_LABELS,
  PlatformComponentCategory,
  documentationHref,
  filterLibraryComponents,
  formatJourneyError,
  isUnauthorizedError,
  platformComponentPath,
  toLibraryComponents,
  toRelatedPlatformComponents,
} from '@internal/platform-common';
import { C, PHARMA_NAVY, PHARMA_NAVY_DARK, PHARMA_TEAL, PHARMA_TEAL_LIGHT } from '../theme/tokens';

const useStyles = makeStyles({
  hero: {
    background: `linear-gradient(180deg, ${PHARMA_NAVY_DARK} 0%, ${PHARMA_NAVY} 100%)`,
    borderRadius: 16,
    color: '#F8FAFC',
    marginBottom: 24,
    padding: '28px 28px 24px',
  },
  eyebrow: {
    color: PHARMA_TEAL_LIGHT,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.16em',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 'clamp(26px, 4vw, 36px)',
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.15,
    margin: 0,
  },
  principle: {
    color: PHARMA_TEAL_LIGHT,
    fontSize: 18,
    fontWeight: 600,
    marginTop: 10,
  },
  copy: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 1.65,
    marginBottom: 0,
    marginTop: 10,
    maxWidth: 720,
  },
  secondary: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 0,
    marginTop: 10,
    maxWidth: 760,
  },
  panel: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    padding: 20,
  },
  search: {
    marginBottom: 16,
    maxWidth: 480,
  },
  filters: {
    border: 0,
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    margin: '0 0 12px',
    minInlineSize: 0,
    padding: 0,
  },
  filterLabel: {
    color: C.muted,
    display: 'block',
    float: 'none',
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.12em',
    marginBottom: 6,
    padding: 0,
    textTransform: 'uppercase',
    width: '100%',
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    color: `${C.text} !important`,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    height: '100%',
    minHeight: 220,
    padding: 20,
    textDecoration: 'none !important',
    transition: 'border-color 120ms ease, box-shadow 120ms ease',
    '&:hover, &:focus-visible': {
      borderColor: PHARMA_TEAL,
      boxShadow: '0 8px 24px rgba(11, 31, 58, 0.08)',
      outline: 'none',
      textDecoration: 'none',
    },
  },
  certified: {
    borderColor: 'rgba(13, 148, 136, 0.45)',
    boxShadow: '0 0 0 1px rgba(13, 148, 136, 0.12)',
  },
  tested: {
    borderColor: '#CBD5E1',
    borderLeft: `4px solid ${C.observability}`,
  },
  development: {
    borderColor: '#CBD5E1',
    borderLeft: `4px solid ${C.security}`,
  },
  planned: {
    background: '#F8FAFC',
    borderStyle: 'dashed',
    color: `${C.muted} !important`,
    opacity: 0.72,
  },
  catalogOnly: {
    borderColor: '#CBD5E1',
  },
  name: {
    color: PHARMA_NAVY,
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontSize: 18,
    fontWeight: 600,
    letterSpacing: '0.02em',
    margin: 0,
    textTransform: 'uppercase',
  },
  category: {
    color: C.muted,
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  purpose: {
    color: C.muted,
    flexGrow: 1,
    fontSize: 14,
    lineHeight: 1.55,
    margin: '4px 0 0',
  },
  meta: {
    color: C.muted,
    fontSize: 12,
    margin: 0,
  },
  explore: {
    color: PHARMA_TEAL,
    fontSize: 13,
    fontWeight: 600,
    marginTop: 8,
  },
  empty: {
    color: C.muted,
    padding: '12px 0',
  },
});

const CATEGORY_FILTERS = ['ALL', ...PLATFORM_COMPONENT_CATEGORIES] as const;

function categoryLabel(value: (typeof CATEGORY_FILTERS)[number]): string {
  if (value === 'ALL') {
    return 'All';
  }
  return PLATFORM_COMPONENT_CATEGORY_LABELS[value];
}

function statusLabel(value: LibraryStatusFilter): string {
  if (value === 'ALL') {
    return 'All';
  }
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function runtimeLabel(value: LibraryRuntimeFilter): string {
  if (value === 'ALL') {
    return 'All';
  }
  return value === 'runtime' ? 'Runtime Available' : 'Catalog Only';
}

function compatibilityLabel(value: LibraryCompatibilityFilter): string {
  return value === 'ALL' ? 'All' : 'Data Product Standard 1.x';
}

export function cardTones(component: LibraryPlatformComponent): string[] {
  const tones: string[] = [];
  if (component.certificationStatus === 'PLANNED') {
    tones.push('planned');
  } else if (component.certificationStatus === 'DEVELOPMENT') {
    tones.push('development');
  } else if (component.certificationStatus === 'TESTED') {
    tones.push('tested');
  } else if (
    component.certificationStatus === 'CERTIFIED' &&
    component.runtimeAvailability === 'runtime'
  ) {
    tones.push('certified');
  }
  if (component.runtimeAvailability === 'catalog-only') {
    tones.push('catalogOnly');
  }
  return tones;
}

function shortPurpose(component: LibraryPlatformComponent): string {
  const text = component.profile.purpose || component.description;
  if (text.length <= 140) {
    return text;
  }
  return `${text.slice(0, 137).trim()}…`;
}

export function PlatformComponentsPage() {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);
  const [components, setComponents] = useState<LibraryPlatformComponent[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<(typeof CATEGORY_FILTERS)[number]>('ALL');
  const [certification, setCertification] = useState<LibraryStatusFilter>('ALL');
  const [runtime, setRuntime] = useState<LibraryRuntimeFilter>('ALL');
  const [compatibility, setCompatibility] =
    useState<LibraryCompatibilityFilter>('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let active = true;
    catalogApi
      .getEntities({ filter: { kind: ['Component', 'API'] } })
      .then(response => {
        if (!active) {
          return;
        }
        setComponents(
          toLibraryComponents(toRelatedPlatformComponents(response.items)),
        );
        setLoading(false);
      })
      .catch(err => {
        if (active) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [catalogApi]);

  const rows = useMemo(
    () =>
      filterLibraryComponents(components, {
        query,
        category: category === 'ALL' ? 'ALL' : (category as PlatformComponentCategory),
        certification: certification === 'ALL' ? 'ALL' : certification,
        runtime,
        compatibility,
      }),
    [components, query, category, certification, runtime, compatibility],
  );

  return (
    <Page themeId="tool">
      <Content>
        <section className={classes.hero} aria-label="Platform Components">
          <p className={classes.eyebrow}>Platform Components</p>
          <h1 className={classes.title}>Platform Components</h1>
          <p className={classes.principle}>
            Build the domain logic. Reuse the platform.
          </p>
          <p className={classes.copy}>
            Discover governed technical building blocks for Data Products and
            Golden Paths.
          </p>
          <p className={classes.secondary}>
            Platform Components provide reusable integration, storage and
            operational capabilities without coupling generated Data Products to
            the Control Plane.
          </p>
        </section>
        <div className={classes.panel}>
          <Typography variant="body2" style={{ marginBottom: 16 }}>
            <Link to="/compose">Compose</Link>
            {' · '}
            <Link to={documentationHref('platform-components')}>
              What is a Platform Component?
            </Link>
            {' · '}
            <Link to={documentationHref('platform-component-using')}>
              How to reuse a Component
            </Link>
            {' · '}
            <Link to={documentationHref('platform-component-composition')}>
              Composition
            </Link>
          </Typography>
          {loading && <Progress />}
          {error && (
            <Typography variant="body2">
              {isUnauthorizedError(error)
                ? 'Unauthorized'
                : formatJourneyError(error)}
            </Typography>
          )}
          <TextField
            className={classes.search}
            fullWidth
            label="Search platform components"
            value={query}
            onChange={event => setQuery(event.target.value)}
            inputProps={{ 'aria-label': 'Search platform components' }}
            placeholder="Name, title, description, category, owner"
          />
          <fieldset className={classes.filters} aria-label="Component category filters">
            <legend className={classes.filterLabel}>Category</legend>
            {CATEGORY_FILTERS.map(item => (
              <Chip
                key={item}
                label={categoryLabel(item)}
                color={category === item ? 'primary' : 'default'}
                onClick={() => setCategory(item)}
                clickable
                aria-pressed={category === item}
              />
            ))}
          </fieldset>
          <fieldset className={classes.filters} aria-label="Component status filters">
            <legend className={classes.filterLabel}>Status</legend>
            {LIBRARY_STATUS_FILTERS.map(item => (
              <Chip
                key={item}
                label={statusLabel(item)}
                color={certification === item ? 'primary' : 'default'}
                onClick={() => setCertification(item)}
                clickable
                aria-pressed={certification === item}
              />
            ))}
          </fieldset>
          <fieldset className={classes.filters} aria-label="Component runtime filters">
            <legend className={classes.filterLabel}>Runtime</legend>
            {LIBRARY_RUNTIME_FILTERS.map(item => (
              <Chip
                key={item}
                label={runtimeLabel(item)}
                color={runtime === item ? 'primary' : 'default'}
                onClick={() => setRuntime(item)}
                clickable
                aria-pressed={runtime === item}
              />
            ))}
          </fieldset>
          <fieldset
            className={classes.filters}
            aria-label="Component compatibility filters"
          >
            <legend className={classes.filterLabel}>Compatibility</legend>
            {LIBRARY_COMPATIBILITY_FILTERS.map(item => (
              <Chip
                key={item}
                label={compatibilityLabel(item)}
                color={compatibility === item ? 'primary' : 'default'}
                onClick={() => setCompatibility(item)}
                clickable
                aria-pressed={compatibility === item}
              />
            ))}
          </fieldset>
          {!loading && rows.length === 0 && (
            <Typography className={classes.empty} variant="body2">
              No Platform Components match the current search and filters.
            </Typography>
          )}
          <Grid container spacing={2}>
            {rows.map(component => {
              const tones = cardTones(component);
              const toneClass = tones
                .map(tone => classes[tone as keyof typeof classes])
                .filter(Boolean)
                .join(' ');
              return (
                <Grid item xs={12} sm={6} md={4} key={component.entityRef}>
                  <RouterLink
                    className={`${classes.card} ${toneClass}`}
                    to={platformComponentPath(component.name)}
                    aria-label={`${component.title}, ${component.certificationStatus}, ${
                      component.runtimeAvailability === 'runtime'
                        ? 'runtime available'
                        : 'catalog only'
                    }`}
                    data-testid={`component-card-${component.name}`}
                    data-status={component.certificationStatus}
                    data-runtime={component.runtimeAvailability}
                    data-tone={tones.join(' ') || 'default'}
                  >
                    <h2 className={classes.name}>{component.title}</h2>
                    <p className={classes.category}>
                      {PLATFORM_COMPONENT_CATEGORY_LABELS[component.category]}
                    </p>
                    <p className={classes.meta}>
                      {component.certificationStatus} · v{component.version}
                      {component.runtimeAvailability === 'catalog-only'
                        ? ' · Catalog only · No runtime'
                        : ' · Runtime available'}
                    </p>
                    <p className={classes.purpose}>{shortPurpose(component)}</p>
                    <p className={classes.meta}>
                      Used by{' '}
                      {component.runtimeUsedBy.join(', ') || 'None'}
                    </p>
                    {component.conceptualUsedBy.length > 0 && (
                      <p className={classes.meta}>
                        Planned / conceptual use{' '}
                        {component.conceptualUsedBy.join(', ')}
                      </p>
                    )}
                    {component.designUsedBy.length > 0 && (
                      <p className={classes.meta}>
                        Design example {component.designUsedBy.join(', ')}
                      </p>
                    )}
                    <p className={classes.meta}>
                      Compatible{' '}
                      {component.compatibleStandardVersions
                        .map(value =>
                          value === '1.x' ? 'Data Product Standard 1.x' : value,
                        )
                        .join(', ') || 'unspecified'}
                    </p>
                    <span className={classes.explore}>Explore</span>
                  </RouterLink>
                </Grid>
              );
            })}
          </Grid>
        </div>
      </Content>
    </Page>
  );
}
