from __future__ import annotations

from threading import Lock

from app.envelope import UnsEvent
from app.registry import TopicContract


class EventRecord:
    def __init__(self, topic: str, event: UnsEvent, contract: TopicContract) -> None:
        self.topic = topic
        self.event = event
        self.contract = contract


class EventStore:
    def __init__(self) -> None:
        self._lock = Lock()
        self._by_id: dict[str, EventRecord] = {}
        self._order: list[str] = []
        self.accepted = 0
        self.rejected = 0
        self.duplicates = 0

    def insert(self, topic: str, event: UnsEvent, contract: TopicContract) -> tuple[EventRecord, bool]:
        with self._lock:
            existing = self._by_id.get(event.eventId)
            if existing is not None:
                self.duplicates += 1
                return existing, False
            record = EventRecord(topic, event, contract)
            self._by_id[event.eventId] = record
            self._order.append(event.eventId)
            self.accepted += 1
            return record, True

    def reject(self) -> None:
        with self._lock:
            self.rejected += 1

    def list_recent(self, limit: int = 100) -> list[EventRecord]:
        with self._lock:
            ids = self._order[-limit:]
            return [self._by_id[item] for item in ids]

    def topics_seen(self) -> list[str]:
        with self._lock:
            return sorted({record.topic for record in self._by_id.values()})
