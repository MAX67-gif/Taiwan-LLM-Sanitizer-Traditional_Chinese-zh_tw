"""Verify multilingual README synchronization and public-project neutral copy.

A passing result confirms structural facts/links, not human translation accuracy.
Translations are deliberately checked against the SHA of README.md: changing the
canonical README without also revising all localized copies fails CI.
"""
from __future__ import annotations
import argparse
import hashlib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "README.md"
LOCALES = ("en", "ja", "ko", "es")
LANGUAGE_FILES = ("README.md",) + tuple(f"README.{x}.md" for x in LOCALES)
CANONICAL_POKEBONK = "examples/pokebonk-demo/README.md"
RELEASE_PATH = "releases/tag/r7-pokebonk-demo-0.1.2"
COMMON_MILESTONES = ("R7.2", "v0.1.2", "R14", "R13", "R11", "R12", "R5", "R6")
FORBIDDEN_PROJECT_BRANDS = re.compile(
    r"(?i)(?:\bTAIDE\b|\bFAIDE\b|\bMiuLab\b|Taiwan[-\s]LLM(?![-\s]Sanitizer))"
)
MARKER = re.compile(r"<!-- SOURCE_README_SHA256:([0-9a-f]{64}) -->")
LINKS = re.compile(r"\]\(([^)\s]+)(?:\s+[^)]*)?\)")


def violations(name: str, content: str, canonical_sha: str) -> list[str]:
    errors: list[str] = []
    if not re.search(r"(?m)^# Taiwan-LLM-Sanitizer", content):
        errors.append(f"{name}: missing project title")
    if FORBIDDEN_PROJECT_BRANDS.search(content):
        errors.append(f"{name}: named competitor comparison/reference present")
    if CANONICAL_POKEBONK not in content or RELEASE_PATH not in content:
        errors.append(f"{name}: missing canonical Pokebonk README or current release")
    for version in COMMON_MILESTONES:
        if version not in content:
            errors.append(f"{name}: missing shared version {version}")
    for readme in LANGUAGE_FILES:
        if f"({readme})" not in content:
            errors.append(f"{name}: missing language switch link to {readme}")
    for link in LINKS.findall(content):
        if link.startswith(("https://", "http://", "mailto:", "#")):
            continue
        rel = (ROOT / link.split("#", 1)[0]).resolve()
        if not rel.is_relative_to(ROOT.resolve()) or not rel.exists():
            errors.append(f"{name}: broken or unsafe relative link {link}")
    if name != "README.md":
        tokens = MARKER.findall(content)
        if len(tokens) != 1 or tokens[0] != canonical_sha:
            errors.append(f"{name}: SOURCE_README_SHA256 mismatch — update translation alongside source")
        if "HUMAN_TRANSLATION_REVIEW" not in content:
            errors.append(f"{name}: translation review status missing")
    return errors


def run_checks() -> list[str]:
    expected = hashlib.sha256(BASE.read_bytes()).hexdigest()
    errors: list[str] = []
    for name in LANGUAGE_FILES:
        p = ROOT / name
        if not p.is_file():
            errors.append(f"missing: {name}")
            continue
        errors.extend(violations(name, p.read_text(encoding="utf-8"), expected))
    game_doc = ROOT / CANONICAL_POKEBONK
    if not game_doc.exists():
        errors.append("missing current Pokebonk README")
    else:
        text = game_doc.read_text(encoding="utf-8")
        if "R7.2" not in text or "R71_ARCHIVED_GUIDE.md" not in text:
            errors.append("current Pokebonk README must link its archived R7.1 guide")
    archive = ROOT / "examples/pokebonk-demo/R71_ARCHIVED_GUIDE.md"
    if not archive.exists() or "R7.1" not in archive.read_text(encoding="utf-8"):
        errors.append("R7.1 historic README not preserved")
    return errors


def self_test() -> None:
    checksum = "0" * 64
    minimal = (
        "# Taiwan-LLM-Sanitizer\n" +
        " ".join(f"({x})" for x in LANGUAGE_FILES) +
        f" {CANONICAL_POKEBONK} {RELEASE_PATH} " +
        " ".join(COMMON_MILESTONES) +
        "\n<!-- HUMAN_TRANSLATION_REVIEW: pending -->\n" +
        f"<!-- SOURCE_README_SHA256:{checksum} -->\n"
    )
    assert not violations("README.en.md", minimal, checksum)
    assert any("mismatch" in x for x in violations("README.en.md", minimal, "a" * 64))
    assert any("named competitor" in x for x in violations("README.en.md", minimal + "\nTAIDE", checksum))
    assert not FORBIDDEN_PROJECT_BRANDS.search("Taiwan-LLM-Sanitizer")
    print("README_I18N_GUARD_SELF_TEST_PASS")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    if args.self_test:
        self_test()
        return 0
    errors = run_checks()
    if errors:
        for msg in errors:
            print("README_I18N_BLOCKED:", msg, file=sys.stderr)
        return 1
    print(f"README_I18N_SYNC_PASS: {len(LANGUAGE_FILES)} languages + current Pokebonk guide")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
