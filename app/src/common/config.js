/**
 * 全局配置 —— 打包前按需修改
 */
export default {
  // Kimi Code 额度查询接口（未文档化的控制台内部接口，可能随时变更）
  API_URL: 'https://api.kimi.com/coding/v1/usages',

  // 【填这里】Kimi Code 控制台创建的 sk-kimi-xxx Key。
  // 留空 '' = 纯手机推送模式（手环不发起任何直连请求，推荐，见 README）
  API_KEY: 'sk-kimi-YOUR-KEY-HERE',

  // 数据来源策略：
  //   'auto'  —— 有 API_KEY 时先试手环直连，失败自动回退手机推送（默认）
  //   'push'  —— 只用手机推送（interconnect），即使填了 KEY 也不直连
  //   'direct'— 只直连，不回退（调试用；注意官方支持矩阵称米环9Pro不支持 fetch）
  DATA_SOURCE: 'auto',

  // 缓存有效期：亮屏时若缓存未超过该时长则不发起新请求（防 onShow 频繁请求）
  CACHE_TTL_MS: 5 * 60 * 1000,

  // 快应用包名（须与 manifest.json 的 package 一致，手机端推送时用于定位应用）
  PKG_NAME: 'com.four.kimiquota'
}
