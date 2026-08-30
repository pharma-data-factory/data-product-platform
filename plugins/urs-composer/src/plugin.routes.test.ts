import fs from 'fs';
import path from 'path';
import { ursComposerPlugin } from './plugin';

describe('ursComposerPlugin routes', () => {
  it('exposes route refs for URS Composer pages', () => {
    expect(Object.keys(ursComposerPlugin.routes ?? {})).toEqual(
      expect.arrayContaining(['root', 'library', 'create', 'edit', 'requirementSet']),
    );
  });

  it('registers expected page paths', () => {
    const pluginSource = fs.readFileSync(path.join(__dirname, 'plugin.tsx'), 'utf8');
    expect(pluginSource).toContain("path: '/urs-composer'");
    expect(pluginSource).toContain("path: '/urs-composer/library'");
    expect(pluginSource).toContain("path: '/urs-composer/new'");
    expect(pluginSource).toContain("path: '/urs-composer/:id/edit'");
    expect(pluginSource).toContain("path: '/urs-composer/:id'");
  });
});
