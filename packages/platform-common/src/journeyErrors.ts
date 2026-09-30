const SECRET_PATTERN =
  /client.?secret|private.?key|AUTH_GITHUB_CLIENT_SECRET|GITHUB_PRIVATE_KEY|bearer\s+[a-z0-9._-]+|ghp_[a-z0-9]+|stack|at\s+\S+\s+\(/i;

/**
 * The human message in an error response body, as a string — always.
 *
 * NXD-101. Nexora's routes answer `{ "error": "Requirement set not found" }`;
 * Backstage's own middleware — every 401 from `httpAuth.credentials`, every
 * framework-level error — answers `{ "error": { "name", "message", "stack" } }`.
 * Four frontend clients read `body.error` as if it were always the first
 * shape. Three turned the object into the message "[object Object]"; the URS
 * client passed the object on as `message`, a page rendered it, and React
 * threw error #31 ("Objects are not valid as a React child") for an expired
 * session.
 */
export function messageFromErrorBody(body: unknown, fallback: string): string {
  if (body && typeof body === 'object') {
    const { error, message } = body as { error?: unknown; message?: unknown };
    if (typeof error === 'string' && error.trim()) {
      return error;
    }
    if (error && typeof error === 'object') {
      const nested = (error as { message?: unknown }).message;
      if (typeof nested === 'string' && nested.trim()) {
        return nested;
      }
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
  }
  return fallback;
}

/** `Error`, a plain `{ message, status }` API error, or anything else. */
function rawMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }
  if (err && typeof err === 'object') {
    const { message, status } = err as { message?: unknown; status?: unknown };
    const text = typeof message === 'string' ? message : '';
    return typeof status === 'number' ? `${status} ${text}`.trim() : text;
  }
  return String(err ?? '');
}

export function isUnauthorizedError(err: unknown): boolean {
  return /401|403|unauthorized|forbidden|not authorized|permission|missing credentials/i.test(
    rawMessage(err),
  );
}

export function formatJourneyError(err: unknown): string {
  const raw = rawMessage(err);
  const lower = raw.toLowerCase();

  // Before the permission branch: a session that ended is not a missing
  // permission, and telling the user to ask an administrator for access
  // they already have sends them to the wrong person (NXD-101).
  if (/missing credentials|token (has )?expired|session (has )?expired|invalid token/i.test(lower)) {
    return 'Your session has ended. Sign in again to continue.';
  }

  if (isUnauthorizedError(err)) {
    return 'You do not have permission to view this page. Contact your platform administrator if you need access.';
  }

  if (/not found|no match/i.test(lower)) {
    return 'This item was not found. It may still be registering, or the name may be incorrect.';
  }

  if (
    /network|failed to fetch|unavailable|econnrefused|etimedout|503|502|504/i.test(
      lower,
    )
  ) {
    return 'The platform is temporarily unavailable. Try again in a moment.';
  }

  if (SECRET_PATTERN.test(raw)) {
    return 'Something went wrong. Try again or contact your platform administrator.';
  }

  return 'Something went wrong. Try again or contact your platform administrator.';
}
