#!/usr/bin/env python3
from pathlib import Path
import json, subprocess, sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
seen_domains = set()
folders = sorted((ROOT / "sources").iterdir())
for folder in folders:
    if not folder.is_dir():
        continue
    manifest_path = folder / "manifest.json"
    js_files = list(folder.glob("*.js"))
    if not manifest_path.is_file():
        errors.append(f"{folder.name}: thiếu manifest.json")
        continue
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        source_id = manifest["id"]
        if source_id in seen_domains:
            errors.append(f"{folder.name}: trùng id {source_id}")
        seen_domains.add(source_id)
        if not manifest.get("domains"):
            errors.append(f"{folder.name}: domains rỗng")
        if len(js_files) != 1:
            errors.append(f"{folder.name}: cần đúng một file JS")
        elif js_files[0].stat().st_size < 5000:
            errors.append(f"{folder.name}: file JS quá ngắn")
    except Exception as exc:
        errors.append(f"{folder.name}: {exc}")

index = json.loads((ROOT / "sources.json").read_text(encoding="utf-8"))
if len(index) != len(seen_domains):
    errors.append(f"sources.json có {len(index)}, thư mục có {len(seen_domains)}")

if errors:
    print("\n".join("- " + e for e in errors), file=sys.stderr)
    raise SystemExit(1)
print(f"Hợp lệ: {len(seen_domains)} parser JavaScript")
