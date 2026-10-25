"""Release tree guard: only original general-purpose TLS tools may remain public."""
from pathlib import Path
import subprocess,re
ROOT=Path(__file__).resolve().parents[1]
RETIRED_NAME='poke'+'bonk'
RETIRED_BRAND='pok'+'émon'
WHITELIST=['README.md','README.en.md','README.es.md','README.ja.md','README.ko.md','AGENTS.md','CHANGELOG.md','.github/workflows/ci.yml','docs/ROADMAP.md']

def main():
  files=subprocess.run(['git','ls-files','-z'],cwd=ROOT,check=True,capture_output=True).stdout.decode('utf-8').split('\0')
  files=[f for f in files if f]
  viol=[f for f in files if RETIRED_NAME in f.casefold() or RETIRED_BRAND in f.casefold() or re.search(r'(^|/)src/demos/.*game',f,re.I)]
  assert not viol,'Retired named-game files are not permitted in public repo: '+repr(viol)
  for f in WHITELIST:
    text=(ROOT/f).read_text(encoding='utf-8').casefold()
    assert RETIRED_NAME not in text, f+': game-specific reference remains'
    assert RETIRED_BRAND not in text, f+': third-party game brand remains'
  ci=(ROOT/'.github/workflows/ci.yml').read_text(encoding='utf-8')
  assert 'r7-poke'+'bonk-demo-release' not in ci
  assert (ROOT/'docs/WEBSITE_LOCALIZATION_GUIDE.md').is_file()
  assert (ROOT/'docs/THIRD_PARTY_RIGHTS_POLICY.md').is_file()
  assert not (ROOT/'.github/workflows/retire-third-party-demo.yml').exists(), 'One-time deletion workflow must not remain installed'
  print('PUBLIC_THIRD_PARTY_DISTRIBUTION_GUARD_PASS',len(files),'files')
if __name__=='__main__':main()
