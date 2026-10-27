"""Fail-closed, offline native OpenCC s2twp research adapter.

Never embeds OpenCC dictionaries into this MIT project and never silently
replaces a missing official OpenCC installation with a handmade surrogate.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.metadata as metadata
import json
import os
from pathlib import Path
import sys

SOURCE_ROOT = Path(__file__).resolve().parents[3]
MAX_BYTES = 65_536

class BaselineUnavailable(RuntimeError):
    pass


def get_native_converter():
    """Return the installed OpenCC Python binding with its real distribution identity."""
    try:
        import opencc  # type: ignore
        try:
            version = metadata.version('opencc')
        except metadata.PackageNotFoundError:
            version = metadata.version('OpenCC')
        if not version or not getattr(opencc, '__file__', None):
            raise BaselineUnavailable('OPENCC_DISTRIBUTION_NOT_VERIFIABLE')
        # Use the official real Taiwan phrase config. Never silently downgrade.
        converter = opencc.OpenCC('s2twp.json')
        return converter, {'package': 'opencc', 'version': version,
                           'config': 's2twp.json', 'binding': 'Python'}
    except (ImportError, AttributeError, OSError, metadata.PackageNotFoundError) as exc:
        raise BaselineUnavailable('OPENCC_NOT_INSTALLED_OR_S2TWP_UNAVAILABLE') from exc


def utf16_boundaries(source: str):
    """UTF-16 code-unit offsets -> Python code point offsets; surrogate halves forbidden."""
    result = {0: 0}
    offset = 0
    for pos, char in enumerate(source):
        if 0xD800 <= ord(char) <= 0xDFFF:
            raise ValueError('UNPAIRED_SURROGATE_REJECTED')
        offset += 2 if ord(char) > 0xFFFF else 1
        result[offset] = pos + 1
    return result


def convert_editable(source: str, manifest: dict, converter):
    if manifest.get('schema') != 'tls.r173.editable-spans.v1' or manifest.get('format') != 'markdown' or manifest.get('status') != 'READY' or manifest.get('offset_unit') != 'utf16':
        raise ValueError('UNTRUSTED_EDITABLE_MANIFEST')
    digest = hashlib.sha256(source.encode('utf-8')).hexdigest()
    if manifest.get('source_sha256') != digest:
        raise ValueError('SOURCE_HASH_MISMATCH')
    boundaries = utf16_boundaries(source)
    if manifest.get('source_length_utf16') != max(boundaries):
        raise ValueError('SOURCE_LENGTH_MISMATCH')
    spans = manifest.get('spans')
    if not isinstance(spans, list) or len(spans) > 20000:
        raise ValueError('INVALID_EDITABLE_SPANS')
    cursor, out, changes = 0, [], 0
    for span in spans:
        if not isinstance(span, dict) or set(span) != {'id', 'start', 'end'} or not isinstance(span['id'], str):
            raise ValueError('INVALID_EDITABLE_SPANS')
        a, b = span['start'], span['end']
        if type(a) is not int or type(b) is not int or a < cursor or b <= a or a not in boundaries or b not in boundaries:
            raise ValueError('INVALID_EDITABLE_SPANS')
        out.append(source[boundaries[cursor]:boundaries[a]])
        current = source[boundaries[a]:boundaries[b]]
        converted = converter.convert(current)
        if not isinstance(converted, str):
            raise ValueError('OPENCC_OUTPUT_INVALID')
        out.append(converted)
        changes += int(converted != current)
        cursor = b
    out.append(source[boundaries[cursor]:])
    return ''.join(out), changes


def safe_file(path: str, must_exist: bool):
    p = Path(path).expanduser().resolve()
    if SOURCE_ROOT == p or SOURCE_ROOT in p.parents:
        if not must_exist:
            raise ValueError('NO_PRIVATE_RESULTS_INSIDE_PUBLIC_REPO')
    if must_exist:
        if not p.is_file() or Path(path).is_symlink():
            raise ValueError('INPUT_NOT_REGULAR_FILE')
    elif p.exists() or not p.parent.is_dir():
        raise ValueError('NO_OVERWRITE_OR_PARENT_MISSING')
    return p


def run(argv=None):
    parser = argparse.ArgumentParser(description='OpenCC s2twp: native, offline, fail-closed')
    parser.add_argument('--probe', action='store_true')
    parser.add_argument('--input')
    parser.add_argument('--output')
    parser.add_argument('--audit')
    parser.add_argument('--mode', choices=('RAW', 'EQUAL_EDITABLE'), default='EQUAL_EDITABLE')
    parser.add_argument('--spans')
    args = parser.parse_args(argv)
    if not args.probe and (not args.input or not args.output or not args.audit):
        parser.error('input, output and audit all required except --probe')
    if not args.probe and args.mode == 'EQUAL_EDITABLE' and not args.spans:
        parser.error('EQUAL_EDITABLE mode requires locked R16 spans manifest')
    try:
        converter, provenance = get_native_converter()
    except BaselineUnavailable as err:
        # stdout contains no source or local paths; a missing library is NOT a score.
        print(json.dumps({'status': 'BASELINE_NOT_AVAILABLE', 'reason': str(err),
                          'configuration_required': 's2twp.json', 'human_quality': 'NOT_MEASURED'}))
        return 3
    if args.probe:
        print(json.dumps({'status': 'AVAILABLE_UNVERIFIED_QUALITY', 'native': provenance,
                          'network_requested': False}, ensure_ascii=False))
        return 0
    inp = safe_file(args.input, True)
    out = safe_file(args.output, False)
    audit_path = safe_file(args.audit, False)
    if out == audit_path or out == inp or audit_path == inp:
        raise ValueError('OVERLAPPING_FILES')
    data = inp.read_bytes()
    if len(data) > MAX_BYTES:
        raise ValueError('SOURCE_LIMIT')
    source = data.decode('utf-8', 'strict')
    if not source.strip() or '\0' in source:
        raise ValueError('SOURCE_REJECTED')
    if args.mode == 'RAW':
        rendered = converter.convert(source)
        changed_segments = None
    else:
        locked = safe_file(args.spans, True)
        manifest = json.loads(locked.read_text('utf-8'))
        rendered, changed_segments = convert_editable(source, manifest, converter)
    if not isinstance(rendered, str):
        raise ValueError('NATIVE_CONVERTER_OUTPUT_INVALID')
    # Private output only; never publish source, output, or linkable source digest.
    report = {'schema': 'tls.r173.native-baseline-v1', 'status': 'NATIVE_BASELINE_EXECUTED',
              'native': provenance, 'lane': args.mode, 'source_private': True,
              'protected_by_equal_wrapper': args.mode == 'EQUAL_EDITABLE',
              'editable_segments_changed': changed_segments,
              'semantic_equivalence_verified': False, 'human_quality': 'NOT_MEASURED',
              'transport': 'NONE', 'raw_text_in_audit': False,
              'source_sha256_in_audit': False}
    fd = None
    try:
        with out.open('x', encoding='utf-8') as f:
            f.write(rendered)
        with audit_path.open('x', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
            f.write('\n')
    except Exception:
        if out.exists():
            out.unlink()
        raise
    print(json.dumps({'status': report['status'], 'lane': args.mode, 'native': provenance,
                      'human_quality': 'NOT_MEASURED', 'private_local_outputs_created': True}, ensure_ascii=False))
    return 0

if __name__ == '__main__':
    try:
        sys.exit(run())
    except (ValueError, OSError, UnicodeError, json.JSONDecodeError) as ex:
        print(json.dumps({'status': 'BASELINE_REJECTED', 'reason_code': str(ex).split(':')[0][:70],
                          'source_text_in_log': False}), file=sys.stderr)
        sys.exit(2)
