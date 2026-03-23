提供されたプロジェクト構成（Next.js, Prisma, SQLite, PM2）をXserver VPSで運用するための手順を説明します。

このプロジェクトは、`package.json` や `wrangler.jsonc` から、本来はCloudflare Pages/Workers向けに最適化されていますが、`ecosystem.config.js` や `nginx.conf` が含まれているため、VPS上でのNode.jsアプリケーションとしての実行も考慮されています。

以下に、Xserver VPS（UbuntuなどのLinux環境を想定）での構築手順をまとめます。

### 1. サーバーの基本準備
まず、VPSにSSHでログインし、必要なソフトウェアをインストールします。

* **Node.jsのインストール**: `package.json` で `next: 16.1.6` が使用されているため、Node.js 18.x以降（推奨は20以降）をインストールしてください。
* **PM2のインストール**: プロセス管理のためにPM2をグローバルインストールします。
    ```bash
    npm install -g pm2
    ```

### 2. プロジェクトの配置とセットアップ
GitHubからコードをクローンし、依存関係をインストールします。

* **リポジトリのクローン**:
    ```bash
    git clone <あなたのリポジトリURL>
    cd quiz-app
    ```
* **パッケージのインストール**:
    ```bash
    npm install
    ```
* **Prismaのセットアップ**: SQLiteを使用するため、マイグレーションを実行してデータベースファイルを生成します。
    ```bash
    npx prisma migrate deploy
    ```

### 3. アプリケーションのビルド
Next.jsを本番用にビルドします。

```bash
npm run build
```

### 4. PM2によるアプリケーションの起動
提供されている `ecosystem.config.js` を使用して、アプリケーションをバックグラウンドで実行します。

* **起動コマンド**:
    ```bash
    pm2 start ecosystem.config.js
    ```
    * この設定により、`PORT: 3000` でアプリケーションが待機します。
    * `DATABASE_URL` は `file:./prisma/dev.db` として設定されています。

### 5. Nginxによるリバースプロキシ設定
外部からのアクセス（ポート80）を、内部で動いているNext.js（ポート3000）に転送します。提供された `nginx.conf` を利用します。

* **設定ファイルの作成**: `/etc/nginx/sites-available/quiz-app` に内容をコピーし、`server_name` を取得したドメイン名に書き換えます。
* **設定の有効化**:
    ```bash
    sudo ln -s /etc/nginx/sites-available/quiz-app /etc/nginx/sites-enabled/
    sudo nginx -t
    sudo systemctl restart nginx
    ```

### 6. 運用上の注意点
* **データベース**: 現在の設定ではSQLite（`dev.db`）を使用しています。VPS運用では、ファイルが削除されないようバックアップに注意してください。
* **環境変数**: Clerk（認証）やGoogle GenAI（AI機能）のAPIキーが必要です。`.env` ファイルを作成し、必要な情報を記述してください。
* **Cloudflare依存部分**: `package.json` に `opennextjs-cloudflare` 関連のスクリプトがありますが、VPS運用では `npm start`（PM2経由）を使用するため、これらは無視して問題ありません。


この手順で、Xserver VPS上でリバースプロキシを介した公開が可能になります。ドメインを適用した後は、Nginxの設定でSSL（HTTPS）化を行うことを強く推奨します。