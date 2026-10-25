"""Public-only publication guard: fail closed on paths, secrets and egress APIs.

No third-party dependencies. This is a supplemental static control, not a
guarantee that every future change or browser behavior is risk-free.
"""
import argparse
import posixpath
import re
import subprocess
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ROOT_PUBLIC={
    ".gitignore", ".github/workflows/ci.yml",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "AUTHORS.md","CHANGELOG.md","CONTRIBUTING.md","LICENSE",
    "PRIVACY.md","README.md","SECURITY.md",
    ".github/ISSUE_TEMPLATE/term_proposal.yml","AGENTS.md","CLAUDE.md",
}
DOCS_PUBLIC={
    "docs/FEATURES.md",
    "docs/GLOSSARY.md",
    "docs/ROADMAP.md",
    "docs/DEVELOPER_GUIDE.md",
    "docs/QUALITY_EVALUATION.md",
    "docs/INSTALL_CHROME.md","docs/INSTALL_TAMPERMONKEY.md",
    "docs/AI_INTEGRATION.md","docs/NAME_PROTECTION.md",
    "docs/CONTEXT_REVIEW_R8.md","docs/PRODUCT_POSITIONING_R8.md",
    "docs/R9_USER_TERMS.md","docs/R9_PRODUCT_STRATEGY.md","docs/R9_STAGE_CHECK.md",
    "docs/R10_PROVENANCE_REVIEW.md",
    "docs/R11_SITE_GLOSSARY.md",
    "docs/R11_STAGE_CHECK.md",
    "docs/R12_QUALITY_AUDIT_LAB.md",
    "docs/R14_PROVIDER_CAPABILITY.md",
    "docs/R13_BILINGUAL_READER.md","docs/TAIWAN_UI_TERMS_R13.md",
}
PUBLIC_PREFIXES=("src/","tools/","tests/","dist/","examples/","lexicon/","skills/",".agents/skills/",".claude/skills/")
PUBLIC_BENCHMARK_FILES={
    "benchmarks/r6/public_frozen_v1.jsonl",
    "benchmarks/r6/frozen_manifest_v1.json",
    "benchmarks/r6/human_rubric_v1.json",
}
BAD_PATH=re.compile(
    r"(?i)(?:^|[/_.-])(?:private|internal|handoff|evidence|"
    r"grant|application|funding|codex_oss|competitive_research|"
    r"market_research|research_memo|personal|scratch|"
    r"conversation|secrets?|credentials?|token)(?:[/_.-]|$)"
)
BAD_EXT=(".pem",".p12",".pfx",".p8",".jks")
SECRETS=(
    re.compile(r"gh[pousr]_[A-Za-z0-9]{30,}"),
    re.compile(r"(?<![\w-])sk-(?:proj-)?[A-Za-z0-9_-]{32,}"),
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
)
EXFIL_APIS=(
    "fetch(", "XMLHttpRequest(", "navigator.sendBeacon(",
    "sendBeacon(", "new WebSocket(", "GM_xmlhttpRequest(",
    "chrome.history.", "chrome.cookies.", "document.cookie",
)
# Only production JS, not test examples that intentionally name forbidden APIs.
RUNTIME_PREFIXES=("src/core/","src/chrome/","src/userscript/","src/r13/","dist/chrome/","dist/userscript/","dist/r13/")
RUNTIME_SUFFIXES=(".js",".user.js")

def allowed_path(name:str)->bool:
    if name.startswith("/") or "\\" in name or name.endswith("/"):
        return False
    if any(part in (".","..","") for part in name.split("/")):
        return False
    if BAD_PATH.search(name):
        return False
    if name.lower().endswith(BAD_EXT):
        return False
    if name in ROOT_PUBLIC or name in DOCS_PUBLIC or name in PUBLIC_BENCHMARK_FILES:
        return True
    if name.startswith("docs/"):
        return False
    return name.startswith(PUBLIC_PREFIXES) and not name.endswith((".zip",".html.zip"))

def tracked_paths()->list[str]:
    result=subprocess.run(["git","ls-files","-z"],cwd=ROOT,capture_output=True,check=True)
    return [p.decode("utf-8") for p in result.stdout.split(b"\0") if p]

def scan_secret(path:str,content:str)->list[str]:
    return [f"{path}: possible secret/key fingerprint" for patt in SECRETS if patt.search(content)]

def scan_runtime(path:str,content:str)->list[str]:
    if not path.startswith(RUNTIME_PREFIXES) or not path.endswith(RUNTIME_SUFFIXES):
        return []
    return [f"{path}: disallowed outgoing-data API {api}" for api in EXFIL_APIS if api in content]

def validate(paths:list[str])->list[str]:
    errors=[]
    present=set(paths)
    for item in paths:
        if not allowed_path(item):
            errors.append(f"{item}: path is not on the public allowlist")
            continue
        target=ROOT/item
        if not target.is_file() or target.is_symlink():
            errors.append(f"{item}: missing, nonregular or symlink")
            continue
        # Avoid loading binary images and large files; check allowed UTF-8 source/docs only.
        if target.suffix not in (".md",".py",".js",".json",".yml",".yaml",".txt",".html",".user",".gitignore",""):
            continue
        if target.stat().st_size>2_000_000:
            errors.append(f"{item}: review large public file separately")
            continue
        try:
            content=target.read_text(encoding="utf-8")
        except (UnicodeError,OSError):
            continue
        errors.extend(scan_secret(item,content))
        errors.extend(scan_runtime(item,content))
    required={"README.md","LICENSE","PRIVACY.md","SECURITY.md","AUTHORS.md",
              "tools/publication_guard.py","AGENTS.md","CLAUDE.md",
              "docs/INSTALL_CHROME.md","docs/INSTALL_TAMPERMONKEY.md",
              "docs/AI_INTEGRATION.md","skills/taiwan-zh-tw-localization/SKILL.md",
              ".agents/skills/taiwan-zh-tw-localization/SKILL.md",
              ".claude/skills/taiwan-zh-tw-localization/SKILL.md"}
    for name in sorted(required-present):
        errors.append(f"missing public file: {name}")
    # All public Agent Skills must match the single canonical source exactly.
    source=ROOT/"skills/taiwan-zh-tw-localization/SKILL.md"
    if source.is_file():
        canonical=source.read_bytes()
        for destination in (".agents/skills/taiwan-zh-tw-localization/SKILL.md",
                            ".claude/skills/taiwan-zh-tw-localization/SKILL.md"):
            path=ROOT/destination
            if not path.is_file() or path.read_bytes()!=canonical:
                errors.append(f"{destination}: agent skill differs from canonical")
    # Prevent a README or public guide from linking a deleted/internal path.
    for name in ("README.md","CONTRIBUTING.md","SECURITY.md","docs/DEVELOPER_GUIDE.md"):
        if name not in present:continue
        value=(ROOT/name).read_text(encoding="utf-8")
        for href in re.findall(r"\]\(([^)\s]+)(?:\s+[^)]*)?\)",value):
            if "://" in href or href.startswith(("#","mailto:")):continue
            linked=(Path(name).parent/href.split("#",1)[0]).as_posix()
            linked=posixpath.normpath(linked)
            if linked not in present and linked not in ("","." ) and not (ROOT/linked).is_dir():
                errors.append(f"{name}: broken local link {href}")
    return errors

def self_test():
    assert allowed_path("README.md")
    assert allowed_path("docs/ROADMAP.md")
    assert allowed_path("src/core/preferences.js")
    assert allowed_path("skills/taiwan-zh-tw-localization/SKILL.md")
    assert allowed_path(".agents/skills/taiwan-zh-tw-localization/SKILL.md")
    assert allowed_path(".claude/skills/taiwan-zh-tw-localization/SKILL.md")
    assert allowed_path("docs/INSTALL_CHROME.md")
    assert allowed_path("docs/QUALITY_EVALUATION.md")
    assert allowed_path("docs/R13_BILINGUAL_READER.md")
    assert scan_runtime("src/r13/chrome/content.js","fetch('https://example.com')")
    assert allowed_path("benchmarks/r6/public_frozen_v1.jsonl")
    assert not allowed_path("benchmarks/r6/private_model_results.jsonl")
    assert not allowed_path("docs/CODEX_OSS_EVIDENCE_R1.md")
    assert not allowed_path("docs/PRIVATE_ROADMAP.md")
    assert not allowed_path("docs/NEW_INTERNAL.md")
    assert not allowed_path("notes_private/mysecret.md")
    assert not allowed_path(".env")
    assert scan_runtime("src/core/provider.js","fetch('https://example.com')")
    assert not scan_runtime("src/core/provider.js","const x=1;")
    assert scan_secret("x.md","sk-proj-"+"X"*45)
    print("Publication guard self-test PASS")

def main():
    cli=argparse.ArgumentParser()
    cli.add_argument("--self-test",action="store_true")
    args=cli.parse_args()
    if args.self_test:self_test();return 0
    try:paths=tracked_paths()
    except Exception as exc:
        print(f"ERROR: git tracked paths unavailable: {exc}",file=sys.stderr)
        return 2
    problems=validate(paths)
    if problems:
        for problem in problems:
            print("PUBLICATION BLOCKED:",problem,file=sys.stderr)
        return 1
    print(f"PUBLICATION GUARD PASS: {len(paths)} tracked public files reviewed")
    return 0

if __name__=="__main__":
    raise SystemExit(main())
