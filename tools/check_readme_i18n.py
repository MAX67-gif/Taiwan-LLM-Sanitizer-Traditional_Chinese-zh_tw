"""Enforce zh-TW master + five translated README source-synchronization and rights-neutral links."""
from __future__ import annotations
from pathlib import Path
import hashlib,re,sys
ROOT=Path(__file__).resolve().parents[1]
FILES=('README.md','README.zh-CN.md','README.en.md','README.ja.md','README.ko.md','README.es.md')
SOURCE='docs/WEBSITE_LOCALIZATION_GUIDE.md'
RIGHTS='docs/THIRD_PARTY_RIGHTS_POLICY.md'
EXAMPLE_PREFIX='docs/USAGE_EXAMPLES'
MARKER=re.compile(r'<!-- SOURCE_README_SHA256:([0-9a-f]{64}) -->')
MILESTONES=('R17','R13','R11','R14','R12','R6','R5')
# Game-specific sources once published must never reappear on a public branch.
FORBIDDEN_WORDS=('poke'+'bonk','pok'+'émon','宝可'+'梦','寶可'+'夢')
FORBIDDEN_RELEASE='r7-'+'poke'+'bonk-demo'
LANGUAGE_LINKS=tuple('('+x+')' for x in FILES)

def run()->list[str]:
  errors=[]
  if not (ROOT/'README.md').is_file():return ['no README.md']
  sha=hashlib.sha256((ROOT/'README.md').read_bytes()).hexdigest()
  for fn in FILES:
    p=ROOT/fn
    if not p.is_file():errors.append(fn+': missing');continue
    txt=p.read_text(encoding='utf-8')
    if not txt.startswith('<!--') and fn!='README.md':errors.append(fn+': translation marker expected')
    if '# Taiwan-LLM-Sanitizer' not in txt:errors.append(fn+': title missing')
    for item in (('docs/WEBSITE_LOCALIZATION_GUIDE.zh-CN.md' if fn=='README.zh-CN.md' else SOURCE),RIGHTS):
      if item not in txt:errors.append(fn+': missing '+item)
    if EXAMPLE_PREFIX not in txt:errors.append(fn+': missing original examples link')
    for item in MILESTONES:
      if item not in txt:errors.append(fn+': milestone '+item)
    for item in LANGUAGE_LINKS:
      if item not in txt:errors.append(fn+': language switch '+item)
    if any(x in txt.casefold() for x in FORBIDDEN_WORDS) or FORBIDDEN_RELEASE in txt.casefold():errors.append(fn+': retired site-specific distribution reference')
    if fn!='README.md':
      if MARKER.findall(txt)!=[sha]:errors.append(fn+': SOURCE_README_SHA256 mismatch')
      if 'HUMAN_TRANSLATION_REVIEW' not in txt:errors.append(fn+': translation-review caveat missing')
    for href in re.findall(r'\]\(([^)\s]+)',txt):
      if href.startswith(('https://','http://','mailto:','#')):continue
      target=(p.parent/href.split('#',1)[0]).resolve()
      if not target.is_relative_to(ROOT) or not target.is_file():errors.append(fn+': invalid relative link '+href)
  return errors

if __name__=='__main__':
  if '--self-test' in sys.argv:
    assert FORBIDDEN_RELEASE not in 'A plain generic introduction'
    assert 'pok'+'émon' in FORBIDDEN_WORDS
    print('README_I18N_TEST_PASS')
  else:
    problems=run()
    if problems:
      for p in problems:print('README_I18N_BLOCKED',p,file=sys.stderr)
      raise SystemExit(1)
    print('README_I18N_SYNC_PASS: 6 languages and rights policy')
