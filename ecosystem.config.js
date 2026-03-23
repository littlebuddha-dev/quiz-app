// Path: ecosystem.config.js
// Title: PM2 Ecosystem Configuration

module.exports = {
  apps: [
    {
      name: "quiz-app",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        DATABASE_URL: "file:./prisma/dev.db" // 運用環境のDBパスに合わせて変更してください
      },
      instances: 1, // 必要に応じて増減
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
