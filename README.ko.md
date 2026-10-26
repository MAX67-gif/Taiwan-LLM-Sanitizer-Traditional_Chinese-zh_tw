<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_README_SHA256:3ea808d1341e8e8372736f081bb9c7b4fed794620805158582ffb9ddc1c29249 -->

# Taiwan-LLM-Sanitizer — 안전을 우선하는 대만 번체 중국어 현지화

**Languages:** [繁體中文](README.md) · [简体中文](README.zh-CN.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

사용자가 대만 용어를 직접 선택하고 원문과 번역문을 비교하며 기술 문서의 구조를 보호할 수 있는 오픈소스 도구입니다. 제3자 서비스의 공식 제품이 아닙니다. **MIT** · Founder / Steward: CA L.

## 사용 가능한 기능

| Release | Scope | Status |
| --- | --- | --- |
| **R13** | Local selection-based bilingual reading, no page-text rewrite | v0.6.0 Preview |
| **R11** | Explicit per-site personal glossary and conservative rollback | v0.5.0 Preview |
| **R14** | Offline provider capability / consent declarations; no remote transport | Research preview |
| **R15** | Markdown/JSON/Prompt 구조 보호 및 SHA256 기반 로컬 변경 미리보기 | 독립 미리보기 |
| **R12 / R6** | Frozen 100-case coverage and structural audit; not model correctness | Evaluation only |
| **R5, R8–R10** | Earlier lexical, human-choice and offline research tools | Preview / prototype |

[Releases](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases) · [R13 bilingual reader](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r13-bilingual-reader-preview-0.6.0) · [R11 glossary](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0).

## R15 — Local structure-preview toolkit

[R15 오프라인 구조 보호 도구](examples/TW_Structured_Integrity_Lab_R15_20261025.html)는 코드, JSON 키, URL, 역할과 변수를 보호하고 사용자가 지정한 변경 내용만 미리 보여 줍니다. 자동 번역이나 원본 파일 수정은 하지 않습니다.

## 일반 웹사이트에서 활용하기

공통 안내서에서 텍스트 선택 번역, 개인 용어 설정, 변경 취소 방법을 설명합니다. 특정 게임용 스크립트, 사전, 패치나 타사 자산은 배포하지 않습니다. 사이트 약관과 권리를 반드시 확인하세요. **[Universal website localization guide](docs/WEBSITE_LOCALIZATION_GUIDE.md)**.

## 이 프로젝트의 특징

문맥에 맞는 대만 용어, 코드 및 JSON 키 보호, 명확한 승인과 조건부 복원, 로컬 우선 처리, 검증 가능한 설명에 집중합니다.

## 저작권·상표·개인정보 보호

공개된 자료라고 해서 번역하거나 재배포할 권리가 있는 것은 아닙니다. 비영리·출처 표시·비공식 표기만으로 허가를 얻는 것은 아닙니다. [Third-party rights policy](docs/THIRD_PARTY_RIGHTS_POLICY.md) · [Privacy](PRIVACY.md) · [Security](SECURITY.md).

모든 기능은 미리보기입니다. 번역 정확도, 모든 사이트와의 호환성 또는 제3자 허가를 보장하지 않습니다.

## 문서 및 참여

[Documentation](docs/FEATURES.md) · [Roadmap](docs/ROADMAP.md) · [Contributing](CONTRIBUTING.md) · [Major updates](CHANGELOG.md).

## 직접 만든 사용 예제 9가지

[원본 권리를 침해하지 않는 9가지 예제](docs/USAGE_EXAMPLES.ko.md) (EX01–EX09): 대만 표현 선택, R13 수동 선택형 읽기, R11 사용자 용어집, R14 모델 능력 표시, R15 Markdown／JSON／Prompt 보호.

**가상의 웹 게임 형태 페이지**에서 `Open settings`가 선택 가능한 일반 HTML 글자라면 사이트 이용 약관이 허용할 때 R13 또는 R11로 보조할 가능성이 있습니다. Canvas／WebGL에 직접 그려진 글자는 지원하지 않습니다. 실제 게임 호환성을 확인했다고 주장하지 않으며 특정 게임용 스크립트나 사전도 배포하지 않습니다. [일반 웹사이트 안내](docs/WEBSITE_LOCALIZATION_GUIDE.md).

## R16｜오프라인 현지화 안전 워크벤치(독립 Shadow Preview)

[R16 오프라인 도구](examples/TW_Localization_Safety_Studio_R16_20261026.html) · [사용법 및 안전 제한](docs/R16_LOCALIZATION_STUDIO.md) · [직접 작성한 Markdown 예제](examples/r16/sample_readme.md). Markdown／JSON／Prompt의 보호 구간을 검사하고 후보 문구를 직접 입력한 뒤 차이를 검토하여 **새** 미리보기 파일로 저장합니다. 메타데이터 보고서는 원문을 포함하지 않지만 사용자가 내려받는 미리보기에는 직접 입력한 문구가 포함될 수 있습니다. **자동 번역, 클라우드 전송, 원본 덮어쓰기는 없습니다**. 모든 문법이나 번역 품질을 보증하지 않습니다.

## R17｜오프라인 문서 링크 무결성 검사(읽기 전용)

[R17 Markdown 링크 검사 열기](examples/TW_Document_Trust_Graph_R17_20261026.html) · [사용법 및 한계](docs/R17_DOCUMENT_TRUST_GRAPH.ko.md). 권한이 있는 Markdown 파일을 직접 선택하고 상대 링크와 제목 앵커를 검사합니다. 원문을 포함하지 않는 메타데이터 보고서만 내보냅니다. 외부 또는 알 수 없는 링크는 UNKNOWN으로 남기며 네트워크 요청을 보내지 않습니다. **번역하거나 원본 파일을 수정하지 않습니다.**

## R17.1｜모든 Release에 지원 중인 전체 도구 포함

[전체 도구 배포 및 무결성 안내](docs/ALL_TOOLS_RELEASE.md)를 확인하세요. 새로운 공식 Release에는 합법적으로 배포 가능하고 지원 중인 Chrome 확장, Tampermonkey 스크립트, 오프라인 HTML 작업대 13개, R6 품질 연구 키트, CLI/Skill 개발자 묶음이 모두 포함되어야 합니다. 변경되지 않은 도구는 원래 버전과 SHA256을 유지합니다. Draft의 모든 첨부 파일을 확인한 다음 공개합니다. 기존에 권리 문제로 철회한 제3자 전용 패키지는 제외합니다. 실제 GitHub CI 및 첨부 파일 검사가 성공한 뒤에만 [R17.1 Release](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/all-tools-suite-v17.1.0)를 사용하세요.

