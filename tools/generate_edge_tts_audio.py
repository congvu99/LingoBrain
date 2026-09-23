"""Tạo sẵn MP3 giọng Neural (edge-tts) cho mọi `word` + `context` trong words.json.

Ra: audio/<hash>.mp3 và audio/index.json = {"voice": ..., "items": {text: file}}.
Chạy lại an toàn: bỏ qua file đã có; chạy đủ (không --limit) thì xoá file không còn dùng.

    pip install -r tools/requirements.txt
    python tools/generate_edge_tts_audio.py            # toàn bộ
    python tools/generate_edge_tts_audio.py --limit 5  # thử vài từ đầu
"""
import argparse
import asyncio
import hashlib
import json
import re
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
AUDIO_DIR = ROOT / "audio"
MANIFEST = AUDIO_DIR / "index.json"
DEFAULT_VOICE = "en-US-ChristopherNeural"


def normalize(text):
    """Khoá tra cứu — phải khớp audioKey() trong js/speech-synthesis.js."""
    return re.sub(r"\s+", " ", text or "").strip()


def file_name(voice, key):
    # Gắn giọng vào hash để đổi giọng thì ra file mới, không lẫn với file cũ
    return hashlib.sha1(f"{voice}|{key}".encode("utf-8")).hexdigest()[:12] + ".mp3"


def collect_texts(limit):
    """Text duy nhất theo thứ tự xuất hiện: word rồi context của từng từ."""
    words = json.loads((ROOT / "words.json").read_text(encoding="utf-8"))["words"]
    if limit:
        words = words[:limit]
    keys = {}
    for w in words:
        for t in (w.get("word"), w.get("context")):
            k = normalize(t)
            if k:
                keys[k] = True
    return list(keys)


def has_audio(path):
    return path.exists() and path.stat().st_size > 0


async def synth(key, path, voice, sem, progress, attempts=3):
    """Ghi ra file tạm rồi đổi tên, để lần chạy bị ngắt không để lại MP3 hỏng."""
    tmp = path.with_suffix(".part")
    async with sem:
        for i in range(attempts):
            try:
                await edge_tts.Communicate(key, voice).save(str(tmp))
                if tmp.stat().st_size == 0:
                    raise RuntimeError("empty audio")
                tmp.replace(path)
                break
            except Exception as e:  # mạng / rate-limit: thử lại có giãn cách
                tmp.unlink(missing_ok=True)
                if i == attempts - 1:
                    print(f"\n  FAIL {key[:60]!r}: {e}", file=sys.stderr)
                    return False
                await asyncio.sleep(2 ** (i + 1))
    progress[0] += 1
    print(f"\r  {progress[0]}/{progress[1]}", end="", flush=True)
    return True


def load_manifest():
    try:
        return json.loads(MANIFEST.read_text(encoding="utf-8"))
    except (FileNotFoundError, ValueError):
        return {}


async def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--voice", default=DEFAULT_VOICE)
    ap.add_argument("--limit", type=int, default=0, help="chỉ N từ đầu (nghe thử); gộp vào manifest cũ, không dọn file")
    ap.add_argument("--concurrency", type=int, default=6)
    args = ap.parse_args()
    for stream in (sys.stdout, sys.stderr):  # console Windows cp125x không in được tiếng Việt
        stream.reconfigure(encoding="utf-8", errors="replace")

    AUDIO_DIR.mkdir(exist_ok=True)
    wanted = {k: file_name(args.voice, k) for k in collect_texts(args.limit)}
    todo = [(k, AUDIO_DIR / f) for k, f in wanted.items() if not has_audio(AUDIO_DIR / f)]
    print(f"{len(wanted)} text, cần tạo {len(todo)} (giọng {args.voice})")

    sem = asyncio.Semaphore(args.concurrency)
    progress = [0, len(todo)]
    await asyncio.gather(*[synth(k, p, args.voice, sem, progress) for k, p in todo])
    print()

    # Chỉ ghi vào manifest text đã có file; text lỗi sẽ rơi về Web Speech lúc chạy
    items = {k: f for k, f in wanted.items() if has_audio(AUDIO_DIR / f)}
    if args.limit:
        old = load_manifest()
        if old.get("voice") == args.voice:
            items = {**old.get("items", {}), **items}
    else:
        keep = set(items.values())
        stale = [p for p in AUDIO_DIR.iterdir() if p.suffix in (".mp3", ".part") and p.name not in keep]
        for p in stale:
            p.unlink()
        if stale:
            print(f"Xoá {len(stale)} file không còn dùng")

    tmp = MANIFEST.with_suffix(".json.part")  # ghi tạm rồi đổi tên: ngắt giữa chừng không để lại JSON hỏng
    tmp.write_text(json.dumps({"voice": args.voice, "items": items}, ensure_ascii=False, separators=(",", ":")),
                   encoding="utf-8")
    tmp.replace(MANIFEST)
    missing = len(wanted) - sum(1 for k in wanted if k in items)
    print(f"index.json: {len(items)} mục" + (f" — {missing} lỗi, chạy lại để thử tiếp" if missing else ""))
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
