import fs from 'fs';
import os from 'os';
import path from 'path';
import { FileCreateAuthorizationAuditStore } from './create-authorization-audit-store';
import { createEntitlementAuditEvent } from './entitlements';

describe('FileCreateAuthorizationAuditStore', () => {
  it('keeps valid records readable when the final JSONL line is torn', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-jsonl-'));
    const filePath = path.join(dir, 'create-authorization-audit.jsonl');
    const store = new FileCreateAuthorizationAuditStore(filePath);
    const first = createEntitlementAuditEvent({
      type: 'ACCESS_DENIED',
      actor: 'user:default/viewer',
      organizationId: 'internal',
      action: 'scaffolder.task.create',
      decision: 'DENY',
      detail: 'RBAC',
    });
    store.append(first);
    fs.appendFileSync(filePath, '{"type":"ACCESS_GRANTED","actor":"user:def', 'utf8');

    const events = store.list();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      actor: 'user:default/viewer',
      action: 'scaffolder.task.create',
      decision: 'DENY',
    });
    expect(store.issues()).toEqual([{ lineNumber: 2, reason: 'MALFORMED_JSON' }]);
    expect(fs.readFileSync(filePath, 'utf8')).toContain('{"type":"ACCESS_GRANTED","actor":"user:def');
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('does not promote a malformed line into a valid event', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-jsonl-'));
    const filePath = path.join(dir, 'create-authorization-audit.jsonl');
    const retained = '{"not":"an audit event but valid json"}\n{"type":true}\n';
    fs.writeFileSync(filePath, retained, 'utf8');
    const store = new FileCreateAuthorizationAuditStore(filePath);
    const events = store.list();
    expect(events).toHaveLength(0);
    expect(store.issues()).toEqual([
      { lineNumber: 1, reason: 'MALFORMED_RECORD' },
      { lineNumber: 2, reason: 'MALFORMED_RECORD' },
    ]);
    expect(fs.readFileSync(filePath, 'utf8')).toBe(retained);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
