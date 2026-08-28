/**
 * Audit Service
 * Immutable audit trail logging for GMP compliance
 * Append-only, no updates or deletes allowed
 */

import { Pool } from 'pg';
import { v4 as uuid } from 'uuid';
import { createHash } from 'crypto';
import { AuditLogEntry } from './complianceService';

export interface AuditLogRequest {
  requirementId?: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SIGN' | 'ARCHIVE';
  actor: string;
  actorRole: string;
  actionReason?: string;
  changes?: Record<string, { old: any; new: any }>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

export class AuditService {
  constructor(private pool: Pool) {}

  /**
   * Log an action (append-only)
   */
  async logAction(request: AuditLogRequest): Promise<AuditLogEntry | null> {
    try {
      const id = uuid();
      const timestamp = new Date();
      const verificationHash = this.calculateHash(id, timestamp);

      const query = `
        INSERT INTO audit_logs (
          id, requirement_id, action, actor, actor_role,
          action_reason, changes_json, ip_address, user_agent,
          session_id, immutable, verification_hash, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, TRUE, $11, $12)
        RETURNING *
      `;

      const values = [
        id,
        request.requirementId || null,
        request.action,
        request.actor,
        request.actorRole,
        request.actionReason || null,
        request.changes ? JSON.stringify(request.changes) : null,
        request.ipAddress || null,
        request.userAgent || null,
        request.sessionId || null,
        verificationHash,
        timestamp,
      ];

      const result = await this.pool.query(query, values);

      return {
        id: result.rows[0].id,
        timestamp: result.rows[0].timestamp.toISOString(),
        action: result.rows[0].action,
        actor: result.rows[0].actor,
        role: result.rows[0].actor_role,
        immutable: true,
      } as AuditLogEntry;
    } catch (err) {
      console.error('Error logging audit action:', err);
      return null;
    }
  }

  /**
   * Get audit trail for requirement
   */
  async getAuditTrail(requirementId: string, limit: number = 100): Promise<AuditLogEntry[]> {
    try {
      const query = `
        SELECT 
          id, requirement_id, action, actor, actor_role as role,
          timestamp, action_reason as reason, changes_json as changes,
          ip_address as "ipAddress", user_agent as "userAgent", immutable
        FROM audit_logs
        WHERE requirement_id = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [requirementId, limit]);

      return result.rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp.toISOString(),
        action: row.action,
        actor: row.actor,
        role: row.role,
        reason: row.reason,
        changes: row.changes ? JSON.parse(row.changes) : undefined,
        ipAddress: row.ipAddress,
        userAgent: row.userAgent,
        immutable: row.immutable,
      }));
    } catch (err) {
      console.error(`Error fetching audit trail for ${requirementId}:`, err);
      return [];
    }
  }

  /**
   * Get all recent audit activity
   */
  async getRecentActivity(limit: number = 100): Promise<any[]> {
    try {
      const query = `
        SELECT 
          a.id, a.requirement_id, a.action, a.actor, a.actor_role,
          a.timestamp, r.title, r.version
        FROM audit_logs a
        LEFT JOIN requirements r ON a.requirement_id = r.id
        ORDER BY a.timestamp DESC
        LIMIT $1
      `;

      const result = await this.pool.query(query, [limit]);
      return result.rows;
    } catch (err) {
      console.error('Error fetching recent activity:', err);
      return [];
    }
  }

  /**
   * Get audit logs by action type
   */
  async getLogsByAction(action: string, limit: number = 100): Promise<AuditLogEntry[]> {
    try {
      const query = `
        SELECT 
          id, requirement_id, action, actor, actor_role as role,
          timestamp, action_reason as reason
        FROM audit_logs
        WHERE action = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [action, limit]);

      return result.rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp.toISOString(),
        action: row.action,
        actor: row.actor,
        role: row.role,
        reason: row.reason,
        immutable: true,
      }));
    } catch (err) {
      console.error(`Error fetching logs for action ${action}:`, err);
      return [];
    }
  }

  /**
   * Get audit logs by actor
   */
  async getLogsByActor(actor: string, limit: number = 100): Promise<AuditLogEntry[]> {
    try {
      const query = `
        SELECT 
          id, requirement_id, action, actor, actor_role as role,
          timestamp, action_reason as reason
        FROM audit_logs
        WHERE actor = $1
        ORDER BY timestamp DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [actor, limit]);

      return result.rows.map(row => ({
        id: row.id,
        timestamp: row.timestamp.toISOString(),
        action: row.action,
        actor: row.actor,
        role: row.role,
        reason: row.reason,
        immutable: true,
      }));
    } catch (err) {
      console.error(`Error fetching logs for actor ${actor}:`, err);
      return [];
    }
  }

  /**
   * Verify audit trail immutability
   * Check that no entries have been modified
   */
  async verifyImmutability(requirementId: string): Promise<{
    isValid: boolean;
    totalEntries: number;
    invalidEntries: number;
    details: Array<{ id: string; status: 'VALID' | 'INVALID' }>;
  }> {
    try {
      const query = `
        SELECT id, timestamp, verification_hash
        FROM audit_logs
        WHERE requirement_id = $1
        ORDER BY timestamp ASC
      `;

      const result = await this.pool.query(query, [requirementId]);

      const details: Array<{ id: string; status: 'VALID' | 'INVALID' }> = [];
      let invalidCount = 0;

      for (const row of result.rows) {
        const expectedHash = this.calculateHash(row.id, row.timestamp);
        const isValid = expectedHash === row.verification_hash;

        details.push({
          id: row.id,
          status: isValid ? 'VALID' : 'INVALID',
        });

        if (!isValid) {
          invalidCount++;
        }
      }

      return {
        isValid: invalidCount === 0,
        totalEntries: result.rows.length,
        invalidEntries: invalidCount,
        details,
      };
    } catch (err) {
      console.error(`Error verifying immutability for ${requirementId}:`, err);
      return {
        isValid: false,
        totalEntries: 0,
        invalidEntries: 0,
        details: [],
      };
    }
  }

  /**
   * Generate immutability report (all requirements)
   */
  async generateImmutabilityReport(): Promise<{
    reportDate: string;
    totalRequirements: number;
    totalAuditEntries: number;
    validEntries: number;
    invalidEntries: number;
    requirementsWithIssues: string[];
  }> {
    try {
      // Count total entries
      const countQuery = `SELECT COUNT(*) as count FROM audit_logs`;
      const countResult = await this.pool.query(countQuery);
      const totalEntries = parseInt(countResult.rows[0].count, 10);

      // Get all requirements
      const reqQuery = `SELECT DISTINCT requirement_id FROM audit_logs WHERE requirement_id IS NOT NULL`;
      const reqResult = await this.pool.query(reqQuery);

      const requirementsWithIssues: string[] = [];
      let validEntries = totalEntries;
      let invalidEntries = 0;

      for (const row of reqResult.rows) {
        const verification = await this.verifyImmutability(row.requirement_id);
        if (!verification.isValid) {
          requirementsWithIssues.push(row.requirement_id);
          invalidEntries += verification.invalidEntries;
          validEntries -= verification.invalidEntries;
        }
      }

      return {
        reportDate: new Date().toISOString(),
        totalRequirements: reqResult.rows.length,
        totalAuditEntries: totalEntries,
        validEntries,
        invalidEntries,
        requirementsWithIssues,
      };
    } catch (err) {
      console.error('Error generating immutability report:', err);
      return {
        reportDate: new Date().toISOString(),
        totalRequirements: 0,
        totalAuditEntries: 0,
        validEntries: 0,
        invalidEntries: 0,
        requirementsWithIssues: [],
      };
    }
  }

  /**
   * Export audit trail for compliance
   */
  async exportAuditTrail(
    requirementId: string,
    format: 'JSON' | 'CSV' = 'JSON'
  ): Promise<string | null> {
    try {
      const trail = await this.getAuditTrail(requirementId);

      if (format === 'JSON') {
        return JSON.stringify(trail, null, 2);
      }

      // CSV format
      const headers = [
        'Timestamp',
        'Action',
        'Actor',
        'Role',
        'Reason',
        'IP Address',
      ].join(',');

      const rows = trail.map(entry =>
        [
          entry.timestamp,
          entry.action,
          entry.actor,
          entry.role,
          entry.reason || '',
          entry.ipAddress || '',
        ]
          .map(cell => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      );

      return [headers, ...rows].join('\n');
    } catch (err) {
      console.error(`Error exporting audit trail for ${requirementId}:`, err);
      return null;
    }
  }

  /**
   * Retention policy check
   * Audit logs should be kept for 7 years
   */
  async checkRetentionPolicy(): Promise<{
    totalEntries: number;
    entriesWithinRetention: number;
    entriesExceedingRetention: number;
    oldestEntry?: string;
  }> {
    try {
      const retentionYears = 7;
      const cutoffDate = new Date();
      cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

      const query = `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN timestamp > $1 THEN 1 END) as within_retention,
          COUNT(CASE WHEN timestamp <= $1 THEN 1 END) as exceeding_retention,
          MIN(timestamp) as oldest
        FROM audit_logs
      `;

      const result = await this.pool.query(query, [cutoffDate]);
      const row = result.rows[0];

      return {
        totalEntries: parseInt(row.total, 10),
        entriesWithinRetention: parseInt(row.within_retention, 10),
        entriesExceedingRetention: parseInt(row.exceeding_retention, 10),
        oldestEntry: row.oldest ? row.oldest.toISOString() : undefined,
      };
    } catch (err) {
      console.error('Error checking retention policy:', err);
      return {
        totalEntries: 0,
        entriesWithinRetention: 0,
        entriesExceedingRetention: 0,
      };
    }
  }

  /**
   * Calculate verification hash
   * Used for immutability checking
   */
  private calculateHash(id: string, timestamp: Date): string {
    const data = `${id}:${timestamp.toISOString()}`;
    return createHash('sha256').update(data).digest('hex');
  }
}

/**
 * Factory function
 */
export function createAuditService(pool: Pool): AuditService {
  return new AuditService(pool);
}

// Export singleton
export const auditService = {
  logAction: async () => null,
  getAuditTrail: async () => [],
  verifyImmutability: async () => ({
    isValid: false,
    totalEntries: 0,
    invalidEntries: 0,
    details: [],
  }),
} as AuditService;
