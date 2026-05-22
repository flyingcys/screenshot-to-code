#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
RUNTIME_DIR="$ROOT_DIR/.dev-runtime"
BACKEND_PID_FILE="$RUNTIME_DIR/backend.pid"
FRONTEND_PID_FILE="$RUNTIME_DIR/frontend.pid"
BACKEND_LOG_FILE="$RUNTIME_DIR/backend.log"
FRONTEND_LOG_FILE="$RUNTIME_DIR/frontend.log"

BACKEND_PORT="${BACKEND_PORT:-7001}"
BACKEND_HOST="${BACKEND_HOST:-0.0.0.0}"
FRONTEND_PORT="${FRONTEND_PORT:-5174}"
FRONTEND_HOST="${FRONTEND_HOST:-0.0.0.0}"
DO_BUILD="${DO_BUILD:-1}"

backend_cmd() {
  printf 'exec poetry run uvicorn main:app --reload --host %s --port %s' "$BACKEND_HOST" "$BACKEND_PORT"
}

frontend_cmd() {
  local pm_prefix
  pm_prefix="$(frontend_package_manager_prefix)"

  if [[ "$pm_prefix" == "npm" ]]; then
    printf 'exec npm run dev -- --host %s --port %s' "$FRONTEND_HOST" "$FRONTEND_PORT"
  else
    printf 'exec %s dev --host %s --port %s' "$pm_prefix" "$FRONTEND_HOST" "$FRONTEND_PORT"
  fi
}

frontend_package_manager_prefix() {
  if command -v yarn >/dev/null 2>&1; then
    printf 'yarn'
  else
    printf 'npm'
  fi
}

ensure_runtime_dir() {
  mkdir -p "$RUNTIME_DIR"
}

read_pid() {
  local pid_file="$1"
  if [[ ! -f "$pid_file" ]]; then
    return 1
  fi

  cat "$pid_file"
}

process_running() {
  local pid="$1"
  [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null
}

service_running() {
  local pid_file="$1"
  local pid=""

  if ! pid="$(read_pid "$pid_file" 2>/dev/null)"; then
    return 1
  fi

  process_running "$pid"
}

start_service() {
  local name="$1"
  local cwd="$2"
  local pid_file="$3"
  local log_file="$4"
  local cmd="$5"

  if service_running "$pid_file"; then
    echo "$name 已在运行"
    return 0
  fi

  if [[ -f "$pid_file" ]]; then
    rm -f "$pid_file"
  fi

  echo "启动 $name..."
  (
    cd "$cwd"
    nohup bash -lc "$cmd" >>"$log_file" 2>&1 &
    echo $! >"$pid_file"
  )

  sleep 1
  if service_running "$pid_file"; then
    echo "$name 启动成功"
    return 0
  fi

  echo "$name 启动失败，最近日志如下："
  tail -n 40 "$log_file" || true
  return 1
}

stop_service() {
  local name="$1"
  local pid_file="$2"

  if ! service_running "$pid_file"; then
    rm -f "$pid_file"
    echo "$name 未运行"
    return 0
  fi

  local pid
  pid="$(cat "$pid_file")"
  echo "停止 $name (PID $pid)..."
  kill "$pid" 2>/dev/null || true

  for _ in {1..20}; do
    if ! process_running "$pid"; then
      rm -f "$pid_file"
      echo "$name 已停止"
      return 0
    fi
    sleep 0.2
  done

  echo "$name 未能正常退出，尝试强制结束..."
  kill -9 "$pid" 2>/dev/null || true
  rm -f "$pid_file"
}

status_service() {
  local name="$1"
  local pid_file="$2"

  if service_running "$pid_file"; then
    echo "$name: 运行中 (PID $(cat "$pid_file"))"
  else
    echo "$name: 未运行"
  fi
}

start_all() {
  ensure_runtime_dir
  if [[ "$DO_BUILD" == "1" ]]; then
    build_all
  fi
  start_service "后端" "$BACKEND_DIR" "$BACKEND_PID_FILE" "$BACKEND_LOG_FILE" "$(backend_cmd)"
  start_service "前端" "$FRONTEND_DIR" "$FRONTEND_PID_FILE" "$FRONTEND_LOG_FILE" "$(frontend_cmd)"

  cat <<EOF
启动完成：
  前端: http://localhost:${FRONTEND_PORT}
  后端: http://localhost:${BACKEND_PORT}
  日志:
    $BACKEND_LOG_FILE
    $FRONTEND_LOG_FILE
EOF
}

stop_all() {
  stop_service "前端" "$FRONTEND_PID_FILE"
  stop_service "后端" "$BACKEND_PID_FILE"
}

restart_all() {
  stop_all
  start_all
}

status_all() {
  status_service "后端" "$BACKEND_PID_FILE"
  status_service "前端" "$FRONTEND_PID_FILE"
}

show_logs() {
  ensure_runtime_dir
  echo "后端日志: $BACKEND_LOG_FILE"
  echo "前端日志: $FRONTEND_LOG_FILE"
  echo
  tail -n 40 "$BACKEND_LOG_FILE" 2>/dev/null || true
  echo
  tail -n 40 "$FRONTEND_LOG_FILE" 2>/dev/null || true
}

build_all() {
  echo "构建后端..."
  (cd "$BACKEND_DIR" && poetry run python -m compileall -q .)

  echo "构建前端..."
  local pm_prefix
  pm_prefix="$(frontend_package_manager_prefix)"

  if [[ "$pm_prefix" == "npm" ]]; then
    (cd "$FRONTEND_DIR" && npm run build)
  else
    (cd "$FRONTEND_DIR" && $pm_prefix build)
  fi
}

usage() {
  cat <<'EOF'
用法:
  ./dev.sh start     先构建再启动前后端
  ./dev.sh stop      停止前后端
  ./dev.sh restart   重启前后端
  ./dev.sh status    查看运行状态
  ./dev.sh logs      查看最近日志
  ./dev.sh build     构建前后端
  ./dev.sh help      显示帮助

可选环境变量:
  BACKEND_PORT=7001
  BACKEND_HOST=0.0.0.0
  FRONTEND_PORT=5174
  FRONTEND_HOST=0.0.0.0
  DO_BUILD=0        启动时跳过构建
EOF
}

main() {
  local action="${1:-start}"

  if [[ $# -gt 0 ]]; then
    shift
  fi

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --backend-port)
        BACKEND_PORT="${2:?缺少 --backend-port 的值}"
        shift 2
        ;;
      --frontend-port)
        FRONTEND_PORT="${2:?缺少 --frontend-port 的值}"
        shift 2
        ;;
      --backend-host)
        BACKEND_HOST="${2:?缺少 --backend-host 的值}"
        shift 2
        ;;
      --frontend-host)
        FRONTEND_HOST="${2:?缺少 --frontend-host 的值}"
        shift 2
        ;;
      --no-build)
        DO_BUILD=0
        shift
        ;;
      *)
        echo "未知参数: $1"
        usage
        exit 1
        ;;
    esac
  done

  case "$action" in
    start)
      start_all
      ;;
    stop)
      stop_all
      ;;
    restart)
      restart_all
      ;;
    status)
      status_all
      ;;
    logs)
      show_logs
      ;;
    build)
      build_all
      ;;
    help|-h|--help)
      usage
      ;;
    *)
      echo "未知命令: $action"
      usage
      exit 1
      ;;
  esac
}

main "$@"
