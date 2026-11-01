"""Original deterministic regression cases, not a human language benchmark."""
import importlib.util, json, subprocess, sys, tempfile, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SCRIPT=ROOT/'scripts/audit_markdown.py'
spec=importlib.util.spec_from_file_location('audit_v2',SCRIPT)
A=importlib.util.module_from_spec(spec);spec.loader.exec_module(A)

class ContextV2(unittest.TestCase):
 def decisions(self,text,rule='TW_MENU'):
  return [x for x in A.scan_text(text,True)['private_local_positions_only'] if x['rule_id']==rule]
 def test_cjk_english_adjacent_ui_menu(self):
  r=self.decisions('請開啟軟體menu設定。');self.assertEqual(len(r),1);self.assertEqual(r[0]['candidate'],'選單')
 def test_cjk_english_adjacent_food_menu(self):
  r=self.decisions('餐廳menu提供晚餐。');self.assertEqual(len(r),1);self.assertEqual(r[0]['candidate'],'菜單')
 def test_code_cannot_supply_food_context(self):
  r=self.decisions('menu `restaurant`');self.assertEqual(r[0]['state'],'NEEDS_CONTEXT')
 def test_url_cannot_supply_ui_context(self):
  r=self.decisions('menu https://example.org/software');self.assertEqual(r[0]['state'],'NEEDS_CONTEXT')
 def test_html_attribute_cannot_supply_context(self):
  r=self.decisions('menu <i title="software"></i>');self.assertEqual(r[0]['state'],'NEEDS_CONTEXT')
 def test_other_sentence_cannot_supply_context(self):
  r=self.decisions('menu。另一段描述餐廳。');self.assertEqual(r[0]['state'],'NEEDS_CONTEXT')
 def test_two_semicolon_clauses_have_separate_domains(self):
  r=self.decisions('餐廳 menu；software menu');self.assertEqual([x['candidate'] for x in r],['菜單','選單'])
 def test_unknown_default_not_automatically_a_setting(self):
  r=self.decisions('他默認了這項安排。','TW_DEFAULT');self.assertEqual(r[0]['state'],'KEEP_ORIGINAL')
 def test_bare_default_needs_context(self):
  r=self.decisions('默認','TW_DEFAULT');self.assertEqual(r[0]['state'],'NEEDS_CONTEXT')
 def test_restore_default_has_setting_context(self):
  r=self.decisions('恢復默认。','TW_DEFAULT');self.assertEqual(r[0]['candidate'],'預設')
 def test_nested_relative_destination_is_fully_protected(self):
  r=A.scan_text('[說明](docs/a_(b)/menu.md)',True)
  self.assertEqual(r['counts']['BLOCKED_TECH'],1);self.assertEqual(r['counts']['SUGGEST'],0)
 def test_reference_definition_is_protected(self):
  r=A.scan_text('[docs]: ./menu.md "software"',True);self.assertEqual(r['counts']['BLOCKED_TECH'],1)
 def test_multiline_inline_code_is_protected(self):
  r=A.scan_text('`code\nmenu software\nend`',True);self.assertEqual(r['counts']['SUGGEST'],0)
 def test_english_identifier_boundaries(self):
  r=A.scan_text('submenu onClick clickbait menu_id menubar');self.assertEqual(sum(r['counts'].values()),0)
 def test_control_characters_do_not_escape_report(self):
  r=A.scan_text('私人客戶\nsoftware menu');self.assertNotIn('私人客戶',json.dumps(r,ensure_ascii=False))

class ComparatorV2(unittest.TestCase):
 def compare(self,s,t):
  self.assertTrue(callable(getattr(A,'compare_texts',None)),'comparison function not implemented')
  return A.compare_texts(s,t)
 def test_valid_prose_edit_preserves_known_structures(self):
  s='# 安裝\n軟件 `menu` 有 3 項設定，參閱[文件](./a_(b)/menu.md)。'
  t='# 安裝\n軟體 `menu` 有 3 項設定，參閱[說明](./a_(b)/menu.md)。'
  r=self.compare(s,t);self.assertEqual(r['status'],'CHECKS_PASSED_NOT_SEMANTIC_CERTIFIED')
 def test_code_change_blocks(self):
  r=self.compare('軟件 `menu=3`','軟體 `menu=4`');self.assertEqual(r['status'],'BLOCKED_INTEGRITY')
 def test_url_change_blocks(self):
  r=self.compare('[software menu](https://example.org/x)','[軟體選單](https://example.org/y)');self.assertEqual(r['status'],'BLOCKED_INTEGRITY')
 def test_placeholder_change_blocks(self):
  r=self.compare('software {{name}}','軟體 {{名稱}}');self.assertEqual(r['status'],'BLOCKED_INTEGRITY')
 def test_quantity_change_blocks(self):
  r=self.compare('費用為 3.14 元。','費用為 31.4 元。');self.assertEqual(r['status'],'BLOCKED_INTEGRITY')
 def test_fence_content_change_blocks(self):
  r=self.compare('```js\nconst x=1\n```','```js\nconst x=2\n```');self.assertEqual(r['status'],'BLOCKED_INTEGRITY')
 def test_named_program_change_blocks(self):
  r=self.compare('申請 Codex for Open Source。','申請開源法典。');self.assertEqual(r['status'],'BLOCKED_INTEGRITY')
 def test_negation_loss_is_warning_not_semantic_proof(self):
  r=self.compare('請勿刪除原稿。','請刪除原稿。');self.assertEqual(r['status'],'REVIEW_REQUIRED');self.assertIn('NEGATION_SIGNAL_CHANGED',r['warnings'])
 def test_markdown_heading_level_change_blocks(self):
  r=self.compare('## software','### 軟體');self.assertEqual(r['status'],'BLOCKED_INTEGRITY')
 def test_frontmatter_change_blocks(self):
  r=self.compare('---\nkey: menu\n---\nsoftware','---\nkey: 選單\n---\n軟體');self.assertEqual(r['status'],'BLOCKED_INTEGRITY')
 def test_unclosed_fence_cannot_claim_success(self):
  r=self.compare('```\ncode','```\ncode');self.assertEqual(r['status'],'LIMITED')
 def test_source_or_translation_not_in_report(self):
  s='PRIVATE_CLIENT_9482\n讀取 `token_secret_912`。';r=self.compare(s,s);raw=json.dumps(r,ensure_ascii=False)
  for x in ['PRIVATE_CLIENT_9482','token_secret_912','source_text','source_hash']:self.assertNotIn(x,raw)
 def test_missing_table_structure_is_blocked(self):
  r=self.compare('| Name | Count |\n|---|---|\n| Menu | 3 |','Name Count\nMenu 3');self.assertEqual(r['status'],'BLOCKED_INTEGRITY')

class CliV2(unittest.TestCase):
 def test_error_never_discloses_local_path(self):
  with tempfile.TemporaryDirectory() as d:
   p=Path(d)/'PRIVATE_CUSTOMER_894.md';p.write_text('軟件',encoding='utf8')
   out=Path(d)/'report.json';out.write_text('unchanged')
   r=subprocess.run([sys.executable,str(SCRIPT),'--input',str(p),'--output',str(out)],capture_output=True,text=True)
   self.assertEqual(r.returncode,2);self.assertNotIn(str(out),r.stderr);self.assertNotIn(d,r.stderr)
 def test_comparison_command_valid_and_invalid(self):
  with tempfile.TemporaryDirectory() as d:
   s=Path(d)/'s.md';t=Path(d)/'t.md';s.write_text('軟件 `menu` 3',encoding='utf8');t.write_text('軟體 `menu` 3',encoding='utf8')
   r=subprocess.run([sys.executable,str(SCRIPT),'--input',str(s),'--compare',str(t)],capture_output=True,text=True)
   self.assertEqual(r.returncode,0,r.stderr);self.assertIn('NOT_SEMANTIC',r.stdout)
   t.write_text('軟體 `menux` 4',encoding='utf8')
   r=subprocess.run([sys.executable,str(SCRIPT),'--input',str(s),'--compare',str(t)],capture_output=True,text=True)
   self.assertEqual(r.returncode,3,r.stderr);self.assertEqual(s.read_text(), '軟件 `menu` 3')
 def test_revised_output_not_overwritten(self):
  with tempfile.TemporaryDirectory() as d:
   s=Path(d)/'s.md';t=Path(d)/'t.md';s.write_text('軟件');t.write_text('軟體')
   r=subprocess.run([sys.executable,str(SCRIPT),'--input',str(s),'--compare',str(t),'--output',str(t)],capture_output=True,text=True)
   self.assertEqual(r.returncode,2);self.assertEqual(t.read_text(),'軟體')
if __name__=='__main__':unittest.main(verbosity=2)
