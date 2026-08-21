import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');
const publicDir = path.join(ROOT, 'packages/app/public');

function readPublic(name: string): string {
  return fs.readFileSync(path.join(publicDir, name), 'utf8');
}

describe('Phase 1 brand separation', () => {
  it('uses Nexora names in the PWA shell, not Backstage', () => {
    const html = readPublic('index.html');
    const manifest = JSON.parse(readPublic('manifest.json')) as {
      name: string;
      short_name: string;
      theme_color: string;
      background_color: string;
    };

    expect(html).toContain(
      "config.getOptionalString('app.title') ?? 'Nexora'",
    );
    expect(html).not.toContain("?? 'Backstage'");
    expect(html).toContain('color="#00C2D9"');
    expect(html).not.toContain('#5bbad5');
    expect(html).toContain('/favicon.svg');
    expect(manifest.name).toBe('Nexora');
    expect(manifest.short_name).not.toMatch(/Backstage/i);
    expect(manifest.theme_color).toBe('#05101C');
    expect(manifest.background_color).toBe('#F4F6F8');
  });

  it('ships a BrandMark silhouette instead of the create-app Backstage B', () => {
    const safari = readPublic('safari-pinned-tab.svg');
    const favicon = readPublic('favicon.svg');

    expect(safari).toContain('M24 6');
    expect(safari).toContain('M15.2 33.2');
    expect(safari).not.toMatch(/Backstage/i);
    expect(favicon).toContain('#00C2D9');
    expect(favicon).toContain('#0A1929');
    expect(favicon).toContain(
      'M24 6 L39.5 14.75 L39.5 33.25 L24 42 L8.5 33.25 L8.5 14.75 Z',
    );
  });

  it('ships the favicon files referenced by index.html', () => {
    const html = readPublic('index.html');
    const files = [
      'favicon.ico',
      'favicon.svg',
      'favicon-16x16.png',
      'favicon-32x32.png',
      'apple-touch-icon.png',
      'android-chrome-192x192.png',
      'safari-pinned-tab.svg',
      'manifest.json',
    ];

    for (const file of files) {
      const full = path.join(publicDir, file);
      expect(fs.existsSync(full)).toBe(true);
      expect(fs.statSync(full).size).toBeGreaterThan(200);
    }

    expect(html).toContain('favicon.ico');
    expect(html).toContain('favicon.svg');
    expect(html).toContain('favicon-16x16.png');
    expect(html).toContain('favicon-32x32.png');
    expect(html).toContain('apple-touch-icon.png');
    expect(html).toContain('safari-pinned-tab.svg');
    expect(readPublic('manifest.json')).toContain('android-chrome-192x192.png');

    const png = fs.readFileSync(path.join(publicDir, 'apple-touch-icon.png'));
    expect(png.subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
  });

  it('does not keep unused Kubernetes or MCP create-app plugins', () => {
    const appPackage = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'packages/app/package.json'), 'utf8'),
    ) as { dependencies: Record<string, string> };
    const backendPackage = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'packages/backend/package.json'), 'utf8'),
    ) as {
      dependencies: Record<string, string>;
      scripts: Record<string, string>;
    };
    const appConfig = fs.readFileSync(
      path.join(ROOT, 'app-config.yaml'),
      'utf8',
    );
    const compose = fs.readFileSync(
      path.join(ROOT, 'docker-compose.yml'),
      'utf8',
    );

    expect(appPackage.dependencies['@backstage/plugin-kubernetes']).toBeUndefined();
    expect(
      backendPackage.dependencies['@backstage/plugin-kubernetes-backend'],
    ).toBeUndefined();
    expect(
      backendPackage.dependencies['@backstage/plugin-mcp-actions-backend'],
    ).toBeUndefined();
    expect(appConfig).not.toMatch(/^kubernetes:/m);
    expect(appConfig).not.toContain('mcpActions:');
    expect(appConfig).not.toContain('clientIdMetadataDocuments:');
    expect(backendPackage.scripts['build-image']).toContain(
      '--tag pharma-data-factory',
    );
    expect(backendPackage.scripts['build-image']).not.toContain(
      '--tag backstage',
    );
    expect(compose).toContain('image: pharma-data-factory');
  });
});
