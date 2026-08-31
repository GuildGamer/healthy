#!/usr/bin/env bash
# Start / stop / restart API + Metro + admin (Lane B) as background jobs with logs under .run/
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUN_DIR="${ROOT}/.run"
API_PID_FILE="${RUN_DIR}/api.pid"
MOBILE_PID_FILE="${RUN_DIR}/mobile.pid"
ADMIN_PID_FILE="${RUN_DIR}/admin.pid"
API_LOG="${RUN_DIR}/api.log"
MOBILE_LOG="${RUN_DIR}/mobile.log"
ADMIN_LOG="${RUN_DIR}/admin.log"

usage() {
  echo "Usage: $0 {start|stop|restart|status|logs}"
  exit 1
}

ensure_run_dir() {
  mkdir -p "${RUN_DIR}"
}

pid_is_alive() {
  local pid="$1"
  kill -0 "${pid}" 2>/dev/null
}

read_pid() {
  local pid_file="$1"
  if [[ ! -f "${pid_file}" ]]; then
    return 1
  fi
  local pid
  pid="$(tr -d '[:space:]' <"${pid_file}")"
  if [[ -z "${pid}" ]]; then
    rm -f "${pid_file}"
    return 1
  fi
  if ! pid_is_alive "${pid}"; then
    rm -f "${pid_file}"
    return 1
  fi
  echo "${pid}"
}

# Kill a process and its descendants (pnpm/nest/metro/next spawn trees).
kill_tree() {
  local pid="$1"
  local child
  while read -r child; do
    [[ -n "${child}" ]] || continue
    kill_tree "${child}"
  done < <(pgrep -P "${pid}" 2>/dev/null || true)

  kill "${pid}" 2>/dev/null || true
}

wait_until_dead() {
  local pid="$1"
  local attempts=30
  local i
  for ((i = 0; i < attempts; i++)); do
    if ! pid_is_alive "${pid}"; then
      return 0
    fi
    sleep 0.1
  done
  kill -9 "${pid}" 2>/dev/null || true
}

stop_named() {
  local name="$1"
  local pid_file="$2"
  local pid

  if ! pid="$(read_pid "${pid_file}")"; then
    echo "${name} is not running"
    rm -f "${pid_file}"
    return 0
  fi

  echo "+ stop ${name} (pid ${pid})"
  kill_tree "${pid}"
  wait_until_dead "${pid}"
  rm -f "${pid_file}"
}

start_named() {
  local name="$1"
  local pid_file="$2"
  local log_file="$3"
  shift 3

  if read_pid "${pid_file}" >/dev/null; then
    echo "${name} is already running (pid $(cat "${pid_file}")). Stop it first."
    exit 1
  fi

  echo "+ $*  (background → ${log_file})"
  (
    cd "${ROOT}"
    nohup "$@" >"${log_file}" 2>&1 &
    echo $! >"${pid_file}"
  )
}

lane_b_running() {
  read_pid "${API_PID_FILE}" >/dev/null \
    || read_pid "${MOBILE_PID_FILE}" >/dev/null \
    || read_pid "${ADMIN_PID_FILE}" >/dev/null
}

cmd_start() {
  ensure_run_dir

  if lane_b_running; then
    echo "Lane B already running. Use: make lane-b-restart  or  make lane-b-stop"
    exit 1
  fi

  echo "+ docker compose up -d postgres"
  (cd "${ROOT}" && docker compose up -d postgres)

  : >"${API_LOG}"
  : >"${MOBILE_LOG}"
  : >"${ADMIN_LOG}"

  start_named "api" "${API_PID_FILE}" "${API_LOG}" \
    pnpm --filter @product/api dev
  start_named "mobile" "${MOBILE_PID_FILE}" "${MOBILE_LOG}" \
    pnpm --filter @product/mobile start
  start_named "admin" "${ADMIN_PID_FILE}" "${ADMIN_LOG}" \
    pnpm --filter @product/admin dev

  echo "Lane B started."
  echo "  API:    http://localhost:3000  (log: ${API_LOG})"
  echo "  Admin:  http://localhost:3001  (log: ${ADMIN_LOG})"
  echo "  Metro:  see ${MOBILE_LOG}"
  echo "  Status: make lane-b-status"
  echo "  Logs:   make lane-b-logs"
  echo "  Stop:   make lane-b-stop"
}

cmd_stop() {
  stop_named "admin" "${ADMIN_PID_FILE}"
  stop_named "mobile" "${MOBILE_PID_FILE}"
  stop_named "api" "${API_PID_FILE}"
  echo "Lane B stopped. (Postgres left running — use make down to stop it.)"
}

cmd_restart() {
  cmd_stop
  cmd_start
}

cmd_status() {
  local api_pid mobile_pid admin_pid
  if api_pid="$(read_pid "${API_PID_FILE}")"; then
    echo "api:    running (pid ${api_pid})"
  else
    echo "api:    stopped"
  fi
  if mobile_pid="$(read_pid "${MOBILE_PID_FILE}")"; then
    echo "mobile: running (pid ${mobile_pid})"
  else
    echo "mobile: stopped"
  fi
  if admin_pid="$(read_pid "${ADMIN_PID_FILE}")"; then
    echo "admin:  running (pid ${admin_pid})"
  else
    echo "admin:  stopped"
  fi
}

cmd_logs() {
  ensure_run_dir
  touch "${API_LOG}" "${MOBILE_LOG}" "${ADMIN_LOG}"
  echo "+ tail -f ${API_LOG} ${MOBILE_LOG} ${ADMIN_LOG}"
  tail -f "${API_LOG}" "${MOBILE_LOG}" "${ADMIN_LOG}"
}

case "${1:-}" in
  start) cmd_start ;;
  stop) cmd_stop ;;
  restart) cmd_restart ;;
  status) cmd_status ;;
  logs) cmd_logs ;;
  *) usage ;;
esac
