import { fireEvent, render, screen } from '@testing-library/react';
import { CookieConsentBanner } from './CookieConsentBanner';
import { CONSENT_STORAGE_KEY } from './cookieConsent';

describe('CookieConsentBanner', () => {
  beforeEach(() => {
    window.localStorage.removeItem(CONSENT_STORAGE_KEY);
  });

  it('shows on first visit and hides after accept all', () => {
    render(<CookieConsentBanner />);

    expect(screen.getByTestId('cookie-consent-banner')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cookie-consent-accept-all'));
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
    expect(JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toEqual({
      necessary: true,
      analytics: true,
      marketing: true,
    });
  });

  it('saves necessary-only preferences', () => {
    render(<CookieConsentBanner />);
    fireEvent.click(screen.getByTestId('cookie-consent-necessary-only'));
    expect(JSON.parse(window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? '{}')).toEqual({
      necessary: true,
      analytics: false,
      marketing: false,
    });
  });

  it('stays hidden when consent was already accepted', () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ necessary: true, analytics: false, marketing: false }),
    );
    render(<CookieConsentBanner />);
    expect(screen.queryByTestId('cookie-consent-banner')).not.toBeInTheDocument();
  });
});
