from pathlib import Path

DOMAIN = Path(__file__).resolve().parents[1] / "app" / "domain"
APP = Path(__file__).resolve().parents[1] / "app"


def test_domain_does_not_import_wave1_or_backstage() -> None:
    for path in DOMAIN.glob("*.py"):
        text = path.read_text(encoding="utf-8")
        assert "pdf_" not in text
        assert "sqlite3" not in text
        assert "paho" not in text
        assert "backstage" not in text.lower()


def test_runtime_does_not_call_backstage() -> None:
    for path in APP.rglob("*.py"):
        if "vendor" in path.parts:
            continue
        text = path.read_text(encoding="utf-8")
        assert "backstage" not in text.lower()
        assert "localhost:7007" not in text
