import type { ReactNode } from 'react';
import { Link } from '@backstage/core-components';
import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
  CapabilityGroup,
  ConnectivityInterface,
  DataProductRef,
  HealthCheck,
  MetricValue,
  NexoraAsset,
  ProviderResult,
} from '@internal/platform-common';
import { NEXORA_CYAN, nexoraThemeColor } from '../design';
import { StatusBadge, StatusWord } from './StatusBadge';

const useStyles = makeStyles({
  card: {
    background: nexoraThemeColor.surfaceRaised,
    border: `1px solid ${nexoraThemeColor.border}`,
    borderRadius: 12,
    height: '100%',
    padding: 16,
  },
  title: {
    color: nexoraThemeColor.text,
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: '0.06em',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  value: {
    color: nexoraThemeColor.text,
    fontSize: 26,
    fontWeight: 600,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  muted: {
    color: nexoraThemeColor.textMuted,
    fontSize: 13,
    lineHeight: 1.5,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    margin: 0,
    paddingLeft: 18,
  },
  header: {
    marginBottom: 12,
  },
  meta: {
    color: nexoraThemeColor.textMuted,
    display: 'grid',
    gap: 8,
    gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    marginTop: 12,
  },
  field: {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: NEXORA_CYAN,
  },
});

export function EmptyIntegrationState({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  const classes = useStyles();
  return (
    <section className={classes.card} aria-label={title}>
      <Typography className={classes.title}>{title}</Typography>
      <Typography className={classes.muted}>{message}</Typography>
    </section>
  );
}

export function ProviderGate<T>({
  title,
  result,
  empty,
  children,
}: {
  title: string;
  result?: ProviderResult<T>;
  empty: string;
  children: (data: T) => ReactNode;
}) {
  if (!result || result.status === 'unconfigured') {
    return (
      <EmptyIntegrationState
        title={title}
        message={
          result?.message ||
          'The equipment is registered in the catalog, but no provider is configured.'
        }
      />
    );
  }
  if (result.status === 'unavailable' || result.status === 'invalid') {
    return (
      <EmptyIntegrationState
        title={title}
        message={result.message || empty}
      />
    );
  }
  if (!result.data) {
    return <EmptyIntegrationState title={title} message={empty} />;
  }
  return <>{children(result.data)}</>;
}

export function MetricCard({ metric }: { metric: MetricValue }) {
  const classes = useStyles();
  return (
    <section className={classes.card} aria-label={metric.label}>
      <Typography className={classes.title}>{metric.label}</Typography>
      <Typography className={classes.value}>
        {metric.value}
        {metric.unit ? ` ${metric.unit}` : ''}
      </Typography>
      {metric.updatedAt && (
        <Typography className={classes.muted}>Updated {metric.updatedAt}</Typography>
      )}
    </section>
  );
}

export function HealthCard({ check }: { check: HealthCheck }) {
  const classes = useStyles();
  return (
    <section className={classes.card} aria-label={check.label}>
      <Typography className={classes.title}>{check.label}</Typography>
      <StatusBadge state={check.state} kind="health" />
      {check.value !== undefined && (
        <Typography className={classes.value} style={{ marginTop: 8 }}>
          {check.value}
        </Typography>
      )}
      {check.message && (
        <Typography className={classes.muted}>{check.message}</Typography>
      )}
    </section>
  );
}

export function ConnectivityCard({
  item,
}: {
  item: ConnectivityInterface;
}) {
  const classes = useStyles();
  return (
    <section className={classes.card} aria-label={item.name}>
      <Typography className={classes.title}>{item.kind}</Typography>
      <Typography variant="subtitle1">{item.name}</Typography>
      <StatusBadge state={item.state} kind="connectivity" />
      <div className={classes.meta}>
        {item.broker && (
          <div>
            <div className={classes.field}>Broker</div>
            <Typography variant="body2">{item.broker}</Typography>
          </div>
        )}
        {item.endpoint && (
          <div>
            <div className={classes.field}>Endpoint</div>
            <Typography variant="body2">{item.endpoint}</Typography>
          </div>
        )}
        {item.lastMessage && (
          <div>
            <div className={classes.field}>Last message</div>
            <Typography variant="body2">{item.lastMessage}</Typography>
          </div>
        )}
        {item.rate && (
          <div>
            <div className={classes.field}>Rate</div>
            <Typography variant="body2">{item.rate}</Typography>
          </div>
        )}
        {item.latency && (
          <div>
            <div className={classes.field}>Latency</div>
            <Typography variant="body2">{item.latency}</Typography>
          </div>
        )}
        {item.lastCheck && (
          <div>
            <div className={classes.field}>Last check</div>
            <Typography variant="body2">{item.lastCheck}</Typography>
          </div>
        )}
      </div>
      {item.message && (
        <Typography className={classes.muted}>{item.message}</Typography>
      )}
    </section>
  );
}

export function ContextCard({
  title,
  fields,
}: {
  title: string;
  fields: Array<{ label: string; value?: string }>;
}) {
  const classes = useStyles();
  const visible = fields.filter(field => field.value);
  if (visible.length === 0) {
    return null;
  }
  return (
    <section className={classes.card} aria-label={title}>
      <Typography className={classes.title}>{title}</Typography>
      <div className={classes.meta}>
        {visible.map(field => (
          <div key={field.label}>
            <div className={classes.field}>{field.label}</div>
            <Typography variant="body2">{field.value}</Typography>
          </div>
        ))}
      </div>
    </section>
  );
}

export function CapabilityMatrix({ groups }: { groups: CapabilityGroup[] }) {
  const classes = useStyles();
  return (
    <section className={classes.card} aria-label="Capability matrix">
      <Typography className={classes.title}>Capabilities</Typography>
      <div className={classes.meta}>
        {groups.map(group => (
          <div key={group.level}>
            <div className={classes.field}>{group.level}</div>
            <ul className={classes.list}>
              {group.items.map(item => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export function EntityRelationshipCard({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ label: string; to?: string }>;
  empty: string;
}) {
  const classes = useStyles();
  return (
    <section className={classes.card} aria-label={title}>
      <Typography className={classes.title}>{title}</Typography>
      {items.length === 0 ? (
        <Typography className={classes.muted}>{empty}</Typography>
      ) : (
        <ul className={classes.list}>
          {items.map(item => (
            <li key={item.label}>
              {item.to ? <Link to={item.to}>{item.label}</Link> : item.label}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AssetHeader({
  asset,
  connectivity,
  showTitle = true,
}: {
  asset: NexoraAsset;
  connectivity?: string;
  showTitle?: boolean;
}) {
  const classes = useStyles();
  return (
    <header className={classes.header} aria-label={`${asset.title} overview`}>
      {showTitle ? (
        <Typography
          variant="h4"
          style={{ color: nexoraThemeColor.text, fontWeight: 600 }}
        >
          {asset.title}
        </Typography>
      ) : null}
      {asset.description && (
        <Typography className={classes.muted}>{asset.description}</Typography>
      )}
      <div className={classes.meta}>
        <div>
          <div className={classes.field}>Site</div>
          <Typography>{asset.site || 'Not specified'}</Typography>
        </div>
        <div>
          <div className={classes.field}>Area</div>
          <Typography>{asset.area || 'Not specified'}</Typography>
        </div>
        <div>
          <div className={classes.field}>Line</div>
          <Typography>{asset.line || 'Not specified'}</Typography>
        </div>
        <div>
          <div className={classes.field}>Type</div>
          <Typography>{asset.equipmentType || 'Generic equipment'}</Typography>
        </div>
        {connectivity && (
          <div>
            <div className={classes.field}>Connectivity</div>
            <StatusBadge state={connectivity} kind="connectivity" />
          </div>
        )}
      </div>
    </header>
  );
}

export function DataProductHeader({
  title,
  owner,
  lifecycle,
  version,
  status,
  showTitle = true,
}: {
  title: string;
  owner?: string;
  lifecycle?: string;
  version?: string;
  status?: string;
  showTitle?: boolean;
}) {
  const classes = useStyles();
  return (
    <header className={classes.header} aria-label={`${title} overview`}>
      {showTitle ? (
        <Typography
          variant="h4"
          style={{ color: nexoraThemeColor.text, fontWeight: 600 }}
        >
          {title}
        </Typography>
      ) : null}
      {version && (
        <Typography className={classes.muted}>Version {version}</Typography>
      )}
      <div className={classes.meta}>
        <div>
          <div className={classes.field}>Owner</div>
          <Typography>{owner || 'Not specified'}</Typography>
        </div>
        <div>
          <div className={classes.field}>Lifecycle</div>
          <Typography>{lifecycle || 'Not specified'}</Typography>
        </div>
        {status && (
          <div>
            <div className={classes.field}>Status</div>
            <StatusBadge state={status} kind="health" />
          </div>
        )}
      </div>
    </header>
  );
}

export function RuntimeStateCard({
  state,
  updatedAt,
}: {
  state: string;
  updatedAt?: string;
}) {
  const classes = useStyles();
  return (
    <section className={classes.card} aria-label="Equipment state">
      <Typography className={classes.title}>Equipment State</Typography>
      <StatusWord>{state}</StatusWord>
      {updatedAt && (
        <Typography className={classes.muted}>Last update {updatedAt}</Typography>
      )}
    </section>
  );
}

export function productItems(products: DataProductRef[]) {
  return products.map(product => ({
    label: product.title || product.name,
    to: `/contracts/${product.name}`,
  }));
}
