#!/usr/bin/env python3
"""Conservative, no-modification, no-network Taiwan wording *candidate* probe.

Standard library only. Outputs aggregate metadata with no source, path, URL,
email, filename, document hash, or raw context. Optional local-detail contains
positions only; it must not be shared publicly.
"""
from __future__ import annotations
import argparse
import json
import os
import stat
import re
import sys
from collections import Counter
from pathlib import Path

MAX_BYTES = 64 * 1024
SCHEMA = 'tls.portable-context-audit.v1'  # R1 fields retained; new fields are additive
ENGINE_VERSION = '2.0.0'
RULES = (
    ('TW_SOFTWARE', ('軟件', '软件'), '軟體'),
    ('TW_DATABASE', ('數據庫', '数据库'), '資料庫'),
    ('TW_MOUSE', ('鼠標', '鼠标'), '滑鼠'),
    ('TW_FOLDER', ('文件夾', '文件夹'), '資料夾'),
    ('TW_SERVER', ('服務器', '服务器'), '伺服器'),
    ('TW_SOURCE_CODE', ('源代碼', '源代码'), '原始碼'),
    ('TW_ARRAY', ('數組', '数组'), '陣列'),
    ('TW_DEFAULT', ('默認', '默认'), '預設'),
    ('TW_MENU', ('menu',), None),
    ('TW_CLICK', ('click',), '點選'),
    ('TW_CLICK_HAN', ('點擊', '点击'), '點選'),
    ('TW_SETTINGS', ('設置', '设置'), '設定'),
)
RULE_INDEX = {term.casefold(): (id, suggestion) for id, source, suggestion in RULES for term in source}
TERMS = sorted(RULE_INDEX, key=len, reverse=True)
TOKENS = re.compile('|'.join(re.escape(t) for t in TERMS), re.IGNORECASE)
URL = re.compile(r'https?://[^\s)<>]+', re.I)
PLACEHOLDER = re.compile(r'\{\{[^}\n]*\}\}|\$\{[^}\n]*\}|\{%[^%\n]*%\}', re.I)
MD_DEST = re.compile(r'!?\[[^\]\n]{0,400}\]\(\s*(?:<[^>\n]*>|[^)\n]*)\)', re.I)
HTML_TAG = re.compile(r'<\/?[A-Za-z][^>\n]*>')
CLI_FLAG = re.compile(r'(?<![\w-])--[a-z][\w-]*', re.I)
MARKDOWN_FENCE = re.compile(r'^\s{0,3}(`{3,}|~{3,})')
YAML_FRONTMATTER = re.compile(r'^---\s*$')
TABLE_SEPARATOR = re.compile(r'^\s*\|?\s*:?[-]{3,}:?\s*(\|\s*:?[-]{3,}:?\s*)+\|?\s*$')
RAW_HTML_START = re.compile(r'<(script|style|pre|code|textarea|template)(?=[\s>])', re.I)
CODE_LINE = re.compile(r'^\s*(?:const|let|var|function|class|import|export|def|from)\s+\S')
UI_CUES = re.compile(r'(?i)software|interface|\bui\b|\bapp\b|\bbutton\b|setting|navigation|\bweb\b|\bpanel\b|\bclick\b|\bopen\b|介面|界面|軟體|软件|軟件|系統|按钮|按鈕|設定|設置|點選|選單')
FOOD_CUES = re.compile(r'(?i)restaurant|\bfood\b|\blunch\b|\bdinner\b|\bmeal\b|\bchef\b|餐廳|餐厅|餐飲|餐饮|菜單|菜单|點餐|点餐|料理|午餐|晚餐')
ANALYTICS_CUES = re.compile(r'(?i)\brate\b|\btraffic\b|\bstatistics\b|\bmetrics\b|\banalytics\b|點擊率|点击率|點擊聲|点击声|點閱|点阅|統計|统计|聲音|声音')


def merge_spans(spans):
    merged=[]
    for start,end in sorted(set(spans)):
        if start >= end: continue
        if merged and start <= merged[-1][1]:
            merged[-1]=(merged[-1][0],max(merged[-1][1],end))
        else: merged.append((start,end))
    return merged


def protected_spans(line, whole_line=False):
    if whole_line:
        return [(0,len(line))] if line else []
    spans=[]
    for pattern in (URL, PLACEHOLDER, HTML_TAG, CLI_FLAG):
        spans.extend(m.span() for m in pattern.finditer(line))
    # Balanced destinations include nested parentheses and optional titles.
    # Malformed destinations are protected to EOL, never guessed as prose.
    for opening in re.finditer(r'(?<!\\)\]\(', line):
        start=opening.end();depth=1;i=start;escaped=False
        while i<len(line):
            ch=line[i]
            if escaped:escaped=False
            elif ch=='\\':escaped=True
            elif ch=='(':depth+=1
            elif ch==')':
                depth-=1
                if depth==0:break
            i+=1
        spans.append((start,i))
    for pattern in (r'(?<![\w])(?:\.\.?/|[A-Za-z]:\\)[^\s<>]+',
                    r'(?<![\w])[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+'):
        spans.extend(m.span() for m in re.finditer(pattern,line))
    return merge_spans(spans)


def inline_spans(line, ongoing=None):
    spans=[];pos=0
    if ongoing:
        close=re.search(r'(?<!`)'+'`'*ongoing+r'(?!`)',line)
        if close is None:return ([(0,len(line))] if line else []),ongoing
        spans.append((0,close.end()));pos=close.end();ongoing=None
    while pos<len(line):
        opening=re.search(r'(?<![\\`])`+',line[pos:])
        if opening is None:break
        start=pos+opening.start();end=pos+opening.end();size=end-start
        close=re.search(r'(?<!`)'+'`'*size+r'(?!`)',line[end:])
        if close is None:
            spans.append((start,len(line)));ongoing=size;break
        pos=end+close.end();spans.append((start,pos))
    return spans,ongoing

def protected_line_spans(text, include_empty=False):
    lines=text.splitlines(keepends=True)
    start_fence=None
    in_inline=None
    in_frontmatter=bool(lines) and bool(YAML_FRONTMATTER.match(lines[0].strip('\r\n')))
    in_comment=False
    in_raw_html=None
    ranges=[];issues=[]
    if in_frontmatter:issues.append('FRONTMATTER_PROTECTED')
    for n,line in enumerate(lines):
        clean=line.rstrip('\r\n')
        whole=False
        if in_raw_html:
            whole=True
            if re.search(r'</'+re.escape(in_raw_html)+r'\s*>',clean,re.I):in_raw_html=None
        elif in_frontmatter:
            whole=True
            if n!=0 and YAML_FRONTMATTER.match(clean):in_frontmatter=False
        elif start_fence:
            whole=True
            if re.match(r'^\s{0,3}'+re.escape(start_fence[0])+r'{'+str(start_fence[1])+r',}\s*$',clean):
                start_fence=None
        else:
            m=MARKDOWN_FENCE.match(clean)
            if m:
                start_fence=(m.group(1)[0],len(m.group(1)))
                whole=True
            elif re.match(r'^(?: {4,}|\t)\S',clean) or re.match(r'^ {0,3}\[[^]\n]+\]:',clean) or TABLE_SEPARATOR.match(clean) or CODE_LINE.match(clean):
                whole=True
            else:
                tag=RAW_HTML_START.search(clean)
                if tag:
                    whole=True
                    if not re.search(r'</'+re.escape(tag.group(1))+r'\s*>',clean[tag.end():],re.I):
                        in_raw_html=tag.group(1).lower()
        ps=protected_spans(clean,whole)
        if not whole:
            inline,in_inline=inline_spans(clean,in_inline)
            ps.extend(inline)
        # All HTML comments are protected, including multiline comments.
        i=0
        while i<len(clean):
            if in_comment:
                end=clean.find('-->',i)
                if end<0:
                    ps.append((i,len(clean)));break
                ps.append((i,end+3));i=end+3;in_comment=False;continue
            beginning=clean.find('<!--',i)
            if beginning<0:break
            end=clean.find('-->',beginning+4)
            if end<0:
                ps.append((beginning,len(clean)));in_comment=True;break
            ps.append((beginning,end+3));i=end+3
        ranges.append((clean,[(0,0)] if include_empty and whole and not clean else merge_spans(ps)))
    if in_inline:issues.append('UNCLOSED_INLINE_CODE_PROTECTED')
    if start_fence:issues.append('UNCLOSED_FENCE_PROTECTED')
    if in_frontmatter:issues.append('UNCLOSED_FRONTMATTER_PROTECTED')
    if in_comment:issues.append('UNCLOSED_HTML_COMMENT_PROTECTED')
    if in_raw_html:issues.append('UNCLOSED_RAW_HTML_BLOCK_PROTECTED')
    return ranges,issues


def in_spans(a,b,spans):
    return any(a < end and b > start for start,end in spans)


def _nearest_distance(pattern, line, center):
    vals=[abs((m.start()+m.end())/2-center) for m in pattern.finditer(line)]
    return min(vals) if vals else None


def context_line(line, spans, start, end):
    # Mask syntax before searching domain cues; a URL or code sample is not
    # evidence about surrounding prose. Preserve offsets for local details.
    chars=list(line)
    for a,b in spans:chars[a:b]=' '*(b-a)
    masked=''.join(chars)
    stops=list(re.finditer(r'[。！？!?；;|]|\.(?=\s|$)',masked))
    left=max([0]+[m.end() for m in stops if m.end()<=start])
    right=min([len(line)]+[m.start() for m in stops if m.start()>=end])
    return ' '*left+masked[left:right]+' '*(len(line)-right)


def classify(line, start, end, term, rule, suggestion):
    low=term.casefold()
    if rule=='TW_CLICK_HAN' and (re.match('^(?:率|聲|声|量|數|数|次)',line[end:]) or
                                  line[max(0,start-2):start].endswith('被')):
        return ('KEEP_ORIGINAL',None)
    if rule=='TW_CLICK' and re.match('^(?:[ -]?(?:rate|through|frequency|count|sound|analytics))',line[end:],re.I):
        return ('KEEP_ORIGINAL',None)
    if rule=='TW_DEFAULT':
        if re.match('^(?:了|其)',line[end:]):return ('KEEP_ORIGINAL',None)
        nearby=line[max(0,start-32):start]+line[end:end+32]
        if UI_CUES.search(nearby) or re.search(r'恢復|恢复|reset|default setting',nearby,re.I):
            return ('SUGGEST','預設')
        if re.search(r'默認了|默认了|默認其|默认其|同意|接受|安排|認同|认同',line):
            return ('KEEP_ORIGINAL',None)
        return ('NEEDS_CONTEXT',None)
    if rule in ('TW_MENU','TW_CLICK','TW_CLICK_HAN','TW_SETTINGS'):
        ui=_nearest_distance(UI_CUES,line,(start+end)/2)
        food=_nearest_distance(FOOD_CUES,line,(start+end)/2)
        stats=_nearest_distance(ANALYTICS_CUES,line,(start+end)/2)
        if rule=='TW_MENU':
            if ui is None and food is None:return ('NEEDS_CONTEXT',None)
            if ui is not None and food is not None and abs(ui-food)<=5:return ('NEEDS_CONTEXT',None)
            if food is not None and (ui is None or food<ui):return ('SUGGEST','菜單')
            return ('SUGGEST','選單')
        if rule=='TW_SETTINGS':
            nearby=line[max(0,start-32):start]+line[end:end+32]
            if not UI_CUES.search(nearby):return ('NEEDS_CONTEXT',None)
            return ('SUGGEST','設定')
        if stats is not None and (ui is None or stats<=ui):return ('KEEP_ORIGINAL',None)
        # The word "click" itself is NOT a valid UI cue for its own instance.
        local=line[max(0,start-26):start]+line[end:end+26]
        if UI_CUES.search(local):return ('SUGGEST','點選')
        return ('NEEDS_CONTEXT',None)
    return ('SUGGEST',suggestion)


def scan_text(text,detail=False):
    stripped=text.lstrip()
    if stripped.startswith(('{','[')):
        try:
            parsed=json.loads(stripped)
            if isinstance(parsed,(dict,list)):
                result={'schema':SCHEMA,'engine_version':ENGINE_VERSION,'engine':'deterministic_candidate_only',
                        'status':'UNSUPPORTED_FORMAT','source_modified':False,
                        'network_access':'NONE','human_translation_quality':'NOT_MEASURED',
                        'input_bytes':len(text.encode('utf-8')),'lines_scanned':len(text.splitlines()),
                        'protected_regions':0,
                        'counts':{s:0 for s in ('SUGGEST','KEEP_ORIGINAL','NEEDS_CONTEXT','BLOCKED_TECH')},
                        'by_rule_id':{},'limitations':['JSON_NOT_SUPPORTED'],
                        'privacy':'NO_SOURCE_OR_PATH_IN_REPORT'}
                if detail:result['private_local_positions_only']=[]
                return result
        except ValueError:pass
    rows,issues=protected_line_spans(text)
    counts=Counter(); per_rule=Counter(); matched=[]
    for n,(line,protected) in enumerate(rows,1):
        for match in TOKENS.finditer(line):
            term=match.group();left,right=match.span()
            if term.casefold() in ('menu','click') and ((left>0 and (line[left-1].isascii() and (line[left-1].isalnum() or line[left-1]=='_'))) or (right<len(line) and (line[right].isascii() and (line[right].isalnum() or line[right]=='_')))):
                continue
            rule,suggestion=RULE_INDEX[term.casefold()]
            if in_spans(left,right,protected):
                counts['BLOCKED_TECH']+=1
                continue
            state,chosen=classify(context_line(line,protected,left,right),left,right,term,rule,suggestion)
            counts[state]+=1;per_rule[rule]+=1
            if detail:
                matched.append({'line':n,'column':left+1,'rule_id':rule,'state':state,'candidate':chosen})
    if any(x.startswith('UNCLOSED_') for x in issues):
        overall='LIMITED'
    else:overall='REVIEW_REQUIRED' if counts['SUGGEST'] or counts['NEEDS_CONTEXT'] else 'NO_EDIT_SUGGESTED'
    result={'schema':SCHEMA,'engine_version':ENGINE_VERSION,'engine':'deterministic_candidate_only','status':overall,
            'source_modified':False,'network_access':'NONE',
            'human_translation_quality':'NOT_MEASURED','input_bytes':len(text.encode('utf-8')),
            'lines_scanned':len(rows),'protected_regions':sum(len(x[1]) for x in rows),
            'counts':{s:counts[s] for s in ('SUGGEST','KEEP_ORIGINAL','NEEDS_CONTEXT','BLOCKED_TECH')},
            'by_rule_id':dict(sorted(per_rule.items())),'limitations':sorted(set(issues)),
            'privacy': 'NO_SOURCE_OR_PATH_IN_REPORT'}
    if detail:
        result['private_local_positions_only']=matched
        result['privacy']='LOCAL_DETAIL_POSITIONS_DO_NOT_SHARE_PUBLICLY'
    return result



PROTECTED_NAMES=('Codex for Open Source','OpenAI Codex','Claude Code','ChatGPT','GitHub')
NEGATIONS=re.compile(r'(?i)\b(?:must not|do not|does not|cannot|never|not)\b|不得|不能|不可|不會|不会|不要|禁止|沒有|没有|勿|未|不')
NUMBERS=re.compile(r'(?<![A-Za-z_])\d+(?:[.,:/-]\d+)*(?:%|％)?')


def compare_texts(source, candidate):
    """Metadata-only comparison. PASS cannot certify meaning or naturalness."""
    scans=[scan_text(t) for t in (source,candidate)]
    rows=[protected_line_spans(t,include_empty=True) for t in (source,candidate)]
    protected=[]
    for text,(rs,_) in zip((source,candidate),rows):
        tokens=[]
        for raw,(line,spans) in zip(text.splitlines(keepends=True),rs):
            for a,b in spans:
                # Include protected line endings and empty code lines. Removing
                # a blank code line must not receive an integrity PASS.
                tokens.append(line[a:b]+(raw[len(line):] if b==len(line) else ''))
        protected.append(tokens)
    def structure(rs):
        result=[]
        for line,spans in rs:
            masked=list(line)
            for a,b in spans:masked[a:b]=' '*(b-a)
            plain=''.join(masked)
            head=re.match(r'^ {0,3}(#{1,6})\s+',plain)
            if head:result.append(('heading',len(head.group(1))))
            bullet=re.match(r'^\s*([-+*]|\d+[.)])\s+',plain)
            if bullet:result.append(('list',bullet.group(1)))
            if '|' in plain:result.append(('pipes',plain.count('|')))
        return result
    checks={
        'protected_segments_unchanged':protected[0]==protected[1],
        'numeric_tokens_unchanged':NUMBERS.findall(source)==NUMBERS.findall(candidate),
        'named_products_unchanged':all(source.count(n)==candidate.count(n) for n in PROTECTED_NAMES),
        'markdown_structure_unchanged':structure(rows[0][0])==structure(rows[1][0]),
    }
    warnings=[]
    if len(NEGATIONS.findall(source))!=len(NEGATIONS.findall(candidate)):
        warnings.append('NEGATION_SIGNAL_CHANGED')
    limited=any(s['status'] in ('LIMITED','UNSUPPORTED_FORMAT') for s in scans)
    status=('LIMITED' if limited else 'BLOCKED_INTEGRITY' if not all(checks.values())
            else 'REVIEW_REQUIRED' if warnings else 'CHECKS_PASSED_NOT_SEMANTIC_CERTIFIED')
    return {'schema':'tls.portable-translation-compare.v1','engine_version':ENGINE_VERSION,
            'status':status,'checks':checks,'warnings':warnings,
            'source_modified':False,'candidate_modified':False,'network_access':'NONE',
            'human_translation_quality':'NOT_MEASURED',
            'protected_segment_counts':[len(p) for p in protected],
            'privacy':'NO_SOURCE_OR_PATH_IN_REPORT',
            'limitations':['CONSERVATIVE_MARKDOWN_NOT_FULL_AST','SEMANTIC_EQUIVALENCE_NOT_VERIFIED']}


def read_authorized(path):
    if path.is_symlink() or not path.is_file() or path.suffix.lower() not in ('.md','.markdown','.txt'):
        raise ValueError('INPUT_MUST_BE_REGULAR_MARKDOWN_OR_TXT')
    flags=os.O_RDONLY|getattr(os,'O_NOFOLLOW',0)|getattr(os,'O_BINARY',0)
    fd=os.open(path,flags)
    with os.fdopen(fd,'rb') as f:
        st=os.fstat(f.fileno())
        if not stat.S_ISREG(st.st_mode):raise ValueError('INPUT_MUST_BE_REGULAR_MARKDOWN_OR_TXT')
        if st.st_size>MAX_BYTES or st.st_size==0:raise ValueError('INPUT_EMPTY_OR_OVER_64K')
        data=f.read(MAX_BYTES+1)
    if len(data)>MAX_BYTES or not data:raise ValueError('INPUT_EMPTY_OR_OVER_64K')
    if data.startswith(b'\xef\xbb\xbf') or b'\x00' in data:raise ValueError('INPUT_BOM_OR_NUL')
    return data.decode('utf-8','strict')


def main(argv=None):
    parser=argparse.ArgumentParser(description='Offline Taiwan wording review and translation-preservation checks')
    parser.add_argument('--input',required=True,type=Path,help='Authorized source Markdown or TXT')
    parser.add_argument('--compare',type=Path,help='Optional separate revised draft to verify')
    parser.add_argument('--output',type=Path,help='NEW metadata JSON only; no overwriting')
    parser.add_argument('--local-detail',action='store_true',help='Private positions only; not for publication')
    args=parser.parse_args(argv)
    try:
        decoded=read_authorized(args.input)
        result=(compare_texts(decoded,read_authorized(args.compare)) if args.compare
                else scan_text(decoded,detail=args.local_detail))
        rendered=json.dumps(result,ensure_ascii=False,indent=2)+'\n'
        if args.output:
            if args.output.resolve() in {p.resolve() for p in (args.input,args.compare) if p is not None}:
                raise ValueError('REFUSE_SOURCE_OVERWRITE')
            with args.output.open('x',encoding='utf-8',newline='\n') as fp:fp.write(rendered)
        else:sys.stdout.write(rendered)
        if args.compare and result['status']!='CHECKS_PASSED_NOT_SEMANTIC_CERTIFIED':return 3
        return 0
    except (ValueError,UnicodeError,OSError) as exc:
        # Never echo OS exception details: they may contain confidential paths.
        if isinstance(exc,UnicodeError):code='INVALID_UTF8'
        elif isinstance(exc,FileExistsError):code='OUTPUT_ALREADY_EXISTS'
        elif isinstance(exc,OSError):code='LOCAL_FILE_ACCESS_REFUSED'
        else:code=str(exc) if re.fullmatch(r'[A-Z0-9_]+',str(exc)) else 'INVALID_INPUT'
        print('AUDIT_REFUSED: '+code,file=sys.stderr)
        return 2

if __name__=='__main__':raise SystemExit(main())
