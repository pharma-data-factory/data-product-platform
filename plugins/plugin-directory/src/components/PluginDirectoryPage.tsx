import { ChangeEvent, useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Progress } from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import {
  NexoraSummaryCard,
  NexoraToolPage,
  useNexoraToolStyles,
} from '@internal/plugin-nexora-common';
import {
  canAdministerPluginDirectory,
  canReadPluginDirectory,
  resolvePlatformRole,
} from '@internal/platform-common';
import {
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@material-ui/core';
import {
  NexoraPluginDescriptor,
  PluginDirectorySummary,
  pluginDirectoryApiRef,
} from '../api';
import { StatusChip } from './shared';

export function PluginDirectoryPage() {
  const classes = useNexoraToolStyles();
  const api = useApi(pluginDirectoryApiRef);
  const identityApi = useApi(identityApiRef);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [items, setItems] = useState<NexoraPluginDescriptor[]>([]);
  const [summary, setSummary] = useState<PluginDirectorySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const [validationStatus, setValidationStatus] = useState('');

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      const role = resolvePlatformRole(identity.ownershipEntityRefs);
      setAllowed(canReadPluginDirectory(role));
      setIsAdmin(canAdministerPluginDirectory(role));
    });
  }, [identityApi]);

  useEffect(() => {
    if (!allowed) {
      return;
    }
    api
      .listPlugins({
        q: q || undefined,
        type: type || undefined,
        lifecycle: lifecycle || undefined,
        validationStatus: validationStatus || undefined,
      })
      .then(response => {
        setItems(response.items);
        setSummary(response.summary);
        setError(null);
      })
      .catch(err =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      );
  }, [api, allowed, q, type, lifecycle, validationStatus]);

  if (allowed === null) {
    return (
      <NexoraToolPage eyebrow="Admin" title="Plugin Directory">
        <Progress />
      </NexoraToolPage>
    );
  }

  if (!allowed) {
    return (
      <NexoraToolPage
        eyebrow="Admin"
        title="Plugin Directory"
        copy="Governance inventory of installed Nexora / Backstage plugins."
      >
        <Typography color="error">
          Plugin Directory requires Developer role or higher.
        </Typography>
      </NexoraToolPage>
    );
  }

  return (
    <NexoraToolPage
      eyebrow="Admin"
      title="Plugin Directory"
      principle="Governed plugin inventory, not a Plugin Store."
      copy={
        isAdmin
          ? 'Installed Nexora / Backstage plugins — discoverable, understandable, and validation-aware.'
          : 'Read-only plugin inventory for developers. Install workflows are not available in v0.1.'
      }
      secondary="Distinguishes workspace presence, frontend/backend load state, and conservative validation metadata."
    >
      {summary ? (
        <Grid container spacing={2} style={{ marginBottom: 16 }}>
          <Grid item xs={6} sm={4} md={2}>
            <NexoraSummaryCard label="Installed Plugins" value={summary.total} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <NexoraSummaryCard label="Enabled" value={summary.enabled} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <NexoraSummaryCard label="Development" value={summary.development} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <NexoraSummaryCard label="Disabled" value={summary.disabled} />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <NexoraSummaryCard
              label="Validation Relevant"
              value={summary.validationRelevant}
            />
          </Grid>
          <Grid item xs={6} sm={4} md={2}>
            <NexoraSummaryCard
              label="Backstage Core"
              value={summary.backstageCoreVersion ?? '—'}
            />
          </Grid>
        </Grid>
      ) : (
        <Progress />
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
        <TextField
          size="small"
          label="Search"
          value={q}
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            setQ(event.target.value)
          }
          variant="outlined"
          style={{ minWidth: 220 }}
        />
        <FormControl size="small" variant="outlined" style={{ minWidth: 160 }}>
          <InputLabel id="plugin-type-filter">Type</InputLabel>
          <Select
            labelId="plugin-type-filter"
            label="Type"
            value={type}
            onChange={event => setType(String(event.target.value))}
          >
            <MenuItem value="">All</MenuItem>
            {[
              'PLATFORM',
              'DOMAIN',
              'INDUSTRIAL',
              'VALIDATION',
              'INTEGRATION',
              'EXPERIMENTAL',
            ].map(value => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" variant="outlined" style={{ minWidth: 160 }}>
          <InputLabel id="plugin-lifecycle-filter">Lifecycle</InputLabel>
          <Select
            labelId="plugin-lifecycle-filter"
            label="Lifecycle"
            value={lifecycle}
            onChange={event => setLifecycle(String(event.target.value))}
          >
            <MenuItem value="">All</MenuItem>
            {['ENABLED', 'DISABLED', 'DEVELOPMENT', 'DEPRECATED'].map(value => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" variant="outlined" style={{ minWidth: 200 }}>
          <InputLabel id="plugin-validation-filter">Validation</InputLabel>
          <Select
            labelId="plugin-validation-filter"
            label="Validation"
            value={validationStatus}
            onChange={event => setValidationStatus(String(event.target.value))}
            data-testid="validation-filter"
          >
            <MenuItem value="">All</MenuItem>
            {[
              'NOT_VALIDATED',
              'VALIDATION_IN_PROGRESS',
              'VALIDATED',
              'NOT_APPLICABLE',
              'NOT_ESTABLISHED',
            ].map(value => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </div>

      {error ? <Typography color="error">{error}</Typography> : null}
      <div className={classes.tableWrap}>
        <table className={classes.table} data-testid="plugin-directory-table">
          <thead>
            <tr>
              <th>Plugin</th>
              <th>Type</th>
              <th>Version</th>
              <th>Lifecycle</th>
              <th>Frontend</th>
              <th>Backend</th>
              <th>Validation Status</th>
              <th>Owner</th>
              <th>Runtime Loaded</th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id}>
                <td>
                  <RouterLink
                    className={classes.link}
                    to={`/admin/plugins/${row.id}`}
                    data-testid={`plugin-link-${row.id}`}
                  >
                    {row.name}
                  </RouterLink>
                </td>
                <td>{row.type}</td>
                <td>{row.version ?? '—'}</td>
                <td>
                  <StatusChip value={row.lifecycle} />
                </td>
                <td>
                  {row.frontendLoaded
                    ? 'Loaded'
                    : row.frontendPackage
                      ? 'Present'
                      : '—'}
                </td>
                <td>
                  {row.backendLoaded
                    ? 'Loaded'
                    : row.backendPackage
                      ? 'Present'
                      : '—'}
                </td>
                <td>
                  <StatusChip value={row.validationStatus} />
                </td>
                <td>{row.owner ?? '—'}</td>
                <td>{row.runtimeLoaded ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </NexoraToolPage>
  );
}
