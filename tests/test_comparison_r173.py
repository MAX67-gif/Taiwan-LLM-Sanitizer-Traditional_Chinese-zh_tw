"""Synthetic R17.3 technical gates, NOT real OpenCC/LLM/human quality evaluation."""
import importlib.util
import json
import sys
import tempfile
from pathlib import Path
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
R=ROOT/'research'/'comparison'/'r173'
sys.path.insert(0,str(R))
import opencc_adapter as O
import score_and_audit as S
import import_model_result as M

class FakeConverter:
    """Explicit test-only stub, NOT OpenCC performance data."""
    def convert(self,s):return s.replace('數據庫','資料庫')

class ComparisonR173Test(unittest.TestCase):
    def test_probe_missing_opencc_returns_unavailable(self):
        with patch.object(O,'get_native_converter',side_effect=O.BaselineUnavailable('OPENCC_NOT_INSTALLED_OR_S2TWP_UNAVAILABLE')):
            self.assertEqual(O.run(['--probe']),3)

    def test_utf16_span_preserves_surroundings_and_hash(self):
        source='😀 數據庫 `數據庫`'; start=source.index('數據庫')+1 # +1 for surrogate pair in UTF16
        import hashlib
        m={'schema':'tls.r173.editable-spans.v1','format':'markdown','offset_unit':'utf16','status':'READY',
           'source_sha256':hashlib.sha256(source.encode('utf-8')).hexdigest(),
           'source_length_utf16':len(source.encode('utf-16-le'))//2,
           'spans':[{'id':'s12345','start':start,'end':start+3}]}
        output, n=O.convert_editable(source,m,FakeConverter())
        self.assertEqual(n,1)
        self.assertEqual(output,'😀 資料庫 `數據庫`')

    def test_manifest_hash_mismatch_rejected(self):
        source='數據庫'
        m={'schema':'tls.r173.editable-spans.v1','format':'markdown','offset_unit':'utf16','status':'READY','source_sha256':'0'*64,'source_length_utf16':3,'spans':[{'id':'s00001','start':0,'end':3}]}
        with self.assertRaisesRegex(ValueError,'SOURCE_HASH_MISMATCH'):O.convert_editable(source,m,FakeConverter())

    def test_surrogate_half_ranges_rejected(self):
        source='😀數據庫';import hashlib
        m={'schema':'tls.r173.editable-spans.v1','format':'markdown','offset_unit':'utf16','status':'READY',
           'source_sha256':hashlib.sha256(source.encode()).hexdigest(),'source_length_utf16':5,
           'spans':[{'id':'s00001','start':1,'end':5}]}
        with self.assertRaisesRegex(ValueError,'INVALID_EDITABLE_SPANS'):O.convert_editable(source,m,FakeConverter())

    def test_native_converter_real_library_never_replaced_with_fixture(self):
        # This is a deliberate reference-mode test, not a real OpenCC invocation.
        with patch.object(O,'get_native_converter',side_effect=O.BaselineUnavailable('NO_LIB')):
            self.assertEqual(O.run(['--probe']),3)

    def test_model_result_declared_consent_required(self):
        value={'schema':'tls.r173.offline-model-import.v1','provider':'GROK','model_id':'grok-user-declared','model_version':'user-known','prompt_sha256':'f'*64,'run_id':'case001','rights_attested':True,'explicit_consent':False,'execution_mode':'EXTERNALLY_EXECUTED_BY_AUTHORIZED_USER','recorded_at':'2026-10-27'}
        with self.assertRaisesRegex(ValueError,'CONSENT'):M.summarize(value,b'hello')
        value['explicit_consent']=True
        result=M.summarize(value,b'hello')
        self.assertEqual(result['status'],'USER_PROVIDED_NOT_INDEPENDENTLY_VERIFIED')
        self.assertNotIn('hello',json.dumps(result));self.assertFalse(result['network_requested'])

    def sample(self,**kw):
        x={'schema':S.SCHEMA,'case_id':'DEV_001','lane':'L1_EDITABLE_TEXT','arm':'OPENCC_S2TWP','evidence_class':'DEV_ONLY','status':'NOT_RUN'}
        x.update(kw);return x

    def test_absent_baselines_remain_not_run_and_zero_denominators_are_na(self):
        result=S.aggregate([self.sample(), self.sample(arm='LLM_DECLARED',status='BASELINE_NOT_AVAILABLE')])
        self.assertEqual(result['status'],'RESEARCH_ONLY_NO_PROMOTION')
        self.assertEqual(result['groups'][0]['suggestion_acceptability'],None)
        self.assertEqual(len(result['groups']),2)

    def test_no_scores_for_unexecuted_cases(self):
        with self.assertRaisesRegex(ValueError,'UNEXECUTED'):S.aggregate([self.sample(suggestions_reviewed=3)])

    def test_duplicate_cohort_rejected(self):
        x=self.sample()
        with self.assertRaisesRegex(ValueError,'DUPLICATE'):S.aggregate([x,x])

    def test_critical_safety_not_offset_by_acceptable_suggestions(self):
        x=self.sample(status='EXECUTED',critical_unauthorized_change_count=1,suggestions_reviewed=20,suggestions_acceptable=20)
        result=S.aggregate([x]);self.assertEqual(result['status'],'BLOCKED_CRITICAL_SAFETY')
        self.assertEqual(result['critical_events'],1)

    def test_no_fake_reviewer(self):
        with self.assertRaisesRegex(ValueError,'HUMAN_PROVENANCE'):S.aggregate([self.sample(status='EXECUTED',reviewers=[{'reviewer_code':'1','decision':'ACCEPTABLE'},{'reviewer_code':'2','decision':'ACCEPTABLE'}])])
        with self.assertRaisesRegex(ValueError,'REVIEWERS_NOT_INDEPENDENT'):S.aggregate([self.sample(status='EXECUTED',consent_verified=True,evidence_class='CONSENTED_REVIEWER_REPORT',reviewers=[{'reviewer_code':'1','decision':'ACCEPTABLE'},{'reviewer_code':'1','decision':'ACCEPTABLE'}])])

    def test_prohibit_public_linkable_or_raw_data(self):
        for k in ('original_text','source_sha256','email','api_key'):
            with self.assertRaisesRegex(ValueError,'PRIVATE'):S.aggregate([self.sample(**{k:'x'})])

    def test_dev_sample_cannot_claim_fresh_oos(self):
        with self.assertRaisesRegex(ValueError,'FRESH_OOS'):S.aggregate([self.sample(fresh_oos=True)])

    def test_reviewers_differences_not_flattened_as_unanimous(self):
        x=self.sample(status='EXECUTED',evidence_class='CONSENTED_REVIEWER_REPORT',consent_verified=True,
            suggestions_reviewed=2,suggestions_acceptable=1,reviewers=[{'reviewer_code':'anonA','decision':'ACCEPTABLE'},{'reviewer_code':'anonB','decision':'UNSURE'}])
        res=S.aggregate([x]);self.assertEqual(res['groups'][0]['reviewer_agreement_cases'],0)
        self.assertEqual(res['groups'][0]['independent_two_reviewer_claim_count'],1)
        self.assertTrue(res['groups'][0]['no_one_dimensional_leaderboard'])

if __name__=='__main__':unittest.main()
