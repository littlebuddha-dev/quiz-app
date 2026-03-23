# Xserver VPS クイズアプリ デプロイ手順書（Ubuntu / PM2 / Nginx）

この手順書は、Next.js + Prisma (SQLite) + PM2 + Nginx の構成で、Xserver VPS 上の Ubuntu に安定デプロイするための手順です。

特に次の2点を事故りにくくしています。

- 管理者権限が反映されない
- SQLite の参照先がずれて別DBを見てしまう

## 1. システムの準備

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential nginx
```

## 2. Node.js のインストール

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

node -v
npm -v
```

## 3. プロジェクトの配置

```bash
sudo mkdir -p /var/www
cd /var/www
sudo git clone <あなたのリポジトリURL> quiz-app
sudo chown -R $USER:$USER /var/www/quiz-app
cd /var/www/quiz-app

npm install
sudo npm install -g pm2
```

## 4. 環境変数の設定

```bash
nano .env
```

`.env` の例:

```dotenv
DATABASE_URL="file:/var/www/quiz-app/prisma/dev.db"

NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxx...
CLERK_SECRET_KEY=sk_live_xxxx...
CLERK_WEBHOOK_SECRET=whsec_xxxx...

ADMIN_EMAILS="admin@example.com,owner@example.com"

GEMINI_API_KEY=AIzaSy...

NODE_ENV=production
PORT=3000
```

補足:

- `DATABASE_URL` は絶対パス推奨です
- `ADMIN_EMAILS` に入れたメールアドレスは、Clerk 同期時に自動で `ADMIN` 扱いになります
- `CLERK_WEBHOOK_SECRET` が無いと Prisma 側のユーザー同期に失敗します

## 5. Clerk Webhook の設定

Clerk Dashboard で Webhook を作成してください。

- Endpoint URL: `https://あなたのドメイン/api/webhooks/clerk`
- Events:
  - `user.created`
  - `user.updated`
  - `user.deleted`

発行された Signing Secret を `.env` の `CLERK_WEBHOOK_SECRET` に設定します。

この設定が無いと、ログインしても DB にユーザーが作られず、管理者権限も反映されません。

## 6. Prisma 初期化とビルド

このリポジトリには `prisma/migrations` ディレクトリが無いため、初期反映は `migrate deploy` ではなく `db push` を使います。

```bash
npx prisma generate
npx prisma db push
rm -rf .next
npm run build
```

## 7. 初期データ投入

```bash
npx tsx scripts/seed-categories.ts
```

## 8. 最初の管理者ユーザーを有効化

1. `ADMIN_EMAILS` に設定したメールアドレスでアプリにログインします。
2. Clerk Webhook が成功すると、Prisma の `User.role` が `ADMIN` になります。
3. 反映確認が必要なら次を実行します。

```bash
npx prisma studio
```

確認ポイント:

- `User.email` が `ADMIN_EMAILS` に含まれている
- `User.role` が `ADMIN` になっている

Webhook 設定前に作成されたユーザーは、Clerk 側でプロフィール更新を1回行うか、Prisma Studio で `role` を直接 `ADMIN` に変更してください。

## 9. PM2 で常駐起動

```bash
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

`ecosystem.config.js` では `cwd` をプロジェクトルートに固定しているため、`.env` と SQLite を安定して参照できます。

## 10. Nginx の設定

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo nano /etc/nginx/sites-available/quiz-app
```

設定内容:

```nginx
server {
    listen 80;
    server_name 85.131.252.183;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

反映:

```bash
sudo ln -s /etc/nginx/sites-available/quiz-app /etc/nginx/sites-enabled/quiz-app
sudo nginx -t
sudo systemctl restart nginx
```

## 11. Xserver パケットフィルター設定

Xserver VPS 管理パネルで以下を許可してください。

- Web (80/443)

## 12. 動作確認

```bash
pm2 logs quiz-app
curl -I http://127.0.0.1:3000
```

確認ポイント:

- `/api/webhooks/clerk` に Clerk から 200 が返る
- ログイン後に `User` テーブルへ対象ユーザーが作成される
- `ADMIN_EMAILS` に含まれるユーザーが `ADMIN` になる
- `/admin` にアクセスでき、管理APIが 403 にならない
