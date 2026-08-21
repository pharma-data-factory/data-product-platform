import { BrandMark } from './BrandMark';

export const LogoFull = () => {
  return (
    <div
      style={{
        alignItems: 'center',
        color: '#F2F6FC',
        display: 'flex',
        fontFamily: "'Space Grotesk', Inter, Segoe UI, sans-serif",
        fontSize: 14,
        fontWeight: 600,
        gap: 10,
        letterSpacing: '-0.02em',
        whiteSpace: 'nowrap',
      }}
      aria-label="pharma-data-factory"
    >
      <BrandMark size={28} />
      pharma-data-factory
    </div>
  );
};
