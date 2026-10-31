"""Deterministic, exact-member R17.7 standalone Chrome MV3 installer."""
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED
import io
import sys
ROOT=Path(__file__).resolve().parents[1]
OUTPUT=ROOT/'dist/TLS_Chrome_MV3_MRFT_R177_20261031.zip'
UNPACKED=ROOT/'dist/r177/chrome'
MEMBERS={
    'manifest.json':'src/r177/chrome/manifest.json',
    'popup.html':'src/r177/chrome/popup.html',
    'popup.js':'src/r177/chrome/popup.js',
    'content.js':'src/r177/chrome/content.js',
    'README_INSTALL.md':'src/r177/chrome/README_INSTALL.md',
    'LICENSE':'LICENSE',
    'src/core/provider_capability_r14.js':'src/core/provider_capability_r14.js',
    'src/core/mrft_local_provider_r177.js':'src/core/mrft_local_provider_r177.js',
    'src/core/mrft_regions_r177.js':'src/core/mrft_regions_r177.js',
    'src/r177/mrft_dom_r177.js':'src/r177/mrft_dom_r177.js',
    'src/r177/fixture_r177.js':'src/r177/fixture_r177.js',
    'docs/mrft/MRFT_ORIGINAL_FIXTURE.html':'docs/mrft/MRFT_ORIGINAL_FIXTURE.html',
}
def files(): return {name:(ROOT/path).read_bytes() for name,path in sorted(MEMBERS.items())}
def archive_bytes():
    out=io.BytesIO()
    with ZipFile(out,'w',ZIP_DEFLATED,compresslevel=9) as archive:
        for name,data in files().items():
            info=ZipInfo(name,(2026,10,31,0,0,0));info.create_system=3;info.external_attr=0o100644<<16
            archive.writestr(info,data,compress_type=ZIP_DEFLATED,compresslevel=9)
    return out.getvalue()
def build(check=False):
    artifacts={UNPACKED/name:data for name,data in files().items()};artifacts[OUTPUT]=archive_bytes()
    for path,data in artifacts.items():
        if check:
            if not path.is_file() or path.read_bytes()!=data: raise RuntimeError('R177_PARITY_FAIL:'+str(path.relative_to(ROOT)))
        else:
            path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
    if check and {p.relative_to(UNPACKED).as_posix() for p in UNPACKED.rglob('*') if p.is_file()} != set(MEMBERS):raise RuntimeError('R177_UNEXPECTED_MEMBER')
    print('R177 BUILD/PARITY PASS',len(MEMBERS),'members')
    return OUTPUT
if __name__=='__main__':build(check='--check' in sys.argv)
