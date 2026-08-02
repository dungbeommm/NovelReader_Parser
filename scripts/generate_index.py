#!/usr/bin/env python3
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
items = []
for path in sorted((ROOT / "sources").glob("*/manifest.json")):
    data = json.loads(path.read_text(encoding="utf-8"))
    items.append(data)
items.sort(key=lambda x: x["id"].casefold())
(ROOT / "sources.json").write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"Đã cập nhật {len(items)} nguồn")
