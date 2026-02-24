import json
from pathlib import Path
from typing import Any


def _load_json(path: Path) -> Any:
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def load_alcohols(data_dir: Path) -> list[dict]:
    return _load_json(data_dir / "alcohols.json")


def load_cocktails(data_dir: Path) -> list[dict]:
    return _load_json(data_dir / "cocktails.json")