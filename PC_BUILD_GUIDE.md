# PC 端构建指南（.rpk 打包 → 装到手环）

> ✅ **2026-09-11 PC 实测：CLI 打包已完全跑通**，`app/dist/` 下已生成
> `com.four.kimiquota.release.0.1.0.rpk`（42KB，自签名证书）与 debug 版，
> 可直接走米坛安装，**无需 AIoT IDE**。

本 zip 包含两个目录版本，任选其一使用：

| 目录 | 说明 | 适用 |
|---|---|---|
| `band-app/` | 手写原始源码（结构清晰，推荐阅读/修改） | AIoT IDE 参考源码 |
| `app/` | 已按官方 `create-aiot ux` 脚手架对齐的工程（含 package.json + sign 证书，**已剔除 node_modules**） | 直接打包 |

## 路线一：PC 命令行（已验证可行，推荐）

```bash
cd app
pnpm install          # 或 npm install
npx aiot build        # debug 包（工具链内置调试证书）
npx aiot release      # release 包（用 sign/release/ 下的自签名证书）
```

产物在 `app/dist/`。

### 实测踩坑记录（重要）

1. **工程目录名绝不能叫 `build`**：aiotpack 的排除规则含 `**/build{,/**}`，
   目录名叫 build 会让所有源文件被排除，build 静默成功但零产物——这就是
   上个 agent 在 proot 里「CLI 不可用」结论的真正原因之一。
2. `"please use AIoT-IDE"` **只是构建完成后的提示语，不是拒绝执行**，
   判据是 `TERM_PROGRAM !== 'aiot-ide'`，设 `TERM_PROGRAM=aiot-ide` 即可消音。
3. **release 模式必须有签名证书**，否则报
   `The current mode is production, and there is a problem with the certification path`。
   查找顺序：`sign/release/{private,certificate}.pem` → `sign/{private,certificate}.pem`。
   本包已附带 openssl 自签名证书（100 年，CN=com.four.kimiquota）。重新生成：
   `openssl req -x509 -newkey rsa:2048 -keyout sign/release/private.pem -out sign/release/certificate.pem -days 36500 -nodes -subj "/CN=com.four.kimiquota"`
4. 编译流程会经过 `../.temp_<目录名>` 中转，结束后自动清理，无需手动处理。

## 路线二：AIoT IDE（官方，备选）

1. 下载安装 AIoT IDE：https://iot.mi.com/vela/quickapp/zh/guide/start/use-ide.html
2. 打开 `app/` 目录（若 IDE 对结构有校验，用 IDE 新建 ux 项目后，把 `app/src/` 整体覆盖进去）
3. 模拟器调试（Choose Devices → xiaomi_band_pro）确认显示效果
4. Package → `dist/` 下得到 `.rpk`
5. 米坛 App → 工具 → **蓝牙一键安装**（被拒则换「智能快速安装」）

## 打包前必改

`app/src/common/config.js`（或 band-app 同路径文件）：

- `API_KEY`：纯手机推送模式留空；想试手环直连填 `sk-kimi-xxx`
- `DATA_SOURCE`：`'push'`（推荐）/ `'auto'` / `'direct'`

## 装到手环后

手环端是显示终端，需要手机端推送数据，协议见 `phone-bridge/README.md`：
- 手机 → 手环：usages 接口原始 JSON（或 `{"type":"quota","payload":{...}}`）
- 手环 → 手机：`{"type":"pull",...}`（缓存过期/点刷新时发出）
- 参考实现：`github.com/leset0ng/BandTotp-astrobox`（改包名 `com.four.kimiquota` + 换数据源即可）

## 验证 API Key

```bash
bash tools/verify_api.sh sk-kimi-你的key
```
