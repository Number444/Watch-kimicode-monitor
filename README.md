# Watch KimiCode Monitor

**在小米手环 9 Pro 上实时查看 Kimi Code 额度** —— Xiaomi Vela 快应用

> 5 小时窗口用量 · 周额度 · 重置倒计时 · 一键刷新，抬腕即见。

![平台](https://img.shields.io/badge/平台-Xiaomi%20Vela%20%E5%BF%AB%E5%BA%94%E7%94%A8-orange)
![设备](https://img.shields.io/badge/设备-小米手环%209%20Pro-blue)
![版本](https://img.shields.io/badge/版本-v0.4.1-green)

## 这是什么

一个跑在小米手环 9 Pro（Xiaomi Vela 系统）上的快应用（`.ux`），通过 Kimi Code 官方只读接口
`GET https://api.kimi.com/coding/v1/usages` 拉取额度数据，直接在手环上渲染：

- 📊 **5 小时窗口**与**周额度**双进度条，按余量变色（>50% 绿 / 20–50% 黄 / <20% 红）
- ⏱️ 重置倒计时，每秒刷新，息屏自动停止（省电）
- 🔄 点「刷新」强制拉取，按钮四态反馈（蓝→灰→绿✓/红✗原因）
- 📄 swiper 双页布局：第 1 页纯额度卡片，右滑第 2 页是刷新按钮 + 诊断日志
- 💾 2 分钟缓存 + storage 持久化，亮屏不重复请求

**实测结论**：官方支持矩阵标注手环不支持 `fetch`，但实测小米手环 9 Pro **可以直连 HTTPS**，
经蓝牙共享手机网络请求 api.kimi.com 成功——所以本应用**不需要任何手机端配套 App**，
填入 key 打包即用。手机推送（interconnect）作为预留兜底通道保留。

## 快速开始

### 1. 获取 API Key

在 Kimi Code 中获取你的 `sk-kimi-xxx` key（只读用途，查询不耗额度）。
可先用脚本验证：

```bash
bash tools/verify_api.sh sk-kimi-你的key
```

### 2. 填入 Key

编辑 `app/src/common/config.js`：

```js
API_KEY: 'sk-kimi-你的key',   // ⚠️ 仓库中为占位符，打包前填入；请勿提交真实 key
DATA_SOURCE: 'auto',          // auto=直连优先失败回退推送 / direct / push
```

### 3. 打包（无需 AIoT IDE，纯 CLI 已验证）

```bash
cd app
pnpm install
npx aiot release      # 产物在 app/dist/*.rpk
```

> Windows 下如遇 `please use AIoT-IDE` 提示可无视（只是提示）；
> release 模式需要签名证书，生成方式见 [PC_BUILD_GUIDE.md](PC_BUILD_GUIDE.md)。

### 4. 安装到手环

米坛 App → 工具 → **蓝牙一键安装**（被拒则换「智能快速安装」）。

注意事项：
- 更新安装需递增 `manifest.json` 的 `versionCode`，否则手环不识别为更新
- 更换图标后需**先卸载再安装**（图标有缓存）

## 目录结构

```
├── app/                    # 可打包工程（aiot-toolkit 脚手架结构）
│   └── src/
│       ├── manifest.json   # 包名 com.four.kimiquota，designWidth 336
│       ├── common/
│       │   ├── config.js   # ⭐ API_KEY / 数据通道 / 缓存时长
│       │   └── quota.js    # usages 响应解析（Node 单元验证通过）
│       └── pages/index/index.ux  # 主页面（swiper 双页 + 坐标命中刷新）
├── band-app/               # 手写源码副本（结构清晰，供阅读/AIoT IDE 参考）
├── phone-bridge/README.md  # interconnect 手机推送协议契约（兜底通道，未实施）
├── docs/                   # 后续方案文档
├── tools/verify_api.sh     # key 验证脚本
└── PC_BUILD_GUIDE.md       # CLI 打包完整踩坑记录
```

## 数据协议（可选的手机推送兜底）

- 手环 → 手机：`{"type":"pull","pkg":"com.four.kimiquota","ts":1715000000000}`
- 手机 → 手环：转发 usages 原始 JSON，或 `{"type":"quota","payload":{...}}`

详见 [phone-bridge/README.md](phone-bridge/README.md)。

## Vela 快应用开发踩坑实录

本项目在真机上趟过的坑（官方文档不会告诉你的部分），完整版见 PC_BUILD_GUIDE.md：

1. **子组件 click/touchend 事件不派发**（div/text/input 均不触发，按压变暗只是原生渲染）
   → 解法：根容器监听 `ontouchstart/ontouchend`，用 `clientX/Y` 坐标命中自绘按钮区域
2. **下划线开头的 data 字段被框架跳过初始化** → 数组字段 `.push` 抛异常被静默吞掉
   → 内部字段一律不用 `_` 前缀
3. **工程目录名不能叫 `build`** → aiotpack 排除规则 `**/build{,/**}` 会误杀全部源文件，构建静默成功零产物
4. **右边缘滑动手势被系统占用** → 翻页用原生 `swiper` 组件（不受限），别自研手势
5. **`input` 不认 `width:100%`**，需写死像素宽度
6. 官方接口支持矩阵偏保守：`fetch` 标不支持但**实测可用**

## 文档

- [PC_BUILD_GUIDE.md](PC_BUILD_GUIDE.md) — CLI 打包全流程 + 踩坑
- [docs/NEXT-KEY-SERVER-ALPHA.md](docs/NEXT-KEY-SERVER-ALPHA.md) — 规划中：局域网 key 服务器（免烧 key 打包）

## 免责声明

- 本项目为个人学习项目，与小米、月之暗面（Moonshot AI）无任何官方关联
- API Key 仅用于只读查询额度信息，请妥善保管，**切勿提交到任何仓库**
- 接口为 Kimi Code 内部接口，如有变动请以官方为准

## License

MIT
