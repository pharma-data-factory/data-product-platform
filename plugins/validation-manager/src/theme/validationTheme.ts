/**
 * Validation Manager Theme - Consistent with Nexora Design System
 * Same colors, fonts, and styles as the main platform
 */

export const PHARMA_NAVY = '#0A1929';
export const PHARMA_NAVY_DARK = '#05101C';
export const PHARMA_TEAL = '#00C2D9';
export const PHARMA_TEAL_LIGHT = '#5EE4F0';
export const PHARMA_TEAL_DARK = '#0098AB';

export const C = {
  base: '#F4F6F8',
  section: '#EEF2F6',
  paper: '#FFFFFF',
  card: '#FFFFFF',
  border: '#E8EEF2',
  text: '#0F172A',
  muted: '#475569',
  cloud: '#0A1929',
  factory: '#00C2D9',
  dx: '#00C2D9',
  compliance: '#0891B2',
  security: '#FF8A00',
  observability: '#0A1929',
};

/**
 * GMP Compliance Colors
 * Visual indicators for validation status
 */
export const GMP_COLORS = {
  // Approval Status
  approved: '#10B981',      // Green
  pending: '#F59E0B',       // Amber
  rejected: '#EF4444',      // Red
  signed: '#8B5CF6',        // Purple

  // GxP Relevance
  direct: '#DC2626',        // Red - Direct GMP
  indirect: '#F59E0B',      // Amber - Indirect
  claimControl: '#3B82F6',  // Blue - Claim Control
  none: '#9CA3AF',          // Gray - No GMP

  // Risk Level
  high: '#DC2626',          // Red
  medium: '#F59E0B',        // Amber
  low: '#10B981',           // Green

  // Implementation Status
  implemented: '#10B981',   // Green
  partially: '#F59E0B',     // Amber
  notImplemented: '#EF4444', // Red
  notVerified: '#9CA3AF',   // Gray

  // Version Status
  active: '#10B981',        // Green
  superseded: '#9CA3AF',    // Gray
  draft: '#F59E0B',         // Amber
  archived: '#6B7280',      // Dark Gray
};

/**
 * Validation Manager Styles
 */
export const VALIDATION_STYLES = {
  // Cards und Container
  card: {
    background: C.paper,
    border: `1px solid ${C.border}`,
    borderRadius: 16,
    boxShadow: '0 1px 2px rgba(11, 31, 58, 0.06)',
    transition: 'transform .35s cubic-bezier(.2,.8,.2,1), border-color .35s, box-shadow .35s',
    padding: 24,
  },

  cardHover: {
    transform: 'translateY(-3px)',
    background: '#F8FAFC',
    borderColor: 'rgba(11,31,58,0.16)',
  },

  // Headings
  heading: {
    fontFamily: "'Space Grotesk', Inter, sans-serif",
    fontWeight: 600,
    letterSpacing: '-0.02em',
  },

  mono: {
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  },

  // Buttons
  button: {
    primary: {
      background: `linear-gradient(135deg, ${PHARMA_NAVY}, ${PHARMA_TEAL})`,
      color: '#fff',
      fontWeight: 600,
      borderRadius: 12,
      border: 'none',
      cursor: 'pointer',
      transition: 'filter .2s',
    },

    ghost: {
      background: 'transparent',
      border: `1px solid ${C.border}`,
      color: C.text,
      fontWeight: 600,
      borderRadius: 12,
      cursor: 'pointer',
    },

    danger: {
      background: GMP_COLORS.rejected,
      color: '#fff',
      fontWeight: 600,
      borderRadius: 12,
      cursor: 'pointer',
    },
  },

  // Status Badges
  badge: {
    approved: {
      background: 'rgba(16, 185, 129, 0.1)',
      color: GMP_COLORS.approved,
      border: `1px solid ${GMP_COLORS.approved}`,
    },
    pending: {
      background: 'rgba(245, 158, 11, 0.1)',
      color: GMP_COLORS.pending,
      border: `1px solid ${GMP_COLORS.pending}`,
    },
    rejected: {
      background: 'rgba(239, 68, 68, 0.1)',
      color: GMP_COLORS.rejected,
      border: `1px solid ${GMP_COLORS.rejected}`,
    },
  },

  // Forms
  input: {
    background: C.paper,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    padding: '12px 16px',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color .2s, box-shadow .2s',
  },

  inputFocus: {
    borderColor: PHARMA_TEAL,
    boxShadow: `0 0 0 3px rgba(0, 194, 217, 0.1)`,
  },

  // Grid
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
  },

  // Table
  table: {
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    overflow: 'hidden',
  },

  tableHeader: {
    background: C.section,
    color: PHARMA_TEAL,
    fontWeight: 600,
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
    padding: '12px 14px',
  },

  tableCell: {
    padding: 14,
    borderBottom: `1px solid ${C.border}`,
    verticalAlign: 'top' as const,
  },
};

/**
 * GMP Compliance Rules Visual Indicators
 */
export const COMPLIANCE_INDICATORS = {
  versioningRequired: {
    icon: '⚠️',
    color: GMP_COLORS.pending,
    message: 'Version änderung erforderlich',
  },

  approvalRequired: {
    icon: '✓',
    color: GMP_COLORS.pending,
    message: 'Genehmigung erforderlich',
  },

  signatureRequired: {
    icon: '✍️',
    color: GMP_COLORS.pending,
    message: 'Digitale Signatur erforderlich',
  },

  changeControlRequired: {
    icon: '📋',
    color: GMP_COLORS.pending,
    message: 'Change Control Form erforderlich',
  },

  locked: {
    icon: '🔒',
    color: GMP_COLORS.signed,
    message: 'Dokumentsperrung - unveränderbar',
  },

  archived: {
    icon: '📦',
    color: GMP_COLORS.archived,
    message: 'Archiviert - für Referenz nur',
  },
};
