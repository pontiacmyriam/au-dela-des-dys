#!/usr/bin/env python3
"""Consolidate independent audio QA evidence; never claim automatic certification."""
import csv
import json
import re
import unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path("downloaded-qa")
OUT = Path("audio-qa-comparison")
OUT.mkdir(parents=True, exist_ok=True)

def load(engine):
    path = ROOT / engine / (engine + ".json")
    data = json.loads(path.read_text(encoding="utf-8"))
    rows = data.get("rows", [])
    if len(rows) != 379:
        raise SystemExit(f"{engine}: expected 379 rows, got {len(rows)}")
    mapped = {row["file"]: row for row in rows}
    if len(mapped) != 379:
        raise SystemExit(f"{engine}: duplicate paths")
    return mapped

def normalize(value):
    value = unicodedata.normalize("NFKD", value.lower())
    value = "".join(c for c in value if not unicodedata.combining(c))
    return " ".join(re.findall(r"[a-z0-9]+", value))

signal, vosk, cnam = (load(name) for name in ("signal", "vosk", "cnam"))
if set(signal) != set(vosk) or set(signal) != set(cnam):
    raise SystemExit("Inconsistent file inventory between engines")

out = []
for name in sorted(signal):
    s, v, c = signal[name], vosk[name], cnam[name]
    expected = s.get("expected") or v.get("expected") or c.get("expected") or ""
    recognized = v.get("recognized") or ""
    phones = c.get("recognized") or ""
    errors = [f"{engine}:{row['error']}" for engine, row in (("signal",s),("vosk",v),("cnam",c)) if row.get("error")]
    acoustic = s.get("flags") or []
    normalized_expected = normalize(expected)
    normalized_recognized = normalize(recognized)
    # Isolated phonemes and syllables cannot reliably be recognized by lexical ASR.
    # Catalogue text may also be an instruction rather than the actual audio.
    reference_kind = "quiz_filename" if name.startswith("quiz/") else "catalogue_text" if expected else "missing"
    lexical_candidate = bool(
        reference_kind == "catalogue_text" and
        len(normalized_expected) >= 4 and
        len(normalized_expected.split()) <= 3 and
        normalized_expected == normalized_recognized
    )
    if errors:
        status = "execution_error"
    elif acoustic:
        status = "acoustic_review"
    elif not expected:
        status = "not_in_catalogue"
    elif lexical_candidate:
        status = "lexical_match_candidate"
    else:
        status = "phonetic_review_required"
    out.append({
        "file": name, "reference_type": reference_kind,
        "expected": expected, "vosk_text": recognized, "cnam_phones": phones,
        "acoustic_flags": "|".join(acoustic), "duration_s": s.get("duration_s", ""),
        "status": status, "engine_errors": "|".join(errors),
        "human_validated": "NO", "note": "Missing catalogue text does not prove audio unused. Automatic results cannot alone certify phonemes."
    })

fields = list(out[0])
with (OUT / "all_379_comparison.csv").open("w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=fields)
    writer.writeheader()
    writer.writerows(out)
counts = Counter(row["status"] for row in out)
summary = {
    "total": len(out), "classification_counts": dict(sorted(counts.items())),
    "human_validated": 0, "technical_engines": ["signal", "vosk", "cnam"],
    "caution": "Lexical matches are only candidates. Phonetic and educational certification remains open.",
    "rows": out,
}
(OUT / "all_379_comparison.json").write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")
lines = [
    "# Audio QA: consolidated evidence for all 379 files",
    "",
    "Three tools executed; no automatic phonetic certification is claimed.",
    "All rows have human_validated=NO until independently confirmed.",
    "",
    "## Classification",
]
lines += [f"- {k}: {v}" for k,v in sorted(counts.items())]
lines += ["", "## Sample requiring review", ""]
lines += [f"- \`{r['file']}\`: expected={r['expected']!r}, Vosk={r['vosk_text']!r}, Cnam={r['cnam_phones']!r}, status={r['status']}" for r in out if r["status"] != "lexical_match_candidate"][:35]
(OUT / "SUMMARY.md").write_text("\n".join(lines)+"\n", encoding="utf-8")
print(json.dumps({"total": len(out), "classification_counts": dict(counts), "human_validated": 0}, ensure_ascii=False))
for row in out:
    if row["status"] in ("not_in_catalogue", "acoustic_review"):
        print("ACTIONABLE_REVIEW " + json.dumps({k:row[k] for k in ("file","status","expected","acoustic_flags","duration_s")}, ensure_ascii=False), flush=True)
if len(out) != 379 or counts.get("execution_error"):
    raise SystemExit(1)
