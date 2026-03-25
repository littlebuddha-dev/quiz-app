# データ移行ガイド: Cloudflare D1 から SQLite (VPS) へ
# Path: migration_guide.md

現在のデータを失わずに Xserver VPS へ移行するための手順です。

## 1. Cloudflare D1 からデータのエクスポート

ローカル環境のターミナルで以下のコマンドを実行します。

```bash
# データのフルエクスポート (SQLファイルとして保存)
npx wrangler d1 export quiz-app-db --remote --output=dump.sql
```

これによって、現在のデータベース構造とデータが含まれた `dump.sql` が作成されます。

## 2. ローカル SQLite へのインポート (検証用)

作成された `dump.sql` を SQLite データベースファイルにインポートします。

```bash
# 新しい SQLite ファイルを作成してインポート
sqlite3 prisma/dev.db < dump.sql
```

> [!NOTE]
> `sqlite3` コマンドがインストールされていない場合は、各OSのパッケージマネージャ（brew, apt等）でインストールしてください。

## 3. VPS へのデプロイとデータ配置

1. アプリケーションコードを VPS にアップロードします (Git 経由など)。
2. VPS 上で `npm install` を実行します。
3. 手順2で作成した `prisma/dev.db` を VPS の `prisma/` ディレクトリに配置します。
4. `npm run build` でアプリケーションをビルドします。

## 4. PM2 による起動

VPS 上で PM2 を使用してアプリケーションを起動します。

```bash
# PM2 のインストール（未導入の場合）
npm install -g pm2

# アプリケーションの起動
pm2 start ecosystem.config.js

# サーバー起動時に自動実行されるように設定
pm2 save
pm2 startup
```

## 5. Nginx の設定

`/etc/nginx/sites-available/quiz-app` (名前は任意) に提供した `nginx.conf` の内容をコピーし、ドメイン名を書き換えて有効化してください。

```bash
# 設定の有効化
sudo ln -s /etc/nginx/sites-available/quiz-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 注意事項

- **Clerk の設定**: Xserver VPS のドメイン名に合わせて、Clerk ダッシュボードの `Allowed Redirect Origins` や `Webhooks` の URL を更新してください。
- **環境変数**: `.env` ファイルに、VPS 環境用の `DATABASE_URL="file:./prisma/dev.db"` や Clerk の API キーを正しく設定してください。
