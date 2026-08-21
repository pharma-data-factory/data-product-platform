import fs from 'fs';
import os from 'os';
import path from 'path';
import { FileCertificationOverlay, normalizeEntityRef } from './certificationOverlay';

describe('certification overlay store', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cert-overlay-'));
  const filePath = path.join(dir, 'certification-overrides.json');
  const store = new FileCertificationOverlay(filePath);

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('normalizes entity refs and persists technical status', () => {
    expect(normalizeEntityRef('component:default/cold-room')).toBe(
      'component:default/cold-room',
    );
    expect(store.getStatus('component:default/cold-room')).toBeUndefined();

    const written = store.setStatus('component:default/cold-room', 'CERTIFIED');
    expect(written.status).toBe('CERTIFIED');
    expect(store.getStatus('Component:default/Cold-Room')).toBe('CERTIFIED');

    const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    expect(saved.version).toBe(1);
    expect(saved.overrides['component:default/cold-room'].status).toBe(
      'CERTIFIED',
    );
  });
});
