import { formatJourneyError, isUnauthorizedError } from './journeyErrors';

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
