#!/usr/bin/env python3
"""R19 R3 preview: real Chromium file:// acceptance; synthetic filenames only.

Not the official released R19 R2 native gate, not OS chooser cancel coverage,
not human language-quality evidence. No HTTP/setContent fallback.
"""
from __future__ import annotations
import json, os, pathlib, tempfile
from urllib.parse import urlparse
from playwright.sync_api import sync_playwright

ROOT=pathlib.Path(__file__).resolve().parents[1]
HTML=ROOT/"examples/TW_First_Result_Studio_R19_R3_CANDIDATE_20261113.html"
OUTPUT=pathlib.Path(os.environ.get("TLS_R19_R3_BROWSER_OUTPUT") or tempfile.mkdtemp(prefix="tls-r19-r3-native-"))
assert not OUTPUT.resolve().is_relative_to(ROOT.resolve()), "evidence must not write inside source repository"
OUTPUT.mkdir(parents=True,exist_ok=True)
REPORT={"schema":"tls.r19-r3.native-preview.v1","status":"NOT_RUN","html_file":HTML.name,
        "source_kind":"CANDIDATE_NOT_RELEASED","native_os_file_chooser_verified":False,
        "human_quality_verified":False,"network_requested":False,"page_errors":0,"scenarios":[]}
def check(ok,code):
    if not ok:raise AssertionError(code)
def run():
    import hashlib
    REPORT["html_sha256"]=hashlib.sha256(HTML.read_bytes()).hexdigest()
    network=[];errors=[]
    with sync_playwright() as playwright:
        browser=playwright.chromium.launch(headless=True)
        REPORT["browser_version"]=browser.version
        context=browser.new_context(viewport={"width":1280,"height":800},accept_downloads=True,
                                     reduced_motion="reduce")
        context.on("request",lambda req:network.append("OUTBOUND") if urlparse(req.url).scheme not in ("file","blob","data","about") else None)
        def route_guard(route):
            if urlparse(route.request.url).scheme not in ("file","blob","data","about"):
                network.append("OUTBOUND");route.abort()
            else:route.continue_()
        context.route("**/*",route_guard)
        page=context.new_page()
        page.on("pageerror",lambda e:errors.append(type(e).__name__))
        page.goto(HTML.as_uri(),wait_until="load")
        def upload(name,bytes_):
            page.locator("#file").set_input_files({"name":name,"mimeType":"text/markdown","buffer":bytes_})
        def staged():
            page.locator("#stagedFilePanel").wait_for(state="visible",timeout=12000)
            return page.locator("#stagedFileSummary").inner_text()
        def scenario(name,fn):
            try:
                fn();REPORT["scenarios"].append({"id":name,"status":"PASS"})
                print("R19_R3_NATIVE_PASS",name,flush=True)
            except Exception as e:
                REPORT["scenarios"].append({"id":name,"status":"FAIL","failure_type":type(e).__name__})
                print("R19_R3_NATIVE_FAIL",name,type(e).__name__,flush=True)
        scenario("actual_local_file_url",lambda:check(
            page.url.startswith("file:") and "R19 R3" in page.title(),"NOT_REAL_FILE_CANDIDATE"))
        def direction():
            upload("報告\\u202Egpj.md".replace("\\u202E","\u202e"),b"# Original\n")
            text=staged()
            check("\u202e" not in text,"BIDI_OVERRIDE_VISIBLE")
            check("報告" in text and ".md" in text,"FILENAME_NOT_DISPLAYED")
            check("特殊控制" in text,"REMOVAL_NOT_DISCLOSED")
            check(page.locator("#stagedFileSummary bdi").count()==1,"BIDI_ISOLATION_ABSENT")
        scenario("bidi_spoof_removed_and_disclosed",direction)
        def isolates():
            upload("整理\u2067abc\u2069\u061c.txt",b"Hello\n")
            text=staged()
            check(all(ch not in text for ch in ("\u2067","\u2069","\u061c")),"BIDI_ISOLATE_VISIBLE")
        scenario("isolates_arabic_mark_removed",isolates)
        def long_name():
            upload("臺灣"+"字"*130+"_備份.md",b"# Original\n")
            text=staged().split("（",1)[0]
            check("…" in text and text.endswith(".md"),"EXTENSION_LOST_BY_TRUNCATION")
            check("檔名過長" in staged(),"TRUNCATION_NOT_DISCLOSED")
        scenario("truncation_retains_extension_and_warning",long_name)
        def normal():
            name="修稿🧑‍💻_ملف_e\u0301.md"
            upload(name,b"Original\n")
            check(name in staged(),"VALID_UNICODE_ALTERED")
        scenario("valid_zh_arabic_emoji_zwj_combining_preserved",normal)
        def cancel():
            page.locator("#source").fill("我原本的文字。")
            upload("取消_test.md",b"# Change\n")
            staged()
            page.locator("#cancelFile").click()
            check(page.locator("#source").input_value()=="我原本的文字。","CANCEL_REPLACED_SOURCE")
            check(not page.locator("#stagedFilePanel").is_visible(),"CANCEL_STAGED_REMAINS")
        scenario("cancel_staged_preserves_text",cancel)
        def invalid():
            original=page.locator("#source").input_value()
            upload("壞檔.md",b"\xc3\x28")
            check(not page.locator("#stagedFilePanel").is_visible(),"INVALID_UTF8_STAGED")
            check(page.locator("#source").input_value()==original,"INVALID_UTF8_CHANGED_SOURCE")
        scenario("invalid_utf8_keeps_work",invalid)
        def apply():
            upload("安全\u202e文件.md",b"# Trial\r\n臺灣原創。\r\n")
            staged()
            page.locator("#applyFile").click()
            check("臺灣原創。" in page.locator("#source").input_value(),"APPLY_DROPPED_SOURCE")
            check("\u202e" not in page.locator("#message").inner_text(),"APPLY_REINTRODUCED_BIDI")
        scenario("apply_uses_safe_label_but_real_file_contents",apply)
        def mobile():
            page.set_viewport_size({"width":390,"height":844})
            page.screenshot(path=str(OUTPUT/"R19_R3_MOBILE_SYNTHETIC.png"),full_page=True)
            check(page.locator("#source").is_visible(),"MOBILE_SOURCE_INVISIBLE")
        scenario("mobile_layout_and_synthetic_screenshot",mobile)
        REPORT["network_requested"]=bool(network)
        REPORT["page_errors"]=len(errors)
        REPORT["scenario_count"]=len(REPORT["scenarios"])
        REPORT["passed"]=sum(s["status"]=="PASS" for s in REPORT["scenarios"])
        REPORT["status"]="PASS" if REPORT["passed"]==REPORT["scenario_count"]==9 and not network and not errors else "FAIL"
        page.screenshot(path=str(OUTPUT/"R19_R3_DESKTOP_SYNTHETIC.png"),full_page=True)
        context.close();browser.close()
    (OUTPUT/"R19_R3_CANDIDATE_NATIVE_REPORT.json").write_text(json.dumps(REPORT,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("R19_R3_NATIVE_CANDIDATE",REPORT["status"],str(REPORT["passed"])+"/9",flush=True)
    return 0 if REPORT["status"]=="PASS" else 1

if __name__=="__main__":
    raise SystemExit(run())
