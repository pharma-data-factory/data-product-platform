import { Button } from '@material-ui/core';
import { BrandMark } from '../nav/BrandMark';
import { BRAND_NAME, BRAND_WORDMARK, C, PHARMA_NAVY, PHARMA_TEAL, PLATFORM_POSITIONING } from '../theme/tokens';

export interface LoginPageProps {
  guestEnabled?: boolean;
  onGitHubSignIn: () => void;
  onGuestSignIn?: () => void;
  onBack?: () => void;
  error?: string;
}

export function LoginPage({
  guestEnabled = false,
  onGitHubSignIn,
  onGuestSignIn,
  onBack,
  error,
}: LoginPageProps) {
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
          maxWidth: 440,
          background: C.paper,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(11, 31, 58, 0.08)',
          padding: '40px 36px 32px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            gap: 8,
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
              color: C.text,
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
            {PLATFORM_POSITIONING}
          </p>
          <h1
            style={{
              margin: '20px 0 0',
              fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
              fontSize: 22,
              fontWeight: 600,
              color: C.text,
            }}
          >
            Sign in to continue
          </h1>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginTop: 28,
          }}
        >
          <Button
            variant="contained"
            onClick={onGitHubSignIn}
            startIcon={<GitHubMark />}
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
            Continue with GitHub
          </Button>

          {guestEnabled && (
            <div>
              <p
                style={{
                  margin: '8px 0 10px',
                  fontSize: 12,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: C.muted,
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  textAlign: 'center',
                }}
              >
                Development only
              </p>
              <Button
                variant="outlined"
                onClick={onGuestSignIn}
                style={{
                  width: '100%',
                  borderColor: C.border,
                  color: C.text,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 15,
                  borderRadius: 10,
                  padding: '10px 16px',
                }}
              >
                Continue as Guest
              </Button>
            </div>
          )}
        </div>

        {error && (
          <p
            role="alert"
            style={{
              marginTop: 20,
              marginBottom: 0,
              padding: '12px 14px',
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              borderRadius: 10,
              color: '#991B1B',
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {error}
          </p>
        )}

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{
              display: 'block',
              margin: '24px auto 0',
              background: 'none',
              border: 0,
              color: C.muted,
              cursor: 'pointer',
              fontSize: 13,
              textDecoration: 'underline',
            }}
          >
            Back to {BRAND_NAME}
          </button>
        )}
      </div>
    </main>
  );
}

function GitHubMark() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="18"
      height="18"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
