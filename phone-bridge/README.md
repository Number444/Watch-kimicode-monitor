# 手机推送端（phone-bridge）协议与实现指南

手环快应用 `com.four.kimiquota` 是纯显示终端，数据由手机端查询 Kimi Code API 后推送。
本文件是手机端的**协议契约**与实现路径，任选其一实现即可。

## 一、通信协议（手环端已实现）

### 手机 → 手环（推送额度）

通过 interconnect 发送 JSON 字符串，两种格式均接受：

**格式 A：裸 usages 响应（推荐，零转换）**
```json
{
  "limits": [ { "detail": { "limit": "100", "remaining": "40", "resetTime": 1754000000000 },
                "window": { "duration": 300, "timeUnit": "TIME_UNIT_MINUTE" } } ],
  "usage": { "limit": "1000", "remaining": "900", "resetTime": "2026-08-01T00:00:00Z" },
  "user": { "membership": { "level": "LEVEL_INTERMEDIATE" } },
  "parallel": { "limit": 4 }
}
```

**格式 B：带包装**
```json
{ "type": "quota", "payload": { /* 同格式 A */ } }
```

### 手环 → 手机（拉取请求）

手环缓存过期或用户点「刷新」时发送：
```json
{ "type": "pull", "pkg": "com.four.kimiquota", "ts": 1715000000000 }
```
手机端收到后应重新查询 API 并回推格式 A/B。

## 二、实现路径

### 路径 1：改造 BandTOTP-astrobox（推荐参考）

仓库：`github.com/leset0ng/BandTotp-astrobox`（Rust + WASM，MIT）

它已跑通完整链路：AstroBox NG 插件 → 打开手环快应用 → `interconnect::send-qaic-message` 推 JSON。
改造点：
1. 把「解析 otpauth URI」替换为「HTTP GET `https://api.kimi.com/coding/v1/usages`，
   Header `Authorization: Bearer <sk-kimi-key>`」（插件 manifest 需声明 network 权限）
2. 推送内容改为 API 响应原文（格式 A）
3. 目标包名改为 `com.four.kimiquota`
4. （可选）监听手环的 `pull` 消息触发刷新；加 5 分钟定时轮询

构建：按该仓库 README（`rustup target add wasm32-wasip2` → `python3 scripts/build_dist.py --release --package`），
产物 `.abp` 在 AstroBox NG 中安装。

> 注意：`AstralSightStudios/AstroBox-Plugin-Template`（TypeScript 版）已存档，
> AstroBox V2 插件系统不兼容旧模板，请以 BandTOTP-astrobox 的实际代码为准。

### 路径 2：Termux / 任意能调小米穿戴开放接口的 Android 工具

米坛「环间电子书」证明了手机→手环推送链路的通用性，但其推送能力封装在米坛 App 内。
自研需对接《小米穿戴第三方APP能力开放接口文档》（Vela 官方 interconnect 页面可下载），
且快应用包名/签名需与推送端 App 一致（见 Vela interconnect 文档「开发注意事项」）。
工作量大于路径 1，仅作备选。

### 路径 3：手动推送（调试用）

任何能发送 qaic-message 的工具（含 BandTOTP 改包名后）手动粘贴一段 usages JSON 发出，
手环即渲染。可先用 `tools/verify_api.sh` 拿到真实响应来测。

## 三、安全

- sk-kimi key 只存手机端，不要写进手环 rpk、不要提交 git
- usages 是只读接口，不消耗模型额度
- 该接口未文档化，解析端已做字段缺失容错；接口变更时优先检查 `quota.js parseUsages`
