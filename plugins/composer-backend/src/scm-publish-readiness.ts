/**
 * Whether this installation can publish a scaffolded repository at all.
 *
 * NXD-099. A Golden Path ran its first three steps — resolving the target,
 * rendering the skeleton, checking the URS baseline — and only then failed in
 * `publish:github` with "No token available for host: github.com". The
 * information was available before the first step: whether the configured
 * SCM host has credentials is a property of the configuration, not of the
 * run. `nexora:scm:resolve-repo` now refuses at step one, and the frontend
 * asks before a form is ever filled in.
 *
 * Read from configuration only. `@backstage/integration`'s credentials
 * provider would answer more precisely — whether a GitHub App is actually
 * installed on the organisation — but is not a dependency of this plugin, and
 * adding one is an AGENTS.md decision. What this catches is the failure that
 * occurred: no token and no app for the host.
 */

import type { Config } from '@backstage/config';

export type PublishReadiness =
  | { ready: true; host: string; owner: string }
  | {
      ready: false;
      host?: string;
      owner?: string;
      reason: 'NO_SCM_TARGET' | 'NO_CREDENTIALS';
      message: string;
    };

/** A configured value, not an unset `${VAR}` that survived as text or blank. */
function present(value: string | undefined): boolean {
  return Boolean(value && value.trim() && !/^\$\{.*\}$/.test(value.trim()));
}

function hasCredentials(integration: Config): boolean {
  if (present(integration.getOptionalString('token'))) {
    return true;
  }
  const apps = integration.getOptionalConfigArray('apps') ?? [];
  return apps.some(
    app =>
      present(app.getOptionalString('appId')) &&
      present(app.getOptionalString('privateKey')),
  );
}

export function getPublishReadiness(config: Config): PublishReadiness {
  const host = config.getOptionalString('nexora.scm.host');
  const owner = config.getOptionalString('nexora.scm.organization');
  if (!host || !owner) {
    return {
      ready: false,
      host,
      owner,
      reason: 'NO_SCM_TARGET',
      message:
        'No publish target is configured (nexora.scm.host and ' +
        'nexora.scm.organization), so Golden Paths cannot create a repository ' +
        'in this environment.',
    };
  }

  const integrations = config.getOptionalConfigArray('integrations.github') ?? [];
  // Backstage treats a GitHub integration without `host` as github.com.
  const forHost = integrations.filter(
    integration => (integration.getOptionalString('host') ?? 'github.com') === host,
  );
  if (!forHost.some(hasCredentials)) {
    return {
      ready: false,
      host,
      owner,
      reason: 'NO_CREDENTIALS',
      message:
        `No GitHub credentials are configured for ${host}, so Golden Paths ` +
        `cannot create repositories in ${host}/${owner} in this environment. ` +
        'Configure a token or a GitHub App under integrations.github.',
    };
  }

  return { ready: true, host, owner };
}
