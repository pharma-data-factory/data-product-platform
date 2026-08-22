import { BrandMark } from './BrandMark';
import { BRAND_NAME } from '../theme/tokens';

export const LogoIcon = () => {
  return (
    <div aria-label={BRAND_NAME}>
      <BrandMark size={36} />
    </div>
  );
};
