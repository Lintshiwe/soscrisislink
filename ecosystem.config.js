module.exports = {
  apps: [
    {
      name: 'crisislink-backend',
      script: './backend/src/server.js',
      cwd: './backend',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      // Logging
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_file: './logs/backend.log',
      time: true,

      // Process management
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      // Health monitoring
      min_uptime: '10s',
      max_restarts: 10,

      // Environment-specific settings
      node_args: '--max-old-space-size=4096',
    },
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-username/soscrisislink.git',
      path: '/var/www/crisislink',
      'pre-deploy-local': '',
      'post-deploy':
        'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': '',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
}
