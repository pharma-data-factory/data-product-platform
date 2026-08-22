import { Link } from '@backstage/core-components';
import { Avatar, Grid, Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  PlatformRole,
  ROLE_LABELS,
  QuickAction,
  quickActionsForRole,
} from '@internal/platform-common';
import {
  catalogClassLabel,
  CertificationChip,
  QualityChip,
  UpgradeChip,
} from '@internal/plugin-data-products';
import type { DataProduct } from '@internal/plugin-data-products';
import { C } from '../theme/tokens';
import { LandingI18nProvider } from '../identity/landingI18n';
import { GoldenPathShowcase } from '../identity/GoldenPathShowcase';

const useStyles = makeStyles({
  welcome: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontWeight: 600,
    letterSpacing: '-0.02em',
  },
  identity: {
    alignItems: 'center',
    display: 'flex',
    gap: 16,
  },
  role: {
    color: C.muted,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    letterSpacing: '0.08em',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  card: {
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    height: '100%',
    padding: 20,
    transition: 'border-color .3s, background .3s, transform .3s',
    '&:hover': {
      background: '#F8FAFC',
      borderColor: 'rgba(11, 31, 58, 0.16)',
    },
  },
  title: {
    fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
    fontWeight: 600,
    marginBottom: 12,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontSize: 14,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
  },
  action: {
    background: `linear-gradient(135deg, ${C.cloud}, ${C.factory})`,
    borderRadius: 10,
    color: '#FFFFFF !important',
    display: 'inline-flex',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    textDecoration: 'none',
    '&:hover': {
      filter: 'brightness(1.08)',
      textDecoration: 'none',
    },
  },
  ghostAction: {
    background: 'transparent',
    border: `1px solid ${C.border}`,
    borderRadius: 10,
    color: `${C.text} !important`,
    display: 'inline-flex',
    fontSize: 13,
    fontWeight: 600,
    padding: '8px 14px',
    textDecoration: 'none',
    '&:hover': {
      background: 'rgba(13, 148, 136, 0.08)',
      borderColor: 'rgba(13, 148, 136, 0.45)',
      textDecoration: 'none',
    },
  },
  meta: {
    borderTop: `1px solid ${C.border}`,
    marginTop: 12,
    paddingTop: 12,
  },
  productLink: {
    color: C.text,
    fontWeight: 500,
  },
  empty: {
    color: C.muted,
    marginTop: 8,
  },
  sample: {
    color: C.muted,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 11,
    letterSpacing: '0.08em',
    marginLeft: 8,
    textTransform: 'uppercase',
  },
});

export interface HomeDashboardProps {
  platformRole: PlatformRole;
  displayName?: string;
  picture?: string;
  githubLogin?: string;
  products: DataProduct[];
  recentlyUsed: DataProduct[];
}

export function HomeDashboard({
  platformRole,
  displayName,
  picture,
  githubLogin,
  products,
  recentlyUsed,
}: HomeDashboardProps) {
  const classes = useStyles();
  const actions = quickActionsForRole(platformRole);
  const updates = products.filter(
    product =>
      product.upgrade?.overall === 'UPDATE_AVAILABLE' ||
      product.upgrade?.overall === 'UPGRADE_REQUIRED',
  );

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <div className={classes.identity}>
          <Avatar
            src={picture}
            alt={displayName ?? 'User'}
            style={{ width: 56, height: 56, background: C.factory }}
          >
            {(displayName ?? 'U').slice(0, 1).toUpperCase()}
          </Avatar>
          <div>
            <Typography className={classes.welcome} variant="h4">
              {displayName ? `Welcome, ${displayName}` : 'Home'}
            </Typography>
            <Typography className={classes.role}>
              Role: {ROLE_LABELS[platformRole]}
              {githubLogin ? ` · GitHub: ${githubLogin}` : ''}
            </Typography>
          </div>
        </div>
      </Grid>
      <Grid item xs={12}>
        <LandingI18nProvider>
          <GoldenPathShowcase compact marketplaceLinks />
        </LandingI18nProvider>
      </Grid>
      <Grid item xs={12}>
        <div className={classes.card}>
          <Typography className={classes.title} variant="h6">
            Quick actions
          </Typography>
          <div className={classes.actions}>
            {actions.map((action, index) => (
              <QuickActionLink
                key={action.id}
                action={action}
                primary={index === 0}
              />
            ))}
          </div>
        </div>
      </Grid>
      <Grid item xs={12} md={6}>
        <div className={classes.card}>
          <Typography className={classes.title} variant="h6">
            My Data Products
          </Typography>
          {products.length === 0 && (
            <Typography variant="body2" className={classes.empty}>
              You have no Data Products yet. Create one from the Marketplace.
            </Typography>
          )}
          {products.map(product => (
            <div key={product.name} className={classes.meta}>
              <Link
                className={classes.productLink}
                to={`/data-products/${product.name}`}
              >
                {product.title}
              </Link>
              {catalogClassLabel(product) && (
                <span className={classes.sample}>{catalogClassLabel(product)}</span>
              )}
              <div>
                <QualityChip status={product.qualityStatus} />{' '}
                <CertificationChip status={product.certificationStatus} />
                {product.upgrade && (
                  <>
                    {' '}
                    <UpgradeChip status={product.upgrade.overall} />
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Grid>
      <Grid item xs={12} md={6}>
        <div className={classes.card}>
          <Typography className={classes.title} variant="h6">
            Recent activity
          </Typography>
          {recentlyUsed.length === 0 && (
            <Typography variant="body2" className={classes.empty}>
              Open a Data Product to see recent activity here.
            </Typography>
          )}
          {recentlyUsed.map(product => (
            <Typography key={product.name} variant="body2" className={classes.meta}>
              <Link
                className={classes.productLink}
                to={`/data-products/${product.name}`}
              >
                {product.title}
              </Link>
              {catalogClassLabel(product) && (
                <span className={classes.sample}>{catalogClassLabel(product)}</span>
              )}
            </Typography>
          ))}
        </div>
      </Grid>
      <Grid item xs={12} md={6}>
        <div className={classes.card}>
          <Typography className={classes.title} variant="h6">
            Quality & CI
          </Typography>
          {products.map(product => (
            <Typography key={product.name} variant="body2" className={classes.meta}>
              {product.title}: {product.qualityStatus}{' '}
              <Link to={`/data-products/${product.name}#ci-quality-gate`}>
                CI Quality Gate
              </Link>
            </Typography>
          ))}
          {products.length === 0 && (
            <Typography variant="body2" className={classes.empty}>
              Quality and CI status appear after a Data Product is registered.
            </Typography>
          )}
        </div>
      </Grid>
      <Grid item xs={12} md={6}>
        <div className={classes.card}>
          <Typography className={classes.title} variant="h6">
            Platform updates
          </Typography>
          {updates.length === 0 && (
            <Typography variant="body2" className={classes.empty}>
              No template or SDK updates detected.
            </Typography>
          )}
          {updates.map(product => (
            <Typography key={product.name} variant="body2" className={classes.meta}>
              {product.title}: {product.upgrade?.overall}
            </Typography>
          ))}
        </div>
      </Grid>
    </Grid>
  );
}

function QuickActionLink({
  action,
  primary,
}: {
  action: QuickAction;
  primary: boolean;
}) {
  const classes = useStyles();
  return (
    <Link
      className={primary ? classes.action : classes.ghostAction}
      to={action.to}
    >
      {action.label}
    </Link>
  );
}
