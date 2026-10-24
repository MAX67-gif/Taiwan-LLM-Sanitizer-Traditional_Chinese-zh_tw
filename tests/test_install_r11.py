"""R11 version parity, generated ZIP, opt-in source contracts and legacy R5 freeze."""
from pathlib import Path
from zipfile import ZipFile
import json,re,hashlib
ROOT=Path(__file__).resolve().parents[1]
def read(p):return (ROOT/p).read_text(encoding='utf8')
manifest=json.loads(read('src/r11/chrome/manifest.json'))
assert manifest['version']=='0.5.0' and manifest['manifest_version']==3
assert manifest['permissions']==['activeTab','scripting','storage']
assert not manifest.get('host_permissions')
assert 'optional_host_permissions' in manifest
assert '0.5.0' in read('tools/build_r11.py')
assert 'R11' in read('src/r11/chrome/popup.html')
assert 'R11' in read('src/r11/userscript/adapter.js')
assert 'R11' in read('src/r11/chrome/manifest.json')
assert 'R11' in read('dist/r11/userscript/TaiwanLLMSanitizerR11.user.js')
assert 'R11' in read('README.md')
assert 'R11' in read('docs/INSTALL_CHROME.md')
assert 'R11' in read('docs/INSTALL_TAMPERMONKEY.md')
assert 'R11' in read('docs/R11_SITE_GLOSSARY.md')
assert 'R11' in read('CHANGELOG.md')
assert '0.5.0' in read('dist/r11/chrome/manifest.json')
old=json.loads(read('src/chrome/manifest.json'))
assert old['version']=='0.4.0', 'R5 baseline must not be rewritten'
userscript=read('dist/r11/userscript/TaiwanLLMSanitizerR11.user.js')
assert userscript.count('// ==UserScript==')==1
assert '// @version      0.5.0' in userscript
assert '// @require' not in userscript and '// @connect' not in userscript
for name in ('lexicon_pack.js','preferences.js','entities.js','engine.js','provider.js','web_adapter.js',
             'progress_ui.js','user_terms_r9.js','site_glossary_r11.js'):
    assert read('src/core/'+name)==read('dist/r11/chrome/'+name)
    assert read('src/core/'+name) in userscript
for name in ('popup.html','popup.js','content.js','manifest.json'):
    assert read('src/r11/chrome/'+name)==read('dist/r11/chrome/'+name)
with ZipFile(ROOT/'dist/r11/TLS_Chrome_MV3_R11_20261025.zip') as z:
    assert z.testzip() is None
    assert set(z.namelist())=={p.name for p in (ROOT/'dist/r11/chrome').iterdir() if p.is_file()}
sha_text=read('dist/r11/SHA256SUMS_R11_20261025.txt')
for line in sha_text.strip().splitlines():
    digest,p=line.split('  ',1)
    assert hashlib.sha256((ROOT/'dist/r11'/p).read_bytes()).hexdigest()==digest
assert 'fetch(' not in read('src/core/site_glossary_r11.js')
assert 'XMLHttpRequest(' not in read('src/r11/chrome/content.js')
assert 'connect-src' not in read('src/r11/chrome/popup.js')
print('TLS R11 VERSION/INSTALL/ZIP/SHA/LEGACY_FREEZE PASS')
