import { BrandMark } from '../../nav/BrandMark';
import { BRAND_WORDMARK } from '../../theme/tokens';

export function PlatformCore({
  active,
  label,
}: Readonly<{ active: boolean; label: string }>) {
  return (
    <div className={`nx-core${active ? ' nx-core-active' : ''}`}>
      <div className="nx-core-lockup">
        <BrandMark size={64} tone="onDark" />
        <span className="nx-core-wordmark">{BRAND_WORDMARK}</span>
      </div>
      <div className="nx-core-stack" aria-hidden="true">
        <div className="nx-slab nx-slab-4" />
        <div className="nx-slab nx-slab-3" />
        <div className="nx-slab nx-slab-2" />
        <div className="nx-slab nx-slab-1" />
      </div>
      <span className="nx-core-label">{label}</span>
    </div>
  );
}
