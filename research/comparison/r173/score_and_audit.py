"""R17.3 non-promotional aggregation of mutually separated observation arms.

No automatic language correctness claim. Missing human evidence => NOT_MEASURED.
Records must be original de-identified counts, no raw text/source hashes.
"""
from __future__ import annotations
from collections import defaultdict
from pathlib import Path
import argparse,json,math,sys

SCHEMA='tls.r173.review-observation.v1'
LANES={'L1_EDITABLE_TEXT','L2_RAW_DOCUMENT','L2_EQUAL_PROTECTION','L3_USER_TASK','L4_RETURN_USAGE'}
ARMS={'TLS_R172','NAIVE_LITERAL','OPENCC_S2TWP','LLM_DECLARED','R16_MANUAL','USER_WORKFLOW'}
CLASSES={'DEV_ONLY','CONSENTED_USER_SELF_REPORT','CONSENTED_REVIEWER_REPORT','EXTERNAL_VERIFIED'}
STATES={'EXECUTED','NOT_RUN','BASELINE_NOT_AVAILABLE','REJECTED','TIMEOUT'}
FORBIDDEN={'source','input_text','original_text','output_text','replacement_text','document','private_path','source_sha256','email','phone','ip_address','user_agent','username','full_name','token','secret','api_key'}
METRICS=('critical_unauthorized_change_count','protected_segments_checked','suggestions_reviewed',
         'suggestions_acceptable','eligible_opportunities','eligible_opportunities_hit',
         'task_success','time_to_safe_export_seconds')


def safe_number(value,integer=True):
    if isinstance(value,bool):return False
    if integer:return isinstance(value,int) and 0 <= value <= 1_000_000
    return isinstance(value,(int,float)) and math.isfinite(value) and 0 <= value <= 1_000_000

def validate_record(item):
    if not isinstance(item,dict) or item.get('schema')!=SCHEMA or set(item)&FORBIDDEN:
        raise ValueError('INVALID_SCHEMA_OR_PRIVATE_CONTENT')
    if item.get('lane') not in LANES or item.get('arm') not in ARMS or item.get('evidence_class') not in CLASSES or item.get('status') not in STATES:
        raise ValueError('INVALID_ROUTE')
    if not isinstance(item.get('case_id'),str) or not (1<=len(item['case_id'])<=48) or not all(c.isalnum() or c in '_-' for c in item['case_id']):
        raise ValueError('INVALID_CASE_ID')
    for key in METRICS:
        value=item.get(key)
        if value is not None and not safe_number(value,integer=key!='time_to_safe_export_seconds'):
            raise ValueError('INVALID_METRIC')
    if item.get('status')!='EXECUTED':
        if any(item.get(k) is not None for k in METRICS):raise ValueError('UNEXECUTED_CANNOT_CLAIM_SCORES')
        if item.get('reviewers'):raise ValueError('UNEXECUTED_HUMAN_REVIEW_NOT_ALLOWED')
    if item.get('suggestions_reviewed') is not None and item.get('suggestions_acceptable') is not None and item['suggestions_acceptable']>item['suggestions_reviewed']:
        raise ValueError('INVALID_ACCEPTANCE_DENOMINATOR')
    if item.get('eligible_opportunities') is not None and item.get('eligible_opportunities_hit') is not None and item['eligible_opportunities_hit']>item['eligible_opportunities']:
        raise ValueError('INVALID_COVERAGE_DENOMINATOR')
    if item.get('task_success') not in (None,0,1):raise ValueError('INVALID_TASK_SUCCESS')
    r=item.get('reviewers') or []
    if r:
        if item['evidence_class'] not in {'CONSENTED_REVIEWER_REPORT','EXTERNAL_VERIFIED'} or item.get('consent_verified') is not True:
            raise ValueError('HUMAN_PROVENANCE_MISSING')
        if not isinstance(r,list) or len(r)<2 or len(r)>4 or any(not isinstance(x,dict) or set(x)!={'reviewer_code','decision'} or x.get('decision') not in ('ACCEPTABLE','UNACCEPTABLE','UNSURE') or not isinstance(x.get('reviewer_code'),str) or len(x['reviewer_code'])>30 for x in r):
            raise ValueError('INVALID_REVIEWER_RECORD')
        if len({x['reviewer_code'] for x in r})!=len(r):raise ValueError('REVIEWERS_NOT_INDEPENDENT')
    if item.get('human_equivalence_verified') is True and not r:
        raise ValueError('HUMAN_QUALITY_WITHOUT_REVIEWERS')
    # Re-reviewing/auto promoting known design fixtures is not Fresh OOS.
    if item['evidence_class']=='DEV_ONLY' and item.get('fresh_oos') is True:
        raise ValueError('DEV_CASE_CANNOT_BE_FRESH_OOS')
    return item

def ratio(a,b):return round(a/b,6) if b else None

def aggregate(items):
    buckets=defaultdict(list);seen=set();critical=0
    for item in items:
        validate_record(item)
        k=(item['case_id'],item['lane'],item['arm'],item['evidence_class'])
        if k in seen:raise ValueError('DUPLICATE_CASE_ARM_CANNOT_DOUBLE_COUNT')
        seen.add(k);buckets[(item['lane'],item['arm'],item['evidence_class'])].append(item)
        critical+=item.get('critical_unauthorized_change_count') or 0
    groups=[]
    for (lane,arm,evidence),rows in sorted(buckets.items()):
        executed=[r for r in rows if r['status']=='EXECUTED']
        s=lambda key:sum(r.get(key) or 0 for r in executed)
        reviews=[r for r in executed if len(r.get('reviewers') or [])>=2]
        final_review_agreement=sum(len({j['decision'] for j in r['reviewers']})==1 for r in reviews)
        time_values=[r['time_to_safe_export_seconds'] for r in executed if r.get('time_to_safe_export_seconds') is not None]
        groups.append({'lane':lane,'arm':arm,'evidence_class':evidence,
          'registered_n':len(rows),'executed_n':len(executed),'unavailable_n':sum(r['status']=='BASELINE_NOT_AVAILABLE' for r in rows),
          'not_run_n':sum(r['status']=='NOT_RUN' for r in rows),
          'critical_unauthorized_change_count':s('critical_unauthorized_change_count'),
          'protected_segments_checked':s('protected_segments_checked'),
          'suggestion_acceptability':ratio(s('suggestions_acceptable'),s('suggestions_reviewed')),
          'suggestions_reviewed':s('suggestions_reviewed'),'coverage_on_eligible':ratio(s('eligible_opportunities_hit'),s('eligible_opportunities')),
          'eligible_opportunities':s('eligible_opportunities'),
          'task_success_rate':ratio(s('task_success'),sum(r.get('task_success') is not None for r in executed)),
          'timed_completed_count':len(time_values),
          'time_to_safe_export_seconds_mean':round(sum(time_values)/len(time_values),3) if time_values else None,
          'independent_two_reviewer_claim_count':len(reviews),'reviewer_agreement_cases':final_review_agreement,
          'semantic_equivalence_verified':False,'quality_not_measured':not bool(reviews),
          'no_one_dimensional_leaderboard':True})
    return {'schema':'tls.r173.aggregate.v1','status':'BLOCKED_CRITICAL_SAFETY' if critical else 'RESEARCH_ONLY_NO_PROMOTION',
            'raw_text_included':False,'source_hash_included':False,'fresh_oos_claim':False,
            'total_rows':len(items),'groups':groups,'critical_events':critical,
            'caution':'DEV_ONLY and self-reports are not external adoption or native-speaker certification. No score-based promotion.'}

def main(argv=None):
    parser=argparse.ArgumentParser();parser.add_argument('--input',required=True);parser.add_argument('--output',required=True);args=parser.parse_args(argv)
    inp,out=Path(args.input).resolve(),Path(args.output).resolve()
    if not inp.is_file() or inp==out or out.exists():raise ValueError('NO_OVERWRITE_OR_INPUT')
    data=inp.read_text('utf-8')
    if len(data)>500_000:raise ValueError('INPUT_LIMIT')
    rows=[json.loads(line) for line in data.splitlines() if line.strip()]
    if len(rows)>1000:raise ValueError('ROW_LIMIT')
    result=aggregate(rows)
    with out.open('x',encoding='utf-8') as f:json.dump(result,f,ensure_ascii=False,indent=2);f.write('\n')
    print(json.dumps({'status':result['status'],'total_rows':result['total_rows'],'groups':len(result['groups']),'raw_text_included':False}))
    return 0
if __name__=='__main__':
    try:sys.exit(main())
    except (ValueError,OSError,UnicodeError,json.JSONDecodeError) as exc:
        print(json.dumps({'status':'AUDIT_REJECTED','reason_code':str(exc)[:70]}),file=sys.stderr)
        sys.exit(2)
