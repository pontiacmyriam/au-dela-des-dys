#!/usr/bin/env python3
"""Review catalogue links and literal references without inferring audio semantics."""
import csv
import json
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "public/assets/audio"
CATALOG = ROOT / "public/prototype_vfinal.json"
OUT = Path("audio-reference-review")
OUT.mkdir(exist_ok=True)

files = sorted(AUDIO.rglob("*.mp3"))
asset_paths = {p.relative_to(AUDIO).as_posix() for p in files}
items = json.loads(CATALOG.read_text(encoding="utf-8"))
references = {}
broken = []
total_references = 0
for category, group in items.items():
    if not isinstance(group, list):
        continue
    for idx, item in enumerate(group):
        if not isinstance(item, dict) or not item.get("audio"):
            continue
        total_references += 1
        expected = (Path(item.get("dossier", "")) / item["audio"]).as_posix()
        references.setdefault(expected, []).append({
            "category": category, "index": idx, "expected_text": item.get("texte","")
        })
        if expected not in asset_paths:
            broken.append({"category":category,"index":idx,"path":expected,"expected_text":item.get("texte","")})

text_files = []
extensions = {".js",".jsx",".ts",".tsx",".json",".html",".css"}
for p in ROOT.rglob("*"):
    if not p.is_file() or p.suffix not in extensions:
        continue
    rel=p.relative_to(ROOT)
    if any(seg in {"node_modules", ".next", ".git", "dist", ".vercel", "build"} for seg in rel.parts):
        continue
    if p == CATALOG or p.stat().st_size > 2_000_000:
        continue
    try:
        text_files.append((rel.as_posix(),p.read_text(encoding="utf-8",errors="replace")))
    except OSError:
        continue

rows=[]
for key in sorted(asset_paths):
    basename = Path(key).name
    occurrences = [name for name,body in text_files if basename in body or key in body]
    catalogue_entries = references.get(key,[])
    # Literal occurrences are only hints. Runtime references can be generated dynamically.
    rows.append({
        "file":key,
        "catalogue_entry_count":len(catalogue_entries),
        "catalogue_expected_text":" | ".join(str(x["expected_text"]) for x in catalogue_entries),
        "explicit_source_mentions":" | ".join(occurrences[:30]),
        "reference_status":"catalogue_reference" if catalogue_entries else "source_literal" if occurrences else "not_found_in_static_scan",
        "interpretation":"Absence of static mention does NOT prove audio unused"
    })

with (OUT/"all_379_reference_usage.csv").open("w",encoding="utf-8",newline="") as f:
    writer=csv.DictWriter(f,fieldnames=list(rows[0]))
    writer.writeheader()
    writer.writerows(rows)
(OUT/"broken_catalogue_links.json").write_text(json.dumps(broken,indent=2,ensure_ascii=False),encoding="utf-8")
missing=[x for x in rows if x["reference_status"]=="not_found_in_static_scan"]
summary={"audio_file_count":len(files),"catalogue_audio_entries":total_references,"broken_catalogue_links":len(broken),"not_found_in_static_scan":len(missing),"files_with_literal_mentions":sum(x["reference_status"]=="source_literal" for x in rows),"static_scan_limit":"Dynamic filename construction and database references are not detected."}
(OUT/"summary.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False),encoding="utf-8")
print("REFERENCE_AUDIT_SUMMARY "+json.dumps(summary,ensure_ascii=False),flush=True)
for x in broken:
    print("BROKEN_REFERENCE "+json.dumps(x,ensure_ascii=False),flush=True)
for x in missing:
    print("UNRESOLVED_REFERENCE "+x["file"],flush=True)
if len(files) != 379:
    raise SystemExit("unexpected MP3 inventory")
