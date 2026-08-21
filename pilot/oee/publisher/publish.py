"""Publish canonical OEE 1.0 events to the pilot MQTT broker."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scenarios import SCENARIOS, iter_mqtt_messages  # noqa: E402


def publish(broker: str, port: int, scenario: str, delay_ms: int) -> int:
    import paho.mqtt.client as mqtt

    if scenario not in SCENARIOS:
        raise SystemExit(f"unknown scenario {scenario}. Choose from {', '.join(SCENARIOS)}")
    kwargs: dict = {"client_id": "oee-pilot-publisher", "protocol": mqtt.MQTTv311}
    if hasattr(mqtt, "CallbackAPIVersion"):
        kwargs["callback_api_version"] = mqtt.CallbackAPIVersion.VERSION2
    client = mqtt.Client(**kwargs)
    client.connect(broker, port, keepalive=30)
    client.loop_start()
    count = 0
    try:
        for topic, payload in iter_mqtt_messages(scenario):
            client.publish(topic, json.dumps(payload), qos=1)
            count += 1
            if delay_ms:
                time.sleep(delay_ms / 1000)
        time.sleep(0.3)
    finally:
        client.loop_stop()
        client.disconnect()
    print(f"published {count} events for {scenario} to {broker}:{port}")
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description="OEE pilot machine publisher")
    parser.add_argument("--scenario", required=True, choices=sorted(SCENARIOS))
    parser.add_argument("--broker", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=1883)
    parser.add_argument("--delay-ms", type=int, default=0)
    args = parser.parse_args()
    publish(args.broker, args.port, args.scenario, args.delay_ms)
    return 0


if __name__ == "__main__":
    sys.exit(main())
