"""Publish one complete, source-locked public suite without overwriting a release.

The only mutation paths create a full draft or publish an already verified draft.
Authentication/network errors are never interpreted as absence. Before and after
publication, all assets are downloaded into separate empty directories and checked
by the same production validator. No fixture mode or alternative repository exists.
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

import build_all_tools_release as B
import check_all_tools_release as C

REPOSITORY = 'MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw'
API_BASE = 'repos/' + REPOSITORY
RELEASE_TAG = 'all-tools-suite-v17.3.0'
SUITE_VERSION = '17.3.0'
COMMIT_SHA = re.compile(r'^[0-9a-f]{40}$')


class PublisherBlocked(B.ReleaseBlock):
    pass


def require(condition, reason):
    if not condition:
        raise PublisherBlocked(reason)


class GitHubCLI:
    """A small injectable subprocess boundary; every endpoint is fixed to PUBLIC."""

    def __init__(self, runner=None):
        self.runner = runner or subprocess.run

    def run(self, arguments, *, input=None):
        environment = dict(os.environ)
        environment.update(GH_HOST='github.com', GH_PROMPT_DISABLED='1', GH_NO_UPDATE_NOTIFIER='1')
        try:
            return self.runner(['gh', *arguments], cwd=B.ROOT, input=input,
                               text=True, capture_output=True, check=False,
                               timeout=180, env=environment)
        except (OSError, subprocess.TimeoutExpired) as exc:
            raise PublisherBlocked('GITHUB_TRANSPORT_FAILED') from exc

    def api(self, endpoint, *, method='GET', body=None, allow_not_found=False):
        require(endpoint == API_BASE or endpoint.startswith(API_BASE + '/'), 'GITHUB_ENDPOINT_NOT_ALLOWED')
        arguments = ['api', '--hostname', 'github.com', '--include', '--method', method, endpoint]
        if body is not None:
            arguments += ['--input', '-']
        result = self.run(arguments, input=json.dumps(body) if body is not None else None)
        output = result.stdout.replace('\r\n', '\n')
        header, separator, payload = output.partition('\n\n')
        match = re.match(r'^HTTP/\d(?:\.\d)?\s+(\d{3})(?:\s|$)', header)
        require(separator and match is not None, 'GITHUB_RESPONSE_STATUS_UNVERIFIED')
        status = int(match.group(1))
        # A permission failure, timeout or malformed gateway response is not 404.
        if status == 404 and allow_not_found:
            missing = C.readjson(payload.encode('utf-8'), 'github-not-found')
            require(isinstance(missing, dict) and missing.get('message') == 'Not Found',
                    'GITHUB_NOT_FOUND_RESPONSE_UNVERIFIED')
            return None
        require(200 <= status < 300 and result.returncode == 0, 'GITHUB_HTTP_' + str(status))
        return C.readjson(payload.encode('utf-8'), 'github-response')

    def verify_repository_access(self):
        repository = self.api(API_BASE)
        require(isinstance(repository, dict) and repository.get('full_name') == REPOSITORY
                and repository.get('private') is False, 'PUBLIC_REPOSITORY_IDENTITY_UNVERIFIED')
        # GetRepo's user-level permissions are not an installation token's
        # effective API authorization (even a supplied push value is advisory).
        # Never infer write access from that metadata. GitHub authorizes every
        # actual list/create/PATCH request; all API/CLI failures remain fatal.
        # In particular, a hidden existing draft cannot be replaced: a rejected
        # create stops, and this publisher never retries with upload or clobber.

    def release_by_id(self, release_id):
        require(type(release_id) is int and release_id > 0, 'GITHUB_RELEASE_ID_INVALID')
        release = self.api(API_BASE + '/releases/' + str(release_id))
        require(isinstance(release, dict) and release.get('id') == release_id,
                'GITHUB_RELEASE_ID_MISMATCH')
        return release

    def find_release(self):
        published = self.api(API_BASE + '/releases/tags/' + RELEASE_TAG, allow_not_found=True)
        if published is not None:
            require(isinstance(published, dict) and published.get('tag_name') == RELEASE_TAG,
                    'GITHUB_RELEASE_TAG_MISMATCH')
        matches = []
        # The tag endpoint may not expose drafts. Exhaust the authenticated list;
        # an inaccessible conflicting draft makes creation fail, never overwrite.
        for page in range(1, 101):
            batch = self.api(API_BASE + '/releases?per_page=100&page=' + str(page))
            require(isinstance(batch, list), 'GITHUB_RELEASE_LIST_INVALID')
            require(all(isinstance(row, dict) for row in batch), 'GITHUB_RELEASE_LIST_ROW_INVALID')
            matches.extend(row for row in batch if row.get('tag_name') == RELEASE_TAG)
            if len(batch) < 100:
                break
        else:
            raise PublisherBlocked('GITHUB_RELEASE_LIST_LIMIT_REACHED')
        require(len(matches) <= 1, 'GITHUB_DUPLICATE_RELEASE_TAG')
        if not matches:
            require(published is None, 'GITHUB_RELEASE_LOOKUP_INCONSISTENT')
            return None
        if published is not None:
            require(published.get('id') == matches[0].get('id'), 'GITHUB_RELEASE_LOOKUP_INCONSISTENT')
        return self.release_by_id(matches[0].get('id'))

    def resolve_tag_commit(self, *, allow_missing=False):
        ref = self.api(API_BASE + '/git/ref/tags/' + RELEASE_TAG, allow_not_found=allow_missing)
        if ref is None:
            return None
        require(isinstance(ref, dict) and ref.get('ref') == 'refs/tags/' + RELEASE_TAG,
                'GITHUB_TAG_REFERENCE_MISMATCH')
        obj = ref.get('object')
        seen = set()
        for _ in range(8):
            require(isinstance(obj, dict) and isinstance(obj.get('sha'), str)
                    and COMMIT_SHA.fullmatch(obj['sha']) is not None, 'GITHUB_TAG_OBJECT_INVALID')
            if obj.get('type') == 'commit':
                return obj['sha']
            require(obj.get('type') == 'tag' and obj['sha'] not in seen, 'GITHUB_TAG_OBJECT_NOT_COMMIT')
            seen.add(obj['sha'])
            annotated = self.api(API_BASE + '/git/tags/' + obj['sha'])
            require(isinstance(annotated, dict), 'GITHUB_ANNOTATED_TAG_INVALID')
            obj = annotated.get('object')
        raise PublisherBlocked('GITHUB_TAG_CHAIN_LIMIT_REACHED')

    def create_draft(self, stage, expected_sha):
        arguments = ['release', 'create', RELEASE_TAG,
                     *(str(p) for p in sorted(stage.iterdir())),
                     '--repo', REPOSITORY, '--draft', '--target', expected_sha,
                     '--title', 'Taiwan-LLM-Sanitizer All Tools Suite v17.3.0',
                     '--notes', '28 registered tools, 23 standalone tool assets, one complete suite ZIP, '
                     'and four integrity attachments (28 Release assets). Original version-locked browser tools, 14 offline '
                     'workbenches, R6 public quality kit and runnable CLI/Skill sources with six-language '
                     'documentation. New R17.7 MRFT Chrome MV3 DOM Preview v0.1.0 uses explicit public/non-sensitive-content consent, manual pasted translation or optional browser-local Translator API with honest unavailable states. No quality certification. Manual opt-in only; no cloud translation, retired third-party '
                     'game-specific assets or human translation-quality certification.']
        result = self.run(arguments)
        require(result.returncode == 0, 'GITHUB_DRAFT_CREATE_OR_UPLOAD_FAILED')

    def download(self, directory):
        require(directory.is_dir() and not directory.is_symlink() and not any(directory.iterdir()),
                'DOWNLOAD_DIRECTORY_MUST_BE_EMPTY')
        result = self.run(['release', 'download', RELEASE_TAG, '--repo', REPOSITORY,
                           '--dir', str(directory)])
        require(result.returncode == 0, 'GITHUB_RELEASE_DOWNLOAD_FAILED')

    def publish(self, release_id):
        require(type(release_id) is int and release_id > 0, 'GITHUB_RELEASE_ID_INVALID')
        return self.api(API_BASE + '/releases/' + str(release_id), method='PATCH',
                        body={'draft': False, 'prerelease': False, 'make_latest': 'true'})


def check_remote_identity(release, stage, expected_sha, *, published):
    require(isinstance(release, dict), 'GITHUB_RELEASE_INVALID')
    require(type(release.get('id')) is int and release['id'] > 0, 'GITHUB_RELEASE_ID_INVALID')
    require(release.get('tag_name') == RELEASE_TAG, 'GITHUB_RELEASE_TAG_MISMATCH')
    require(release.get('target_commitish') == expected_sha, 'GITHUB_RELEASE_SOURCE_SHA_MISMATCH')
    require(release.get('draft') is (not published) and release.get('prerelease') is False,
            'GITHUB_RELEASE_STATE_CHANGED')
    assets = release.get('assets')
    require(isinstance(assets, list) and all(isinstance(a, dict) for a in assets), 'GITHUB_ASSET_LIST_INVALID')
    names = [a.get('name') for a in assets]
    require(all(isinstance(name, str) and B.safe_filename(name) for name in names), 'GITHUB_ASSET_NAME_INVALID')
    require(len(names) == len(set(names)) and set(names) == {p.name for p in stage.iterdir()},
            'GITHUB_RELEASE_INCOMPLETE_OR_DUPLICATE')
    for asset in assets:
        require(asset.get('state') == 'uploaded'
                and C.asset_download_url_matches(asset, RELEASE_TAG, draft=not published),
                'GITHUB_ASSET_STATE_OR_DOWNLOAD_URL_UNVERIFIED')


def verify_remote(transport, release, stage, expected_sha, download_parent, *, published):
    check_remote_identity(release, stage, expected_sha, published=published)
    resolved = transport.resolve_tag_commit(allow_missing=not published)
    require(resolved is None or resolved == expected_sha, 'GITHUB_RESOLVED_TAG_SOURCE_SHA_MISMATCH')
    with tempfile.TemporaryDirectory(prefix='tls-published-' if published else 'tls-draft-',
                                     dir=download_parent) as tmp:
        downloaded = Path(tmp)
        transport.download(downloaded)
        # Read fresh metadata after download; an intervening release change must block.
        current = transport.release_by_id(release['id'])
        check_remote_identity(current, stage, expected_sha, published=published)
        resolved = transport.resolve_tag_commit(allow_missing=not published)
        require(resolved is None or resolved == expected_sha, 'GITHUB_RESOLVED_TAG_SOURCE_SHA_MISMATCH')
        if resolved is not None:
            current = {**current, 'resolved_tag_commit': resolved}
        result = C.verify_stage(stage, expected_sha=expected_sha, release_data=current,
                                download_dir=downloaded, require_published=published)
        return current, result


def publish_release(stage, expected_sha, receipt_path, *, transport=None):
    # Preserve a caller's symlink so the production validator can reject it.
    stage = Path(stage).absolute()
    receipt_path = Path(receipt_path)
    require(not receipt_path.resolve().is_relative_to(stage.resolve()), 'RECEIPT_MUST_BE_OUTSIDE_STAGE')
    receipt = {'schema': 'tls.all-tools-publication-receipt.v1', 'status': 'PUBLISH_BLOCKED',
               'repository': REPOSITORY, 'release_tag': RELEASE_TAG, 'suite_version': SUITE_VERSION,
               'source_git_sha': expected_sha, 'last_completed_phase': 'STARTED',
               'draft_created': False, 'published_this_run': False, 'read_only_rerun': False}
    remote = transport or GitHubCLI()
    existing_published = False
    publish_attempted = False
    draft_seen = False
    # Refuse overwriting an earlier receipt, including symlinks. Retain failure evidence.
    with receipt_path.open('x', encoding='utf-8') as stream:
        try:
            require(isinstance(expected_sha, str) and COMMIT_SHA.fullmatch(expected_sha) is not None,
                    'SOURCE_GIT_SHA_MUST_BE_40_HEX')
            receipt['local_validation'] = C.verify_stage(stage, expected_sha=expected_sha)
            manifest = C.readjson((stage / 'ALL_TOOLS_MANIFEST.json').read_bytes(), 'manifest')
            require(manifest.get('release_tag') == RELEASE_TAG and manifest.get('suite_version') == SUITE_VERSION,
                    'RELEASE_TAG_OR_SUITE_VERSION_MISMATCH')
            receipt['last_completed_phase'] = 'PACKAGE_VALIDATED'
            remote.verify_repository_access()
            release = remote.find_release()
            if release is None:
                resolved = remote.resolve_tag_commit(allow_missing=True)
                require(resolved is None or resolved == expected_sha, 'GITHUB_EXISTING_TAG_SOURCE_SHA_MISMATCH')
                remote.create_draft(stage, expected_sha)
                receipt['draft_created'] = True
                release = remote.find_release()
                require(release is not None and release.get('draft') is True, 'CREATED_DRAFT_NOT_FOUND')
            require(type(release.get('draft')) is bool, 'GITHUB_RELEASE_DRAFT_STATE_INVALID')
            receipt['release_id'] = release.get('id')
            existing_published = release['draft'] is False
            receipt['read_only_rerun'] = existing_published
            if existing_published:
                checked, result = verify_remote(remote, release, stage, expected_sha, receipt_path.parent,
                                                published=True)
                receipt.update(status='ALREADY_PUBLISHED_MATCH', post_publish_validation=result,
                               resolved_tag_commit=checked['resolved_tag_commit'],
                               last_completed_phase='POST_PUBLISH_VALIDATED')
            else:
                draft_seen = True
                receipt['last_completed_phase'] = 'DRAFT_CREATED'
                checked, result = verify_remote(remote, release, stage, expected_sha, receipt_path.parent,
                                                published=False)
                receipt['draft_validation'] = result
                receipt['last_completed_phase'] = 'DRAFT_COMPLETE_CHECKED'
                publish_attempted = True
                published = remote.publish(checked['id'])
                require(isinstance(published, dict) and published.get('id') == checked['id']
                        and published.get('draft') is False, 'PUBLISH_RESULT_UNVERIFIED')
                receipt['published_this_run'] = True
                receipt['last_completed_phase'] = 'PUBLISHED'
                checked, result = verify_remote(remote, published, stage, expected_sha, receipt_path.parent,
                                                published=True)
                receipt.update(status='PUBLISHED', post_publish_validation=result,
                               resolved_tag_commit=checked['resolved_tag_commit'],
                               last_completed_phase='POST_PUBLISH_VALIDATED')
            receipt['release_url'] = ('https://github.com/' + REPOSITORY + '/releases/tag/' + RELEASE_TAG)
            receipt['asset_count_verified'] = receipt['post_publish_validation']['github_assets_expected']
            return receipt
        except (B.ReleaseBlock, OSError, ValueError, KeyError, TypeError) as exc:
            if existing_published:
                receipt['status'] = 'EXISTING_RELEASE_MISMATCH_BLOCKED'
            elif receipt['published_this_run']:
                receipt['status'] = 'PUBLISHED_VALIDATION_FAILED'
            elif publish_attempted:
                receipt['status'] = 'PUBLISH_RESULT_UNKNOWN'
            elif draft_seen or receipt['draft_created']:
                receipt['status'] = 'DRAFT_VALIDATION_BLOCKED'
            receipt['error'] = str(exc)
            raise PublisherBlocked(receipt['status'] + ': ' + str(exc)) from exc
        finally:
            stream.write(B.json_bytes(receipt).decode('utf-8'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stage', required=True, type=Path)
    parser.add_argument('--expected-sha', required=True)
    parser.add_argument('--receipt', required=True, type=Path)
    args = parser.parse_args()
    try:
        outcome = publish_release(args.stage, args.expected_sha, args.receipt)
    except (B.ReleaseBlock, OSError, ValueError) as exc:
        print('ALL_TOOLS_PUBLISH_BLOCKED', str(exc), file=sys.stderr)
        return 1
    print(json.dumps(outcome, sort_keys=True))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
