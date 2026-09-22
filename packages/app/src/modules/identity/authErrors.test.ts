import {
  ACCESS_DENIED_MESSAGE,
  describeAuthError,
  formatAuthError,
  isAccessDeniedError,
  isGithubOAuthConfigured,
  isUnapprovedGithubUserError,
} from './authErrors';

describe('GitHub login error handling', () => {
  it('maps cancelled OAuth to a user-friendly message', () => {
    expect(formatAuthError(new Error('Popup closed by user'))).toMatch(
      /cancelled/i,
    );
  });

  it('maps GitHub unavailability without exposing internals', () => {
    expect(formatAuthError(new Error('Failed to fetch'))).toMatch(
      /unavailable/i,
    );
  });

  it('maps invalid callback errors', () => {
    expect(
      formatAuthError(new Error('redirect_uri mismatch for handler/frame')),
    ).toMatch(/callback URL/i);
  });

  it('maps missing OAuth configuration without exposing secrets', () => {
    const message = formatAuthError(
      new Error(
        'missing AUTH_GITHUB_CLIENT_SECRET=super-secret GITHUB_PRIVATE_KEY',
      ),
    );
    expect(message).toMatch(/not configured|not available/i);
    expect(message).not.toMatch(/super-secret|PRIVATE_KEY|CLIENT_SECRET=/);
  });

  it('maps session expiry', () => {
    expect(formatAuthError(new Error('401 unauthorized session expired'))).toMatch(
      /session has expired/i,
    );
  });

  it('maps unauthorized GitHub users to the official access-denied message', () => {
    expect(formatAuthError(new Error('User entity not found in catalog'))).toBe(
      ACCESS_DENIED_MESSAGE,
    );
    expect(
      formatAuthError(new Error('Failed to sign-in, unable to resolve user identity')),
    ).toBe(ACCESS_DENIED_MESSAGE);
    expect(formatAuthError(new Error('User entity not found in catalog'))).not.toMatch(
      /Viewer/i,
    );
    expect(isAccessDeniedError(new Error('User entity not found in catalog'))).toBe(
      true,
    );
  });

  it('never returns stack traces', () => {
    expect(
      formatAuthError(new Error('boom\n    at Object.<anonymous> (index.js:1:1)')),
    ).toBe('GitHub sign-in failed. Please try again.');
  });
});

describe('GitHub OAuth configuration detection', () => {
  it('detects unapproved GitHub catalog resolution failures', () => {
    expect(
      isUnapprovedGithubUserError(
        new Error('Failed to sign-in, unable to resolve user identity'),
      ),
    ).toBe(true);
    expect(isUnapprovedGithubUserError(new Error('Popup closed by user'))).toBe(
      false,
    );
  });

  it('treats empty or unsubstituted client IDs as missing', () => {
    expect(isGithubOAuthConfigured(undefined)).toBe(false);
    expect(isGithubOAuthConfigured('')).toBe(false);
    expect(isGithubOAuthConfigured('${AUTH_GITHUB_CLIENT_ID}')).toBe(false);
    expect(isGithubOAuthConfigured('oauth-client')).toBe(true);
  });

  describe('describeAuthError', () => {
    // The UI message collapses everything unrecognised into "please try
    // again", and the auth backend logs nothing for a failed sign-in, so
    // before this existed a failed login left no diagnosable trace anywhere.
    // "Authentication failed, Failed to obtain access token" — the message
    // that identified a rejected client secret — is exactly the kind of text
    // formatAuthError discards.
    it('keeps the detail the UI message throws away', () => {
      const detail = describeAuthError(
        new Error('Authentication failed, Failed to obtain access token'),
      );
      expect(detail).toContain('Failed to obtain access token');
      expect(formatAuthError(new Error('Authentication failed, Failed to obtain access token')))
        .toBe('GitHub sign-in failed. Please try again.');
    });

    it('redacts a secret instead of dropping the whole message', () => {
      const detail = describeAuthError(
        new Error('token: ghp_abc123def456 rejected by the provider'),
      );
      expect(detail).not.toContain('ghp_abc123def456');
      expect(detail).toContain('[redacted]');
      // The surrounding words survive — losing them is what made the original
      // all-or-nothing masking useless for debugging.
      expect(detail).toContain('rejected by the provider');
    });

    it('handles a non-Error rejection', () => {
      expect(describeAuthError('plain string failure')).toContain(
        'plain string failure',
      );
      expect(describeAuthError(undefined)).toContain('unknown error');
    });
  });
});
