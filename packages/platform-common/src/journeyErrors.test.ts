import {
  formatJourneyError,
  isUnauthorizedError,
  messageFromErrorBody,
} from './journeyErrors';

describe('journey error copy', () => {
  it('maps unauthorized errors without exposing internals', () => {
    expect(isUnauthorizedError(new Error('403 Forbidden'))).toBe(true);
    expect(formatJourneyError(new Error('401 unauthorized'))).toMatch(
      /do not have permission/i,
    );
    expect(formatJourneyError(new Error('401 unauthorized'))).not.toMatch(
      /Scaffolder|Entity Ref|Backstage/i,
    );
  });

  it('maps missing items without stack traces', () => {
    expect(
      formatJourneyError(new Error('Data Product missing was not found in the catalog')),
    ).toMatch(/not found/i);
    expect(
      formatJourneyError(
        new Error('TypeError: boom\n    at CatalogProcessor.run (policy.ts:12)'),
      ),
    ).toBe(
      'Something went wrong. Try again or contact your platform administrator.',
    );
  });
});

describe('error bodies and plain API errors (NXD-101)', () => {
  // The exact body Backstage's middleware sent for an expired session.
  const backstageEnvelope = {
    error: {
      name: 'AuthenticationError',
      message: 'Missing credentials',
      stack: 'AuthenticationError: Missing credentials\n    at credentials (x.ts:1:1)',
    },
    request: { method: 'GET', url: '/requirement-sets' },
    response: { statusCode: 401 },
  };

  it('reads the message from both body shapes, and always returns a string', () => {
    expect(messageFromErrorBody({ error: 'Requirement set not found' }, 'x')).toBe(
      'Requirement set not found',
    );
    expect(messageFromErrorBody(backstageEnvelope, 'x')).toBe('Missing credentials');
    expect(messageFromErrorBody({ message: 'plain' }, 'x')).toBe('plain');
    for (const body of [{}, null, undefined, 'text', { error: {} }, { error: '  ' }]) {
      expect(messageFromErrorBody(body, 'HTTP 500')).toBe('HTTP 500');
    }
  });

  it('never hands back the stack', () => {
    expect(messageFromErrorBody(backstageEnvelope, 'x')).not.toMatch(/at credentials/);
  });

  it('formats a plain { status, message } API error by its content, not as [object Object]', () => {
    expect(formatJourneyError({ status: 401, message: 'Missing credentials' })).toBe(
      'Your session has ended. Sign in again to continue.',
    );
    expect(isUnauthorizedError({ status: 403, message: 'Forbidden' })).toBe(true);
    expect(formatJourneyError({ status: 404, message: 'Requirement set not found' })).toMatch(
      /not found/i,
    );
  });

  it('keeps "401 unauthorized" as a permission message, as before', () => {
    expect(formatJourneyError(new Error('401 unauthorized'))).toMatch(
      /do not have permission/i,
    );
  });
});
