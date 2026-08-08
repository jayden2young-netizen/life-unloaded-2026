#!/bin/zsh

set -u
unsetopt BG_NICE

SCRIPT_DIR="${0:A:h}"
HOST="127.0.0.1"
START_PORT="${LIFE_PORT_START:-8765}"
MAX_PORT=$((START_PORT + 20))
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]] && kill -0 "$SERVER_PID" 2>/dev/null; then
    kill "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
}

shutdown() {
  trap - EXIT INT TERM HUP
  cleanup
  exit 0
}

trap cleanup EXIT
trap shutdown INT TERM HUP

if ! command -v python3 >/dev/null 2>&1; then
  print "未找到 python3。请先安装 Python 3，再重新双击这个脚本。"
  print "按回车关闭窗口。"
  read -r
  exit 1
fi

is_life_server() {
  command -v curl >/dev/null 2>&1 &&
    curl --silent --fail --max-time 1 "http://${HOST}:$1/index.html" 2>/dev/null |
      grep -q "人生尚未加载"
}

open_game() {
  local url="http://${HOST}:$1/"
  print "正在打开：${url}"
  if [[ "${LIFE_SKIP_OPEN:-0}" == "1" ]]; then
    return
  fi
  if command -v open >/dev/null 2>&1; then
    open "$url"
  else
    print "未找到系统 open 命令，请手动在浏览器打开上面的地址。"
  fi
}

if is_life_server "$START_PORT"; then
  print "本项目服务器已经在 ${START_PORT} 端口运行。"
  open_game "$START_PORT"
  exit 0
fi

PORT=""
for candidate in {$START_PORT..$MAX_PORT}; do
  if python3 -c 'import socket,sys; s=socket.socket(); s.setsockopt(socket.SOL_SOCKET,socket.SO_REUSEADDR,1); s.bind((sys.argv[1],int(sys.argv[2]))); s.close()' "$HOST" "$candidate" 2>/dev/null; then
    PORT="$candidate"
    break
  fi
done

if [[ -z "$PORT" ]]; then
  print "${START_PORT}—${MAX_PORT} 端口都被占用，未能启动试玩服务器。"
  print "按回车关闭窗口。"
  read -r
  exit 1
fi

cd "$SCRIPT_DIR" || exit 1
print "正在启动本地试玩服务器……"
python3 -m http.server "$PORT" --bind "$HOST" &
SERVER_PID=$!

ready=0
for _ in {1..40}; do
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    break
  fi
  if is_life_server "$PORT"; then
    ready=1
    break
  fi
  sleep 0.1
done

if [[ "$ready" != "1" ]]; then
  print "服务器没有正常启动，请保留本窗口中的错误信息。"
  exit 1
fi

print "服务器已启动。试玩期间请保留这个窗口。"
print "结束试玩时，在这里按 Control+C。"
open_game "$PORT"
wait "$SERVER_PID"
