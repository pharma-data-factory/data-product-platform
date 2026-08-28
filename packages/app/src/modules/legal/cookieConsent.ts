export const CONSENT_STORAGE_KEY = 'pdf.consent.v1';
export const OPEN_COOKIE_SETTINGS_EVENT = 'pdf:open-cookie-settings';

export type ConsentPreferences = {
  necessary: true;
  analytics: boolean;
  marketing: boolean;
};

export const DEFAULT_CONSENT: ConsentPreferences = {
  necessary: true,
  analytics: false,
  marketing: false,
};

function isPreferences(value: unknown): value is ConsentPreferences {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record.necessary === true &&
    typeof record.analytics === 'boolean' &&
    typeof record.marketing === 'boolean'
  );
}

export function readConsentPreferences(): ConsentPreferences | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    if (raw === 'accepted') {
      return { ...DEFAULT_CONSENT };
    }
    const parsed: unknown = JSON.parse(raw);
    return isPreferences(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function hasAcceptedConsent(): boolean {
  return readConsentPreferences() !== null;
}

export function saveConsentPreferences(prefs: ConsentPreferences): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ ...prefs, necessary: true }),
    );
  } catch {
    // ignore storage failures — dialog may reappear
  }
}

/** Re-open the cookie settings dialog (state-of-the-art footer control). */
export function openCookieSettings(): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT));
}
