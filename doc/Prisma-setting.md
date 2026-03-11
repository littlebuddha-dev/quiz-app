// Path: doc/Prisma-setting.md
// Title: Prisma 設定・運用マニュアル
// Purpose: 開発環境でのデータベース操作とユーザー管理の手順を記載。

# 💎 Prisma 設定・運用マニュアル

このプロジェクトでは、データベースの操作に **Prisma** を使用しています。開発環境では SQLite (`prisma/dev.db`) を使用しており、GUIでデータを操作するための Prisma Studio も利用可能です。

---

## 🚀 主要なコマンド

すべてのコマンドはプロジェクトのルートディレクトリ (`quiz-app/`) で実行してください。

| コマンド | 用途 |
| :--- | :--- |
| `npx prisma studio` | ブラウザでDBを直接編集できるGUIを起動します。 |
| `npx prisma db push` | `schema.prisma` の変更をデータベースに反映します。 |
| `npx prisma generate` | Prisma Client を最新のスキーマに基づいて再生成します。 |

---

## 👤 開発環境でのユーザー作成方法

ローカル環境では Clerk の Webhook（ユーザー作成通知）が直接届かないため、ログインしても自動的にデータベースにユーザーが登録されません。管理画面（`/admin`）を利用するために、以下の手順で手動登録を行ってください。

### 1. 自分の Clerk ID を取得する
1. [Clerk Dashboard](https://dashboard.clerk.com) にアクセス。
2. 「Users」メニューから自分のアカウントを選択。
3. **User ID** (`user_...` で始まる文字列) をコピーする。

### 2. Prisma Studio でレコードを追加する
1. `npx prisma studio` を実行し、ブラウザで [localhost:5555](http://localhost:5555) を開く。
2. **`User`** モデルを選択し、**「Add record」** をクリック。
3. 以下の項目を入力：
   - **`clerkId`**: 先ほどコピーした User ID
   - **`email`**: ログインに使用したメールアドレス
   - **`role`**: 管理者の場合は **`ADMIN`** に変更
4. 画面上部の **「Save 1 change」** ボタンを押して保存する。

---

## ⚠️ 注意事項

- **ローカルDBの場所**: データベース本体は `prisma/dev.db` にあります。誤って削除するとデータが消えるため注意してください。
- **スキーマ変更**: `prisma/schema.prisma` を変更した後は、必ず `npx prisma generate && npx prisma db push` を実行してください。
- **Webhookの同期**: ローカルで自動同期（ログイン時に自動でDB登録）を行いたい場合は、`ngrok` 等を使用して Clerk の Webhook URL を localhost に転送する設定が必要です。
