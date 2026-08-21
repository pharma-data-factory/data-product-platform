import {
  ACCESS_DENIED_MESSAGE,
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
});
