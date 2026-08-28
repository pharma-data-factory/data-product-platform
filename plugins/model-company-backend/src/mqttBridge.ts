import type { LoggerService } from '@backstage/backend-plugin-api';
import type { UnsMessage } from './types';

export type RuntimeBridgeStatus = {
  configured: boolean;
  runtimeReachable: boolean;
  mqttConnected: boolean | null;
  consecutiveFailures: number;
  lastSuccessAt?: string;
  lastError?: string;
  runtimeBaseUrl?: string;
};

/**
 * Forwards Model Company Control Plane UNS messages to the Scenario Runtime,
 * which is the sole MQTT publisher to Mosquitto.
 *
 * Architecture:
 *   Control Plane → Scenario Runtime (/api/v1/uns/publish) → MQTT → Mosquitto
 *
 * Never used from the browser. Credentials stay server-side only.
 */
export class RuntimeMqttBridge {
  private readonly baseUrl: string;
  private readonly logger: LoggerService;
  private consecutiveFailures = 0;
  private lastSuccessAt?: string;
  private lastError?: string;
  private runtimeReachable = false;
  private mqttConnected: boolean | null = null;

  constructor(runtimeBaseUrl: string, logger: LoggerService) {
    this.baseUrl = runtimeBaseUrl.replace(/\/$/, '');
    this.logger = logger;
  }

  getStatus(): RuntimeBridgeStatus {
    return {
      configured: true,
      runtimeReachable: this.runtimeReachable,
      mqttConnected: this.mqttConnected,
      consecutiveFailures: this.consecutiveFailures,
      lastSuccessAt: this.lastSuccessAt,
      lastError: this.lastError,
      runtimeBaseUrl: this.baseUrl,
    };
  }

  /** Probe Scenario Runtime /health (includes MQTT connectivity when available). */
  async probe(): Promise<RuntimeBridgeStatus> {
    try {
      const res = await fetch(`${this.baseUrl}/health`, {
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) {
        this.runtimeReachable = false;
        this.mqttConnected = null;
        this.lastError = `health HTTP ${res.status}`;
        return this.getStatus();
      }
      const body = (await res.json()) as {
        mqtt?: { connected?: boolean; host?: string; port?: number };
      };
      this.runtimeReachable = true;
      this.mqttConnected =
        typeof body.mqtt?.connected === 'boolean' ? body.mqtt.connected : null;
      this.lastError = undefined;
    } catch (error) {
      this.runtimeReachable = false;
      this.mqttConnected = null;
      this.lastError = String(error);
    }
    return this.getStatus();
  }

  async publish(messages: UnsMessage[]): Promise<void> {
    if (!messages.length) {
      return;
    }
    const body = {
      messages: messages.map(msg => ({
        topic: msg.topic,
        message: msg.envelope,
        qos: msg.qos,
        retain: msg.retained,
      })),
    };
    try {
      const res = await fetch(`${this.baseUrl}/api/v1/uns/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status} ${text.slice(0, 200)}`);
      }
      this.consecutiveFailures = 0;
      this.runtimeReachable = true;
      this.mqttConnected = true;
      this.lastSuccessAt = new Date().toISOString();
      this.lastError = undefined;
    } catch (error) {
      this.consecutiveFailures += 1;
      this.lastError = String(error);
      const msg = String(error);
      if (/fetch failed|ECONNREFUSED|AbortError|TimeoutError/i.test(msg)) {
        this.runtimeReachable = false;
        this.mqttConnected = null;
      } else if (/503|MQTT/i.test(msg)) {
        this.runtimeReachable = true;
        this.mqttConnected = false;
      }
      if (this.consecutiveFailures <= 3 || this.consecutiveFailures % 20 === 0) {
        this.logger.warn(
          `Model Company MQTT bridge publish failed (${this.consecutiveFailures}): ${String(error)}`,
        );
      }
    }
  }
}
