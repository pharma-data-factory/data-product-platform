import { Button } from '@material-ui/core';
import { BrandMark } from '../nav/BrandMark';
import { BRAND_WORDMARK, C, PHARMA_NAVY, PHARMA_TEAL } from '../theme/tokens';
import { ACCESS_DENIED_MESSAGE } from './authErrors';

export interface AccessDeniedPageProps {
  githubLogin?: string;
  onBack?: () => void;
  onSignOut?: () => void;
}

export function AccessDeniedPage({
  githubLogin,
  onBack,
  onSignOut,
}: AccessDeniedPageProps) {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: C.base,
        color: C.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        fontFamily: 'Inter, Segoe UI, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 520,
          background: C.paper,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(11, 31, 58, 0.08)',
          padding: '40px 36px 32px',
          textAlign: 'center',
        }}
      >
        <BrandMark size={48} />
        <p
          style={{
            margin: '16px 0 0',
            fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
            fontWeight: 600,
            fontSize: 18,
            letterSpacing: '-0.02em',
            color: PHARMA_NAVY,
          }}
        >
          {BRAND_WORDMARK}
        </p>
        <p
          style={{
            margin: 0,
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: PHARMA_TEAL,
            fontWeight: 600,
          }}
        >
          DATA PRODUCTS. BUILT FOR LIFE SCIENCE.
        </p>
        <h1
          style={{
            margin: '24px 0 0',
            fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
            fontSize: 22,
            fontWeight: 600,
            color: PHARMA_NAVY,
          }}
        >
          Access not granted
        </h1>
        {githubLogin && (
          <p
            style={{
              margin: '12px 0 0',
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: 12,
              letterSpacing: '0.04em',
              color: C.muted,
            }}
          >
            {`GitHub login: ${githubLogin}`}
          </p>
        )}
        <p
          role="status"
          style={{
            margin: '16px 0 0',
            color: C.muted,
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          {ACCESS_DENIED_MESSAGE} Contact your platform administrator to
          request access.
        </p>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginTop: 28,
          }}
        >
          {onSignOut && (
            <Button
              variant="contained"
              onClick={onSignOut}
              style={{
                background: PHARMA_NAVY,
                color: '#FFFFFF',
                textTransform: 'none',
                fontWeight: 600,
                fontSize: 15,
                borderRadius: 10,
                padding: '10px 16px',
                boxShadow: 'none',
              }}
            >
              Sign Out
            </Button>
          )}
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'none',
                border: 0,
                color: C.muted,
                cursor: 'pointer',
                fontSize: 13,
                textDecoration: 'underline',
              }}
            >
              Return to landing page
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
