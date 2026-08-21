from pathlib import Path


def test_dockerfile_has_no_secrets_and_exposes_runtime() -> None:
    dockerfile = Path(__file__).resolve().parents[1] / "Dockerfile"
    text = dockerfile.read_text(encoding="utf-8")
    assert "FROM python:3.12-slim" in text
    assert "pdf_aas.main:app" in text
    assert "password" not in text.lower()
    assert "BEGIN " not in text
    assert "ghp_" not in text
    env = (Path(__file__).resolve().parents[1] / ".env.example").read_text(encoding="utf-8")
    assert "AAS_SQLITE_PATH" in env
    assert "sk-" not in env
    assert "ghp_" not in env
