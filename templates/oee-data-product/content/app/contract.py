from pathlib import Path

CONTRACTS_DIR = Path(__file__).resolve().parents[1] / "contracts"
OEE_RESULT_VERSION = "1.0.0"


def contract_file(name: str) -> Path:
    return CONTRACTS_DIR / name
