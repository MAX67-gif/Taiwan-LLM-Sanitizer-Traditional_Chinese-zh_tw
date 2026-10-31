<!-- HUMAN_TRANSLATION_REVIEW: pending independent native-speaker review -->
<!-- SOURCE_EXAMPLES_SHA256:3a7ad38727e421556466f409dc2ce6b8e2db5ed0535e44344c9334be467f1fd7 -->

# 대만 번체 중국어 현지화: 독창적인 사용 사례 9가지

**언어:** [繁體中文](USAGE_EXAMPLES.md) · [简体中文](USAGE_EXAMPLES.zh-CN.md) · [English](USAGE_EXAMPLES.en.md) · [日本語](USAGE_EXAMPLES.ja.md) · [한국어](USAGE_EXAMPLES.ko.md) · [Español](USAGE_EXAMPLES.es.md)

> 모든 내용은 직접 만든 가상의 예시입니다. 실제 게임에서 가져온 문자열, 화면, 공식 승인 또는 호환성 검증이 아닙니다. 번역문은 사람이 만든 **예시**이며 자동 번역 결과가 아닙니다. 현재 도구들은 각각 별도로 사용합니다.

## EX01｜문맥에 따른 단어 선택

소프트웨어 UI의 `menu`는 대만 중국어에서 「選單」, 식당의 `menu`는 「菜單」로 쓰일 수 있습니다. UI의 `click`은 「點選」이지만 셔터 소리에는 다르게 표현합니다. R11은 사용자 선택을 돕지만 문맥을 자동으로 완벽히 판정하지 않습니다.

## EX02｜R13: 선택한 웹 텍스트의 읽기 전용 번역 비교

가상 페이지의 `Open settings to adjust the display.`를 직접 선택하면 R13에서 원문과 사용자가 입력한 `開啟設定以調整顯示方式。`를 비교할 수 있습니다. 브라우저 모델은 실제 지원되는 경우에만 사용합니다. 원본 페이지는 수정하지 않습니다.

## EX03｜R11: 웹사이트별 사용자 용어집

사용자가 `Settings → 設定`, `Open menu → 開啟選單`을 만든 뒤 허용된 웹사이트에만 수동 적용하고 확인합니다. 되돌리기는 조건부이며 자동 의미 판별기가 아닙니다.

## EX04｜R14: 모델 사용 불가 상태

가정된 `en → zh-Hant` 쌍이 `unavailable`이라면 그대로 표시해야 합니다. 허가 없이 클라우드로 원문을 전송하지 않습니다. R14 시연 데이터는 실제 기기의 모델 검사 결과가 아닙니다.

## EX05｜R15: Markdown 문법 보호

`Run the tool with` + `--help` + `See https://example.org/help.` 같은 자체 문장의 설명 부분만 사람이 검토하고, 코드와 플래그 및 URL은 보존합니다. R15는 완전한 Markdown AST 파서가 아닙니다. R15.1의 배포 여부는 실제 Release에서 확인해야 합니다.

## EX06｜R15: JSON 값과 키 구분

```json
{"title":"Help center","url":"https://example.org/help","enabled":true}
```

`title`의 값에 `說明中心`을 제안할 수 있으나 키, URL, 불리언 값은 건드리지 않습니다. 원본 파일을 자동 덮어쓰지 않습니다.

## EX07｜R15: Prompt 역할 및 자리표시자

```text
system: Preserve placeholders exactly.
user: Explain the settings for {{ACCOUNT_ID}}.
```

역할과 `{{ACCOUNT_ID}}`를 보호합니다. 설명문을 미리 보는 것이 모델 명령의 의미까지 보장하지는 않습니다.

## EX08｜가상의 웹 게임형 인터페이스

DOM에 표시된 `Open settings`나 `Start` 같은 단순 문구는 사이트 약관이 허용할 경우 R13 수동 선택 또는 R11 사용자 작성 용어집으로 보조할 가능성이 있습니다. Canvas/WebGL 텍스트, 플레이어 이름, 채팅, 비밀번호, 저장 데이터는 대상이 아닙니다. 특정 게임 전용 파일을 배포하거나 실제 게임 호환성을 보증하지 않습니다.

## EX09｜권한이나 지원이 불확실하면 중단

이미지 속 텍스트, 타인의 채팅, 사이트 약관에 위배되는 변경은 처리하지 않고 원문을 유지합니다. 합법적으로 직접 작성한 오프라인 예시를 사용하세요.

## 관련 자료

[일반 웹사이트 안내](WEBSITE_LOCALIZATION_GUIDE.md) · [저작권 및 개인정보](THIRD_PARTY_RIGHTS_POLICY.md) · [R15 제한사항](R15_STRUCTURED_INTEGRITY.md). 사용자 검증 없는 성능·정확도 수치는 제시하지 않습니다.

## R16 실습（직접 작성한 예제）

[R16 오프라인 도구](../examples/TW_Localization_Safety_Studio_R16_20261026.html)에서 [Markdown 예제](../examples/r16/sample_readme.md)를 열고 보호 구간을 확인한 다음 후보 문구를 직접 입력합니다. 코드, 변수, HTML 주석 및 URL은 변경할 수 없습니다. 원본을 덮어쓰지 않고 새 미리보기를 다운로드합니다. **자동 번역이나 업로드는 없습니다**.


#### EX10｜Codex, Claude, Grok와 TLS 사용하기

원본 사용 권한이 있는 중국어 Markdown을 AI로 작성하고 [R17.2 오프라인 도구](../examples/TW_Wording_Assistant_R172_20261027.html)에서 단어를 직접 검토한 뒤 새 파일로 내보냅니다. [AI 가이드(영어)](AI_WORKFLOWS_CODEX_CLAUDE_GROK.en.md). Grok 네이티브 플러그인은 제공하지 않습니다.

<!-- ALL_TOOLS_CATALOG: suite=17.3.0; tools=28; standalone=23; tool_ids_sha256=22cb8ad7ccdc6b9d468e2652407ee15e6288ce2c4a5e4f61fdf88b2cef9a0a57 -->

## 전체 도구 다운로드

이 예제에서 사용하는 합법적으로 배포 가능한 도구는 [R17.1 전체 도구 및 무결성 안내](ALL_TOOLS_RELEASE.md)에 모았습니다. Chrome, Tampermonkey, 오프라인 HTML, CLI는 설치 방법이 다릅니다. 원래 버전 번호를 유지하므로 작업에 맞는 진입점을 선택하고 같은 사이트에서 여러 버전을 동시에 사용하지 마세요. 이 묶음은 사람이 검토한 번역 품질을 인증하지 않습니다.

<!-- R177_MRFT_EXAMPLE_BEGIN -->
## R17.7 별도 다중 영역 연습

기존 EX01–EX09는 유지됩니다. [MRFT 사용법과 자체 제작 연습](mrft/MRFT_DOM_PREVIEW.md)에서는 최대 8개 영역, 두 위치 모드, 수동 번역문 또는 명시적으로 활성화한 로컬 모델을 다룹니다. OCR이나 클라우드 전송은 없습니다. Suite 17.3.0에는 도구 28개／독립 도구 자산 23개／Release 첨부 파일 28개가 있으며 기존 27개 도구의 바이트는 유지됩니다. 모델 기능과 사람의 언어 품질 평가는 별도로 검증해야 합니다.
<!-- R177_MRFT_EXAMPLE_END -->
