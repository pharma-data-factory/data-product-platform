import fs from 'fs';
import path from 'path';
import type { EntitlementAuditEvent } from './entitlements';

export const CREATE_AUTHORIZATION_AUDIT_TYPES = new Set<
  EntitlementAuditEvent['type']
>([
  'ACCESS_GRANTED',
  'ACCESS_DENIED',
  'marketplace.create.allowed',
  'marketplace.create.denied',
]);

export function isCreateAuthorizationAuditEvent(
  event: EntitlementAuditEvent,
): boolean {
  return CREATE_AUTHORIZATION_AUDIT_TYPES.has(event.type);
}

/**
 * Torn / malformed JSONL behavior (not Part 11):
 * - Valid prior lines remain readable.
 * - A line that is not valid JSON is never returned as an event (MALFORMED_JSON).
 * - Valid JSON that lacks required audit fields is never returned as an event
 *   (MALFORMED_RECORD). It is not rewritten into a synthetic valid record.
 * - Those lines stay on disk (evidence is not rewritten or deleted).
 * - list() records per-line issues so administrator review can detect them.
 */
export type CreateAuthorizationAuditIssueReason =
  | 'MALFORMED_JSON'
  | 'MALFORMED_RECORD';

export interface CreateAuthorizationAuditIssue {
  lineNumber: number;
  reason: CreateAuthorizationAuditIssueReason;
}

export interface CreateAuthorizationAuditStore {
  append(event: EntitlementAuditEvent): void;
  list(): EntitlementAuditEvent[];
  issues(): CreateAuthorizationAuditIssue[];
}

export class MemoryCreateAuthorizationAuditStore
  implements CreateAuthorizationAuditStore
{
  private readonly events: EntitlementAuditEvent[] = [];

  append(event: EntitlementAuditEvent): void {
    this.events.push(event);
  }

  list(): EntitlementAuditEvent[] {
    return [...this.events];
  }

  issues(): CreateAuthorizationAuditIssue[] {
    return [];
  }
}

export class FileCreateAuthorizationAuditStore
  implements CreateAuthorizationAuditStore
{
  private lastIssues: CreateAuthorizationAuditIssue[] = [];

  constructor(private readonly filePath: string) {}

  append(event: EntitlementAuditEvent): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    fs.appendFileSync(this.filePath, `${JSON.stringify(event)}\n`, 'utf8');
  }

  list(): EntitlementAuditEvent[] {
    this.lastIssues = [];
    if (!fs.existsSync(this.filePath)) {
      return [];
    }
    const events: EntitlementAuditEvent[] = [];
    const lines = fs.readFileSync(this.filePath, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.trim().length === 0) {
        return;
      }
      const parsed = parseCreateAuthorizationAuditLine(line);
      if ('event' in parsed) {
        events.push(parsed.event);
        return;
      }
      this.lastIssues.push({
        lineNumber: index + 1,
        reason: parsed.issue,
      });
    });
    return events;
  }

  issues(): CreateAuthorizationAuditIssue[] {
    return [...this.lastIssues];
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * Accepts only objects that already look like audit events.
 * Does not invent missing fields.
 */
export function parseCreateAuthorizationAuditLine(
  line: string,
):
  | { event: EntitlementAuditEvent }
  | { issue: CreateAuthorizationAuditIssueReason } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(line);
  } catch {
    return { issue: 'MALFORMED_JSON' };
  }
  if (!isCreateAuthorizationAuditEventShape(parsed)) {
    return { issue: 'MALFORMED_RECORD' };
  }
  return { event: parsed };
}

function isCreateAuthorizationAuditEventShape(
  value: unknown,
): value is EntitlementAuditEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  if (
    !isNonEmptyString(record.type) ||
    !isNonEmptyString(record.at) ||
    !isNonEmptyString(record.actor) ||
    !isNonEmptyString(record.organizationId)
  ) {
    return false;
  }
  if (
    record.decision !== undefined &&
    record.decision !== 'GRANT' &&
    record.decision !== 'DENY'
  ) {
    return false;
  }
  return true;
}
