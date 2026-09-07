# AIモデルとAPIの確認記録

確認日: 2026-09-07。対象はクイズ生成・翻訳・校閲・画像生成。

| 用途 | モデル | この開発環境での確認 |
| --- | --- | --- |
| 既定のクイズ生成 | `gemini-3.8-flash` | モデル一覧取得・三言語JSON生成成功 |
| 画像生成 | `gemini-3.1-flash-image`（Nano Banana 2） | モデル一覧取得・画像データ生成成功 |
| OpenAI最上位 | `gpt-6-astra` | 公式仕様確認・リクエストのモックテスト済み。キー未設定で実APIは未検証 |
| OpenAI高精度 | `gpt-5.6-sol` | 同上 |
| OpenAI標準・校閲 | `gpt-5.6-terra` | 同上 |
| OpenAI軽量 | `gpt-5.6-luna` | 同上 |
| OpenAI画像 | `gpt-image-2` | 公式モデル一覧確認。キー未設定で実APIは未検証 |

既存のGemini 3.7やGPT-5.5などを明示的に選択した設定は維持する。新規・未指定時はGemini 3.8を使う。Gemini 3.6を3.8へ置換することはせず、独立したフォールバックとして残す。モデル未提供の404は次の候補へ進めるが、認証失敗や不正なリクエストはそのまま返す。

SDK `@google/genai` の既存 `generateContent` と、OpenAI Responses / Images APIの入出力契約を維持。新モデルの利用のためのSDK更新は不要だった。クイズ生成の三言語検証・品質審査は維持する。

Gemini 3.8 / 3.7のテキスト料金は2026年末まで入力$0.75・出力$3.75 / 100万トークン、2027年1月1日から$1.50・$7.50へ切り替える。出力には思考トークンを含める。OpenAIの料金は確認日時点の標準テキスト料金。画像・ツール・キャッシュ・長文追加料金を含む請求全体の見積もりではない。

## 再確認

```sh
npm run ai:check-models
npm run ai:check-models -- --smoke
npm run ai:check-models -- --images
npm run test:ai-models
npm run test:quiz-quality
```

最初のコマンドはモデル一覧の読み取りのみ。`--smoke` は設定済みプロバイダーごとに短いテキスト生成、`--images` は画像1枚の生成を行い、利用料金が発生し得る。APIキー・画像データ・APIエラー本文は出力しない。`.env`、`.env.local`、プロセス環境変数の順に優先する。モデル一覧への掲載と、生成権限・クォータがあることは別なので、結果を区別して表示する。

## 公式資料

- [Gemini 3.8 Flash](https://ai.google.dev/gemini-api/docs/latest-model)
- [Gemini画像生成](https://ai.google.dev/gemini-api/docs/image-generation)
- [Gemini料金](https://ai.google.dev/gemini-api/docs/pricing)
- [OpenAIモデル一覧](https://developers.openai.com/api/docs/models)
- [GPT-6 Astra移行ガイド](https://developers.openai.com/api/docs/guides/latest-model/gpt-6-astra.md#migration-quickstart)
- [GPT-5.6モデル移行](https://developers.openai.com/api/docs/guides/upgrading-to-gpt-5p6-sol)
- [Sol](https://developers.openai.com/api/docs/models/gpt-5.6-sol)、[Terra](https://developers.openai.com/api/docs/models/gpt-5.6-terra)、[Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna)
