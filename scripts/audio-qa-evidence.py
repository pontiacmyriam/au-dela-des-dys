#!/usr/bin/env python3
"""Reproducible audio QA: observable evidence, not phonetic certification."""
import argparse
import csv
import json
import math
import os
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
AUDIO = ROOT / "public/assets/audio"
CATALOG = ROOT / "public/prototype_vfinal.json"


def references():
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    result = {}
    for values in catalog.values():
        if not isinstance(values, list):
            continue
        for item in values:
            if item.get("audio"):
                key = str(Path(item.get("dossier", "")) / item["audio"])
                result.setdefault(key, item.get("texte", ""))
    for path in (AUDIO / "quiz").glob("*.mp3"):
        result[str(path.relative_to(AUDIO))] = path.stem
    return result


def decode(file, sample_rate=16000):
    p = subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-i", str(file),
         "-ac", "1", "-ar", str(sample_rate), "-f", "s16le", "pipe:1"],
        capture_output=True, check=False,
    )
    if p.returncode or len(p.stdout) < 3200:
        raise ValueError(f"Cannot decode: {p.stderr.decode(errors='replace')[:200]}")
    return p.stdout


def signal_info(raw):
    from array import array
    samples = array("h")
    samples.frombytes(raw)
    if os.sys.byteorder != "little":
        samples.byteswap()
    total = len(samples)
    peak = max(abs(x) for x in samples) / 32768
    rms = math.sqrt(sum(float(x) * x for x in samples) / total) / 32768
    clipped = sum(abs(x) >= 32735 for x in samples) / total
    window = 320
    frames = [
        math.sqrt(sum(float(x)*x for x in samples[i:i+window]) / len(samples[i:i+window])) / 32768
        for i in range(0, total, window) if len(samples[i:i+window]) == window
    ]
    active = [i for i, x in enumerate(frames) if x > .012]
    silent = 1 - len(active) / len(frames) if frames else 1
    flags = []
    if rms < .003 or not active:
        flags.append("inaudible")
    if clipped > .002:
        flags.append("possible_clipping")
    if peak < .045:
        flags.append("quiet_peak")
    if active and (active[0] == 0 or active[-1] >= len(frames)-1):
        flags.append("boundary_close")
    if silent > .7:
        flags.append("mostly_silent")
    return {"duration_s": round(total / 16000, 3), "peak": round(peak, 5),
            "rms": round(rms, 5), "clipped_ratio": round(clipped, 6),
            "silent_ratio": round(silent, 4), "flags": flags}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--engine", choices=["signal", "vosk", "cnam"], required=True)
    parser.add_argument("--output-dir", default="audio-qa-output")
    parser.add_argument("--vosk-model", default="vosk-model-small-fr-0.22")
    args = parser.parse_args()
    out = Path(args.output_dir)
    out.mkdir(parents=True, exist_ok=True)
    refs = references()
    files = sorted(AUDIO.rglob("*.mp3"))
    model = processor = None
    if args.engine == "vosk":
        from vosk import Model, SetLogLevel
        SetLogLevel(-1)
        model = Model(args.vosk_model)
    elif args.engine == "cnam":
        import torch
        from transformers import AutoModelForCTC, AutoProcessor
        torch.set_num_threads(2)
        name = "Cnam-LMSSC/wav2vec2-french-phonemizer"
        processor = AutoProcessor.from_pretrained(name)
        model = AutoModelForCTC.from_pretrained(name).eval()
    results = []
    for index, file in enumerate(files, 1):
        key = str(file.relative_to(AUDIO))
        row = {"file": key, "expected": refs.get(key), "engine": args.engine}
        try:
            raw = decode(file)
            if args.engine == "signal":
                row.update(signal_info(raw))
            elif args.engine == "vosk":
                from vosk import KaldiRecognizer
                rec = KaldiRecognizer(model, 16000)
                pieces = []
                if rec.AcceptWaveform(raw):
                    pieces.append(json.loads(rec.Result()).get("text", ""))
                else:
                    pass
                pieces.append(json.loads(rec.FinalResult()).get("text", ""))
                row["recognized"] = " ".join(piece for piece in pieces if piece).strip()
            else:
                import numpy as np
                import torch
                samples = np.frombuffer(raw, dtype="<i2").astype("float32") / 32768
                with torch.inference_mode():
                    inputs = processor(samples, sampling_rate=16000, return_tensors="pt")
                    prediction = torch.argmax(model(**inputs).logits, dim=-1)
                    row["recognized"] = processor.batch_decode(prediction)[0]
        except Exception as exc:
            row["error"] = str(exc)[:500]
        results.append(row)
        if index % 25 == 0 or index == len(files):
            print(f"{args.engine}: {index}/{len(files)}", flush=True)
    target = out / f"{args.engine}.json"
    target.write_text(json.dumps({"engine": args.engine, "total": len(files), "rows": results},
                                 ensure_ascii=False, indent=2), encoding="utf-8")
    with (out / f"{args.engine}.csv").open("w", newline="", encoding="utf-8") as handle:
        fieldnames = ["file", "expected", "engine", "recognized", "duration_s", "peak",
                      "rms", "clipped_ratio", "silent_ratio", "flags", "error"]
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in results:
            writer.writerow({key: json.dumps(row[key], ensure_ascii=False) if isinstance(row.get(key), list)
                             else row.get(key, "") for key in fieldnames})
    failed = sum(bool(r.get("error")) for r in results)
    print(f"Finished {args.engine}: files={len(results)}, errors={failed}", flush=True)
    if failed:
        print("First errors:", json.dumps([{"file": r["file"], "error": r["error"]} for r in results if r.get("error")][:3], ensure_ascii=False), flush=True)
    if len(files) != 379 or failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
