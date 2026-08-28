from __future__ import annotations

from typing import Any

from pdf_observability import Observability
from pdf_rest_source import RestSource, RestSourceError

from app.config import settings
from app.domain.quality import context_quality_failures, event_quality_failures, now_utc
from app.ingestion.mappings import (
    classify_event,
    parse_mqtt_message,
    to_context,
    to_counter_event,
    to_production_count,
    to_quality_count,
    to_state_event,
)
from app.store import OeeEventStore

_MAX_REJECTED = 50


class IngestService:
    def __init__(
        self,
        store: OeeEventStore,
        rest_source: RestSource,
        observability: Observability,
    ) -> None:
        self.store = store
        self.rest_source = rest_source
        self.obs = observability
        self.rest_error: str | None = None
        self.duplicate_count = 0
        self.rejected: list[dict[str, Any]] = []

    def ingest_mqtt(self, topic: str, payload: str) -> None:
        try:
            mapped = parse_mqtt_message(topic, payload)
        except (TypeError, ValueError) as error:
            self._reject({"_topic": topic}, ["invalid_schema"])
            raise ValueError("invalid_schema") from error
        self.ingest_payload(mapped)

    def ingest_payload(self, payload: dict[str, Any], *, enforce_equipment: bool = True) -> str:
        if self.store.storage_error:
            raise RuntimeError("timeseries_unavailable")
        try:
            return self._ingest_payload(payload, enforce_equipment=enforce_equipment)
        except RuntimeError:
            raise
        except ValueError:
            raise
        except Exception:
            if self.store.storage_error:
                raise RuntimeError("timeseries_unavailable") from None
            raise

    def _ingest_payload(self, payload: dict[str, Any], *, enforce_equipment: bool = True) -> str:
        kind = classify_event(payload)
        if kind == "context":
            return self._ingest_context(payload)
        normalized = dict(payload)
        if "timestamp" not in normalized and "start" in normalized:
            normalized["timestamp"] = normalized["start"]
        if normalized.get("state") == "PLANNED_STOP":
            normalized["state"] = "MAINTENANCE"
        if normalized.get("state") == "MICROSTOP":
            normalized["state"] = "STOPPED"
        failures = event_quality_failures(
            normalized,
            calculated_at=now_utc(),
            expected_equipment_id=settings.equipment_id if enforce_equipment else None,
        )
        if failures:
            self._reject(normalized, failures)
            raise ValueError(failures[0])
        event_id = str(normalized.get("eventId") or "")
        if event_id and self.store.has_event(event_id):
            self.duplicate_count += 1
            self.obs.info("oee_duplicate_event", eventId=event_id)
            return "duplicate"
        if kind == "state":
            self.store.save_state(to_state_event(normalized))
        elif kind == "production":
            self.store.save_production(to_production_count(normalized))
        elif kind == "quality":
            self.store.save_quality(to_quality_count(normalized))
        elif kind == "counter":
            self.store.save_counter(to_counter_event(normalized))
        else:
            self._reject(normalized, ["unknown_event"])
            raise ValueError("unknown_event")
        self.obs.info("oee_event_stored", kind=kind, eventId=event_id)
        return "stored"

    def _ingest_context(self, payload: dict[str, Any]) -> str:
        failures = context_quality_failures(payload)
        if failures:
            self._reject({**payload, "kind": "context"}, failures)
            raise ValueError(failures[0])
        context = to_context(payload)
        self.store.save_context(context, payload)
        return "stored"

    def refresh_context(self) -> None:
        if not self.rest_source.enabled():
            self.rest_error = None
            return
        try:
            payload = self.rest_source.get()
            self.rest_error = None
            if isinstance(payload, dict):
                self._ingest_context(payload)
            elif isinstance(payload, list):
                for item in payload:
                    if isinstance(item, dict):
                        self._ingest_context(item)
        except RestSourceError as error:
            self.rest_error = str(error)
            self.obs.error("rest_source", error=error.__class__.__name__)
        except ValueError as error:
            self.rest_error = str(error)
            self.obs.warning("oee_invalid_payload", checks=str(error), source="rest")

    def _reject(self, payload: dict[str, Any], failures: list[str]) -> None:
        recorded = dict(payload)
        recorded.setdefault("kind", classify_event(payload) or "unknown")
        self.rejected.append(recorded)
        if len(self.rejected) > _MAX_REJECTED:
            self.rejected = self.rejected[-_MAX_REJECTED:]
        self.obs.warning("oee_invalid_payload", checks=",".join(failures))
