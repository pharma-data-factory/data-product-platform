import { useCallback, useEffect, useId, useState, type ReactNode } from 'react';
import { Button, IconButton, Link, Switch } from '@material-ui/core';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import {
  useLandingI18n,
} from '../identity/landingI18n';
import { PHARMA_TEAL } from '../identity/landingTokens';
import { LEGAL_PATHS } from './constants';
import {
  NEXORA_GREY,
} from '@internal/plugin-nexora-common';
import {
  DEFAULT_CONSENT,
  hasAcceptedConsent,
  OPEN_COOKIE_SETTINGS_EVENT,
  readConsentPreferences,
  saveConsentPreferences,
  type ConsentPreferences,
} from './cookieConsent';

/** Only one dialog instance should render if mounted in multiple trees. */
let activeOwnerId: string | null = null;

const ACCENT = '#22C55E';
const PANEL = NEXORA_GREY[900];
const CARD = NEXORA_GREY[800];
const MUTED = NEXORA_GREY[400];
const TEXT = NEXORA_GREY[50];

function CookieGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke={ACCENT} strokeWidth="1.8" />
      <path
        d="M16.5 7.2c-.9.2-1.5 1-1.5 1.9 0 .2 0 .3.1.5-.8.2-1.4.9-1.4 1.8 0 .2 0 .3.1.5-.7.3-1.2.9-1.2 1.7"
        stroke={ACCENT}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="10" r="1" fill={ACCENT} />
      <circle cx="13.5" cy="14.5" r="1" fill={ACCENT} />
      <circle cx="8.5" cy="15" r="0.8" fill={ACCENT} />
    </svg>
  );
}

function CategoryRow({
  title,
  body,
  trailing,
}: Readonly<{
  title: string;
  body: string;
  trailing: ReactNode;
}>) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 16px',
        borderRadius: 14,
        background: CARD,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: TEXT }}>{title}</p>
        <p style={{ margin: '4px 0 0', fontSize: 13, lineHeight: 1.45, color: MUTED }}>{body}</p>
      </div>
      <div style={{ flex: '0 0 auto' }}>{trailing}</div>
    </div>
  );
}

export function CookieConsentBanner() {
  const ownerId = useId();
  const [isOwner, setIsOwner] = useState(false);
  const [visible, setVisible] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const { t } = useLandingI18n();
  const copy = t.consent;

  useEffect(() => {
    if (activeOwnerId === null) {
      activeOwnerId = ownerId;
      setIsOwner(true);
    } else {
      setIsOwner(activeOwnerId === ownerId);
    }
    return () => {
      if (activeOwnerId === ownerId) {
        activeOwnerId = null;
      }
    };
  }, [ownerId]);

  useEffect(() => {
    if (!isOwner) {
      return undefined;
    }
    setVisible(!hasAcceptedConsent());

    const openSettings = () => {
      const prefs = readConsentPreferences();
      setAnalytics(prefs?.analytics ?? false);
      setMarketing(prefs?.marketing ?? false);
      setVisible(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
  }, [isOwner]);

  const persist = useCallback((prefs: ConsentPreferences) => {
    saveConsentPreferences(prefs);
    setVisible(false);
  }, []);

  const onAcceptAll = useCallback(() => {
    persist({ necessary: true, analytics: true, marketing: true });
  }, [persist]);

  const onNecessaryOnly = useCallback(() => {
    setAnalytics(false);
    setMarketing(false);
    persist({ ...DEFAULT_CONSENT });
  }, [persist]);

  const onSavePreferences = useCallback(() => {
    persist({ necessary: true, analytics, marketing });
  }, [analytics, marketing, persist]);

  const onClose = useCallback(() => {
    persist({ ...DEFAULT_CONSENT });
  }, [persist]);

  if (!isOwner || !visible) {
    return null;
  }

  return (
    <div
      role="presentation"
      data-testid="cookie-consent-banner"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1400,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(2, 8, 16, 0.45)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={copy.title}
        style={{
          width: '100%',
          maxWidth: 560,
          borderRadius: 20,
          background: PANEL,
          border: '1px solid rgba(148,163,184,0.18)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.55)',
          color: TEXT,
          fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
          padding: 22,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'rgba(34,197,94,0.12)',
              border: '1px solid rgba(34,197,94,0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: '0 0 auto',
            }}
          >
            <CookieGlyph />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: TEXT }}>{copy.title}</p>
            <p style={{ margin: '8px 0 0', fontSize: 14, lineHeight: 1.55, color: MUTED }}>
              {copy.body}{' '}
              <Link href={LEGAL_PATHS.privacy} style={{ color: PHARMA_TEAL, fontWeight: 600 }}>
                {copy.privacy}
              </Link>
            </p>
          </div>
          <IconButton
            aria-label={copy.close}
            onClick={onClose}
            size="small"
            style={{ color: MUTED, marginTop: -4 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>

        <div
          style={{
            height: 1,
            background: 'rgba(148,163,184,0.16)',
            margin: '18px 0',
          }}
        />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <CategoryRow
            title={copy.necessaryTitle}
            body={copy.necessaryBody}
            trailing={
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: ACCENT,
                  color: '#052E16',
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                }}
              >
                {copy.necessaryBadge}
              </span>
            }
          />
          <CategoryRow
            title={copy.analyticsTitle}
            body={copy.analyticsBody}
            trailing={
              <Switch
                color="primary"
                checked={analytics}
                onChange={(_, checked) => setAnalytics(checked)}
                inputProps={{ 'aria-label': copy.analyticsTitle }}
                data-testid="cookie-consent-analytics"
              />
            }
          />
          <CategoryRow
            title={copy.marketingTitle}
            body={copy.marketingBody}
            trailing={
              <Switch
                color="primary"
                checked={marketing}
                onChange={(_, checked) => setMarketing(checked)}
                inputProps={{ 'aria-label': copy.marketingTitle }}
                data-testid="cookie-consent-marketing"
              />
            }
          />
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 10,
            marginTop: 18,
          }}
        >
          <Button
            variant="contained"
            onClick={onAcceptAll}
            data-testid="cookie-consent-accept-all"
            startIcon={<CheckIcon />}
            style={{
              flex: '1 1 140px',
              background: ACCENT,
              color: '#052E16',
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 12,
              boxShadow: 'none',
              padding: '10px 16px',
            }}
          >
            {copy.acceptAll}
          </Button>
          <Button
            variant="contained"
            onClick={onNecessaryOnly}
            data-testid="cookie-consent-necessary-only"
            style={{
              flex: '1 1 140px',
              background: CARD,
              color: TEXT,
              textTransform: 'none',
              fontWeight: 600,
              borderRadius: 12,
              boxShadow: 'none',
              padding: '10px 16px',
            }}
          >
            {copy.necessaryOnly}
          </Button>
          <Button
            variant="outlined"
            onClick={onSavePreferences}
            data-testid="cookie-consent-save"
            startIcon={<CheckIcon style={{ color: ACCENT }} />}
            style={{
              flex: '1 1 140px',
              color: ACCENT,
              borderColor: ACCENT,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 12,
              padding: '10px 16px',
            }}
          >
            {copy.savePreferences}
          </Button>
        </div>
      </div>
    </div>
  );
}
