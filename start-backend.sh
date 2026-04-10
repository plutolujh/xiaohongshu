#!/bin/bash

# 检查端口3004是否被占用
PORT=3004
PID=$(lsof -t -i:$PORT)

if [ ! -z "$PID" ]; then
  echo "端口 $PORT 被占用，正在关闭占用进程..."
  kill -9 $PID
  echo "已关闭占用进程 $PID"
fi

echo "启动后端服务（端口：$PORT）..."
npm run server
