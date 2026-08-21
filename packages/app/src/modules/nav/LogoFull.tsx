import { BrandMark } from './BrandMark';
import { BRAND_NAME, BRAND_WORDMARK } from '../theme/tokens';

export const LogoFull = () => {
  return (
    <div
      style={{
        alignItems: 'center',
        color: '#F2F6FC',
        display: 'flex',
        fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
        fontSize: 15,
        fontWeight: 700,
        gap: 10,
        letterSpacing: '0.08em',
        whiteSpace: 'nowrap',
      }}
      aria-label={BRAND_NAME}
    >
      <BrandMark size={28} />
      {BRAND_WORDMARK}
    </div>
  );
};
