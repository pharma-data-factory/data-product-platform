import { RuntimeMqttBridge } from './mqttBridge';
import type { UnsMessage } from './types';

describe('RuntimeMqttBridge', () => {
  const logger = {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: () => logger,
  } as any;

  const sample: UnsMessage = {
    topic: 'uns/model-pharma/MODEL-PHARMA-01/packaging/PKG-L01/CHECKWEIGHER-01/state',
    qos: 1,
    retained: true,
    informationType: 'state',
    envelope: {
      schemaVersion: '1.0',
      eventId: 'EVT-test-1',
      timestamp: '2026-08-23T12:00:00.000Z',
      sourceSystem: 'model-factory',
      enterpriseId: 'model-pharma',
      siteId: 'MODEL-PHARMA-01',
      areaId: 'PACKAGING',
      lineId: 'PKG-L01',
      equipmentId: 'CHECKWEIGHER-01',
      orderId: 'PO-PKG-100003',
      batchId: 'FGB-260823-001',
      dataQuality: 'GOOD',
      payload: {
        schemaVersion: '1.0',
        timestamp: '2026-08-23T12:00:00.000Z',
        equipmentId: 'CHECKWEIGHER-01',
        state: 'MICROSTOP',
        reasonCode: 'PRODUCT_JAM',
        dataQuality: 'GOOD',
      },
    },
    schemaId: 'equipment-state-v1',
    valid: true,
    validationErrors: [],
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('POSTs envelopes to Scenario Runtime publish API', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ ok: true });
    (globalThis as any).fetch = fetchMock;

    const bridge = new RuntimeMqttBridge('http://127.0.0.1:18091/', logger);
    await bridge.publish([sample]);

    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:18091/api/v1/uns/publish',
      expect.objectContaining({
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      }),
    );
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.messages[0].topic).toContain('CHECKWEIGHER-01/state');
    expect(body.messages[0].message.equipmentId).toBe('CHECKWEIGHER-01');
    expect(body.messages[0].message.payload.state).toBe('MICROSTOP');
  });

  it('no-ops on empty batch', async () => {
    const fetchMock = jest.fn();
    (globalThis as any).fetch = fetchMock;
    const bridge = new RuntimeMqttBridge('http://127.0.0.1:18091', logger);
    await bridge.publish([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
