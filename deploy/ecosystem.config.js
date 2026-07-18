// ============================================================
// CampusBlink — PM2 Ecosystem Config
// Manages the Node.js backend process on EC2.
// Usage: pm2 start ecosystem.config.js
// ============================================================

module.exports = {
  apps: [
    {
      name: 'campusblink-backend',
      script: 'src/index.js',
      cwd: '/app/campusblink/backend',

      // Cluster mode uses all available CPU cores
      // t3.micro has 2 vCPUs — use 2 instances for better throughput
      instances: 2,
      exec_mode: 'cluster',

      // Auto-restart on crash
      autorestart: true,
      watch: false,

      // Memory limit — restart if backend exceeds 400MB (EC2 t3.micro has 1GB RAM)
      max_memory_restart: '400M',

      // Environment — production settings
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // Log file locations
      out_file: '/app/logs/campusblink-out.log',
      error_file: '/app/logs/campusblink-error.log',
      merge_logs: true,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Graceful shutdown — wait for existing requests to finish
      kill_timeout: 5000,
      listen_timeout: 10000,

      // Restart delay to prevent restart loops
      min_uptime: '10s',
      max_restarts: 10,
    },
  ],
};
