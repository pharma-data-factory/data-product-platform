export const ACCESS_DENIED_MESSAGE =
  'Your GitHub identity was authenticated successfully, but you do not currently have access to this Nexora environment.';

const SECRET_PATTERN =
  /client.?secret|private.?key|AUTH_GITHUB_CLIENT_SECRET|GITHUB_PRIVATE_KEY|GITHUB_CLIENT_SECRET|bearer\s+[a-z0-9._-]+|ghp_[a-z0-9]+|ghs_[a-z0-9]+|token[=:]\s*\S+/i;

/**
 * The raw error, with anything secret-looking removed.
 *
 * `formatAuthError` deliberately collapses everything it does not recognise
 * into "GitHub sign-in failed. Please try again." That protects a shared
 * screen, but it also meant the cause was discarded at the only point where it
 * existed: the auth backend logs nothing for a failed sign-in, so a masked
 * message left no way at all to find out what went wrong.
 *
 * This keeps the redaction and gives the detail back, for a console log rather
 * than the UI. `SECRET_PATTERN` is applied to the whole string, not tested
 * against it, so a message that merely *contains* a token loses the token
 * instead of the message.
 */
export function describeAuthError(err: unknown): string {
  const raw =
    err instanceof Error
      ? `${err.name}: ${err.message}${err.stack ? `\n${err.stack}` : ''}`
      : String(err ?? 'unknown error');
  return raw.replace(new RegExp(SECRET_PATTERN.source, 'gi'), '[redacted]');
}

export function isAccessDeniedError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  return /catalog|user entity|not found|unable to resolve user identity|not authorized|access denied/i.test(
    raw,
  );
}

export function formatAuthError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();

  if (
    /popup|cancel|closed by user|window was closed|user denied/i.test(lower)
  ) {
    return 'GitHub sign-in was cancelled. You can try again when you are ready.';
  }

  if (
    /network|failed to fetch|unavailable|econnrefused|etimedout|503|502|504/i.test(
      lower,
    )
  ) {
    return 'GitHub is unavailable. Check your connection and try again.';
  }

  if (
    /callback|redirect_uri|invalid.?state|mismatch|handler\/frame/i.test(lower)
  ) {
    return 'GitHub sign-in could not complete. Verify the OAuth callback URL matches this environment.';
  }

  if (
    /not configured|missing auth_github|clientid|client.?id|client.?secret/i.test(
      lower,
    )
  ) {
    return 'GitHub sign-in is not configured for this environment.';
  }

  if (/session|expired|unauthorized|401/i.test(lower)) {
    return 'Your session has expired. Please sign in again.';
  }

  if (/catalog|user entity|not found|unable to resolve|failed to sign-in/i.test(lower)) {
    return ACCESS_DENIED_MESSAGE;
  }

  if (SECRET_PATTERN.test(raw) || /stack|at\s+\S+\s+\(/i.test(raw)) {
    return 'GitHub sign-in failed. Please try again.';
  }

  return 'GitHub sign-in failed. Please try again.';
}

export function isGithubOAuthConfigured(
  clientId: string | undefined,
): boolean {
  if (!clientId) {
    return false;
  }
  const value = clientId.trim();
  return value.length > 0 && !value.includes('${');
}

export function isUnapprovedGithubUserError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  return /unable to resolve|user not found|not found in the catalog|failed to sign-in|no matching user|catalog user/i.test(
    raw,
  );
}

export function githubLoginFromProfile(profile?: {
  displayName?: string;
  email?: string;
}): string | undefined {
  const displayName = profile?.displayName?.trim();
  if (displayName && !displayName.includes(' ')) {
    return displayName.toLowerCase();
  }
  const email = profile?.email?.trim().toLowerCase();
  if (email?.endsWith('@users.noreply.github.com')) {
    return email.split('@')[0]?.replace(/^\d+\+/, '') || undefined;
  }
  return displayName || email?.split('@')[0];
}

export function readGithubOAuthClientId(config: {
  getOptionalString(key: string): string | undefined;
}): string | undefined {
  for (const key of [
    'auth.providers.github.development.clientId',
    'auth.providers.github.production.clientId',
  ]) {
    try {
      const value = config.getOptionalString(key);
      if (isGithubOAuthConfigured(value)) {
        return value;
      }
    } catch {
      // Empty or invalid values mean GitHub user login is not configured.
    }
  }
  return undefined;
}
