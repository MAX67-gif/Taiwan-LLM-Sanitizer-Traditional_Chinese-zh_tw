"""Check/rebuild the local protected-name module from the public name registry."""
from pathlib import Path
import argparse
import json

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"lexicon/protected_names_r5.json"
TARGET=ROOT/"src/core/entities.js"
OPEN="const REGISTRY=/* TLS_NAMES_BEGIN */"
CLOSE="/* TLS_NAMES_END */;"

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--check",action="store_true")
    a=p.parse_args()
    src=json.loads(SOURCE.read_text(encoding="utf-8"))
    rows=src["entries"]
    if not rows or len(rows)!=len({r["id"] for r in rows}):
        raise ValueError("Duplicate/empty entity registry")
    aliases=set()
    for item in rows:
        assert item["name"] and item["id"] and item["aliases"]
        for variant in item["aliases"]:
            if variant in aliases and variant!="Codex":
                raise ValueError("Duplicate named variant: "+variant)
            aliases.add(variant)
    old=TARGET.read_text(encoding="utf-8")
    prefix,tail=old.split(OPEN,1)
    _,suffix=tail.split(CLOSE,1)
    desired=prefix+OPEN+json.dumps(rows,ensure_ascii=False,separators=(",",":"))+CLOSE+suffix
    if a.check:
        if old!=desired:
            raise SystemExit("ENTITY PACK OUT OF SYNC; run python tools/generate_names_r5.py")
        print("ENTITY REGISTRY PACK PASS")
    else:
        TARGET.write_text(desired,encoding="utf-8")
        print("ENTITY REGISTRY PACK UPDATED")
if __name__=="__main__":main()
