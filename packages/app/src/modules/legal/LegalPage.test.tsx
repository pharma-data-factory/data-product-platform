import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LegalPage } from './LegalPage';
import { isPublicLegalPath } from './constants';
import { LANDING_LOCALE_STORAGE_KEY } from '../identity/landingI18n';
import { CookieConsentBanner } from './CookieConsentBanner';
import { CONSENT_STORAGE_KEY, openCookieSettings } from './cookieConsent';

describe('legal routes', () => {
  beforeEach(() => {
    window.localStorage.removeItem(LANDING_LOCALE_STORAGE_KEY);
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  });

  it('publishes the Legal Notice content in English', () => {
    render(
      <MemoryRouter>
        <LegalPage pathname="/legal" standalone />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Legal Notice').length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Art\. 3 para\. 1 lit\. s UWG/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Dominic Betz/i)).toBeInTheDocument();
    expect(screen.queryByText(/REVIEW PLACEHOLDER/i)).not.toBeInTheDocument();
  });

  it('publishes the Legal Notice content in German', () => {
    window.localStorage.setItem(LANDING_LOCALE_STORAGE_KEY, 'de');
    render(
      <MemoryRouter>
        <LegalPage pathname="/legal" standalone />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Art\. 3 Abs\. 1 lit\. s UWG/i)).toBeInTheDocument();
    expect(screen.getByText(/Zeichnungsberechtigte/i)).toBeInTheDocument();
  });

  it('publishes the Privacy Policy content', () => {
    render(
      <MemoryRouter>
        <LegalPage pathname="/privacy" standalone />
      </MemoryRouter>,
    );
    expect(screen.getAllByText('Privacy Policy').length).toBeGreaterThan(0);
    expect(screen.getByText(/Swiss DPA, GDPR/i)).toBeInTheDocument();
    expect(screen.getByText(/markus\.schmeckenbecher@gmail\.com/i)).toBeInTheDocument();
    expect(screen.queryByText(/REVIEW PLACEHOLDER/i)).not.toBeInTheDocument();
  });

  it('keeps other legal pages as counsel-review placeholders', () => {
    render(
      <MemoryRouter>
        <LegalPage pathname="/terms" standalone />
      </MemoryRouter>,
    );
    expect(screen.getAllByText(/REVIEW PLACEHOLDER/).length).toBeGreaterThan(0);
  });

  it('recognizes public legal paths', () => {
    expect(isPublicLegalPath('/legal')).toBe(true);
    expect(isPublicLegalPath('/open-source')).toBe(true);
    expect(isPublicLegalPath('/marketplace')).toBe(false);
  });
});

describe('CookieConsentBanner reopen', () => {
  beforeEach(() => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ necessary: true, analytics: false, marketing: false }),
    );
  });

  it('can be reopened via openCookieSettings', () => {
    render(<CookieConsentBanner />);
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
    act(() => {
      openCookieSettings();
    });
    expect(screen.getByTestId('cookie-consent-banner')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cookie-consent-necessary-only'));
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
  });
});
