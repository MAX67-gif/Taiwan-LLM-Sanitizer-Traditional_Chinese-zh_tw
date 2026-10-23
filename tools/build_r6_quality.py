"""Build a standalone, deterministic, public R6 translation-quality study kit.

No network or user-data access. The only inputs are explicit public repository
files. R5 browser runtime is not modified by this evaluation-only builder.
"""
import hashlib
import json
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
ZIP_NAME = "TLS_R6_PUBLIC_QUALITY_KIT_V1_20261024.zip"
ARCHIVE = DIST / ZIP_NAME
CHECKSUM = DIST / (ZIP_NAME + ".sha256")
STAMP = (2026, 10, 24, 0, 0, 0)
SOURCES = (
    "benchmarks/r6/public_frozen_v1.jsonl",
    "benchmarks/r6/frozen_manifest_v1.json",
    "benchmarks/r6/human_rubric_v1.json",
    "examples/TW_R6_Bilingual_Quality_Review_20261024.html",
    "examples/TW_R6_Local_Chrome_Model_Run_20261024.html",
    "docs/QUALITY_EVALUATION.md",
    "PRIVACY.md",
    "tools/r6_benchmark.js",
    "tools/translation_qa.js",
    "src/core/engine.js",
    "src/core/lexicon_pack.js",
    "src/core/preferences.js",
    "src/core/entities.js",
    "lexicon/approved_r3.json",
    "lexicon/protected_names_r5.json",
)
INTRO = """# Taiwan-LLM-Sanitizer R6 Public Quality Kit

Evaluation-only frozen public regression materials (100 editorial cases).
DO NOT treat the R5 offline-dictionary baseline or structural check as
measurements of a real translation model's Taiwanese fluency.

Start:
1. Read docs/QUALITY_EVALUATION.md and PRIVACY.md.
2. Run: node tools/r6_benchmark.js validate
3. Run: node tools/r6_benchmark.js baseline --output OUTPUT.jsonl --report REPORT.json
4. On desktop Chrome with a supported built-in model, open
   examples/TW_R6_Local_Chrome_Model_Run_20261024.html
   (browser availability varies; it may download a language model).
5. Compare translation results using
   examples/TW_R6_Bilingual_Quality_Review_20261024.html
6. Optional: node tools/r6_benchmark.js score --input RESULTS.jsonl --output SCORES.json

All local inputs/outputs remain on the user's device. Sending files manually
to any cloud AI assistant is a separate user action governed by that service's
data policies. No evaluation scores have been independently verified yet.

Project: https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw
Steward: CA L. MIT public core, relevant third-party rights retained.
"""

def validate():
    raw = (ROOT / SOURCES[0]).read_bytes()
    manifest = json.loads((ROOT / SOURCES[1]).read_text(encoding="utf-8"))
    actual = hashlib.sha256(raw).hexdigest()
    if actual != manifest.get("exact_sha256_utf8"):
        raise ValueError("R6_PUBLIC_FROZEN_HASH_MISMATCH")
    examples = [json.loads(line) for line in raw.decode("utf-8").splitlines() if line.strip()]
    if len(examples) != 100 or len({e["id"] for e in examples}) != 100:
        raise ValueError("R6_INVALID_CASE_COUNT")
    for name in SOURCES:
        p = ROOT / name
        if not p.is_file() or p.is_symlink() or p.stat().st_size > 2_000_000:
            raise ValueError("R6_MISSING_OR_UNSAFE_FILE " + name)
    return actual

def build():
    digest = validate()
    DIST.mkdir(exist_ok=True)
    with zipfile.ZipFile(ARCHIVE, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for name in sorted(SOURCES):
            info = zipfile.ZipInfo(name, STAMP)
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, (ROOT / name).read_bytes(), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
        info = zipfile.ZipInfo("README_R6_PUBLIC_KIT.md", STAMP)
        info.compress_type = zipfile.ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        z.writestr(info, INTRO.encode("utf-8"), compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)
    with zipfile.ZipFile(ARCHIVE) as z:
        if z.testzip() is not None or len(z.namelist()) != len(SOURCES)+1:
            raise ValueError("R6_ZIP_INTEGRITY_FAIL")
    sha = hashlib.sha256(ARCHIVE.read_bytes()).hexdigest()
    CHECKSUM.write_text(f"{sha}  {ZIP_NAME}\n", encoding="utf-8")
    print("R6 PUBLIC KIT BUILT", ARCHIVE.name, "SHA256", sha)
    print("R6 FROZEN INPUT SHA256", digest)
    return sha

if __name__ == "__main__":
    build()
