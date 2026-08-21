import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '../../..');

function read(relative: string): string {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

describe('OEE Pilot Integration Proof', () => {
  it('ships a generator, Test MES, Mosquitto, and publisher without Kubernetes', () => {
    const compose = read('pilot/oee/docker-compose.yml');
    expect(fs.existsSync(path.join(ROOT, 'pilot/oee/generate.py'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'pilot/oee/test-mes/test_mes.py'))).toBe(
      true,
    );
    expect(fs.existsSync(path.join(ROOT, 'pilot/oee/publisher/publish.py'))).toBe(
      true,
    );
    expect(compose).toContain('mosquitto');
    expect(compose).toContain('test-mes');
    expect(compose).toContain('generated/pilot-oee-line-01');
    expect(compose).not.toMatch(/^\s+uns:/m);
    expect(compose).not.toContain('image: grafana');
    expect(compose).not.toContain('bitnami/kafka');
    expect(read('pilot/oee/mosquitto/mosquitto.conf')).toContain('PILOT-LOCAL');
    expect(read('pilot/oee/mosquitto/mosquitto.conf')).toContain(
      'allow_anonymous true',
    );
  });

  it('does not fake a live GitHub Actions proof', () => {
    const marker = read('pilot/oee/GITHUB_LIVE_PROOF_NOT_RUN');
    expect(marker).toContain('GITHUB_LIVE_PROOF_NOT_RUN');
    expect(read('docs/developer/oee-github-integration-test.md')).toContain(
      'GITHUB_LIVE_PROOF_NOT_RUN',
    );
  });

  it('registers the generated pilot as PILOT / TEST in the sample Catalog only', () => {
    const samples = read('catalog/samples/entities.yaml');
    const production = read('catalog/entities.yaml');
    expect(samples).toContain('name: pilot-oee-line-01');
    expect(samples).toContain('PILOT / TEST');
    expect(samples).toContain('pilot-oee-line-01--oee-result');
    expect(production).not.toContain('pilot-oee-line-01');
    expect(read('app-config.production.yaml')).not.toContain('catalog/samples');
  });
});
