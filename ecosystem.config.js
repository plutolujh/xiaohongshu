{
  "apps": [
    {
      "name": "xiaohongshu-server",
      "script": "server.js",
      "instances": "max",
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production"
      },
      "env_production": {
        "NODE_ENV": "production"
      },
      "error_file": "./logs/err.log",
      "out_file": "./logs/out.log",
      "log_date_format": "YYYY-MM-DD HH:mm:ss",
      "merge_logs": true,
      "rotate": {
        "enabled": true,
        "date_format": "YYYY-MM-DD",
        "max_size": "10M",
        "max_days": 7
      },
      "max_memory_restart": "500M",
      "autorestart": true,
      "max_restarts": 10,
      "min_uptime": "5000",
      "restart_delay": 1000
    }
  ]
}