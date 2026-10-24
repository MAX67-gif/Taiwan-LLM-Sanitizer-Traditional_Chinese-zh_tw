"""R13 release parity/version/security, without changing R5/R11 frozen installers."""
from pathlib import Path
from zipfile import ZipFile
import hashlib,json
ROOT=Path(__file__).resolve().parents[1]
read=lambda p:(ROOT/p).read_text('utf8')
version=json.loads(read('src/r13/chrome/manifest.json'))
assert version['version']=='0.6.0' and version['manifest_version']==3
assert version['permissions']==['activeTab','scripting','storage']
assert not version.get('host_permissions')
assert set(version['optional_host_permissions'])=={'http://*/*','https://*/*'}
assert json.loads(read('src/r11/chrome/manifest.json'))['version']=='0.5.0'
assert json.loads(read('src/chrome/manifest.json'))['version']=='0.4.0'
assert 'R13' in read('src/r13/chrome/popup.html')
assert 'R13' in read('README.md')
assert 'R13' in read('CHANGELOG.md')
assert '點選' in read('docs/R13_BILINGUAL_READER.md')
assert 'R13' in read('docs/INSTALL_CHROME.md')
assert 'R13' in read('docs/INSTALL_TAMPERMONKEY.md')
assert '0.6.0' in read('tools/build_r13.py')
assert 'R13' in read('dist/r13/userscript/TaiwanLLMSanitizerR13.user.js')
text=read('dist/r13/userscript/TaiwanLLMSanitizerR13.user.js')
assert text.count('// ==UserScript==')==1
assert '// @version      0.6.0' in text
assert '// @require' not in text and '// @connect' not in text
assert read('src/core/bilingual_reader_r13.js') in text
assert read('src/r13/reader_ui_r13.js') in text
assert read('src/r13/userscript/adapter.js') in text
for name in ('manifest.json','popup.html','popup.js','content.js'):
    assert read('src/r13/chrome/'+name)==read('dist/r13/chrome/'+name)
for name,src in (('bilingual_reader_r13.js','src/core/bilingual_reader_r13.js'),('reader_ui_r13.js','src/r13/reader_ui_r13.js')):
    assert read(src)==read('dist/r13/chrome/'+name)
with ZipFile(ROOT/'dist/r13/TLS_Chrome_MV3_R13_20261025.zip') as z:
    assert z.testzip() is None
    assert set(z.namelist())=={p.name for p in (ROOT/'dist/r13/chrome').iterdir() if p.is_file()}
for line in read('dist/r13/SHA256SUMS_R13_20261025.txt').strip().splitlines():
    h,f=line.split('  ',1)
    assert hashlib.sha256((ROOT/'dist/r13'/f).read_bytes()).hexdigest()==h,f
assert 'fetch(' not in read('src/r13/reader_ui_r13.js')
assert 'XMLHttpRequest(' not in read('src/r13/chrome/content.js')
assert 'GM_xmlhttpRequest(' not in read('src/r13/userscript/adapter.js')
assert json.loads(read('lexicon/ui_actions_r13.json'))['auto_apply'] is False
print('R13 VERSION/PARITY/INSTALL/SHA/PRIVACY PASS')
