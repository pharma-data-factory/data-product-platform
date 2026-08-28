import { useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { Progress } from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';
import {
  NexoraSection,
  NexoraToolPage,
  useNexoraToolStyles,
} from '@internal/plugin-nexora-common';
import {
  canReadPluginDirectory,
  resolvePlatformRole,
} from '@internal/platform-common';
import { Typography } from '@material-ui/core';
import { NexoraPluginDescriptor, pluginDirectoryApiRef } from '../api';
import { DetailRow, StatusChip } from './shared';

export function PluginDetailPage() {
  const classes = useNexoraToolStyles();
  const { pluginId = '' } = useParams();
  const api = useApi(pluginDirectoryApiRef);
  const identityApi = useApi(identityApiRef);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [plugin, setPlugin] = useState<NexoraPluginDescriptor | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    identityApi.getBackstageIdentity().then(identity => {
      setAllowed(
        canReadPluginDirectory(resolvePlatformRole(identity.ownershipEntityRefs)),
      );
    });
  }, [identityApi]);

  useEffect(() => {
    if (!allowed || !pluginId) {
      return;
    }
    api
      .getPlugin(pluginId)
      .then(setPlugin)
      .catch(err =>
        setError(err instanceof Error ? err.message : 'Failed to load'),
      );
  }, [api, allowed, pluginId]);

  if (allowed === null || (allowed && !plugin && !error)) {
    return (
      <NexoraToolPage eyebrow="Admin" title={pluginId || 'Plugin'}>
        <Progress />
      </NexoraToolPage>
    );
  }

  if (!allowed) {
    return (
      <NexoraToolPage eyebrow="Admin" title="Plugin Directory">
        <Typography color="error">
          Plugin Directory requires Developer role or higher.
        </Typography>
      </NexoraToolPage>
    );
  }

  if (error || !plugin) {
    return (
      <NexoraToolPage eyebrow="Admin" title={pluginId}>
        <Typography color="error">{error ?? 'Not found'}</Typography>
        <Typography style={{ marginTop: 12 }}>
          <RouterLink className={classes.link} to="/admin/plugins">
            Back to Plugin Directory
          </RouterLink>
        </Typography>
      </NexoraToolPage>
    );
  }

  return (
    <NexoraToolPage
      eyebrow="Admin · Plugin Directory"
      title={plugin.name}
      copy={`Plugin ID: ${plugin.id}`}
      secondary={plugin.description}
    >
      <Typography style={{ marginBottom: 16 }}>
        <RouterLink className={classes.link} to="/admin/plugins">
          ← Plugin Directory
        </RouterLink>
      </Typography>

      <NexoraSection title="Identity">
        <DetailRow label="Name" value={plugin.name} />
        <DetailRow label="ID" value={plugin.id} />
        <DetailRow label="Description" value={plugin.description} />
        <DetailRow label="Version" value={plugin.version} />
        <DetailRow label="Type" value={<StatusChip value={plugin.type} />} />
        <DetailRow
          label="Lifecycle"
          value={<StatusChip value={plugin.lifecycle} />}
        />
        <DetailRow label="Source" value={plugin.source} />
        <DetailRow label="Owner" value={plugin.owner} />
      </NexoraSection>

      <NexoraSection title="Packages">
        <DetailRow label="Frontend package" value={plugin.frontendPackage} />
        <DetailRow label="Backend package" value={plugin.backendPackage} />
      </NexoraSection>

      <NexoraSection title="Runtime">
        <DetailRow
          label="Frontend route"
          value={
            plugin.frontendRoute ? (
              <RouterLink className={classes.link} to={plugin.frontendRoute}>
                {plugin.frontendRoute}
              </RouterLink>
            ) : null
          }
        />
        <DetailRow label="Backend route" value={plugin.backendRoute} />
        <DetailRow
          label="Runtime loaded"
          value={plugin.runtimeLoaded ? 'Yes' : 'No'}
        />
        <DetailRow
          label="Frontend loaded"
          value={plugin.frontendLoaded ? 'Yes' : 'No'}
        />
        <DetailRow
          label="Backend loaded"
          value={plugin.backendLoaded ? 'Yes' : 'No'}
        />
      </NexoraSection>

      <NexoraSection title="Permissions">
        {plugin.permissions?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {plugin.permissions.map(permission => (
              <li key={permission}>{permission}</li>
            ))}
          </ul>
        ) : (
          <Typography color="textSecondary">
            No plugin-specific permissions listed.
          </Typography>
        )}
      </NexoraSection>

      <NexoraSection title="Dependencies">
        {plugin.dependencies?.length ? (
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {plugin.dependencies.map(dep => (
              <li key={dep}>{dep}</li>
            ))}
          </ul>
        ) : (
          <Typography color="textSecondary">No dependencies listed.</Typography>
        )}
      </NexoraSection>

      <NexoraSection title="Validation" testId="validation-section">
        <DetailRow
          label="Validation Status"
          value={<StatusChip value={plugin.validationStatus} />}
        />
        <DetailRow
          label="Validation Reference"
          value={plugin.validationReference ?? '—'}
        />
        {plugin.id === 'validation-expert' || plugin.type === 'VALIDATION' ? (
          <Typography style={{ marginTop: 12 }}>
            <RouterLink className={classes.link} to="/validation-expert">
              Open Validation Expert workbench
            </RouterLink>
          </Typography>
        ) : null}
        <Typography
          variant="body2"
          color="textSecondary"
          style={{ marginTop: 12 }}
        >
          Plugin Directory is not authoritative for product validation. Status
          is conservative inventory metadata only.
        </Typography>
      </NexoraSection>
    </NexoraToolPage>
  );
}
