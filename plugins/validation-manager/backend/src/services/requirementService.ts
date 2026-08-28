/**
 * Requirement Service
 * CRUD operations for requirements with GMP rules enforcement
 */

import { Pool, QueryResult } from 'pg';
import { v4 as uuid } from 'uuid';
import { Requirement, ChangeLogEntry } from './complianceService';
import { approvalService } from './approvalService';
import { auditService } from './auditService';
import { complianceService } from './complianceService';

export class RequirementService {
  constructor(private pool: Pool) {}

  /**
   * Create new requirement
   * Auto-initializes: version 1.0.0, approval chain, audit trail
   */
  async createRequirement(
    data: Omit<Requirement, 'id' | 'version' | 'changeLog' | 'approvals' | 'auditTrail'>,
    userId: string,
    userRole: string
  ): Promise<{
    success: boolean;
    requirement?: Requirement;
    error?: string;
  }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const requirementId = `URS-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      const version = '1.0.0';
      const documentId = `DOC-${new Date().getFullYear()}-URS-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;

      // 1. Insert requirement
      const requirementQuery = `
        INSERT INTO requirements (
          id, version, title, description, rationale,
          gxp_relevance, risk_level, business_criticality,
          requirement_state, implementation_status, verification_status,
          document_id, created_by, last_modified_by, document_status,
          retention_period, access_control, created_date, last_modified_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING *
      `;

      const requirementValues = [
        requirementId,
        version,
        data.title,
        data.description,
        data.rationale,
        data.gxpRelevance,
        data.riskLevel,
        data.businessCriticality || 'Medium',
        'OPEN_POLICY_DEFINITION', // Initial state
        'NOT_VERIFIED',
        'NOT_EXECUTED',
        documentId,
        userId,
        userId,
        'DRAFT',
        '3 years',
        JSON.stringify(['QA_LEAD', 'VALIDATION_LEAD', 'LEGAL', 'PLATFORM_ADMIN']), // Default access
      ];

      const requirementResult = await client.query(requirementQuery, requirementValues);
      const requirement = requirementResult.rows[0];

      // 2. Create approval records (4-step chain)
      const approvalChain = approvalService.createApprovalRecords();
      for (let i = 0; i < approvalChain.length; i++) {
        const approval = approvalChain[i];
        const approvalId = uuid();
        const approvalQuery = `
          INSERT INTO approval_records (
            id, requirement_id, role, sequence_order, status, created_date
          ) VALUES ($1, $2, $3, $4, $5, NOW())
        `;
        await client.query(approvalQuery, [
          approvalId,
          requirementId,
          approval.role,
          i + 1,
          'PENDING',
        ]);
      }

      // 3. Create initial changelog entry
      const changeLogId = uuid();
      const changeLogQuery = `
        INSERT INTO change_logs (
          id, requirement_id, version, change_description,
          change_type, author, author_role, reason, change_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `;
      await client.query(changeLogQuery, [
        changeLogId,
        requirementId,
        version,
        'Initial baseline',
        'MAJOR',
        userId,
        userRole,
        'Initial requirement creation',
      ]);

      // 4. Create audit log entry
      const auditId = uuid();
      const auditQuery = `
        INSERT INTO audit_logs (
          id, requirement_id, action, actor, actor_role,
          action_reason, changes_json, timestamp, immutable, verification_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), TRUE, $8)
      `;

      const auditHash = complianceService.calculateDocumentHash({
        ...requirement,
        approvals: approvalChain,
      } as any);

      const changes = {
        created: true,
        title: data.title,
        gxpRelevance: data.gxpRelevance,
        riskLevel: data.riskLevel,
      };

      await client.query(auditQuery, [
        auditId,
        requirementId,
        'CREATE',
        userId,
        userRole,
        'Initial requirement creation',
        JSON.stringify(changes),
        auditHash,
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        requirement: {
          ...requirement,
          version,
          changeLog: [
            {
              version,
              date: new Date().toISOString(),
              change: 'Initial baseline',
              changeType: 'MAJOR',
              author: userId,
            },
          ],
          approvals: approvalChain,
          auditTrail: [],
        },
      };
    } catch (err) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Failed to create requirement: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get requirement by ID
   */
  async getRequirement(id: string): Promise<Requirement | null> {
    try {
      const query = `
        SELECT r.*, 
               json_agg(json_build_object('role', ar.role, 'status', ar.status, 'date', ar.approval_date)) as approvals,
               json_agg(json_build_object('version', cl.version, 'date', cl.change_date, 'change', cl.change_description, 'changeType', cl.change_type, 'author', cl.author)) as change_log
        FROM requirements r
        LEFT JOIN approval_records ar ON r.id = ar.requirement_id
        LEFT JOIN change_logs cl ON r.id = cl.requirement_id
        WHERE r.id = $1
        GROUP BY r.id
      `;

      const result = await this.pool.query(query, [id]);
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (err) {
      console.error(`Error fetching requirement ${id}:`, err);
      return null;
    }
  }

  /**
   * List requirements with filters
   */
  async listRequirements(
    filters?: {
      gxpRelevance?: string[];
      riskLevel?: string[];
      requirementState?: string[];
      approvalStatus?: string[];
      createdBy?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    total: number;
    requirements: Requirement[];
  }> {
    try {
      let whereClause = '1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.gxpRelevance?.length) {
        whereClause += ` AND gxp_relevance = ANY($${paramIndex})`;
        params.push(filters.gxpRelevance);
        paramIndex++;
      }

      if (filters?.riskLevel?.length) {
        whereClause += ` AND risk_level = ANY($${paramIndex})`;
        params.push(filters.riskLevel);
        paramIndex++;
      }

      if (filters?.requirementState?.length) {
        whereClause += ` AND requirement_state = ANY($${paramIndex})`;
        params.push(filters.requirementState);
        paramIndex++;
      }

      if (filters?.createdBy) {
        whereClause += ` AND created_by = $${paramIndex}`;
        params.push(filters.createdBy);
        paramIndex++;
      }

      const countQuery = `SELECT COUNT(*) as total FROM requirements WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total, 10);

      const limit = filters?.limit || 20;
      const offset = filters?.offset || 0;

      const query = `
        SELECT * FROM requirements
        WHERE ${whereClause}
        ORDER BY last_modified_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const listParams = [...params, limit, offset];
      const result = await this.pool.query(query, listParams);

      return {
        total,
        requirements: result.rows,
      };
    } catch (err) {
      console.error('Error listing requirements:', err);
      return { total: 0, requirements: [] };
    }
  }

  /**
   * Update requirement (with GMP validation)
   * Auto-detects version change type (MAJOR/MINOR/PATCH)
   */
  async updateRequirement(
    id: string,
    updates: Partial<Requirement>,
    userId: string,
    userRole: string
  ): Promise<{
    success: boolean;
    requirement?: Requirement;
    changeType?: 'MAJOR' | 'MINOR' | 'PATCH';
    requiresApproval?: boolean;
    error?: string;
  }> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Get current requirement
      const currentResult = await client.query('SELECT * FROM requirements WHERE id = $1', [id]);
      if (currentResult.rows.length === 0) {
        return { success: false, error: 'Requirement not found' };
      }

      const current = currentResult.rows[0];

      // 2. Determine change type
      const tempReq = { ...current, ...updates };
      const changeInfo = complianceService.getRequiredChangeControl(current, tempReq);

      // 3. Calculate new version
      const newVersion = complianceService.getNextVersion(current.version, changeInfo.changeType);

      // 4. Validate compliance
      const validation = complianceService.validateRequirementBeforePublish({
        ...tempReq,
        version: newVersion,
      } as any);

      if (!validation.isValid && changeInfo.changeType !== 'PATCH') {
        return {
          success: false,
          error: `Validation failed: ${validation.violations.join(', ')}`,
        };
      }

      // 5. Update requirement
      const updateQuery = `
        UPDATE requirements SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          rationale = COALESCE($3, rationale),
          gxp_relevance = COALESCE($4, gxp_relevance),
          risk_level = COALESCE($5, risk_level),
          business_criticality = COALESCE($6, business_criticality),
          version = $7,
          last_modified_by = $8,
          last_modified_date = NOW()
        WHERE id = $9
        RETURNING *
      `;

      const updateValues = [
        updates.title || null,
        updates.description || null,
        updates.rationale || null,
        updates.gxpRelevance || null,
        updates.riskLevel || null,
        updates.businessCriticality || null,
        newVersion,
        userId,
        id,
      ];

      const updateResult = await client.query(updateQuery, updateValues);
      const updated = updateResult.rows[0];

      // 6. Create changelog entry
      const changeLogId = uuid();
      const changeLogQuery = `
        INSERT INTO change_logs (
          id, requirement_id, version, change_description,
          change_type, author, author_role, affected_fields, change_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `;

      await client.query(changeLogQuery, [
        changeLogId,
        id,
        newVersion,
        `Updated: ${changeInfo.affectedAreas.join(', ')}`,
        changeInfo.changeType,
        userId,
        userRole,
        JSON.stringify(changeInfo.affectedAreas),
      ]);

      // 7. For MAJOR changes: auto-create Change Control Form
      if (changeInfo.changeType === 'MAJOR') {
        const ccNumber = `CC-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`;
        const ccQuery = `
          INSERT INTO change_control_forms (
            id, cc_number, requirement_id, change_type, description,
            justification, status, created_by, created_date, affected_areas
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), $9)
        `;

        await client.query(ccQuery, [
          uuid(),
          ccNumber,
          id,
          changeInfo.changeType,
          `${changeInfo.affectedAreas.join(', ')}`,
          'Auto-created on requirement update',
          'DRAFT',
          userId,
          JSON.stringify(changeInfo.affectedAreas),
        ]);
      }

      // 8. Reset approvals for MAJOR changes
      if (changeInfo.changeType === 'MAJOR') {
        const resetQuery = `
          UPDATE approval_records
          SET status = 'PENDING', approval_date = NULL, comment = NULL
          WHERE requirement_id = $1
        `;
        await client.query(resetQuery, [id]);
      }

      // 9. Create audit log
      const auditId = uuid();
      const auditQuery = `
        INSERT INTO audit_logs (
          id, requirement_id, action, actor, actor_role,
          action_reason, changes_json, timestamp, immutable, verification_hash
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), TRUE, $8)
      `;

      const changes: Record<string, any> = {};
      if (updates.title) changes.title = { old: current.title, new: updates.title };
      if (updates.description) changes.description = { old: current.description, new: updates.description };
      if (updates.gxpRelevance) changes.gxpRelevance = { old: current.gxp_relevance, new: updates.gxpRelevance };
      if (updates.riskLevel) changes.riskLevel = { old: current.risk_level, new: updates.riskLevel };

      await client.query(auditQuery, [
        auditId,
        id,
        'UPDATE',
        userId,
        userRole,
        `Version ${newVersion}: ${changeInfo.changeType}`,
        JSON.stringify(changes),
        complianceService.calculateDocumentHash(updated as any),
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        requirement: updated,
        changeType: changeInfo.changeType,
        requiresApproval: changeInfo.requiresApproval,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: `Failed to update requirement: ${err instanceof Error ? err.message : 'Unknown error'}`,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Get version history for requirement
   */
  async getVersionHistory(id: string): Promise<ChangeLogEntry[]> {
    try {
      const query = `
        SELECT 
          version, change_date as date, change_description as change,
          change_type as "changeType", author, change_control_form as "changeControlForm"
        FROM change_logs
        WHERE requirement_id = $1
        ORDER BY change_date DESC
      `;

      const result = await this.pool.query(query, [id]);
      return result.rows;
    } catch (err) {
      console.error(`Error fetching history for ${id}:`, err);
      return [];
    }
  }

  /**
   * Get audit trail for requirement
   */
  async getAuditTrail(id: string): Promise<any[]> {
    try {
      const query = `
        SELECT 
          id, requirement_id, action, actor, actor_role,
          timestamp, action_reason, changes_json, ip_address, user_agent
        FROM audit_logs
        WHERE requirement_id = $1
        ORDER BY timestamp DESC
      `;

      const result = await this.pool.query(query, [id]);
      return result.rows;
    } catch (err) {
      console.error(`Error fetching audit trail for ${id}:`, err);
      return [];
    }
  }

  /**
   * Check if requirement can be edited (not locked)
   */
  async canEditRequirement(id: string, userRole: string): Promise<boolean> {
    try {
      const query = `
        SELECT document_status, access_control FROM requirements WHERE id = $1
      `;

      const result = await this.pool.query(query, [id]);
      if (result.rows.length === 0) return false;

      const { document_status, access_control } = result.rows[0];

      // Cannot edit locked documents
      if (document_status === 'SIGNED' || document_status === 'ARCHIVED') {
        return false;
      }

      // Check access control
      const roles = JSON.parse(access_control || '[]');
      return roles.includes(userRole) || userRole === 'PLATFORM_ADMIN';
    } catch (err) {
      console.error(`Error checking edit permission for ${id}:`, err);
      return false;
    }
  }

  /**
   * Archive requirement
   */
  async archiveRequirement(id: string, userId: string, reason: string): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update status
      const updateQuery = `
        UPDATE requirements
        SET document_status = 'ARCHIVED',
            archive_until_date = CURRENT_DATE + INTERVAL '7 years',
            last_modified_by = $2,
            last_modified_date = NOW()
        WHERE id = $1
      `;

      await client.query(updateQuery, [id, userId]);

      // Create audit log
      const auditId = uuid();
      const auditQuery = `
        INSERT INTO audit_logs (
          id, requirement_id, action, actor, action_reason,
          timestamp, immutable, verification_hash
        ) VALUES ($1, $2, $3, $4, $5, NOW(), TRUE, $6)
      `;

      await client.query(auditQuery, [
        auditId,
        id,
        'ARCHIVE',
        userId,
        reason,
        uuid(),
      ]);

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Error archiving requirement ${id}:`, err);
      return false;
    } finally {
      client.release();
    }
  }
}

/**
 * Factory function
 */
export function createRequirementService(pool: Pool): RequirementService {
  return new RequirementService(pool);
}
