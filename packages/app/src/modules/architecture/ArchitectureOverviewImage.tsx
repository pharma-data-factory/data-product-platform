import {
  NEXORA_NAVY_DARK,
} from '@internal/plugin-nexora-common';
import {
  ARCHITECTURE_OVERVIEW_IMAGE_ALT,
  ARCHITECTURE_OVERVIEW_IMAGE_SRC,
} from './constants';

export function ArchitectureOverviewImage({
  priority = false,
}: {
  priority?: boolean;
}) {
  return (
    <img
      src={ARCHITECTURE_OVERVIEW_IMAGE_SRC}
      alt={ARCHITECTURE_OVERVIEW_IMAGE_ALT}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      width={1376}
      height={768}
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        aspectRatio: '1376 / 768',
        objectFit: 'contain',
        background: NEXORA_NAVY_DARK,
      }}
    />
  );
}
