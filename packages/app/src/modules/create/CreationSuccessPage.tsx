import { Link } from '@backstage/core-components';
import { Button, Typography } from '@material-ui/core';
import { BrandMark } from '../nav/BrandMark';
import { C, PHARMA_NAVY, PHARMA_TEAL } from '../theme/tokens';
import { CreationSuccessAction } from './creationSuccess';

export function CreationSuccessPage({
  productName,
  repository,
  actions,
  onDismiss,
}: {
  productName: string;
  repository?: string;
  actions: CreationSuccessAction[];
  onDismiss?: () => void;
}) {
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
          maxWidth: 560,
          background: C.paper,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(11, 31, 58, 0.08)',
          padding: '40px 36px 32px',
        }}
      >
        <BrandMark size={48} />
        <p
          style={{
            margin: '16px 0 0',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 12,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: PHARMA_TEAL,
            fontWeight: 600,
          }}
        >
          Data Product created
        </p>
        <h1
          style={{
            margin: '12px 0 0',
            fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
            fontSize: 28,
            fontWeight: 600,
            color: C.text,
          }}
        >
          {productName || 'Data Product'}
        </h1>
        {repository && (
          <Typography
            variant="body2"
            style={{ marginTop: 8, color: C.muted, wordBreak: 'break-all' }}
          >
            Repository: {repository}
          </Typography>
        )}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            marginTop: 28,
          }}
        >
          {actions.map((action, index) => (
            <Link
              key={action.id}
              to={action.to}
              style={{
                display: 'block',
                textAlign: 'center',
                background:
                  index === 0
                    ? `linear-gradient(135deg, ${PHARMA_NAVY}, ${PHARMA_TEAL})`
                    : 'transparent',
                color: index === 0 ? '#fff' : C.text,
                border: index === 0 ? 0 : `1px solid ${C.border}`,
                borderRadius: 12,
                fontWeight: 600,
                padding: '10px 16px',
                textDecoration: 'none',
              }}
            >
              {action.label}
            </Link>
          ))}
        </div>
        {onDismiss && (
          <Button
            onClick={onDismiss}
            style={{ marginTop: 16, textTransform: 'none' }}
          >
            View creation log
          </Button>
        )}
      </div>
    </main>
  );
}

export function CreationFailurePage({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss?: () => void;
}) {
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
          maxWidth: 560,
          background: C.paper,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          boxShadow: '0 24px 60px rgba(11, 31, 58, 0.08)',
          padding: '40px 36px 32px',
        }}
      >
        <BrandMark size={48} />
        <p
          style={{
            margin: '16px 0 0',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 12,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#c62828',
            fontWeight: 600,
          }}
        >
          Creation failed
        </p>
        <Typography variant="body2" style={{ marginTop: 12, color: C.muted }}>
          {message}
        </Typography>
        {onDismiss && (
          <Button
            onClick={onDismiss}
            style={{ marginTop: 16, textTransform: 'none' }}
          >
            View creation log
          </Button>
        )}
      </div>
    </main>
  );
}
