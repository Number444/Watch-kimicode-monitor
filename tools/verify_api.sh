#!/usr/bin/env bash
# 验证 Kimi Code API Key 与 usages 接口
# 用法: bash verify_api.sh <sk-kimi-xxx>
set -euo pipefail

KEY="${1:-}"
if [ -z "$KEY" ]; then
  echo "用法: bash verify_api.sh <sk-kimi-xxx>" >&2
  exit 1
fi

URL="https://api.kimi.com/coding/v1/usages"
echo "==> GET $URL"
HTTP=$(curl -sS -m 30 -o /tmp/kimi_usages.json -w "%{http_code}" \
  -H "Authorization: Bearer $KEY" "$URL")

echo "==> HTTP $HTTP"
case "$HTTP" in
  200)
    echo "==> 响应内容:"
    if command -v python3 >/dev/null; then
      python3 -m json.tool /tmp/kimi_usages.json
    else
      cat /tmp/kimi_usages.json
    fi
    echo
    echo "✅ Key 有效。可将以上 JSON 原样推送到手环（格式 A）测试渲染。"
    ;;
  401)
    cat /tmp/kimi_usages.json; echo
    echo "❌ 401 Invalid Authentication —— 检查是否为 Kimi Code 控制台的 sk-kimi- key（与开放平台 sk- key 不通用）"
    ;;
  *)
    cat /tmp/kimi_usages.json; echo
    echo "⚠️ 非预期状态码，接口可能已变更"
    ;;
esac
rm -f /tmp/kimi_usages.json
