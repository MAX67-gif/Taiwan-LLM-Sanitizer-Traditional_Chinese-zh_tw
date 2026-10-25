"""Six-language original examples: ID parity, master SHA, local links and rights boundaries."""
from __future__ import annotations
import hashlib,re,sys
from pathlib import Path
from check_readme_i18n import FORBIDDEN_WORDS
ROOT=Path(__file__).resolve().parents[1]
DOCS=ROOT/'docs'
LANGUAGES=('','zh-CN','en','ja','ko','es')
IDS=tuple(f'EX{i:02d}' for i in range(1,10))
MARKER=re.compile(r'<!-- SOURCE_EXAMPLES_SHA256:([0-9a-f]{64}) -->')
HEADING=re.compile(r'^## (EX\d\d)\b',re.M)
GUIDE='docs/WEBSITE_LOCALIZATION_GUIDE.zh-CN.md'

def validate()->list[str]:
    errors=[]
    master=DOCS/'USAGE_EXAMPLES.md'
    if not master.is_file():return ['missing master original examples']
    sha=hashlib.sha256(master.read_bytes()).hexdigest()
    for lang in LANGUAGES:
        name='USAGE_EXAMPLES'+('.'+lang if lang else '')+'.md'
        p=DOCS/name
        if not p.is_file():errors.append(name+':missing');continue
        raw=p.read_text(encoding='utf-8')
        found=HEADING.findall(raw)
        if len(found)!=len(IDS) or tuple(found)!=IDS:
            errors.append(name+':example IDs missing/reordered/duplicated')
        if lang:
            if MARKER.findall(raw)!=[sha]:errors.append(name+':SOURCE_EXAMPLES_SHA256 invalid')
            if 'HUMAN_TRANSLATION_REVIEW' not in raw:errors.append(name+':human review status missing')
        for token in ('R11','R13','R14','R15','Canvas','WebGL','README'):
            if token=='README':
                if 'USAGE_EXAMPLES.zh-CN.md' not in raw:errors.append(name+':language links missing')
            elif token not in raw:errors.append(name+':'+token+' omitted')
        if any(word in raw.casefold() for word in FORBIDDEN_WORDS):
            errors.append(name+':retired third-party specific content')
        for href in re.findall(r'\]\(([^)\s]+)',raw):
            if href.startswith(('https://','http://','mailto:','#')):continue
            target=(p.parent/href.split('#',1)[0]).resolve()
            if not target.is_relative_to(ROOT) or not target.is_file():
                errors.append(name+':broken local link '+href)
    if not (ROOT/GUIDE).is_file():errors.append(GUIDE+':missing')
    return errors

if __name__=='__main__':
    if '--self-test' in sys.argv:
        assert HEADING.findall('## EX01 | A\n## EX01 | duplicate')==['EX01','EX01']
        assert tuple(HEADING.findall('\n'.join(f'## EX{i:02d} | text' for i in range(1,10))))==IDS
        assert FORBIDDEN_WORDS
        print('EXAMPLES_I18N_SELF_TEST_PASS')
    else:
        errors=validate()
        if errors:
            for error in errors:print('EXAMPLES_I18N_BLOCKED',error,file=sys.stderr)
            raise SystemExit(1)
        print('EXAMPLES_I18N_SYNC_PASS: 6 languages, 9 original examples each')
