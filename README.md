# 小米手环 9 Pro — Kimi Code 额度显示（Vela 快应用）

基于《小米手环9Pro_KimiCode额度_开发调研.md》实现的方案 B（手机中转为主）+ 方案 A 兜底（手环直连）双通道架构。

## ⚠️ 关键调研修正（2026-09-11 实测）

开发前核对小米 Vela 官方文档「支持明细」，发现与原调研文档假设冲突的重要事实：

| 接口 | 官方支持矩阵（米环 9 / 9 Pro） | 影响 |
|---|---|---|
| `system.fetch` | **不支持** | 手环无法直接 HTTPS 请求 api.kimi.com |
| `system.network` | **不支持** | 无法查询网络状态 |
| `system.interconnect` | 支持（BandTOTP、环间电子书等社区应用实证） | **数据只能由手机端推送** |

因此本实现以 **手机推送（interconnect）为主通道**，直连 fetch 保留为编译期可配置的兜底
（官方矩阵也可能偏保守，真机可自行验证：把 `config.js` 的 `DATA_SOURCE` 改为 `'auto'/'direct'`）。

## 架构

```
Kimi Code API (api.kimi.com/coding/v1/usages)
   ↑ 查询（手机端，Bearer sk-kimi key，只读不耗额度）
手机端桥（AstroBox 插件 / BandTOTP 式工具）
   ↓ interconnect 推送 JSON
手环快应用（本仓库 band-app/）
   → 渲染 5h 窗口 / 周额度进度条 + 重置倒计时 + 套餐档位
   → storage 缓存，亮屏 onShow 去抖（5 分钟内不重复请求）
   → 缓存过期时向手机发 {type:'pull'} 拉取请求
```

## 目录

```
kimi-band-quota/
├── band-app/                  # 手环快应用源码（AIoT IDE 可直接打开）
│   └── src/
│       ├── manifest.json      # 包名 com.four.kimiquota，designWidth 336（米环9Pro 336×480）
│       ├── app.ux
│       ├── common/
│       │   ├── config.js      # ⭐ 打包前配置：API_KEY / 数据通道 / 缓存时长
│       │   ├── quota.js       # usages 响应解析（已通过 Node 单元验证）
│       │   └── icon.png       # 192×192 应用图标
│       └── pages/Index/index.ux  # 主页面：双进度条 + 倒计时 + 档位徽章
├── phone-bridge/README.md     # 手机推送端协议契约 + BandTOTP 改造指南
└── tools/verify_api.sh        # 验证 sk-kimi key 与 usages 接口的 curl 脚本
```

## 使用步骤

1. **验证 Key**（手机/电脑均可）：
   ```bash
   bash tools/verify_api.sh sk-kimi-你的key
   ```
   应返回含 `limits` / `usage` / `user.membership` 的 JSON。
2. **配置**：编辑 `band-app/src/common/config.js`：
   - 纯推送模式（推荐）：`API_KEY` 留空，`DATA_SOURCE: 'push'`
   - 想真机试试直连：填入 key，`DATA_SOURCE: 'auto'`（直连失败自动回退推送）
3. **打包**：PC 上用 AIoT IDE 打开 `band-app/`，Package 生成 `.rpk`（见下方「CLI 打包尝试」）
4. **安装**：米坛 App → 工具 → 蓝牙一键安装（被拒则换「智能快速安装」）
5. **手机推送端**：按 `phone-bridge/README.md` 配置，把 usages JSON 原样推给手环

## 数据协议（手环端已实现，手机端按此推送即可）

- **手环 → 手机**：`{"type":"pull","pkg":"com.four.kimiquota","ts":1715000000000}`
- **手机 → 手环**：直接转发 usages 接口原始 JSON，或包装为 `{"type":"quota","payload":{...usages原始JSON...}}`
- 手环端对字段缺失做了容错：全新 5h 窗口（无 detail/quota 字段）渲染为 100%；
  resetTime 兼容 epoch 毫秒与 ISO 字符串

## 界面行为

- 按余量变色：>50% 绿 / 20–50% 黄 / <20% 红（`quota.js colorFor`）
- 倒计时每秒刷新，息屏停止（省电）
- 点「刷新」强制请求（直连或向手机发 pull）
- 官方提示规避：不在 `onShow` 无条件 fetch，先读缓存、过期才请求

## CLI 打包尝试记录

（见会话记录 / 下方 changelog —— AIoT IDE 的打包链路依赖其内置 aiot 工具链，
本设备 proot 环境的 CLI 打包可行性结论与操作步骤记录于 CHANGELOG.md）
