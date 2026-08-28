/**
 * Requirement Card Component
 * Display individual requirements with status, GxP assessment, and actions
 * Consistent with Nexora Design System
 */

import React from 'react';
import { PHARMA_TEAL, GMP_COLORS, VALIDATION_STYLES, C } from '../theme/validationTheme';
import { Requirement } from '../types/validation';

interface RequirementCardProps {
  requirement: Requirement;
  onEdit?: (req: Requirement) => void;
  onViewHistory?: (req: Requirement) => void;
  onGenerateDocument?: (req: Requirement) => void;
  canEdit: boolean;
}

const styles = {
  card: {
    ...VALIDATION_STYLES.card,
    cursor: 'pointer' as const,
  },

  cardHover: {
    ...VALIDATION_STYLES.cardHover,
  },

  header: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'flex-start' as const,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: `1px solid ${C.border}`,
  },

  titleSection: {
    flex: 1,
  },

  id: {
    ...VALIDATION_STYLES.mono,
    color: PHARMA_TEAL,
    marginBottom: 4,
  },

  title: {
    ...VALIDATION_STYLES.heading,
    fontSize: 16,
    color: C.text,
    margin: '0 0 8px 0',
  },

  badges: {
    display: 'flex' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },

  badge: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.05em',
  },

  badgeApproved: {
    ...VALIDATION_STYLES.badge.approved,
  },

  badgePending: {
    ...VALIDATION_STYLES.badge.pending,
  },

  badgeRejected: {
    ...VALIDATION_STYLES.badge.rejected,
  },

  content: {
    marginBottom: 16,
  },

  description: {
    fontSize: 13,
    lineHeight: 1.6,
    color: C.text,
    marginBottom: 12,
  },

  rationale: {
    fontSize: 12,
    color: C.muted,
    fontStyle: 'italic' as const,
    marginBottom: 12,
    paddingLeft: 12,
    borderLeft: `3px solid ${C.border}`,
  },

  metadata: {
    display: 'grid' as const,
    gridTemplateColumns: '1fr 1fr' as const,
    gap: 12,
    marginBottom: 12,
    paddingTop: 12,
    borderTop: `1px solid ${C.border}`,
  },

  metadataItem: {
    fontSize: 12,
  },

  metadataLabel: {
    color: C.muted,
    fontWeight: 600,
    marginBottom: 2,
  },

  metadataValue: {
    color: C.text,
    fontWeight: 500,
  },

  gxpRelevance: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
  },

  riskBadge: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingLeft: 8,
    paddingRight: 8,
    paddingTop: 4,
    paddingBottom: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
  },

  actions: {
    display: 'flex' as const,
    gap: 8,
    justifyContent: 'flex-end' as const,
  },

  button: {
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 12,
    fontWeight: 600,
    border: 'none' as const,
    cursor: 'pointer' as const,
    transition: 'all .2s',
  },

  buttonPrimary: {
    ...VALIDATION_STYLES.button.primary,
  },

  buttonGhost: {
    ...VALIDATION_STYLES.button.ghost,
  },

  lockIndicator: {
    display: 'inline-flex' as const,
    alignItems: 'center' as const,
    gap: 4,
    fontSize: 12,
    color: GMP_COLORS.signed,
    fontWeight: 600,
  },
};

const getGxPColor = (relevance: string): string => {
  switch (relevance) {
    case 'Direct':
      return GMP_COLORS.direct;
    case 'Indirect':
      return GMP_COLORS.indirect;
    case 'Claim-control':
      return GMP_COLORS.claimControl;
    default:
      return GMP_COLORS.none;
  }
};

const getRiskColor = (level: string): string => {
  switch (level) {
    case 'High':
      return GMP_COLORS.high;
    case 'Medium':
      return GMP_COLORS.medium;
    case 'Low':
      return GMP_COLORS.low;
    default:
      return C.muted;
  }
};

const getApprovalStatus = (req: Requirement): {
  icon: string;
  label: string;
  style: React.CSSProperties;
} => {
  const pendingCount = req.approvals.filter(a => a.status === 'PENDING').length;
  const rejectedCount = req.approvals.filter(a => a.status === 'REJECTED').length;

  if (rejectedCount > 0) {
    return {
      icon: '❌',
      label: `Rejected (${rejectedCount})`,
      style: VALIDATION_STYLES.badge.rejected,
    };
  }

  if (pendingCount > 0) {
    return {
      icon: '⏳',
      label: `Pending (${pendingCount})`,
      style: VALIDATION_STYLES.badge.pending,
    };
  }

  return {
    icon: '✅',
    label: 'Approved',
    style: VALIDATION_STYLES.badge.approved,
  };
};

export const RequirementCard: React.FC<RequirementCardProps> = ({
  requirement,
  onEdit,
  onViewHistory,
  onGenerateDocument,
  canEdit,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const approvalStatus = getApprovalStatus(requirement);
  const isLocked = requirement.signature?.status === 'SIGNED';
  const gxpColor = getGxPColor(requirement.gxpRelevance);
  const riskColor = getRiskColor(requirement.riskLevel);

  return (
    <div
      style={{
        ...styles.card,
        ...(isHovered ? styles.cardHover : {}),
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleSection}>
          <div style={styles.id}>{requirement.id}</div>
          <h3 style={styles.title}>{requirement.title}</h3>
        </div>
        {isLocked && (
          <div style={styles.lockIndicator}>
            🔒 Signed
          </div>
        )}
      </div>

      {/* Badges */}
      <div style={styles.badges}>
        <div style={{ ...styles.badge, ...approvalStatus.style }}>
          {approvalStatus.icon} {approvalStatus.label}
        </div>
        <div
          style={{
            ...styles.gxpRelevance,
            background: `${gxpColor}20`,
            color: gxpColor,
            border: `1px solid ${gxpColor}`,
          }}
        >
          {requirement.gxpRelevance}
        </div>
        <div style={{ ...styles.riskBadge, background: riskColor }}>
          Risk: {requirement.riskLevel}
        </div>
      </div>

      {/* Content */}
      <div style={styles.content}>
        <p style={styles.description}>{requirement.description}</p>
        <div style={styles.rationale}>
          <strong>Rationale:</strong> {requirement.rationale}
        </div>

        {/* Metadata */}
        <div style={styles.metadata}>
          <div style={styles.metadataItem}>
            <div style={styles.metadataLabel}>State</div>
            <div style={styles.metadataValue}>{requirement.requirementState}</div>
          </div>
          <div style={styles.metadataItem}>
            <div style={styles.metadataLabel}>Version</div>
            <div style={styles.metadataValue}>{requirement.version}</div>
          </div>
          <div style={styles.metadataItem}>
            <div style={styles.metadataLabel}>Implementation</div>
            <div style={styles.metadataValue}>{requirement.implementationStatus}</div>
          </div>
          <div style={styles.metadataItem}>
            <div style={styles.metadataLabel}>Verification</div>
            <div style={styles.metadataValue}>{requirement.verificationStatus}</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={styles.actions}>
        {onViewHistory && (
          <button
            style={styles.buttonGhost}
            onClick={() => onViewHistory(requirement)}
            title="View version history"
          >
            📋 History
          </button>
        )}

        {onGenerateDocument && (
          <button
            style={styles.buttonGhost}
            onClick={() => onGenerateDocument(requirement)}
            title="Generate PDF document"
          >
            📄 Document
          </button>
        )}

        {canEdit && !isLocked && onEdit && (
          <button
            style={styles.buttonPrimary}
            onClick={() => onEdit(requirement)}
          >
            ✏️ Edit
          </button>
        )}

        {isLocked && (
          <button style={{ ...styles.button, opacity: 0.5, cursor: 'not-allowed' }}>
            🔒 Locked
          </button>
        )}
      </div>
    </div>
  );
};
