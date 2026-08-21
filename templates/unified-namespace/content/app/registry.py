from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml


@dataclass(frozen=True)
class TopicContract:
    topic: str
    contract: str
    contract_version: str
    schema: str
    producer: str
    owner: str
    domain: str
    quality_status: str
    event_type: str


class ContractRegistry:
    def __init__(self, contracts: list[TopicContract], schema_root: Path) -> None:
        self._by_topic = {item.topic: item for item in contracts}
        self._by_name: dict[tuple[str, str], TopicContract] = {
            (item.contract, item.contract_version): item for item in contracts
        }
        self._schema_root = schema_root

    @classmethod
    def load(cls, registry_path: Path, schema_root: Path) -> ContractRegistry:
        raw = yaml.safe_load(registry_path.read_text(encoding="utf-8")) or []
        contracts = [
            TopicContract(
                topic=item["topic"],
                contract=item["contract"],
                contract_version=item["contractVersion"],
                schema=item["schema"],
                producer=item["producer"],
                owner=item["owner"],
                domain=item["domain"],
                quality_status=item["qualityStatus"],
                event_type=item["eventType"],
            )
            for item in raw
        ]
        return cls(contracts, schema_root)

    def all(self) -> list[TopicContract]:
        return list(self._by_topic.values())

    def for_topic(self, topic: str) -> TopicContract | None:
        return self._by_topic.get(topic)

    def for_contract(self, name: str, version: str) -> TopicContract | None:
        return self._by_name.get((name, version))

    def schema_path(self, contract: TopicContract) -> Path:
        return self._schema_root / Path(contract.schema).name
