"""Static offline task launcher verifier for repository and full suite layouts."""
from pathlib import Path
import argparse,re,sys
from urllib.parse import unquote
from zipfile import ZipFile
ROOT=Path(__file__).resolve().parents[1]

def verify(html, members):
    urls=re.findall(r'href="([^"]+)"',html)
    if not urls:raise ValueError('NO_START_LINKS')
    for item in urls:
        x=unquote(item)
        if any(c in x for c in ('\\','?', '#')) or x.startswith(('/', 'http:','https:')) or '..' in x.split('/') or x not in members:
            raise ValueError('START_HERE_MISSING_OR_UNSAFE:'+x)
    return len(urls)

def main():
    p=argparse.ArgumentParser();p.add_argument('--suite',type=Path);a=p.parse_args()
    if a.suite:
        with ZipFile(a.suite) as z:
            names=set(z.namelist());html=z.read('START_HERE.html').decode('utf8')
        print('SUITE_START_HERE_PASS',verify(html,names))
    else:
        html=(ROOT/'START_HERE.html').read_text(encoding='utf8')
        names={p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*') if p.is_file()}
        print('REPO_START_HERE_PASS',verify(html,names))
if __name__=='__main__':main()
