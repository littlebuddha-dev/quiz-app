// Path: ecosystem.config.js
// Title: PM2 Ecosystem Configuration

module.exports = {
  apps: [
    {
      name: "quiz-app",
      cwd: __dirname,
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1, // 必要に応じて増減
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
