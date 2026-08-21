from __future__ import annotations

import re
from dataclasses import dataclass

SEGMENT_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


class NamespaceError(ValueError):
    """Raised when a topic does not match the configured namespace."""


@dataclass(frozen=True)
class NamespaceParts:
    root: str
    fields: dict[str, str]

    def get(self, name: str) -> str:
        return self.fields[name]


def split_fields(configured: str | list[str]) -> list[str]:
    if isinstance(configured, list):
        return [field.strip() for field in configured if field.strip()]
    return [field.strip() for field in configured.split(",") if field.strip()]


def validate_segment(value: str, label: str) -> str:
    cleaned = value.strip()
    if not cleaned or not SEGMENT_PATTERN.fullmatch(cleaned):
        raise NamespaceError(
            f"Invalid {label} '{value}'. Use lowercase letters, digits, and dashes.",
        )
    return cleaned


def build_topic(
    *,
    root: str,
    field_names: list[str],
    values: dict[str, str],
) -> str:
    root_segment = validate_segment(root, "root")
    segments = [root_segment]
    for name in field_names:
        if name not in values or not str(values[name]).strip():
            raise NamespaceError(f"Missing namespace field '{name}'")
        segments.append(validate_segment(str(values[name]), name))
    return "/".join(segments)


def parse_topic(topic: str, *, root: str, field_names: list[str]) -> NamespaceParts:
    if not topic or "//" in topic or topic.startswith("/") or topic.endswith("/"):
        raise NamespaceError("Topic must be a non-empty slash-separated hierarchy")
    segments = [validate_segment(part, "topic") for part in topic.split("/")]
    expected = 1 + len(field_names)
    if len(segments) != expected:
        raise NamespaceError(
            f"Topic '{topic}' has {len(segments)} segments; expected {expected} "
            f"({root}/{'/'.join(field_names)})",
        )
    root_segment = validate_segment(root, "root")
    if segments[0] != root_segment:
        raise NamespaceError(
            f"Topic root '{segments[0]}' does not match configured root '{root_segment}'",
        )
    fields = dict(zip(field_names, segments[1:], strict=True))
    return NamespaceParts(root=root_segment, fields=fields)


def validate_topic(topic: str, *, root: str, field_names: list[str]) -> str:
    parsed = parse_topic(topic, root=root, field_names=field_names)
    return build_topic(root=parsed.root, field_names=field_names, values=parsed.fields)
