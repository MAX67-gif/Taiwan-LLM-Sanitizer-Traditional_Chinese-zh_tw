"""Offline, opt-in import provenance: NO LLM calls, NO document text in report."""
from __future__ import annotations
import argparse
import json
import hashlib
from pathlib import Path
import sys

_ALLOWED_PROVIDERS = {'CODEX', 'CLAUDE', 'GROK', 'OTHER_DECLARED'}
_HEX = set('0123456789abcdef')

def validate_manifest(x: object):
    if not isinstance(x, dict) or set(x) != {'schema','provider','model_id','model_version', 'prompt_sha256','run_id','rights_attested','explicit_consent','execution_mode','recorded_at'}:
        raise ValueError('MANIFEST_FIELDS_INVALID')
    if x['schema'] != 'tls.r173.offline-model-import.v1' or x['provider'] not in _ALLOWED_PROVIDERS:
        raise ValueError('MANIFEST_VERSION_OR_PROVIDER')
    for key, cap in (('model_id', 96), ('model_version', 96), ('run_id', 64), ('recorded_at', 40)):
        if not isinstance(x[key], str) or not x[key] or len(x[key]) > cap or any(ord(c) < 32 for c in x[key]):
            raise ValueError('MANIFEST_INVALID_MODEL_IDENTITY')
    if not isinstance(x['prompt_sha256'], str) or len(x['prompt_sha256']) != 64 or not set(x['prompt_sha256']) <= _HEX:
        raise ValueError('PROMPT_SHA_INVALID')
    if x['rights_attested'] is not True or x['explicit_consent'] is not True:
        raise ValueError('RIGHTS_OR_CONSENT_MISSING')
    if x['execution_mode'] != 'EXTERNALLY_EXECUTED_BY_AUTHORIZED_USER':
        raise ValueError('DO_NOT_MISLABEL_CLOUD_EVIDENCE')
    return x

def summarize(manifest, output_bytes):
    validate_manifest(manifest)
    text = output_bytes.decode('utf-8', 'strict')
    if not text.strip() or '\0' in text or len(output_bytes) > 65_536:
        raise ValueError('INVALID_OR_OVERSIZED_MODEL_TEXT')
    # Linkable hash only in private local report (not public metadata).
    return {'schema':'tls.r173.model-import-receipt.v1', 'status':'USER_PROVIDED_NOT_INDEPENDENTLY_VERIFIED',
            'provider':manifest['provider'], 'model_id':manifest['model_id'],
            'model_version':manifest['model_version'], 'run_id':manifest['run_id'],
            'prompt_sha256':manifest['prompt_sha256'], 'local_output_sha256':hashlib.sha256(output_bytes).hexdigest(),
            'output_bytes':len(output_bytes), 'human_review':'NOT_MEASURED',
            'contains_output_text':False, 'network_requested':False,
            'consent_declared':True, 'model_execution_verified':False}

def run(argv=None):
    parser=argparse.ArgumentParser(description='Import a previously generated authorized AI result OFFLINE')
    parser.add_argument('--manifest',required=True)
    parser.add_argument('--result',required=True)
    parser.add_argument('--local-receipt',required=True)
    args=parser.parse_args(argv)
    fields=[Path(x).resolve() for x in (args.manifest,args.result,args.local_receipt)]
    if len(set(fields)) != 3 or not fields[0].is_file() or not fields[1].is_file() or fields[2].exists():
        raise ValueError('LOCAL_FILES_MISSING_OR_OVERLAPPING')
    receipt=summarize(json.loads(fields[0].read_text('utf-8')),fields[1].read_bytes())
    with fields[2].open('x',encoding='utf-8') as o:
        json.dump(receipt,o,indent=2,ensure_ascii=False);o.write('\n')
    print(json.dumps({'status':receipt['status'],'contains_output_text':False,'network_requested':False}))
    return 0
if __name__=='__main__':
    try:sys.exit(run())
    except (ValueError,OSError,UnicodeError, json.JSONDecodeError) as exc:
        print(json.dumps({'status':'IMPORT_REJECTED', 'reason_code':str(exc).split(':')[0][:64]}),file=sys.stderr)
        sys.exit(2)
