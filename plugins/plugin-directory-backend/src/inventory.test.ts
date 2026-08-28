import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  buildSummary,
  discoverPlugins,
  filterPlugins,
  resolveWorkspaceRoot,
} from './inventory';

describe('plugin directory inventory', () => {
  const workspaceRoot = resolveWorkspaceRoot(path.join(__dirname, '../../..'));

  it('resolves the monorepo workspace root', () => {
    expect(fs.existsSync(path.join(workspaceRoot, 'backstage.json'))).toBe(true);
    expect(fs.existsSync(path.join(workspaceRoot, 'plugins'))).toBe(true);
  });

  it('discovers workspace plugins and distinguishes runtime loaded', () => {
    const items = discoverPlugins({ workspaceRoot });
    expect(items.length).toBeGreaterThan(5);

    const validation = items.find(item => item.id === 'validation-expert');
    expect(validation).toBeDefined();
    expect(validation?.type).toBe('VALIDATION');
    expect(validation?.validationStatus).toBe('NOT_VALIDATED');
    expect(validation?.frontendLoaded).toBe(true);
    expect(validation?.backendLoaded).toBe(true);
    expect(validation?.runtimeLoaded).toBe(true);
    expect(validation?.presentInWorkspace).toBe(true);

    const core = items.find(item => item.id === 'backstage-core');
    expect(core?.source).toBe('BACKSTAGE_CORE');
    expect(core?.validationStatus).toBe('NOT_APPLICABLE');
  });

  it('does not treat VALIDATED from presence alone', () => {
    const items = discoverPlugins({ workspaceRoot });
    expect(items.every(item => item.validationStatus !== 'VALIDATED')).toBe(true);
  });

  it('filters by type and search', () => {
    const items = discoverPlugins({ workspaceRoot });
    const filtered = filterPlugins(items, { type: 'VALIDATION', q: 'expert' });
    expect(filtered.map(item => item.id)).toContain('validation-expert');
  });

  it('builds summary counts', () => {
    const items = discoverPlugins({ workspaceRoot });
    const summary = buildSummary(items, '1.53.0');
    expect(summary.total).toBe(items.length);
    expect(summary.enabled).toBeGreaterThan(0);
    expect(summary.validationRelevant).toBeGreaterThan(0);
    expect(summary.backstageCoreVersion).toBe('1.53.0');
  });

  it('handles malformed plugin.yaml without failing discovery', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pd-manifest-'));
    const pluginDir = path.join(tmp, 'plugins', 'sample-plugin');
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(tmp, 'backstage.json'),
      JSON.stringify({ version: '1.0.0' }),
    );
    fs.mkdirSync(path.join(tmp, 'packages', 'app', 'src'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'packages', 'backend', 'src'), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(tmp, 'packages', 'app', 'package.json'),
      JSON.stringify({ dependencies: {} }),
    );
    fs.writeFileSync(
      path.join(tmp, 'packages', 'backend', 'package.json'),
      JSON.stringify({ dependencies: {} }),
    );
    fs.writeFileSync(path.join(tmp, 'packages', 'app', 'src', 'App.tsx'), '');
    fs.writeFileSync(
      path.join(tmp, 'packages', 'backend', 'src', 'index.ts'),
      '',
    );
    fs.writeFileSync(
      path.join(pluginDir, 'package.json'),
      JSON.stringify({
        name: '@internal/plugin-sample-plugin',
        version: '0.0.1',
        backstage: { role: 'frontend-plugin', pluginId: 'sample-plugin' },
      }),
    );
    fs.writeFileSync(path.join(pluginDir, 'plugin.yaml'), ':::not-yaml');

    const warns: string[] = [];
    const items = discoverPlugins({
      workspaceRoot: tmp,
      logger: { warn: message => warns.push(message) },
    });
    expect(items.some(item => item.id === 'sample-plugin')).toBe(true);
    expect(warns.length).toBeGreaterThan(0);
  });
});
