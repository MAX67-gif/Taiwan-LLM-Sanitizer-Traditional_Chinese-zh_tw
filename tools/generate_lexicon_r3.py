"""Rebuild the browser-safe context lexicon pack from editorial JSON with no network."""
import argparse
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/"lexicon"/"approved_r3.json"
PACK=ROOT/"src"/"core"/"lexicon_pack.js"
PREFIX="const ITEMS="
SUFFIX=";\nconst DOMAINS"

def expected():
    parsed=json.loads(SOURCE.read_text(encoding="utf-8"))
    rows=parsed["entries"]
    if not isinstance(rows,list) or len(rows)<20:
        raise ValueError("Glossary empty or invalid")
    keys=set()
    for r in rows:
        for field in ("id","from","to","domain","scope","source_locale"):
            if not isinstance(r.get(field),str) or not r[field].strip():
                raise ValueError("Invalid glossary row: "+repr(r))
        key=(r["from"].casefold(),r["scope"])
        if key in keys:raise ValueError("Duplicate phrase and scope: "+repr(key))
        keys.add(key)
    compact=[{k:r[k] for k in ("id","from","to","domain","scope","source_locale")} for r in rows]
    return json.dumps(compact,ensure_ascii=False,separators=(",",":"))

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--check",action="store_true")
    opts=parser.parse_args()
    original=PACK.read_text(encoding="utf-8")
    i=original.index(PREFIX)+len(PREFIX)
    j=original.index(SUFFIX,i)
    new=original[:i]+expected()+original[j:]
    if opts.check:
        if original!=new:raise SystemExit("Lexicon pack OUT OF SYNC; run python tools/generate_lexicon_r3.py")
        print("LEXICON COMPILED DATA MATCH PASS")
    else:
        PACK.write_text(new,encoding="utf-8")
        print("LEXICON PACK UPDATED",PACK)
if __name__=="__main__":
    main()
