/**
 * Requirements API Hook
 * React Hook für API-Calls zu Requirements Management
 * GMP-Compliant with automatic versioning and audit trail
 */

import { useState, useCallback } from 'react';
import { Requirement, ChangeLogEntry, ApprovalRecord } from '../types/validation';

interface UseRequirementsOptions {
  onSuccess?: (message: string) => void;
  onError?: (error: string) => void;
}

export const useRequirements = (options?: UseRequirementsOptions) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);

  const api = '/api/validation-manager';

  /**
   * Fetch all requirements with filters
   */
  const fetchRequirements = useCallback(
    async (filters?: {
      gxpRelevance?: string[];
      riskLevel?: string[];
      requirementState?: string[];
      approvalStatus?: string[];
    }) => {
      setLoading(true);
      try {
        const query = new URLSearchParams();
        if (filters?.gxpRelevance) {
          query.append('gxpRelevance', filters.gxpRelevance.join(','));
        }
        if (filters?.riskLevel) {
          query.append('riskLevel', filters.riskLevel.join(','));
        }
        if (filters?.requirementState) {
          query.append('requirementState', filters.requirementState.join(','));
        }
        if (filters?.approvalStatus) {
          query.append('approvalStatus', filters.approvalStatus.join(','));
        }

        const response = await fetch(`${api}/requirements?${query}`);
        if (!response.ok) throw new Error('Failed to fetch requirements');

        const data = await response.json();
        setRequirements(data);
        setError(null);
        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        options?.onError?.(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  /**
   * Fetch single requirement by ID
   */
  const fetchRequirement = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${api}/requirements/${id}`);
      if (!response.ok) throw new Error('Requirement not found');

      const data = await response.json();
      setError(null);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      options?.onError?.(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create new requirement
   * Auto-creates version 1.0.0 and baseline audit log
   */
  const createRequirement = useCallback(
    async (data: Omit<Requirement, 'id' | 'version' | 'changeLog' | 'auditTrail'>) => {
      setLoading(true);
      try {
        const response = await fetch(`${api}/requirements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error('Failed to create requirement');

        const created = await response.json();
        setRequirements([...requirements, created]);
        options?.onSuccess?.('Requirement created successfully');
        setError(null);
        return created;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        options?.onError?.(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [requirements]
  );

  /**
   * Update requirement
   * Automatically determines version change type and applies GMP rules
   */
  const updateRequirement = useCallback(
    async (
      id: string,
      updates: Partial<Requirement>,
      changeType?: 'MAJOR' | 'MINOR' | 'PATCH'
    ) => {
      setLoading(true);
      try {
        const response = await fetch(`${api}/requirements/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates,
            changeType, // If not provided, backend auto-detects
          }),
        });

        if (!response.ok) throw new Error('Failed to update requirement');

        const updated = await response.json();
        setRequirements(
          requirements.map(r => (r.id === id ? updated : r))
        );
        options?.onSuccess?.(`Requirement updated (v${updated.version})`);
        setError(null);
        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        options?.onError?.(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [requirements]
  );

  /**
   * Approve requirement as reviewer
   * Moves to next approval step or marks as fully approved
   */
  const approveRequirement = useCallback(
    async (id: string, userRole: string, comment?: string) => {
      setLoading(true);
      try {
        const response = await fetch(`${api}/requirements/${id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userRole, comment }),
        });

        if (!response.ok) throw new Error('Approval failed');

        const approved = await response.json();
        setRequirements(requirements.map(r => (r.id === id ? approved : r)));
        options?.onSuccess?.(`Requirement approved by ${userRole}`);
        setError(null);
        return approved;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        options?.onError?.(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [requirements]
  );

  /**
   * Reject requirement with reason
   */
  const rejectRequirement = useCallback(
    async (id: string, userRole: string, reason: string) => {
      setLoading(true);
      try {
        const response = await fetch(`${api}/requirements/${id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userRole, reason }),
        });

        if (!response.ok) throw new Error('Rejection failed');

        const rejected = await response.json();
        setRequirements(requirements.map(r => (r.id === id ? rejected : r)));
        options?.onSuccess?.(`Requirement rejected: ${reason}`);
        setError(null);
        return rejected;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        options?.onError?.(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [requirements]
  );

  /**
   * Sign requirement (digital signature)
   * Only possible when all approvals are done
   */
  const signRequirement = useCallback(
    async (id: string, certificateId: string) => {
      setLoading(true);
      try {
        const response = await fetch(`${api}/requirements/${id}/sign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ certificateId }),
        });

        if (!response.ok) throw new Error('Signing failed');

        const signed = await response.json();
        setRequirements(requirements.map(r => (r.id === id ? signed : r)));
        options?.onSuccess?.('Requirement digitally signed and locked');
        setError(null);
        return signed;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        options?.onError?.(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [requirements]
  );

  /**
   * Archive requirement
   * Moves to archive storage, immutable
   */
  const archiveRequirement = useCallback(
    async (id: string, reason: string) => {
      setLoading(true);
      try {
        const response = await fetch(`${api}/requirements/${id}/archive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason }),
        });

        if (!response.ok) throw new Error('Archival failed');

        const archived = await response.json();
        setRequirements(requirements.map(r => (r.id === id ? archived : r)));
        options?.onSuccess?.('Requirement archived');
        setError(null);
        return archived;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        options?.onError?.(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [requirements]
  );

  /**
   * Get version history for requirement
   */
  const getVersionHistory = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${api}/requirements/${id}/history`);
      if (!response.ok) throw new Error('Failed to fetch history');

      const data = await response.json();
      setError(null);
      return data as ChangeLogEntry[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      options?.onError?.(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get audit trail for requirement
   */
  const getAuditTrail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${api}/requirements/${id}/audit`);
      if (!response.ok) throw new Error('Failed to fetch audit trail');

      const data = await response.json();
      setError(null);
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      options?.onError?.(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Get current approval status
   */
  const getApprovalStatus = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`${api}/requirements/${id}/approvals`);
      if (!response.ok) throw new Error('Failed to fetch approvals');

      const data = await response.json();
      setError(null);
      return data as ApprovalRecord[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      options?.onError?.(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    // State
    requirements,
    loading,
    error,

    // Methods
    fetchRequirements,
    fetchRequirement,
    createRequirement,
    updateRequirement,
    approveRequirement,
    rejectRequirement,
    signRequirement,
    archiveRequirement,
    getVersionHistory,
    getAuditTrail,
    getApprovalStatus,
  };
};
