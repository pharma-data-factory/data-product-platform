const SECRET_PATTERN =
  /client.?secret|private.?key|AUTH_GITHUB_CLIENT_SECRET|GITHUB_PRIVATE_KEY|bearer\s+[a-z0-9._-]+|ghp_[a-z0-9]+|stack|at\s+\S+\s+\(/i;

export function isUnauthorizedError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  return /401|403|unauthorized|forbidden|not authorized|permission/i.test(raw);
}

export function formatJourneyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? '');
  const lower = raw.toLowerCase();

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
