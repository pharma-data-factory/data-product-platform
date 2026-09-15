import fs from 'node:fs';
import path from 'node:path';

const [, , templateDir, outDir] = process.argv;
if (!templateDir || !outDir) {
  console.error('Usage: node scripts/render-template.mjs <templateDir> <outDir>');
  process.exit(1);
}

const values = {
  name: 'demo-service',
  title: 'Demo Service',
  description: 'Generated for local dry-run',
  owner: 'group:default/platform-team',
  system: 'data-platform',
  domain: 'platform',
  lifecycle: 'experimental',
  version: '1.0.0',
  sourceSystems: 'none',
  interfaces: 'REST',
  dataContracts: 'health-v1',
  dependsOn: '',
  defaultTopic: 'dataprod/events',
  mqttTopic: 'pharma/temperature/+',
  // template.yaml defaults this to 'unbound' when the author picks no baseline.
  // Mirrored here so a dry run renders what the scaffolder would actually write.
  ursBaselineId: 'unbound',
  policyVersion: '1',
  templateVersion: '1.0.0',
  templateName: {
    'python-service': 'python-microservice',
    'node-service': 'nodejs-microservice',
    'mqtt-connector': 'mqtt-data-connector',
    'mqtt-temperature-product': 'mqtt-temperature-data-product',
    'rest-equipment-product': 'rest-equipment-data-product',
  }[path.basename(templateDir)] ?? path.basename(templateDir),
  destination: { owner: 'acme', repo: 'demo-service' },
};

function render(source) {
  return source.replace(/\$\{\{\s*([^}]+)\s*\}\}/g, (_match, expression) => {
    const trimmed = String(expression).trim();
    if (!trimmed.startsWith('values.')) {
      return _match;
    }
    const value = trimmed
      .replace(/^values\./, '')
      .split('.')
      .reduce((current, key) => current?.[key], values);
    return value === undefined || value === null ? '' : String(value);
  });
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const contentDir = path.join(templateDir, 'content');
for (const file of walk(contentDir)) {
  const relative = path.relative(contentDir, file);
  const target = path.join(outDir, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const raw = fs.readFileSync(file);
  if (relative.replaceAll('\\', '/').endsWith('.github/workflows/data-product-quality.yml')) {
    fs.writeFileSync(target, raw);
    continue;
  }
  fs.writeFileSync(target, render(raw.toString('utf8')));
}

console.log(`Rendered ${templateDir} -> ${outDir}`);
