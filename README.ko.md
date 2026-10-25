<!-- SOURCE_README_SHA256:b6e6bbd92d0e4678dea92d845dff58c18013802a07aa19ec8437de0b03925008 -->
<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
# Taiwan-LLM-Sanitizer | 대만 번체 중국어를 위한 안전한 현지화 도구

**언어 / Languages:** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md) · [한국어](README.ko.md) · [Español](README.es.md)

**오픈소스·개인정보 보호 우선·사용자 선택형** 대만 번체 중국어 현지화 도구입니다. 새로운 거대 언어 모델이 아니라 용어 선택, 원문 유지, 변경 사항 미리 보기, 기술적 구조 보호를 위한 독립적인 계층입니다. 자체 코어는 MIT 라이선스이며 Founder / Steward는 **CA L.**입니다.

## 주요 데모: PokéBonk 대만 번체 표시 지원 (R7.2 / v0.1.2)

**[PokéBonk 전용 README·설치·제약](examples/pokebonk-demo/README.md)** · [별도 데모 릴리스 다운로드](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2)

**비공식** Chrome / 단일 파일 Tampermonkey 데모이며, 사용자가 명시적으로 활성화한 사이트에서 일부 **화면에 보이는 DOM 텍스트**만 표시용으로 바꿉니다. 원본 예시 용어 **171개**에는 협동 플레이/UI를 위한 **검증되지 않은 신규 후보 35개**가 포함됩니다. 플레이어 이름, 채팅, 입력란은 제외하며 조건부 복원을 지원합니다. **게임 로직, 저장 데이터, 네트워크를 변경하지 않으며 최신 실제 게임에서 전체 동작을 검증하지 않았습니다.** 공식 번역이나 게임 전체 번역이 아닙니다.

## 현재 사용 가능한 기능

| 구성 요소 | 상태 | 사용 범위와 한계 |
| --- | --- | --- |
| **PokéBonk 표시 데모** | **R7.2 v0.1.2 Preview** | 별도 설치, 비공식·보이는 DOM 한정. [전용 README](examples/pokebonk-demo/README.md) |
| **Chrome/Tampermonkey 이중 언어 읽기** | **R13 v0.6.0 Preview** | 선택한 원문과 번역을 비교. Chrome 온디바이스 번역은 지원 환경에서만 사용하며 원래 페이지 텍스트는 변경하지 않음 |
| **사이트별 사용자 용어집** | **R11 v0.5.0 Preview** | R9 용어집 가져오기, 사이트 단위 미리 보기/개별 승인/복원 |
| 이전 브라우저 버전 | R5 v0.4.0 Preview | 보수적인 오프라인 용어 수정 및 실험적 로컬 번역, 이전 버전 보관 |
| **품질 점검** | **R12 독립 연구용 HTML** | 공개된 R6 고정 100개 사례의 범위 및 구조 경고 비교. 번역 정확도 인증 아님 |
| 용어·문맥 검토 | R8/R9/R10 독립 HTML | 다의어와 선택지 확인, 출처 검토. 미검증 후보는 자동 적용하지 않음 |
| Provider 기능·동의 검사 | **R14 Offline Shadow Preview** | 선언된 언어 쌍, 모델 상태, 다운로드와 동의 확인. **외부 전송 없음** |
| CLI/AI Skill | Prototype | Markdown, TXT, 일부 JSON/JSONL 및 Codex/Claude 보조 처리 |

[R14 오프라인 데모](examples/TW_Provider_Capability_Lab_R14_20261025.html)는 실제 기기에서 측정한 모델 성능이 아닙니다. R13은 지원되는 Chrome 로컬 Translator API 또는 수동 번역을 사용하며 지원되지 않는 경우 클라우드로 임의 전환하지 않습니다.

**다운로드:** [PokéBonk R7.2](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r7-pokebonk-demo-0.1.2) · [R13](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r13-bilingual-reader-preview-0.6.0) · [R11](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r11-manual-site-glossary-0.5.0) · [R12](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases/tag/r12-quality-evidence-preview-v1) · [전체 릴리스](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/releases)

Chrome ZIP은 압축을 풀고 `chrome://extensions` 개발자 모드에서 `manifest.json`이 있는 폴더를 로드해야 합니다. **Chrome Web Store에 등록되지 않았습니다.** Tampermonkey는 독립 실행되는 `.user.js` 파일입니다. 한 사이트에서 R5와 R11을 동시에 활성화하지 마세요. [Chrome 설치](docs/INSTALL_CHROME.md) · [Tampermonkey 설치](docs/INSTALL_TAMPERMONKEY.md) · [R13 설명](docs/R13_BILINGUAL_READER.md)

## 우리 프로젝트의 특징

- **모델에 독립적인 제어:** 용어·권한·보호 대상 구조를 확인하고 차이를 미리 보여 줍니다. 언어 모델 자체를 훈련했다고 주장하지 않습니다.
- **변경보다 보호 우선:** 코드, 고유명사, JSON 키, URL, 자리표시자는 그대로 둡니다. 문맥이 불분명하면 원문을 보존합니다.
- **대만 용어는 문맥에 따라 선택:** 소프트웨어 `menu`는 「選單」, 음식점 `menu`는 「菜單」, 마우스 UI `click`은 「點選」을 우선합니다. 다른 의미에는 일괄 적용하지 않습니다.
- **검증 가능한 한계:** R6 100개 사례는 이미 공개된 회귀 테스트일 뿐, 독립적 사람 평가로 번역 자연스러움이 입증된 것은 아닙니다.

타 프로젝트의 성능을 순위 매기거나 모방·공식 제휴를 암시하지 않습니다.

## 개인정보·라이선스·제약

로컬 처리를 우선하며 웹페이지 원문을 수집하는 자체 서버나 백그라운드 텔레메트리가 없습니다. Chrome 모델 다운로드와 원래 사이트 트래픽은 별개입니다. 공개 용어 자료에는 검토 대기 후보 **883개**, 편집용 기본 용어 **67개**, 독립 검증이 없는 R10 예시 **40개**가 있습니다. 후보가 자동으로 확정 규칙이 되지는 않습니다. [개인정보 정책](PRIVACY.md) · [보안](SECURITY.md) · [기능 제약](docs/FEATURES.md)

Canvas/WebGL, OCR, 모든 PDF, 모바일 확장 프로그램, 실제 번역 자연스러움은 완전 지원·검증을 보장하지 않습니다. 제삼자의 공식 승인이나 보증을 암시하지 않습니다. 추후 별도 상용 기능을 만들더라도 이미 공개된 MIT 코어의 권리를 소급 제한하지 않습니다.

## 개발 및 기여

민감한 정보나 사용 권한 문제가 없는 재현 사례를 [Issues](https://github.com/MAX67-gif/Taiwan-LLM-Sanitizer-Traditional_Chinese-zh_tw/issues)에 남겨 주세요. [기여 안내](CONTRIBUTING.md) · [로드맵](docs/ROADMAP.md) · [개발자 안내](docs/DEVELOPER_GUIDE.md) · [AI 연동](docs/AI_INTEGRATION.md) · [주요 변경 내역](CHANGELOG.md). 공개 README는 핵심만 안내하며 이전 Git 기록과 릴리스는 유지합니다.
