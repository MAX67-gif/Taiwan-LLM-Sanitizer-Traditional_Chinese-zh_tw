"""Verify offline HTML explorer contains exactly the public editorial corpus."""
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parents[1]
html=(ROOT/"examples/TW_Lexicon_Explorer_R3_20261024.html").read_text(encoding="utf-8")
match=re.search(r'<script id="data" type="application/json">([\s\S]*?)</script>',html)
assert match is not None,"Missing embedded JSON corpus"
payload=json.loads(match.group(1))
cand=json.loads((ROOT/"lexicon/candidates_r3.json").read_text(encoding="utf-8"))["entries"]
seed=json.loads((ROOT/"lexicon/approved_r3.json").read_text(encoding="utf-8"))["entries"]
assert len(payload["entries"])==len(cand)>=800
assert len(payload["approved"])==len(seed)>=50
assert [(r["from"],r["to"],r["domain"]) for r in payload["entries"]]==[
 (r["from"],r["to"],r["domain"]) for r in cand]
assert [(r["from"],r["to"],r["domain"]) for r in payload["approved"]]==[
 (r["from"],r["to"],r["domain"]) for r in seed]
assert "connect-src 'none'" in html
for prohibited in ("fetch(","XMLHttpRequest(","sendBeacon(","WebSocket(","@require"):
    assert prohibited not in html,prohibited
print("R3 EXPLORER CORPUS PARITY + ZERO-NETWORK CHECK PASS")
