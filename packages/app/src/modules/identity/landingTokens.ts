import {
  C,
  PHARMA_NAVY,
  PHARMA_NAVY_DARK,
  PHARMA_TEAL,
  PHARMA_TEAL_LIGHT,
} from '../theme/tokens';

export {
  BRAND_NAME,
  BRAND_WORDMARK,
  C,
  PHARMA_NAVY,
  PHARMA_NAVY_DARK,
  PHARMA_PAPER,
  PHARMA_SURFACE,
  PHARMA_TEAL,
  PHARMA_TEAL_DARK,
  PHARMA_TEAL_LIGHT,
  PHARMA_TEXT,
} from '../theme/tokens';

/** Public surfaces use the same Nexora navy + cyan as the Control Plane theme. */
export const LANDING = {
  heroFrom: PHARMA_NAVY_DARK,
  heroTo: PHARMA_NAVY,
  teal: PHARMA_TEAL,
  mint: PHARMA_TEAL_LIGHT,
  section: C.section,
} as const;
