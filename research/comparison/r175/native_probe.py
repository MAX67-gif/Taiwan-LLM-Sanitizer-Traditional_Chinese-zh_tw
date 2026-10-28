"""Pinned official OpenCC CLI source probe; synthetic fair-span research only.

No OpenCC binaries, wordlists, dictionaries, or private documents ship with TLS.
The official GitHub Release archive must be provided by the caller and SHA
verified BEFORE any package content is extracted or executed.
"""
from __future__ import annotations
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import re
import stat
import subprocess
import sys
import tempfile
from zipfile import ZipFile, BadZipFile

PROJECT_ROOT = Path(__file__).resolve().parents[3]
R173 = PROJECT_ROOT / "research" / "comparison" / "r173"
sys.path.insert(0, str(R173))
from opencc_adapter import convert_editable, utf16_boundaries  # noqa: E402

VERSION = "1.4.2"
TAG = "ver.1.4.2"
ASSET = "opencc-1.4.2-1-deb-amd64.zip"
RELEASE_URL = f"https://github.com/BYVoid/OpenCC/releases/download/{TAG}/{ASSET}"
OFFICIAL_RELEASE_ASSET_SHA256 = "5ec8bc9cd4aed58586af969a66e623b6fe22c24ac66af46aa6c81e8b75fea9e1"
CONFIG_NAME = "s2twp.json"
# Separately licensed Ubuntu runtime package: never bundled in TLS releases.
MARISA_ASSET = "libmarisa1_0.3.1+git20250817-1build1_amd64.deb"
MARISA_URL = "https://archive.ubuntu.com/ubuntu/pool/main/m/marisa/libmarisa1_0.3.1%2Bgit20250817-1build1_amd64.deb"
MARISA_SHA256 = "befd1c30ac2163bb15ea83f26f92dbf4de39a00dcb0eaad133ee2c73306b268b"
MARISA_VERSION = "0.3.1+git20250817-1build1"

MAX_ARCHIVE_BYTES = 16_000_000
MAX_SAMPLE_BYTES = 65_536
MAX_STDOUT_BYTES = 131_072
SCHEMA = "tls.r175.native-opencc-1.4.2.v1"


class EvidenceBlocked(RuntimeError):
    """Expected fail-closed evidence status, not a translation failure."""


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def hash_file(path: Path) -> str:
    return digest(path.read_bytes())


def validate_package(path: Path) -> list[tuple[str, bytes]]:
    """Read and validate original official archive; no execution yet."""
    if not path.is_file() or path.is_symlink() or path.stat().st_size > MAX_ARCHIVE_BYTES:
        raise EvidenceBlocked("OFFICIAL_ASSET_MISSING_OR_OVERSIZE")
    data = path.read_bytes()
    if digest(data) != OFFICIAL_RELEASE_ASSET_SHA256:
        raise EvidenceBlocked("OFFICIAL_ASSET_SHA256_MISMATCH")
    try:
        with ZipFile(path) as z:
            infos = z.infolist()
            if not infos or len(infos) > 30 or z.testzip() is not None:
                raise EvidenceBlocked("OFFICIAL_ZIP_CRC_OR_COUNT_INVALID")
            items = []
            seen = set()
            signed_member = None
            for info in infos:
                name = info.filename
                parts = Path(name).parts
                mode = info.external_attr >> 16
                if (name.startswith("/") or "\\" in name or any(p in ("", ".", "..") for p in parts)
                        or name in seen or stat.S_ISLNK(mode)):
                    raise EvidenceBlocked("OFFICIAL_ZIP_UNSAFE_PATH")
                seen.add(name)
                if name.endswith("/"):
                    continue
                if name == "SHA256SUMS":
                    if signed_member is not None or info.file_size > 8192:
                        raise EvidenceBlocked("OFFICIAL_SHA256SUMS_UNSAFE")
                    signed_member = z.read(info)
                    continue
                if not name.endswith(".deb"):
                    raise EvidenceBlocked("OFFICIAL_ZIP_UNEXPECTED_PAYLOAD")
                if info.file_size > MAX_ARCHIVE_BYTES:
                    raise EvidenceBlocked("OFFICIAL_PACKAGE_TOO_LARGE")
                items.append((Path(name).name, z.read(info)))
            if not items:
                raise EvidenceBlocked("OFFICIAL_DEB_NOT_FOUND")
            if signed_member is None:
                raise EvidenceBlocked("OFFICIAL_SHA256SUMS_MISSING")
            try:
                hashes = {}
                for line in signed_member.decode("utf-8", "strict").splitlines():
                    if not line.strip():
                        continue
                    match = re.fullmatch(r"([0-9a-f]{64})  (?:\./)?([A-Za-z0-9_.+-]+\.deb)", line)
                    if not match or match.group(2) in hashes:
                        raise EvidenceBlocked("OFFICIAL_SHA256SUMS_FORMAT")
                    hashes[match.group(2)] = match.group(1)
            except UnicodeError as exc:
                raise EvidenceBlocked("OFFICIAL_SHA256SUMS_FORMAT") from exc
            if hashes.keys() != {name for name, _ in items}:
                raise EvidenceBlocked("OFFICIAL_SHA256SUMS_NOT_EXACT")
            if any(hashes[name] != digest(raw) for name, raw in items):
                raise EvidenceBlocked("OFFICIAL_DEB_SHA256_MISMATCH")
            return items
    except (BadZipFile, OSError) as exc:
        raise EvidenceBlocked("OFFICIAL_ZIP_UNREADABLE") from exc


def validate_marisa(path: Path | None) -> dict:
    """Verify distinct Ubuntu MARISA runtime provenance before extraction."""
    if path is None or path.is_symlink() or not path.is_file() or path.stat().st_size > 1_000_000:
        raise EvidenceBlocked("MARISA_PINNED_DEPENDENCY_MISSING_OR_OVERSIZE")
    if hash_file(path) != MARISA_SHA256:
        raise EvidenceBlocked("MARISA_DEPENDENCY_SHA256_MISMATCH")
    try:
        inspected = subprocess.run(
            ["dpkg-deb", "--field", str(path), "Package", "Version", "Architecture"],
            capture_output=True, timeout=12, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise EvidenceBlocked("MARISA_METADATA_UNAVAILABLE") from exc
    if inspected.returncode:
        raise EvidenceBlocked("MARISA_METADATA_UNAVAILABLE")
    expected = {"Package": "libmarisa1", "Version": MARISA_VERSION, "Architecture": "amd64"}
    fields = {}
    for line in inspected.stdout.decode("utf-8", "strict").splitlines():
        if ": " not in line:
            raise EvidenceBlocked("MARISA_METADATA_MISMATCH")
        key, val = line.split(": ", 1)
        if key not in expected or key in fields:
            raise EvidenceBlocked("MARISA_METADATA_MISMATCH")
        fields[key] = val
    if fields != expected:
        raise EvidenceBlocked("MARISA_METADATA_MISMATCH")
    return {"url": MARISA_URL, "package": MARISA_ASSET,
            "sha256": MARISA_SHA256, "package_metadata": fields,
            "redistributed_in_TLS": False}


def unpack_native(archive: Path, stage: Path, marisa_package: Path | None) -> dict:
    """Extract verified Debian assets to a temporary non-root staging folder."""
    packages = validate_package(archive)
    marisa_provenance = validate_marisa(marisa_package)
    staging = stage / "dpkg"
    runtime = stage / "runtime"
    staging.mkdir(parents=True, exist_ok=False)
    runtime.mkdir(parents=True, exist_ok=False)
    debs = []
    for filename, raw in packages:
        p = staging / filename
        if p.exists():
            raise EvidenceBlocked("DUPLICATE_DEB_BASENAME")
        p.write_bytes(raw)
        debs.append({"file": filename, "sha256": digest(raw)})
        result = subprocess.run(["dpkg-deb", "-x", str(p), str(runtime)], capture_output=True, timeout=45, check=False)
        if result.returncode:
            raise EvidenceBlocked("VERIFIED_DEB_EXTRACT_FAILED")
    dependency_extract = subprocess.run(
        ["dpkg-deb", "-x", str(marisa_package), str(runtime)],
        capture_output=True, timeout=15, check=False,
    )
    if dependency_extract.returncode:
        raise EvidenceBlocked("MARISA_PINNED_PACKAGE_EXTRACTION_FAILED")
    lib = runtime / "usr/lib/x86_64-linux-gnu/libmarisa.so.1"
    if not lib.is_file() or not lib.resolve().is_relative_to(runtime.resolve()):
        raise EvidenceBlocked("MARISA_RUNTIME_LIBRARY_UNVERIFIED")
    marisa_provenance["runtime_library_sha256"] = hash_file(lib)
    binaries = [p for p in runtime.rglob("opencc") if p.is_file() and not p.is_symlink() and os.access(p, os.X_OK)]
    configs = [p for p in runtime.rglob(CONFIG_NAME) if p.is_file() and not p.is_symlink()]
    if len(binaries) != 1 or len(configs) != 1:
        raise EvidenceBlocked("NATIVE_BINARY_OR_CONFIG_NOT_FOUND")
    binary, config = binaries[0], configs[0]
    config_dir = config.parent
    dictionary_files = sorted([p for p in config_dir.rglob("*") if p.is_file() and p.suffix in {".ocd", ".ocd2", ".json"}])
    if not dictionary_files or len(dictionary_files) > 300:
        raise EvidenceBlocked("DICT_RESOURCE_SET_UNVERIFIED")
    for p in dictionary_files:
        if p.is_symlink():
            raise EvidenceBlocked("DICT_SYMLINK_REJECTED")
    libdirs = sorted({str(p.parent) for p in runtime.rglob("*") if p.is_file() and
                      (p.name.startswith("libopencc") or p.name.startswith("libmarisa")) and ".so" in p.name})
    env = {"PATH": "/usr/bin:/bin", "LANG": "C.UTF-8", "LC_ALL": "C.UTF-8", "LD_LIBRARY_PATH": ":".join(libdirs)}
    return {
        "binary": binary, "config": config, "env": env, "working_dir": config_dir,
        "archive_sha256": hash_file(archive), "deb_sources": debs,
        "marisa_dependency": marisa_provenance,
        "binary_sha256": hash_file(binary), "config_sha256": hash_file(config),
        "resources": [{"path":str(p.relative_to(config_dir)), "sha256":hash_file(p)} for p in dictionary_files],
        "library_binaries_sha256": [{"file":p.name,"sha256":hash_file(p)} for p in sorted(runtime.rglob("libopencc*.so*")) if p.is_file() and not p.is_symlink()],
    }


def safe_version(native: dict) -> str:
    binary = native["binary"]
    try:
        p = subprocess.run([str(binary), "--version"], cwd=native["working_dir"], env=native["env"], capture_output=True, timeout=15, check=False)
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise EvidenceBlocked("NATIVE_VERSION_EXECUTION_FAILED") from exc
    # A successful version probe must prove that this is the specific official version.
    value = (p.stdout + p.stderr).decode("utf-8", "replace")[:1500]
    if p.returncode != 0 or not re.search(r"(?<!\d)1\.4\.2(?!\d)", value):
        # Temporary metadata only from hash-verified upstream CLI.
        print("R175_NATIVE_VERSION_DIAGNOSTIC " + json.dumps({
            "exit_code": p.returncode,
            "stdout": p.stdout.decode("utf-8", "replace")[:220],
            "stderr": p.stderr.decode("utf-8", "replace")[:220],
        }, ensure_ascii=False), file=sys.stderr)
        raise EvidenceBlocked("NATIVE_VERSION_MISMATCH_OR_UNAVAILABLE")
    return VERSION


class NativeCLI:
    def __init__(self, native: dict):
        self.native = native
        self.last_exit_code = None
        self.stdout_sha256 = None

    def convert(self, source: str) -> str:
        raw = source.encode("utf-8", "strict")
        if len(raw) > MAX_SAMPLE_BYTES:
            raise EvidenceBlocked("SOURCE_EXCEEDS_INPUT_BUDGET")
        with tempfile.TemporaryDirectory(prefix="tls_opencc_span_") as td:
            root=Path(td)
            inp,out=root/"in.txt",root/"out.txt"
            inp.write_bytes(raw)
            cmd=[str(self.native["binary"]), "-c", str(self.native["config"]), "-i", str(inp), "-o", str(out)]
            try:
                p=subprocess.run(cmd,env=self.native["env"],cwd=self.native["working_dir"],capture_output=True,timeout=15,check=False)
            except (OSError,subprocess.TimeoutExpired) as exc:
                raise EvidenceBlocked("NATIVE_CONVERSION_EXECUTION_FAILED") from exc
            self.last_exit_code=p.returncode
            self.stdout_sha256=digest(p.stdout)
            if p.returncode or not out.is_file() or out.stat().st_size>MAX_STDOUT_BYTES:
                raise EvidenceBlocked("NATIVE_CONVERSION_FAILED")
            try:
                return out.read_bytes().decode("utf-8", "strict")
            except UnicodeError as exc:
                raise EvidenceBlocked("NATIVE_OUTPUT_INVALID_UTF8") from exc


def run_verified(archive: Path, source_path: Path, spans_path: Path, output_dir: Path, marisa_package: Path | None = None) -> dict:
    if output_dir.exists() or not output_dir.parent.is_dir():
        raise EvidenceBlocked("NO_OVERWRITE_OUTPUT_DIRECTORY")
    if source_path.is_symlink() or not source_path.is_file() or source_path.stat().st_size > MAX_SAMPLE_BYTES:
        raise EvidenceBlocked("ORIGINAL_FIXTURE_MISSING_OR_OVERSIZE")
    if not source_path.resolve().is_relative_to(PROJECT_ROOT):
        raise EvidenceBlocked("ONLY_ORIGINAL_REPO_FIXTURE_ALLOWED")
    if spans_path.is_symlink() or not spans_path.is_file():
        raise EvidenceBlocked("SPANS_UNVERIFIED")
    source=source_path.read_bytes().decode("utf-8", "strict")
    spans=json.loads(spans_path.read_text("utf-8", "strict"))
    if not source.strip() or "\x00" in source:
        raise EvidenceBlocked("FIXTURE_EMPTY_OR_CONTROL_INPUT")
    # Use native temporary-only input/output, never private user documents or paths.
    with tempfile.TemporaryDirectory(prefix="tls_r175_native_") as td:
        native=unpack_native(archive,Path(td),marisa_package)
        version=safe_version(native)
        converter=NativeCLI(native)
        raw=converter.convert(source)
        raw_exit,raw_stdout_hash = converter.last_exit_code,converter.stdout_sha256
        equal,changed=convert_editable(source,spans,converter)
        equal_exit,equal_stdout_hash = converter.last_exit_code,converter.stdout_sha256
        if spans.get("status")!="READY":
            raise EvidenceBlocked("PARITY_MANIFEST_OR_OUTPUT_INVALID")
        # Deterministic cross-validate source and span using R17.3 authority.
        if spans.get("source_sha256")!=digest(source.encode("utf-8")):
            raise EvidenceBlocked("SOURCE_DIGEST_MISMATCH")
        reference=spans.get("spans",[])
        boundaries=utf16_boundaries(source)
        if any(x["start"] not in boundaries or x["end"] not in boundaries for x in reference):
            raise EvidenceBlocked("UNALIGNED_SPANS")
        output_dir.mkdir(mode=0o700)
        platform="linux-x86_64-official-release-deb"
        receipt={"schema":SCHEMA,"status":"SOURCE_VERIFIED_NATIVE_EXECUTED", "source":{
            "repository":"BYVoid/OpenCC", "tag":TAG, "asset":ASSET, "url":RELEASE_URL,
            "asset_sha256":native["archive_sha256"], "asset_sha256_verified":True,
            "debs":native["deb_sources"]}, "dependency":native["marisa_dependency"],
            "version":{"expected":VERSION,"observed":version,"cli_command":"opencc --version"},
            "platform":platform, "cli_binary_sha256":native["binary_sha256"],
            "config":{"name":CONFIG_NAME,"sha256":native["config_sha256"],
                "referenced_resources_count":len(native["resources"]),
                "resources_sha256":native["resources"]},
            "libraries":native["library_binaries_sha256"],
            "rights":{"license":"Apache-2.0 upstream", "redistributed_in_TLS":False},
            "real_execution":True,"cloud_api_called":False, "evidence_type":"NATIVE_CLI_ORIGINAL_SYNTHETIC_FIXTURE"}
        result={"schema":"tls.r175.parity.v1","source_fixture":"R175_ORIGINAL_SYNTHETIC_MARKDOWN",
             "source_sha256":digest(source.encode("utf-8")),
             "case_id":"R175_ORIGINAL_SYNTHETIC_MARKDOWN",
             "editable_spans_manifest_sha256":digest(spans_path.read_bytes()),
             "raw":{"lane":"L2_RAW_DIAGNOSTIC_ONLY","output_sha256":digest(raw.encode("utf-8")),
                    "output_utf8_bytes":len(raw.encode("utf-8")),"exit_code":raw_exit,
                    "stdout_sha256":raw_stdout_hash,"quality_score":None},
             "equal":{"lane":"L1_SAME_EDITABLE_SPANS","output_sha256":digest(equal.encode("utf-8")),
                      "output_utf8_bytes":len(equal.encode("utf-8")),
                      "modified_editable_segments":changed,"protected_segments_changed":0,
                      "exit_code":equal_exit,"stdout_sha256":equal_stdout_hash,
                      "semantic_equivalence_verified":False,"quality_score":None},
             "human_review":"HUMAN_REVIEW_PENDING", "user_adoption":"NOT_COLLECTED",
             "fresh_oos":False, "opencc_ambiguities_experimental":"NOT_EXECUTED"}
        validation={"schema":"tls.r175.validation.v1","source":"SOURCE_VERIFIED",
                    "native":"SOURCE_VERIFIED_NATIVE_EXECUTED", "fair_editable_safety":"PASS_TECHNICAL_ONLY",
                    "human_review":"HUMAN_REVIEW_PENDING", "adoption":"NOT_COLLECTED",
                    "product_runtime_changed":False,"tool_release_changed":False,
                    "network_requested_by_tool":False,"no_live_content":True,"new_release_created":False}
        for name,obj in (("NATIVE_SOURCE_RECEIPT.json",receipt),("R175_NATIVE_PARITY.json",result),("VALIDATION.json",validation)):
            (output_dir/name).write_text(json.dumps(obj,ensure_ascii=False,indent=2,sort_keys=True)+"\n",encoding="utf-8")
        return validation


def main(argv=None):
    parser=argparse.ArgumentParser(description="Verified native OpenCC v1.4.2 CLI: no fallback")
    parser.add_argument("--archive",required=True)
    parser.add_argument("--marisa-package")
    parser.add_argument("--fixture",required=True)
    parser.add_argument("--spans",required=True)
    parser.add_argument("--output",required=True)
    args=parser.parse_args(argv)
    try:
        report=run_verified(Path(args.archive),Path(args.fixture),Path(args.spans),Path(args.output),
                            Path(args.marisa_package) if args.marisa_package else None)
        print(json.dumps({"status":report["native"],"quality":"NOT_MEASURED","user_data_access":False},sort_keys=True))
        return 0
    except (EvidenceBlocked,ValueError,OSError,UnicodeError,subprocess.SubprocessError,KeyError,TypeError) as exc:
        reason=str(exc) if isinstance(exc,EvidenceBlocked) else "INVALID_SOURCE_OR_RUNTIME_EVIDENCE"
        print(json.dumps({"status":"B_BLOCKED_NATIVE_EVIDENCE","reason_code":reason[:70],
                          "native_quality":"NOT_MEASURED", "no_fallback":True}),file=sys.stderr)
        return 3


if __name__=="__main__":
    sys.exit(main())
