"""R19 exact-source intake. RED-phase scaffold; no extraction or execution."""
from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path

MAX_TASK_BYTES = 8 * 1024 * 1024
MAX_MEMBER_BYTES = 16 * 1024 * 1024
MAX_TOTAL_BYTES = 64 * 1024 * 1024
MAX_MEMBERS = 2048
HTML_SUFFIX = 'examples/TW_First_Result_Studio_R19_20261101.html'

@dataclass(frozen=True)
class Contract:
    task_sha256: str
    task_bytes: int
    source_sha256: str
    source_bytes: int
    html_sha256: str
    html_bytes: int
    runner_sha256: str
    kind: str = 'SYNTHETIC_TEST'

OFFICIAL = Contract(
    '5ef57fa1522245de20a4e14dd2d6698a8c82af294ab1be13f8e8c8611ee9a18d', 3526829,
    '6de12ac92967a1dddb37f3d3577276b97399de697a5d3aab9f2e3b7f0a6c353d', 3424117,
    '33c9455b08f4e412fe1f4474482ed9fe013714f36f33ae367e0d39421e094d5a', 136680,
    'f3689d92020aec54d8f59e556f83e4dc795d8232499eca750c5f1a8b1b0c1bd8',
    'PINNED_R19_R2',
)


# Strict source integrity gate. This is a read-only validation operation:
# it deliberately does not extract, execute, upload or promote source archives.
import hashlib
import io
import os
import re
import stat
import unicodedata
from zipfile import ZipFile, BadZipFile, ZIP_STORED, ZIP_DEFLATED

RUNNER_SUFFIX = 'tests/browser_first_result_studio_r19.cjs'
_ALLOWED_COMPRESSION = frozenset((ZIP_STORED, ZIP_DEFLATED))
_RESERVED_WINDOWS = frozenset({
    'CON', 'PRN', 'AUX', 'NUL',
    *(f'COM{i}' for i in range(1, 10)),
    *(f'LPT{i}' for i in range(1, 10)),
})


class _Reject(Exception):
    def __init__(self, code):
        super().__init__(code)
        self.code = code


def _bad(code):
    raise _Reject(code)


def _receipt(state, code, contract, observed=None):
    return {
        'schema': 'tls.r19.native-intake.v1',
        'intake_state': state,
        'reason_code': code,
        'native_status': 'NOT_RUN',
        'promotion': 'NONE',
        'contract_kind': contract.kind,
        'source_identity_verified': state == 'VERIFIED',
        'observed': observed or {},
    }


def _valid_archive_name(name):
    if not isinstance(name, str) or not name or name.startswith('/'):
        _bad('ZIP_UNSAFE_NAME')
    if '\\' in name or ':' in name or '\x00' in name:
        _bad('ZIP_UNSAFE_NAME')
    if unicodedata.normalize('NFC', name) != name:
        _bad('ZIP_UNSAFE_NAME')
    parts = name[:-1].split('/') if name.endswith('/') else name.split('/')
    if not parts:
        _bad('ZIP_UNSAFE_NAME')
    for part in parts:
        if not part or part in ('.', '..') or part.endswith(('.', ' ')):
            _bad('ZIP_UNSAFE_NAME')
        if any(ord(c) < 32 or ord(c) == 127 for c in part):
            _bad('ZIP_UNSAFE_NAME')
        if part.split('.', 1)[0].upper() in _RESERVED_WINDOWS:
            _bad('ZIP_UNSAFE_NAME')
    return '/'.join(parts).casefold()


def _check_names(infos):
    if len(infos) > MAX_MEMBERS:
        _bad('ZIP_MEMBER_COUNT')
    names = set()
    files = set()
    directories = set()
    total = 0
    for info in infos:
        key = _valid_archive_name(info.filename)
        if key in names:
            _bad('ZIP_DUPLICATE_NAME')
        names.add(key)
        file_type = stat.S_IFMT(info.external_attr >> 16)
        if file_type not in (0, stat.S_IFREG, stat.S_IFDIR):
            _bad('ZIP_LINK_OR_SPECIAL')
        if info.is_dir():
            if file_type not in (0, stat.S_IFDIR):
                _bad('ZIP_LINK_OR_SPECIAL')
            directories.add(key)
        else:
            if file_type == stat.S_IFDIR:
                _bad('ZIP_LINK_OR_SPECIAL')
            files.add(key)
        if info.flag_bits & 1 or info.compress_type not in _ALLOWED_COMPRESSION:
            _bad('ZIP_UNSUPPORTED_COMPRESSION')
        if info.file_size < 0 or info.file_size > MAX_MEMBER_BYTES:
            _bad('ZIP_MEMBER_LIMIT')
        total += info.file_size
        if total > MAX_TOTAL_BYTES:
            _bad('ZIP_TOTAL_LIMIT')
    for filename in files:
        parts = filename.split('/')
        for end in range(1, len(parts)):
            if '/'.join(parts[:end]) in files:
                _bad('ZIP_PATH_COLLISION')
        if filename in directories:
            _bad('ZIP_PATH_COLLISION')


def _verified_members(archive):
    # Validate every member before returning any identity claims.
    # zipfile.read validates CRC; bounded metadata preflight prevents bombs.
    infos = archive.infolist()
    _check_names(infos)
    files = {}
    for info in infos:
        if info.is_dir():
            continue
        with archive.open(info, 'r') as stream:
            blob = stream.read(info.file_size + 1)
            if len(blob) != info.file_size or stream.read(1):
                _bad('ZIP_INVALID')
        files[info.filename] = blob
    return files, len(infos)


def _sha(blob):
    return hashlib.sha256(blob).hexdigest()


def _inspect_bytes(task, contract):
    with ZipFile(io.BytesIO(task), 'r') as outer:
        top, n_outer = _verified_members(outer)
    candidates = [
        blob for name, blob in top.items()
        if name.lower().endswith('.zip') and _sha(blob) == contract.source_sha256
    ]
    if len(candidates) == 0:
        _bad('SOURCE_NOT_FOUND')
    if len(candidates) != 1:
        _bad('SOURCE_AMBIGUOUS')
    source = candidates[0]
    if len(source) != contract.source_bytes:
        _bad('SOURCE_SIZE_MISMATCH')
    if len(source) > MAX_MEMBER_BYTES:
        _bad('SOURCE_SIZE_MISMATCH')

    with ZipFile(io.BytesIO(source), 'r') as inner:
        members, n_inner = _verified_members(inner)

    html_names = [
        name for name in members
        if name == HTML_SUFFIX or name.endswith('/' + HTML_SUFFIX)
    ]
    if len(html_names) == 0:
        _bad('HTML_NOT_FOUND')
    if len(html_names) != 1:
        _bad('HTML_AMBIGUOUS')
    html = members[html_names[0]]
    if len(html) != contract.html_bytes:
        _bad('HTML_SIZE_MISMATCH')
    if _sha(html) != contract.html_sha256:
        _bad('HTML_SHA_MISMATCH')

    runners = [
        blob for name, blob in members.items()
        if (name == RUNNER_SUFFIX or name.endswith('/' + RUNNER_SUFFIX))
        and _sha(blob) == contract.runner_sha256
    ]
    if len(runners) == 0:
        _bad('RUNNER_NOT_FOUND')
    if len(runners) != 1:
        _bad('RUNNER_AMBIGUOUS')
    return {
        'task_bytes': len(task),
        'outer_entries': n_outer,
        'inner_entries': n_inner,
        'source_bytes': len(source),
        'html_bytes': len(html),
        'runner_bytes': len(runners[0]),
    }


def inspect_task(path: Path | None, contract: Contract = OFFICIAL) -> dict:
    # Only the pinned official Contract is used by the default call.
    # Synthetic alternative contracts are an explicit unit-test facility.
    if path is None:
        return _receipt('BLOCKED', 'INPUT_MISSING', contract)
    try:
        p = Path(path)
        if p.is_symlink():
            _bad('INPUT_SYMLINK')
        if not p.is_file():
            _bad('INPUT_NOT_REGULAR')
        size = p.stat().st_size
        if size > MAX_TASK_BYTES:
            _bad('INPUT_LIMIT')
        if size != contract.task_bytes:
            _bad('TASK_SIZE_MISMATCH')
        # Read at most the pinned maximum; never allow source bytes to be
        # written, extracted, opened in a browser, or executed by this intake.
        with p.open('rb') as source:
            raw = source.read(MAX_TASK_BYTES + 1)
        if len(raw) > MAX_TASK_BYTES:
            _bad('INPUT_LIMIT')
        if len(raw) != contract.task_bytes:
            _bad('TASK_SIZE_MISMATCH')
        if _sha(raw) != contract.task_sha256:
            _bad('TASK_SHA_MISMATCH')
        try:
            evidence = _inspect_bytes(raw, contract)
        except (BadZipFile, OSError, EOFError, RuntimeError, ValueError,
                NotImplementedError, OverflowError):
            _bad('ZIP_INVALID')
        return _receipt('VERIFIED', 'IDENTITY_VERIFIED_NATIVE_NOT_RUN',
                        contract, evidence)
    except _Reject as exc:
        return _receipt('REJECTED', exc.code, contract)
    except (OSError, ValueError, TypeError):
        return _receipt('REJECTED', 'INPUT_UNREADABLE', contract)
