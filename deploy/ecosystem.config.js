// deploy/ecosystem.config.js
// PM2 process config for the Bercut backend.
//
// IMPORTANT: instances must remain 1 (single instance).
// SSE relies on in-process subscriber maps. Clustering without sticky sessions
// would break real-time delivery — barber completing a job would emit on
// the wrong worker and the kiosk would never receive the payment_trigger event.

module.exports = {
  apps: [
    {
      name:         'bercut-backend',
      script:       './backend/server.js',
      cwd:          '/var/www/bercut',
      instances:    1,            // DO NOT change to 'max' — SSE requires single instance
      exec_mode:    'fork',
      autorestart:  true,
      watch:        false,
      max_memory_restart: '512M',

      env: {
        NODE_ENV: 'production',
        PORT:     3000,
      },

      // Logging
      out_file:  './logs/backend-out.log',
      error_file:'./logs/backend-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Graceful reload
      kill_timeout:     5000,
      listen_timeout:   10000,
      shutdown_with_message: true,
    },
  ],
}
