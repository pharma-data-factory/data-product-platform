from pathlib import Path

DATA_CONTRACT_PATH = "contracts/equipment-event.schema.json"
DATA_CONTRACT_VERSION = "1.0.0"


def contract_file() -> Path:
    return Path(__file__).resolve().parents[1] / DATA_CONTRACT_PATH
