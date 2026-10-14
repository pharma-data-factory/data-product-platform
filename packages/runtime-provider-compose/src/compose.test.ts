/**
 * What the provider writes (NXD-144): the image by digest, defaults applied
 * but not hashed, secrets out of the Compose file, one named volume per
 * storage area, ephemeral host ports, and the labels it reads back.
 */

import { DIGEST, desiredItem } from './__testUtils__/fixtures';
import { parseInspect } from './docker';
import {
  LABEL_CONFIG_HASH,
  LABEL_REVISION,
  UnresolvedSecretError,
  projectName,
  renderProject,
  renderSecretsEnv,
} from './compose';

const secrets = async (ref: string) => (ref === 'mqtt/password' ? 's3cret' : undefined);

describe('renderProject', () => {
  it('pins the image by digest, applies defaults, and keeps secrets out of the Compose file', async () => {
    const item = desiredItem();
    const rendered = await renderProject(item, 'target-1', secrets);
    const service = (rendered.compose.services as any).app;
    expect(service.image).toBe(`ghcr.io/pharma/oee@${DIGEST}`);
    expect(service.environment).toEqual({ EQUIPMENT_ID: 'filler-01', MQTT_PORT: '1883' });
    expect(rendered.secrets).toEqual({ MQTT_PASSWORD: 's3cret' });
    expect(service.env_file).toEqual(['secrets.env']);
    expect(JSON.stringify(rendered.compose)).not.toContain('s3cret');
    // The hash is of the configuration as stored, not of what was resolved.
    expect(rendered.configHash).toBe(item.desired.configHash);
    expect(service.labels).toEqual(
      expect.objectContaining({ [LABEL_REVISION]: '3', [LABEL_CONFIG_HASH]: item.desired.configHash }),
    );
  });

  it('gives each storage area a named volume, each port an ephemeral host port, and maps limits', async () => {
    const rendered = await renderProject(desiredItem(), 'target-1', secrets);
    const service = (rendered.compose.services as any).app;
    expect(service.volumes).toEqual(['data:/app/data']);
    expect(rendered.compose.volumes).toEqual({ data: {} });
    expect(service.ports).toEqual(['8080']);
    expect(service.deploy).toEqual({ resources: { limits: { cpus: '0.5', memory: '512m' } } });
    expect(service.restart).toBe('unless-stopped');
  });

  it('joins an external network when the target names one', async () => {
    const rendered = await renderProject(desiredItem(), 'target-1', secrets, { network: 'plant-mqtt' });
    expect((rendered.compose.services as any).app.networks).toEqual(['default', 'plant-mqtt']);
    expect(rendered.compose.networks).toEqual({ 'plant-mqtt': { external: true } });
  });

  it('refuses a secret the target does not hold, naming the reference and no value', async () => {
    const item = desiredItem({}, { config: { MQTT_PASSWORD: { secretRef: 'missing/one' } } });
    await expect(renderProject(item, 't', secrets)).rejects.toThrow(UnresolvedSecretError);
    await expect(renderProject(item, 't', secrets)).rejects.toThrow(/secret "missing\/one"/);
  });

  it('renders an installation without runtime or secrets as a bare service', async () => {
    const item = desiredItem({ runtime: undefined, configSchema: undefined }, { config: { A: '1' } });
    const rendered = await renderProject(item, 't', secrets);
    const service = (rendered.compose.services as any).app;
    expect(service.env_file).toBeUndefined();
    expect(service.ports).toBeUndefined();
    expect(rendered.compose.volumes).toBeUndefined();
  });
});

describe('helpers', () => {
  it('names a project from target and installation', () => {
    expect(projectName('basel-line-3', 'oee')).toBe('nexora-basel-line-3-oee');
  });

  it('writes secrets one per line, without embedded newlines', () => {
    expect(renderSecretsEnv({ A: 'x\ny', B: 'z' })).toBe('A=xy\nB=z\n');
  });

  it('reads docker inspect, de-duplicating IPv4 and IPv6 bindings', () => {
    const [container] = parseInspect(
      JSON.stringify([
        {
          Id: 'c1',
          Image: 'sha256:img',
          State: { Status: 'running', Health: { Status: 'healthy' } },
          Config: { Labels: { [LABEL_REVISION]: '3' } },
          NetworkSettings: {
            Ports: {
              '8080/tcp': [
                { HostIp: '0.0.0.0', HostPort: '49153' },
                { HostIp: '::', HostPort: '49153' },
              ],
              '9000/tcp': null,
            },
          },
        },
      ]),
    );
    expect(container).toEqual({
      id: 'c1',
      image: 'sha256:img',
      state: 'running',
      health: 'healthy',
      labels: { [LABEL_REVISION]: '3' },
      publishers: [{ targetPort: 8080, publishedPort: 49153, protocol: 'tcp' }],
    });
  });
});
