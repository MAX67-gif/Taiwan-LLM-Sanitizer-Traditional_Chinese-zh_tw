#!/usr/bin/env python3
"""Independent R19 R3 CANDIDATE native receipt verifier (not a release gate).

Checks actual browser report + local HTML SHA + desktop/mobile PNG dimensions.
Synthetic --self-test rejects altered metadata but is not browser evidence.
"""
from __future__ import annotations
import argparse,copy,hashlib,json,re,sys,zlib
from pathlib import Path

EXPECTED_HTML_SHA="e0e9f895d01e75cac43a3bcd1a8312b2a5b39f74eb92b366508e98c92a40fed1"
EXPECTED_HTML="TW_First_Result_Studio_R19_R3_CANDIDATE_20261113.html"
SCENARIOS=(
 "actual_local_file_url",
 "bidi_spoof_removed_and_disclosed",
 "isolates_arabic_mark_removed",
 "truncation_retains_extension_and_warning",
 "valid_zh_arabic_emoji_zwj_combining_preserved",
 "cancel_staged_preserves_text",
 "invalid_utf8_keeps_work",
 "apply_uses_safe_label_but_real_file_contents",
 "mobile_layout_and_synthetic_screenshot",
)
class Rejected(ValueError):pass
def require(x,code):
 if not x:raise Rejected(code)
def sha(data):return hashlib.sha256(data).hexdigest()
def checked_bytes(path,limit=10_000_000):
 require(path.is_file() and not path.is_symlink(),"INPUT_NOT_REGULAR")
 require(0<path.stat().st_size<=limit,"INPUT_TOO_LARGE")
 return path.read_bytes()
def png(path,width=None):
 raw=checked_bytes(path)
 require(len(raw)>1024 and raw[:8]==b'\x89PNG\r\n\x1a\n',"INVALID_PNG_SIGNATURE")
 offset=8;seen_header=False;seen_end=False;idat=[]
 width_actual=height=bitdepth=colortype=None
 channel_counts={0:1,2:3,3:1,4:2,6:4}
 # PNG chunk CRC and zlib content are checked; merely writing a fake IHDR
 # is insufficient. This is structural screenshot evidence, not UI semantics.
 while offset<len(raw):
  require(offset+12<=len(raw),"PNG_TRUNCATED_CHUNK_HEADER")
  size=int.from_bytes(raw[offset:offset+4],"big")
  ctype=raw[offset+4:offset+8]
  end=offset+12+size
  require(end<=len(raw) and size<=len(raw),"PNG_TRUNCATED_OR_OVERSIZE_CHUNK")
  payload=raw[offset+8:offset+8+size]
  given=int.from_bytes(raw[offset+8+size:end],"big")
  require((zlib.crc32(ctype+payload)&0xffffffff)==given,"PNG_CRC_MISMATCH")
  if not seen_header:
   require(ctype==b'IHDR' and size==13,"PNG_MISSING_FIRST_IHDR")
   width_actual=int.from_bytes(payload[0:4],"big")
   height=int.from_bytes(payload[4:8],"big")
   bitdepth=payload[8];colortype=payload[9]
   require(300<=width_actual<=16000 and 350<=height<=60000,"PNG_DIMENSIONS")
   require(colortype in channel_counts and bitdepth==8 and payload[10:]==b'\x00\x00\x00',
           "PNG_UNSUPPORTED_ENCODING_OR_INTERLACE")
   seen_header=True
  elif ctype==b'IHDR':
   raise Rejected("PNG_DUPLICATE_IHDR")
  elif ctype==b'IDAT':
   require(not seen_end,"PNG_IDAT_AFTER_END")
   idat.append(payload)
  elif ctype==b'IEND':
   require(size==0 and bool(idat),"PNG_MISSING_IMAGE_DATA")
   require(end==len(raw),"PNG_TRAILING_BYTES")
   seen_end=True
   break
  offset=end
 require(seen_end and seen_header and bool(idat),"PNG_MISSING_END_OR_DATA")
 if width is not None:require(width_actual==width,"PNG_WRONG_VIEWPORT_WIDTH")
 stride=width_actual*channel_counts[colortype]
 expected=height*(stride+1)
 require(expected<=120_000_000,"PNG_DECOMPRESSED_SIZE_EXCESS")
 decoder=zlib.decompressobj()
 try:decoded=decoder.decompress(b"".join(idat),expected+1)
 except zlib.error as exc:raise Rejected("PNG_IDAT_ZLIB_INVALID") from exc
 require(len(decoded)==expected and decoder.eof and not decoder.unused_data
         and not decoder.unconsumed_tail,"PNG_PIXEL_DATA_INVALID")
 require(all(decoded[row*(stride+1)]<=4 for row in range(height)),
         "PNG_SCANLINE_FILTER_INVALID")
 return {"sha256":sha(raw),"bytes":len(raw),"width":width_actual,"height":height}

def validate_report(report):
 require(type(report) is dict and report.get("schema")=="tls.r19-r3.native-preview.v1","REPORT_SCHEMA")
 require(report.get("status")=="PASS" and "failure" not in report,"REPORT_NOT_PASS")
 require(report.get("source_kind")=="CANDIDATE_NOT_RELEASED","FALSE_RELEASE_CLAIM")
 require(report.get("html_file")==EXPECTED_HTML and report.get("html_sha256")==EXPECTED_HTML_SHA,
         "WRONG_CANDIDATE_HTML")
 require(isinstance(report.get("browser_version"),str) and
         re.fullmatch(r"\d+\.\d+\.\d+\.\d+",report["browser_version"]) is not None,"BROWSER_VERSION")
 require(report.get("native_os_file_chooser_verified") is False and report.get("human_quality_verified") is False,
         "UNSUPPORTED_HUMAN_OR_CHOOSER_CLAIM")
 require(report.get("network_requested") is False and type(report.get("page_errors")) is int
         and report["page_errors"]==0,"NETWORK_OR_PAGE_ERRORS")
 require(type(report.get("scenario_count")) is int and report["scenario_count"]==9,"SCENARIO_COUNT")
 require(type(report.get("passed")) is int and report["passed"]==9,"PASS_COUNT")
 items=report.get("scenarios")
 require(isinstance(items,list) and len(items)==9 and
         [x.get("id") for x in items if isinstance(x,dict)]==list(SCENARIOS),
         "SCENARIO_NAMES_OR_ORDER")
 require(all(type(x) is dict and set(x)=={"id","status"} and x["status"]=="PASS" for x in items),
         "SCENARIO_NOT_ALL_PASS")
 return True
def validate(root,output):
 html=root/"examples"/EXPECTED_HTML
 require(sha(checked_bytes(html,400_000))==EXPECTED_HTML_SHA,"SOURCE_SHA_DRIFT")
 raw=checked_bytes(output/"R19_R3_CANDIDATE_NATIVE_REPORT.json",65_536)
 report=json.loads(raw.decode("utf-8"))
 validate_report(report)
 desktop=png(output/"R19_R3_DESKTOP_SYNTHETIC.png")
 require(desktop["width"]>=900,"DESKTOP_SCREENSHOT_NOT_DESKTOP")
 mobile=png(output/"R19_R3_MOBILE_SYNTHETIC.png",390)
 return {
  "schema":"tls.r19-r3.candidate-native-receipt.v1",
  "status":"PASS_CANDIDATE_ONLY",
  "candidate_sha256":EXPECTED_HTML_SHA,"scenario_count":9,"native_real_file_url":"RUNNER_ASSERTED",
  "browser_version":report["browser_version"],"report_sha256":sha(raw),
  "desktop_png":desktop,"mobile_png":mobile,
  "network_requested":False,"page_errors":0,"release_permission":"NONE",
  "source_text_in_report":False,"native_os_file_chooser_verified":False,
  "human_quality_verified":False,"adoption_measured":False,
 }
def self_test():
 good={"schema":"tls.r19-r3.native-preview.v1","status":"PASS","source_kind":"CANDIDATE_NOT_RELEASED",
 "html_file":EXPECTED_HTML,"html_sha256":EXPECTED_HTML_SHA,"browser_version":"140.0.7339.16",
 "native_os_file_chooser_verified":False,"human_quality_verified":False,
 "network_requested":False,"page_errors":0,"scenario_count":9,"passed":9,
 "scenarios":[{"id":id_,"status":"PASS"} for id_ in SCENARIOS]}
 assert validate_report(good)
 variants=[]
 for k,v in [("status","FAIL"),("source_kind","RELEASED"),("html_sha256","0"*64),
             ("browser_version","unknown"),("native_os_file_chooser_verified",True),
             ("human_quality_verified",True),("network_requested",True),("page_errors",1),
             ("scenario_count",8),("passed",8)]:
  x=copy.deepcopy(good);x[k]=v;variants.append(x)
 for mutation in ["remove","duplicate","fail","extra"]:
  x=copy.deepcopy(good)
  if mutation=="remove":x["scenarios"].pop()
  if mutation=="duplicate":x["scenarios"][1]["id"]=x["scenarios"][0]["id"]
  if mutation=="fail":x["scenarios"][0]["status"]="FAIL"
  if mutation=="extra":x["scenarios"][0]["debug_source"]="USER_TEXT"
  variants.append(x)
 for x in variants:
  try:validate_report(x)
  except Rejected:pass
  else:raise AssertionError("MUTATED_R3_RECEIPT_ACCEPTED")
 return len(variants)
def main(args=None):
 p=argparse.ArgumentParser()
 p.add_argument("--self-test",action="store_true")
 p.add_argument("--root",type=Path)
 p.add_argument("--output",type=Path)
 p.add_argument("--receipt",type=Path)
 a=p.parse_args(args)
 if a.self_test:
  print("R19_R3_CANDIDATE_RECEIPT_SELFTEST_PASS",self_test());return 0
 if not a.root or not a.output or not a.receipt:p.error("--root --output --receipt required")
 receipt=validate(a.root.resolve(),a.output.resolve())
 require(not a.receipt.is_symlink(),"RECEIPT_SYMLINK")
 a.receipt.parent.mkdir(parents=True,exist_ok=True)
 a.receipt.write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
 print("R19_R3_CANDIDATE_9_NATIVE_AND_SCREENSHOTS_VERIFIED")
 return 0
if __name__=="__main__":
 try:raise SystemExit(main())
 except (OSError,ValueError,UnicodeError,json.JSONDecodeError) as e:
  print("R19_R3_CANDIDATE_RECEIPT_BLOCKED",type(e).__name__,str(e)[:120],file=sys.stderr)
  raise SystemExit(2)
