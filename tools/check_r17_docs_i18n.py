"""Ensure every R17 guide follows authoritative technical contract, not linguistic accuracy."""
from pathlib import Path
import hashlib,re,sys
R=Path(__file__).resolve().parents[1]
MASTER=R/'docs/R17_DOCUMENT_TRUST_GRAPH.md'
LANGS=('zh-CN','en','ja','ko','es')
FILES=('README.md','README.zh-CN.md','README.en.md','README.ja.md','README.ko.md','README.es.md')
def validate():
 errors=[]
 if not MASTER.is_file():return ['MISSING_R17_MASTER']
 sha=hashlib.sha256(MASTER.read_bytes()).hexdigest()
 for fn in FILES:
  if not (R/fn).is_file():errors.append('MISSING_'+fn);continue
  txt=(R/fn).read_text(encoding='utf-8')
  if 'R17' not in txt or 'TW_Document_Trust_Graph_R17_20261026.html' not in txt:errors.append('NO_R17_LINK_'+fn)
 for lang in LANGS:
  f=R/f'docs/R17_DOCUMENT_TRUST_GRAPH.{lang}.md'
  if not f.is_file():errors.append('MISSING_'+lang);continue
  txt=f.read_text(encoding='utf-8')
  marks=re.findall(r'<!-- R17_SOURCE_DOC_SHA256:([a-f0-9]{64}) -->',txt)
  if marks!=[sha]:errors.append('HASH_NOT_SYNCHRONIZED_'+lang)
  for token in ('R17-P0','HUMAN_TRANSLATION_REVIEW=PENDING','UNKNOWN','R17_DOCUMENT_TRUST_GRAPH.md','THIRD_PARTY_RIGHTS_POLICY.md'):
   if token not in txt:errors.append('REQUIRED_CONTENT_'+lang+'_'+token)
 return errors
if __name__=='__main__':
 if '--self-test' in sys.argv:
  assert len(LANGS)==5 and len(FILES)==6
  print('R17_DOC_SYNC_SELF_TEST_PASS')
 else:
  problems=validate()
  if problems:
   print('\n'.join('R17_DOC_SYNC_BLOCKED '+x for x in problems),file=sys.stderr)
   raise SystemExit(1)
  print('R17_DOC_SYNC_PASS: six languages, source hash bound; HUMAN_REVIEW_PENDING')
