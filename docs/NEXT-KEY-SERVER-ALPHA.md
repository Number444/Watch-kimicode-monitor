# 待续作：v0.5.0-alpha — HTTP 方式下发/管理 API Key

> 状态：**已挂起**（2026-09-11 Four 指示归档）。恢复时从本文档继续。
> 挂起点：方案已评审通过，未写任何代码。当前可用版本 v0.4.1（HEAD=82a16e7）。

## 背景

- key 目前硬编码在 `app/src/common/config.js`（v0.2.0 起），进了本地 git 库；rpk 不可分发。
- Four 提出：手环打包极简 HTTP 客户端，由"开端口的一端"通过 HTTP 传输/管理 key。
- 手机无 Termux 且不安装 → **服务器跑在 PC**（Python 3.14 已装，标准库零依赖）。
- 手环直连 fetch 已实测可用（官方支持矩阵偏保守），蓝牙共享网络经手机 NAT，理论可达 PC 局域网 IP。

## 架构

```
PC 192.168.5.20:8471（tools/key_server.py，Python 标准库）
  GET /             → 极简管理页：设置/查看(掩码)/删除 key（手机浏览器同 Wi-Fi 可开）
  GET /x7k2/api/key → {"key":"sk-..."}（随机路径前缀当简易口令，可按需更换）
  key 存 tools/.kimi-key.json（已 gitignore）
        ▲ HTTP（蓝牙链路 → 手机 NAT → 家庭局域网）
手环 v0.5.0-alpha
  启动: storage 读 key → 无 → GET key 服务器 → 校验 sk- 前缀 → 写 storage
  usages 直连 401 → 清除本地 key → 重新拉取（管理页改 key 后手环自愈）
```

## 关键未验证假设（alpha 的首要任务）

手环的蓝牙上网是**真实 NAT**（可达 PC LAN IP）还是**小米运动健康代理转发**（只能出公网）。
→ alpha 版 diag 日志会直接给出答案：
- `Key拉取成功` → 链路通，方案成立
- `Key拉取失败 code=xxx` → 代理转发模式，**回退方案**：interconnect 通道下发（见 phone-bridge/README.md，config 消息 `{"type":"config","key":"sk-..."}`，手环端加分支存 storage 即可）

## 改动清单（恢复时照做）

### 1. `tools/key_server.py`（Python http.server，约 120 行）
- `GET /`：单文件 HTML 管理页（掩码显示当前 key + 输入框 + 保存/删除）
- `GET /x7k2/api/key`：有 key 返回 `{"key":"..."}`；无 key 返回 404 `{"error":"no key"}`
- 控制台打印每个请求来源 IP + 路径（判定手环请求是否到达）
- `tools/start_key_server.ps1` 一键启动；`.gitignore` 加 `tools/.kimi-key.json`

### 2. `app/src/common/config.js`
- 新增 `KEY_SERVER: 'http://192.168.5.20:8471/x7k2'`
- `API_KEY` 清空（不再烧入）

### 3. `index.ux`（v0.5.0-alpha，versionCode 12）
- key 解析链：storage > 服务器拉取；都没有 → 第 2 页按钮文案变「拉取Key」
- 新增 `pullKeyFromServer()`：GET `KEY_SERVER + '/api/key'`，校验 `sk-` 前缀后写 storage
- usages 401 分支：清 storage key → 自动 pullKeyFromServer()
- 第 2 页顶部 key 状态行：`Key: 已配置(尾号u37a)` / `Key: 未配置` / `Key: 拉取中…`
- 全程 diag 日志（链路判定的依据）
- 完成后同步 `band-app/` 副本并打包 release

## 验证步骤

1. PC 起服务后**手机浏览器**先开 `http://192.168.5.20:8471`（同 Wi-Fi），确认管理页可开
2. 米坛装 alpha rpk → 第 2 页看日志判定链路
3. 连接失败先查 PC 防火墙放行 8471

## 注意事项

- HTTP 明文仅蓝牙链路 + 家庭局域网，路径前缀防误访问；key 永不进 rpk/git
- PC 关机时无法拉 key——已有 storage 缓存不受影响，仅新机/换 key 需要 PC 在线
- PC 局域网 IP 变化时改 config.js 的 KEY_SERVER 重新打包（或恢复时做成 storage 可配）
