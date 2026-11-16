#!/usr/bin/env python3
"""Cross-tab previous 379 audio verdicts against currently reachable paths."""
import csv,json
from collections import Counter
from pathlib import Path
usage=Path("audio-active-usage/all_379_usage.csv")
comparison=Path("downloaded-prior-comparison/all_379_comparison.json")
if not usage.is_file() or not comparison.is_file():
    raise SystemExit("Required prior evidence missing")
with usage.open(encoding="utf-8",newline="") as f:
    current={row["file"]:row["current_visible_path"]=="YES" for row in csv.DictReader(f)}
rows=json.loads(comparison.read_text(encoding="utf-8"))["rows"]
if len(rows)!=379 or len(current)!=379 or {r["file"] for r in rows}!=set(current):
    raise SystemExit("Mismatch between 379-file inventories")
out=Path("audio-active-verdict")
out.mkdir(exist_ok=True)
counter=Counter()
combined=[]
for row in rows:
    active=current[row["file"]]
    counter[("active" if active else "inactive",row["status"])]+=1
    combined.append({"file":row["file"],"used_in_current_visible_parcours":active,
                     "status":row["status"],"expected":row["expected"],
                     "vosk_text":row["vosk_text"],"cnam_phones":row["cnam_phones"],
                     "acoustic_flags":row["acoustic_flags"],"human_validated":row["human_validated"]})
with (out/"all_379_verdicts_by_usage.csv").open("w",encoding="utf-8",newline="") as f:
    w=csv.DictWriter(f,fieldnames=list(combined[0]))
    w.writeheader()
    w.writerows(combined)
summary={"active_distinct_mp3":sum(current.values()),"inactive_mp3":len(current)-sum(current.values()),
         "by_status":{"active":dict(sorted((s,n) for (part,s),n in counter.items() if part=="active")),
                      "inactive":dict(sorted((s,n) for (part,s),n in counter.items() if part=="inactive"))},
         "caveat":"Automatic concordance is NOT a human phonetic certification."}
(out/"summary.json").write_text(json.dumps(summary,indent=2,ensure_ascii=False),encoding="utf-8")
print("ACTIVE_VERDICTS "+json.dumps(summary,ensure_ascii=False),flush=True)
