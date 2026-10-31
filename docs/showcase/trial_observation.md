# 自願、離線、匿名試用觀察｜Voluntary offline observation

這是空白模板，不是真人結果。可拒絕參與、跳過問題或不分享；沒有送出按鈕、自動上傳、追蹤像素或外部分析程式。請勿加入原稿、文件路徑、帳號、聯絡方式、Token、公司機密或可辨識個人的描述。

This is a blank template, not a completed user study. Participation and sharing are optional. No automatic submission or telemetry is included. Do not add source text, paths, accounts, contact details, credentials or identifying information.

## 同意與觀察欄位／Consent and observation

```text
template_version: tls.showcase.observation.v1
consent_to_local_record: UNSET
consent_to_publish_summary: UNSET
participant_slot: UNASSIGNED
task_kind: NOT_COLLECTED
tool_version: R17.2
task_result: NOT_COLLECTED
elapsed_seconds: NOT_COLLECTED
understood_purpose_without_help: NOT_COLLECTED
download_opened_successfully: NOT_COLLECTED
completed_own_document: NOT_COLLECTED
needed_help_at_step: NOT_COLLECTED
protected_content_problem: NOT_COLLECTED
wording_concern_without_source_text: NOT_COLLECTED
d7_return: NOT_COLLECTED
```

填寫前先由參與者選擇 `YES`／`NO`；`UNSET` 不等於同意。只有同意本機紀錄時才記錄觀察；是否公開摘要需另外同意。若沒有同意，維持空白即可。`participant_slot` 是研究序號，由維護者在取得同意後分配，不是身分資料。不要由 AI 代填結果。

Before recording, the participant chooses `YES` or `NO`; `UNSET` is not consent. Publishing a summary requires its own consent. The slot is a study sequence number assigned after consent, not an identity. AI must not invent completed responses.

## 固定研究規則／Fixed study rules

- **E1/E2：**固定前 10 位非作者參與者，分開觀察用途理解與完成自己的文件；既定目標各為 8/10，並保留原協定的 15 秒用途辨識／3 分鐘任務時間門檻。這些是目標，不是已達成結果。
- **E3：**同一參與者與 R16 的配對任務比較，原目標為中位時間減少 30%；未做配對量測就 `NOT_COLLECTED`，不拿示範影片長度代替。
- **D7：**固定首 5 位參與者，觀察第七日是否完成第二次任務；原目標 3/5。沒有回覆記錄為 `NOT_OBSERVED`，不換分母或補入較成功的人。
- 一次看過此展示、下載、Star、Clone、CI 或 AI 自測，都不等於獨立外部使用者成功。這個展示是已曝光示例，不可稱為未見測試。

E1/E2 use the first ten non-author participants with the existing 8/10 goals and 15-second purpose/3-minute task thresholds. E3 requires paired R16 timing (target: 30% median reduction). D7 uses the first five participants (target: 3/5 returning for a second task); missing returns stay `NOT_OBSERVED`. Do not replace participants or treat downloads, stars, clones, CI or AI checks as human outcomes.

完整原協定：[公平比較與自願試用說明](../R173_COMPARISON_AND_ADOPTION.md)。參與者只需填願意回答的欄位；維護者負責保持固定分母、正確同意與去識別。預設所有結果保持 `NOT_COLLECTED`。
