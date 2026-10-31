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
    ".gitignore", ".github/workflows/ci.yml", "START_HERE.html",
    "release/all_tools_registry.json",
    ".github/PULL_REQUEST_TEMPLATE.md",
    "AUTHORS.md","CHANGELOG.md","CONTRIBUTING.md","LICENSE",
    "PRIVACY.md","README.md","README.zh-CN.md","README.en.md","README.ja.md","README.ko.md","README.es.md","SECURITY.md",
    ".github/ISSUE_TEMPLATE/term_proposal.yml","AGENTS.md","CLAUDE.md",
}
DOCS_PUBLIC={
    "docs/showcase/source.md", "docs/showcase/preview.md",
    "docs/showcase/decisions.json", "docs/showcase/verification.json",
    "docs/showcase/README.md", "docs/showcase/README.en.md",
    "docs/showcase/trial_observation.md",
    "docs/FEATURES.md",
    "docs/GLOSSARY.md",
    "docs/ROADMAP.md",
    "docs/ALL_TOOLS_RELEASE.md",
    "docs/AI_WORKFLOWS_CODEX_CLAUDE_GROK.md", "docs/AI_WORKFLOWS_CODEX_CLAUDE_GROK.en.md",
    "docs/R172_WORDING_ASSISTANT.md",
    "docs/mrft/MRFT_DOM_PREVIEW.md",
    "docs/mrft/session_metadata.schema.json",
    "docs/mrft/MRFT_ORIGINAL_FIXTURE.html",
    "docs/QUICK_START_R174.md", "docs/QUICK_START_R174.en.md",
    "docs/R174_ORIGINAL_FIRST_TASK.md",
    "docs/R175_NATIVE_OPENCC_PROTOCOL.md",
    "docs/R173_COMPARISON_AND_ADOPTION.md", "docs/R173_COMPARISON_AND_ADOPTION.en.md",
    "docs/WEBSITE_LOCALIZATION_GUIDE.md",
    "docs/WEBSITE_LOCALIZATION_GUIDE.zh-CN.md",
    "docs/MULTILINGUAL_DOCUMENTATION_STANDARD.md",
    "docs/USAGE_EXAMPLES.md",
    "docs/USAGE_EXAMPLES.zh-CN.md",
    "docs/USAGE_EXAMPLES.en.md",
    "docs/USAGE_EXAMPLES.ja.md",
    "docs/USAGE_EXAMPLES.ko.md",
    "docs/USAGE_EXAMPLES.es.md",
    "docs/THIRD_PARTY_RIGHTS_POLICY.md",
    "docs/DEVELOPER_GUIDE.md",
    "docs/QUALITY_EVALUATION.md",
    "docs/INSTALL_CHROME.md","docs/INSTALL_TAMPERMONKEY.md",
    "docs/AI_INTEGRATION.md","docs/NAME_PROTECTION.md",
    "docs/CONTEXT_REVIEW_R8.md",
    "docs/R9_USER_TERMS.md","docs/R9_STAGE_CHECK.md",
    "docs/R10_PROVENANCE_REVIEW.md",
    "docs/R11_SITE_GLOSSARY.md",
    "docs/R11_STAGE_CHECK.md",
    "docs/R12_QUALITY_AUDIT_LAB.md",
    "docs/R14_PROVIDER_CAPABILITY.md",
    "docs/R15_STRUCTURED_INTEGRITY.md",
    "docs/R16_LOCALIZATION_STUDIO.md",
    "docs/R17_DOCUMENT_TRUST_GRAPH.md",
    "docs/R17_DOCUMENT_TRUST_GRAPH.zh-CN.md",
    "docs/R17_DOCUMENT_TRUST_GRAPH.en.md",
    "docs/R17_DOCUMENT_TRUST_GRAPH.ja.md",
    "docs/R17_DOCUMENT_TRUST_GRAPH.ko.md",
    "docs/R17_DOCUMENT_TRUST_GRAPH.es.md",
    "docs/R13_BILINGUAL_READER.md","docs/TAIWAN_UI_TERMS_R13.md",
}
PUBLIC_PREFIXES=("src/","tools/","tests/","dist/","examples/","lexicon/","skills/",".agents/skills/",".claude/skills/")
# Research files are explicitly allowlisted and NEVER silently become a distributed tool.
PUBLIC_R173_RESEARCH={
    "research/comparison/r173/methodology.json", "research/comparison/r173/consent_schema.json",
    "research/comparison/r173/feedback_template.md", "research/comparison/r173/llm_prompt.txt",
    "research/comparison/r173/fixtures_first_task.md", "research/comparison/r173/naive_baseline.js",
    "research/comparison/r173/prepare_spans.js", "research/comparison/r173/opencc_adapter.py",
    "research/comparison/r173/import_model_result.py", "research/comparison/r173/score_and_audit.py",
}
PUBLIC_R175_RESEARCH={
    "research/comparison/r175/native_probe.py",
    "research/comparison/r175/fixture_native_original.md",
    "research/comparison/r175/PROTOCOL.md",
}
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
RUNTIME_PREFIXES=("src/r177/","dist/r177/","src/core/","src/chrome/","src/userscript/","src/r13/","dist/chrome/","dist/userscript/","dist/r13/")
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
    if name in ROOT_PUBLIC or name in DOCS_PUBLIC or name in PUBLIC_BENCHMARK_FILES or name in PUBLIC_R173_RESEARCH or name in PUBLIC_R175_RESEARCH:
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

# This is a narrow narrative boundary, not a blanket ban on public research.
# Match explicit origin references and clear market/competitor strategy signals;
# ordinary privacy rules, fair technical comparison, skills and benchmarks remain.
NEGATED_STRATEGY_HEADING = re.compile(
    r"(?i)^\s{0,3}#{1,6}\s+(?:"
    r"(?:do not|never|must not|must never)\s+(?:publish|disclose|share)\s+"
    r"(?:(?:private|internal|detailed)\s+)*(?:market|competitor|product|customer\s+acquisition)\b"
    r"|(?:不得|禁止|不要)(?:公開|公布|揭露|發布|發佈)(?:私人|內部|詳細)*(?:市場|產品|競品|競爭|用戶獲取))"
)
PRIVATE_BRAIN_LABEL = r"(?:private[\s_-]+(?:project[\s_-]+)?brain|私人(?:專案)?大腦|私人\s*Project\s*Brain)"
PRIVATE_ORIGIN = re.compile(
    r"(?i)(?:\b(?:source|origin)\b[\"']?\s*[:=]\s*[\"']?\s*|(?:來源|出處)\s*[:：]\s*|\b(?:based on|derived from|copied from)\s+|(?:源自|取自)\s*)"
    + PRIVATE_BRAIN_LABEL
)
PRIVATE_ORIGIN_LINK = re.compile(r"(?i)(?:\]\(|https?://)[^\s)]{0,180}(?:private[-_/](?:project[-_/])?brain|project[-_]brain)(?:[/\\.#?]|\b)")
STRATEGY_HEADING = re.compile(
    r"(?im)^\s{0,3}#{1,6}\s+[^\r\n]{0,100}(?:"
    r"(?:market|competitor|product|customer\s+acquisition)[\w /&-]{0,40}(?:strategy|positioning|advantage|acquisition)"
    r"|產品定位|產品策略|產品競爭力|市場策略|競爭優勢|競品分析|用戶獲取|使用者獲取)"
)
COMPETITOR_SIGNAL = re.compile(r"(?i)\bcompetitor(?:s)?\b|競爭對手|競品")
BUSINESS_STRATEGY_SIGNAL = re.compile(r"(?i)customer\s+acquisition|go[- ]to[- ]market|market\s+opportunity|competitive\s+moat|用戶獲取|使用者獲取|市場機會|競爭壁壘")

def scan_public_boundary(path:str,content:str)->list[str]:
    # Test fixtures and frozen benchmark records are data, not public narrative.
    if path.startswith(("tests/", "benchmarks/")):
        return []
    origin_scope = path.endswith(".md") or (path.startswith(("docs/", "research/")) and path.endswith((".json", ".txt")))
    strategy_scope = path.startswith(("docs/", "research/", "README")) and path.endswith((".md", ".json", ".txt"))
    if not origin_scope and not strategy_scope:
        return []
    # Origin declarations always inspect original text: an unrelated warning
    # or privacy clause on the same line cannot cancel a declared private source.
    # Only explicit strategy-prohibition headings are omitted from strategy text.
    narrative = "\n".join(line for line in content.splitlines() if not NEGATED_STRATEGY_HEADING.search(line))
    errors=[]
    if origin_scope and (PRIVATE_ORIGIN.search(content) or PRIVATE_ORIGIN_LINK.search(content)):
        errors.append(f"{path}: private planning-origin reference is not public methodology")
    if strategy_scope and (STRATEGY_HEADING.search(narrative) or (COMPETITOR_SIGNAL.search(narrative) and BUSINESS_STRATEGY_SIGNAL.search(narrative))):
        errors.append(f"{path}: market/competitor strategy belongs outside public product documentation")
    return errors

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
        errors.extend(scan_public_boundary(item,content))
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
    assert allowed_path("README.zh-CN.md")
    assert allowed_path("research/comparison/r173/methodology.json")
    assert not allowed_path("research/comparison/r173/actual_private_outputs.jsonl")
    assert allowed_path("docs/USAGE_EXAMPLES.zh-CN.md")
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
    # Synthetic boundary fixtures: no real private repository identifiers.
    boundary = scan_public_boundary
    checks = [
        (not allowed_path("docs/PRODUCT_POSITIONING_R8.md"), "withdraw old positioning allowlist"),
        (not allowed_path("docs/R9_PRODUCT_STRATEGY.md"), "withdraw old strategy allowlist"),
        (bool(boundary("research/comparison/r173/methodology.json", '{"source": "Private Project Brain planning note"}')), "private origin metadata"),
        (bool(boundary("docs/FEATURES.md", "Source: private-project-brain planning note")), "private origin prose"),
        (bool(boundary("docs/FEATURES.md", "Source: Private Project Brain planning note. Do not edit this paragraph.")), "origin survives unrelated sentence negation"),
        (bool(boundary("research/comparison/r173/methodology.json", '{"source":"Private Project Brain planning note","warning":"Do not modify frozen inputs"}')), "origin survives unrelated compact JSON warning"),
        (bool(boundary("skills/example/SKILL.md", "Based on Private Project Brain planning note; never upload user text.")), "skill origin survives unrelated privacy clause"),

        (bool(boundary("docs/FEATURES.md", "[Source](https://example.invalid/project-brain/planning.md)")), "private origin link"),
        (bool(boundary("docs/FEATURES.md", "# Market and competitor strategy\nCustomer acquisition targets and competitive positioning.")), "renamed English strategy"),
        (bool(boundary("docs/FEATURES.md", "# 產品定位與競爭優勢\n市場機會與用戶獲取假設。")), "renamed Chinese strategy"),
        (bool(boundary("research/comparison/r173/feedback_template.md", "Competitor positioning: Example A.\nCustomer acquisition targets: paid conversion.")), "strategy body in research"),
        (not boundary("docs/THIRD_PARTY_RIGHTS_POLICY.md", "Do not publish private strategy or private Project Brain source notes."), "privacy rule remains public"),
        (not boundary("docs/ROADMAP.md", "# Do not publish market strategy\n不得公開私人研究原文；公開內容只描述功能、限制與可重現方法。"), "governance rule remains public"),
        (not boundary("research/comparison/r173/methodology.json", '{"source": "research/comparison/r173/methodology.json; self-contained public methods"}'), "public methodology remains public"),
        (not boundary("research/comparison/r175/PROTOCOL.md", "# Equal-protection comparison\nEvery textual competitor receives the same editable spans; missing runs are NOT_RUN."), "fair comparison remains public"),
        (bool(boundary("skills/example/SKILL.md", "Source: private-project-brain synthetic example")), "private origin inside reusable skill"),
        (bool(boundary("README.en.md", "Source: Private Project Brain planning note")), "private origin in root README"),
        (not boundary("skills/example/SKILL.md", "# Reusable localization workflow\nUse the public lexicon, preserve protected names and run local QA.\nNever upload private user text."), "legitimate reusable skill remains public"),
        (not boundary("AGENTS.md", "Private strategy belongs in private records; do not publish Private Project Brain source notes."), "public agent privacy guidance"),
        (not boundary("tests/fixtures/example.md", "Source: private-project-brain synthetic example"), "test fixtures outside narrative classification"),
        (not boundary("benchmarks/r6/public_frozen_v1.jsonl", '{"text": "market strategy"}'), "frozen benchmark outside narrative boundary"),
    ]
    assert all(ok for ok, _ in checks), "PUBLIC_CONTENT_BOUNDARY_SELF_TEST: " + ", ".join(label for ok, label in checks if not ok)
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
