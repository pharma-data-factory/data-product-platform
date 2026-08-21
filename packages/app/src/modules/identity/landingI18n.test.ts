import { landingCopy, LANDING_LOCALES, readStoredLandingLocale } from './landingI18n';

describe('landing i18n', () => {
  it('supports English and German only', () => {
    expect(LANDING_LOCALES.map(item => item.id)).toEqual(['en', 'de']);
    expect(landingCopy.en.bookDemo).toBe('Book a Demo');
    expect(landingCopy.de.bookDemo).toBe('Demo vereinbaren');
    expect(landingCopy.en.signIn).toBe('Sign In');
    expect(landingCopy.de.signIn).toBe('Anmelden');
    expect(JSON.stringify(landingCopy)).not.toMatch(/Start for Free/);
  });

  it('defaults to English when nothing is stored', () => {
    window.localStorage.clear();
    expect(readStoredLandingLocale()).toBe('en');
  });
});
