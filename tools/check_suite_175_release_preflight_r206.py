#!/usr/bin/env python3
"""R206 read-only preflight for the future *new* Suite 17.5 release tag.

Requires independently verified R202 full 30 official-byte candidate plus
fresh R199 official 17.4 sources. Two GitHub GETs check that neither the new
release nor tag exists. This DOES NOT authorize publication or merge.
Never interpret 403/429/5xx or transport failure as 404.
"""
from __future__ import annotations
import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

import check_suite_175_official_candidate as CandidateCheck
import publish_all_tools_release as OldPublisher
import check_suite_175_official_sources as Source
import build_suite_175_official_candidate as Candidate

ROOT=Path(__file__).resolve().parents[1]
REPO=OldPublisher.REPOSITORY
API_BASE='repos/'+REPO
NEW_TAG='all-tools-suite-v17.5.0'
FUTURE_PATHS=(
    API_BASE+'/releases/tags/'+NEW_TAG,
    API_BASE+'/git/ref/tags/'+NEW_TAG,
)

class NotReady(ValueError):pass

def need(ok,reason):
    if not ok:raise NotReady('R206_'+reason)

def github_unused(client):
    """The immutable old tag must never be reused; the new tag must be absent."""
    need(client is not None and hasattr(client,'api'),'CLIENT_MISSING')
    responses=[]
    for endpoint in FUTURE_PATHS:
        answer=client.api(endpoint,method='GET',allow_not_found=True)
        need(answer is None,'FUTURE_RELEASE_OR_TAG_ALREADY_EXISTS')
        responses.append(endpoint.split('/'+REPO+'/')[-1])
    return tuple(responses)

def validate(stage:Path,official:Path,release_json:Path,expected_sha:str,client):
    need(isinstance(expected_sha,str) and re.fullmatch(r'[0-9a-f]{40}',expected_sha),
         'GIT_SHA_REQUIRED')
    actual=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    need(actual==expected_sha,'SOURCE_CHECKOUT_CHANGED')
    candidate=CandidateCheck.inspect(stage,official,release_json,expected_sha)
    need(candidate['status']=='OFFICIAL_29_SOURCE_BYTES_AND_30_CANDIDATE_ASSETS_VERIFIED'
         and candidate['old_official_release_bytes_verified']==29
         and candidate['candidate_assets']==30 and candidate['tool_count']==30
         and candidate['release_permission']=='NONE' and candidate['released'] is False,
         'CANDIDATE_NOT_INDEPENDENTLY_VERIFIED')
    names={p.name for p in stage.iterdir()}
    need(len(names)==30 and Candidate.SUITE_NAME in names and
         Candidate.NEW_HTML in names and Candidate.DEV_NAME in names,
         'FULL_CANDIDATE_STAGE_MISSING')
    # A candidate with filename *_NOT_RELEASED cannot serve as the production
    # new version even after all source bytes and tag-absence probes succeed.
    need(Candidate.SUITE_NAME.endswith('NOT_RELEASED.zip'),
         'CANDIDATE_MUST_NOT_BE_RELABELED_AS_RELEASE')
    checked=github_unused(client)
    need(len(checked)==2,'TWO_INDEPENDENT_TAG_PROBES_REQUIRED')
    return {
        'schema':'tls.r206.versioned-release-preflight.v1',
        'status':'SOURCE_VERIFIED_TAG_UNUSED_BUT_RELEASE_NOT_READY',
        'previous_official_release':Source.TAG,
        'proposed_new_release':NEW_TAG,
        'verified_prior_original_assets':29,
        'source_based_candidate_assets':30,
        'candidate_suite_sha256':candidate['suite_sha256'],
        'candidate_source_git_sha':expected_sha,
        'release_and_tag_checked_via':'GITHUB_GET_404_ONLY',
        'github_metadata_probes':2,
        'candidate_contains_not_released_markers':True,
        'full_production_175_builder_verified':False,
        'new_six_language_release_docs_verified':False,
        'draft_fresh_downloads_verified':False,
        'published_fresh_downloads_verified':False,
        'tag_absence_atomic_reservation':False,
        'human_quality_verified':False,
        'os_native_file_chooser_cancel_verified':False,
        'publication_permission':'NONE',
        'merge_permission':'NONE',
        'github_write_calls':0,
        'user_source_text_in_receipt':False,
    }

def main(argv=None):
    p=argparse.ArgumentParser()
    p.add_argument('--stage',type=Path,required=True)
    p.add_argument('--official-assets',type=Path,required=True)
    p.add_argument('--release-json',type=Path,required=True)
    p.add_argument('--expected-sha',required=True)
    p.add_argument('--receipt',type=Path,required=True)
    a=p.parse_args(argv)
    need(a.receipt.name=='TLS_R206_VERSIONED_RELEASE_PREFLIGHT_NOT_READY.json',
         'RECEIPT_FILENAME_FIXED')
    need(not a.receipt.is_symlink() and not a.receipt.exists() and
         not a.receipt.resolve().is_relative_to(ROOT.resolve()),'NO_REPO_WRITE_OR_OVERWRITE')
    cli=OldPublisher.GitHubCLI()
    cli.verify_repository_access()
    result=validate(a.stage,a.official_assets,a.release_json,a.expected_sha,cli)
    a.receipt.parent.mkdir(parents=True,exist_ok=True)
    a.receipt.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',
                         encoding='utf-8')
    print('R206_30_REAL_SOURCE_BYTES_TWO_TAG_PROBES_PASS_NO_RELEASE',
          result['candidate_suite_sha256'])
    return 0

if __name__=='__main__':
    try:raise SystemExit(main())
    except (NotReady,OldPublisher.PublisherBlocked,Source.SourceRejected,
            CandidateCheck.CandidateValidationBlocked,Candidate.CandidateRejected,
            OSError,ValueError,KeyError,UnicodeError,subprocess.CalledProcessError) as exc:
        print('R206_VERSIONED_PROMOTION_BLOCKED',type(exc).__name__,str(exc)[:170],
              file=sys.stderr)
        raise SystemExit(2)
