import { useCallback } from 'react';
import {
  discoveryApiRef,
  fetchApiRef,
  useApi,
} from '@backstage/core-plugin-api';
import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { NEXORA_STATUS, useLoadable } from '@internal/plugin-nexora-common';

interface PublishReadiness {
  ready: boolean;
  host?: string;
  owner?: string;
  reason?: 'NO_SCM_TARGET' | 'NO_CREDENTIALS';
  message?: string;
}

const useStyles = makeStyles({
  notice: {
    background: NEXORA_STATUS.warnBg,
    border: `1px solid ${NEXORA_STATUS.warnFg}`,
    borderRadius: 12,
    color: NEXORA_STATUS.warnFg,
    marginTop: 16,
    maxWidth: 720,
    padding: '10px 14px',
  },
  title: { fontSize: 14, fontWeight: 600 },
  body: { fontSize: 13, marginTop: 2 },
  muted: { fontSize: 12, marginTop: 12, opacity: 0.8 },
});

/**
 * NXD-099. Says before a Golden Path is started that it cannot publish here.
 *
 * A run used to render the skeleton and check the URS baseline, and only then
 * fail in publish:github because the environment had no GitHub credentials.
 * The backend now refuses at the first step; this says it before the form.
 * Renders nothing when publishing is possible.
 */
export function PublishReadinessNotice() {
  const classes = useStyles();
  const discoveryApi = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);

  const load = useCallback(async (): Promise<PublishReadiness> => {
    const baseUrl = await discoveryApi.getBaseUrl('composer');
    const res = await fetchApi.fetch(`${baseUrl}/scm/publish-readiness`);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  }, [discoveryApi, fetchApi]);
  const { value, error } = useLoadable(load);

  if (error) {
    // Advisory, so it does not block anything — but the absence of a warning
    // must not be read as "publishing works" when nobody could check.
    return (
      <Typography className={classes.muted}>
        Could not check whether publishing is configured in this environment.
      </Typography>
    );
  }
  if (!value || value.ready) {
    return null;
  }
  return (
    <div className={classes.notice} role="status">
      <Typography className={classes.title}>
        Golden Paths cannot publish a repository in this environment
      </Typography>
      <Typography className={classes.body}>{value.message}</Typography>
    </div>
  );
}
