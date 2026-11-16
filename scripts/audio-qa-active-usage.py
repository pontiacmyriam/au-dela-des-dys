#!/usr/bin/env python3
"""Inventory MP3 paths reachable through the current visible React learning folders.

This is a source-based audit, not a guarantee about historical deployments,
manual URL entry, saved state, or any other dynamic path outside App.js.
"""
import csv
import json
import re
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
app=(ROOT/"src/App.js").read_text(encoding="utf-8")
progression=(ROOT/"src/curatedProgression.js").read_text(encoding="utf-8")
data=json.loads((ROOT/"public/prototype_vfinal.json").read_text(encoding="utf-8"))
paths={x.relative_to(ROOT/"public/assets/audio").as_posix() for x in (ROOT/"public/assets/audio").rglob("*.mp3")}
match=re.search(r"const FOLDER_ORDER\s*=\s*\[([^\]]+)\]", app)
if not match:
    raise SystemExit("Cannot determine visible folders from App.js")
folders=re.findall(r'"([^"]+)"',match.group(1))
if not folders or "premiers_sons" not in folders or "sons_simples" not in folders:
    raise SystemExit("Unexpected learning folder configuration")
intro=progression.split("export function buildIntroProgression",1)[1].split("export function buildSimpleProgression",1)[0]
simple=progression.split("export function buildSimpleProgression",1)[1]
used={}
def add(path, reason):
    used.setdefault(path,set()).add(reason)
def from_item(folder, text):
    candidate=next((x for x in data.get(folder,[]) if x.get("texte")==text),None)
    if not candidate:
        raise SystemExit(f"Referenced source not found: {folder}/{text}")
    return candidate
for folder in folders:
    if folder in {"premiers_sons","sons_simples"}:
        continue
    for item in data.get(folder,[]):
        if item.get("audio"):
            add(f"{item.get('dossier') or folder}/{item['audio']}",f"visible_folder:{folder}")
for name,body in (("premiers_sons",intro),("sons_simples",simple)):
    # In App.js item.quiz takes priority over item.audio.
    for folder,text,correct in re.findall(r"(?:sound|listening)\('([^']+)', '([^']+)', '([^']+)'",body):
        from_item(folder,text)
        add(f"quiz/{correct}.mp3",f"generated_quiz:{name}")
    for word in re.findall(r"(?:generatedWord|word)\('([^']+)'",body):
        add(f"quiz/{word}.mp3",f"generated_word:{name}")
for folder,text in re.findall(r"from\('([^']+)', '([^']+)'\)",intro):
    source=from_item(folder,text)
    add(f"{source.get('dossier') or folder}/{source['audio']}","intro_nonquiz")
missing=sorted(set(used)-paths)
out=Path("audio-active-usage")
out.mkdir(exist_ok=True)
with (out/"all_379_usage.csv").open("w",newline="",encoding="utf-8") as f:
    writer=csv.DictWriter(f,fieldnames=["file","current_visible_path","path_reasons"])
    writer.writeheader()
    for path in sorted(paths|set(used)):
        writer.writerow({"file":path,"current_visible_path":"YES" if path in used else "NO",
                         "path_reasons":" | ".join(sorted(used.get(path,set())))})
summary={"present_mp3":len(paths),"used_by_current_visible_parcours":len(set(used)&paths),
         "not_called_by_current_visible_parcours":len(paths-set(used)),
         "missing_used_paths":missing,
         "visible_folders":folders,
         "limit":"Static reconstruction of App.js and curatedProgression.js. Not a runtime browser test."}
(out/"summary.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False),encoding="utf-8")
print("ACTIVE_AUDIO_USAGE "+json.dumps(summary,ensure_ascii=False),flush=True)
if missing:
    raise SystemExit("Visible learning path refers to missing audio")
