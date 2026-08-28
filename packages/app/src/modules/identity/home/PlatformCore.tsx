import { BrandMark } from '../../nav/BrandMark';
import { BRAND_WORDMARK } from '../../theme/tokens';

export function PlatformCore({
  active,
  label,
  layers,
}: Readonly<{
  active: boolean;
  label: string;
  layers: readonly [string, string, string];
}>) {
  return (
    <div className={`nx-core${active ? ' nx-core-active' : ''}`}>
      <div className="nx-core-lockup">
        <BrandMark size={64} tone="onDark" />
        <span className="nx-core-wordmark">{BRAND_WORDMARK}</span>
      </div>
      <div className="nx-core-stack" aria-label={layers.join(' · ')}>
        <div className="nx-slab nx-slab-1">
          <span className="nx-slab-label">{layers[0]}</span>
        </div>
        <div className="nx-slab nx-slab-2">
          <span className="nx-slab-label">{layers[1]}</span>
        </div>
        <div className="nx-slab nx-slab-3">
          <span className="nx-slab-label">{layers[2]}</span>
        </div>
      </div>
      <span className="nx-core-label">{label}</span>
    </div>
  );
}
