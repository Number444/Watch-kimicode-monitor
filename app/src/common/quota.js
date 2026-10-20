/**
 * Kimi Code usages 接口响应解析 + 视图模型工具（纯函数，无系统依赖）
 *
 * 响应结构（2026-10 实测，字段为字符串数字；pct/颜色均按「已用」口径）：
 * {
 *   limits: [ { detail: {limit, used, remaining, resetTime(ISO 微秒)},
 *               window: {duration: 300, timeUnit: 'TIME_UNIT_MINUTE'} } ],  // 5h 滚动窗口
 *   usage:  { limit, used, remaining, resetTime(ISO) },                    // 周窗口
 *   usages: { limit_5h: {used_ratio}, limit_7d: {used_ratio} },           // 简化口径（未采用）
 *   booster_wallet: { ... },                                              // Booster 钱包（未采用）
 * }
 * 注：user.membership.level 与 parallel 已于 2026-10 从响应中移除
 * 边缘情况：全新（0% 已用）的 5h 窗口只返回 window 描述符、无 detail 字段 → 视为 0% 已用
 */

const LEVEL_MAP = {
  LEVEL_BASIC: 'Basic',
  LEVEL_INTERMEDIATE: 'Pro',
  LEVEL_ADVANCED: 'Max'
}

function toMs(t) {
  if (t === null || t === undefined || t === '') return 0
  if (typeof t === 'number') return t
  const p = Date.parse(t)
  return isNaN(p) ? 0 : p
}

function toNum(v) {
  const n = Number(v)
  return isNaN(n) ? null : n
}

function makeQuota(limit, used, remaining, resetTime) {
  const l = toNum(limit)
  const r = toNum(remaining)
  let u = toNum(used)
  if (u === null && l !== null && r !== null) u = l - r // 老格式无 used 字段，由 limit-remaining 兜底
  return {
    pct: (l !== null && l > 0 && u !== null) ? Math.round(u * 100 / l) : null,
    used: u,
    limit: l,
    resetMs: toMs(resetTime)
  }
}

export function parseUsages(raw) {
  const result = {
    plan: '--',
    fiveHour: { pct: null, used: null, limit: null, resetMs: 0 },
    weekly: { pct: null, used: null, limit: null, resetMs: 0 },
    parallel: null
  }
  if (!raw || typeof raw !== 'object') return result

  // 5 小时滚动窗口：window.duration=300 且 timeUnit 含 MINUTE
  const limits = Array.isArray(raw.limits) ? raw.limits : []
  let win = null
  for (let i = 0; i < limits.length; i++) {
    const w = limits[i] && limits[i].window
    if (w && Number(w.duration) === 300 && String(w.timeUnit || '').indexOf('MINUTE') >= 0) {
      win = limits[i]
      break
    }
  }
  if (!win && limits.length > 0) win = limits[0] // 兜底：取第一个窗口
  if (win) {
    const d = win.detail || win.quota || null
    if (d && d.limit !== undefined && d.remaining !== undefined) {
      result.fiveHour = makeQuota(d.limit, d.used, d.remaining, d.resetTime)
    } else {
      // 全新窗口：只返回 window 描述符 → 0% 已用
      result.fiveHour = { pct: 0, used: 0, limit: null, resetMs: 0 }
    }
  }

  // 周窗口
  if (raw.usage && raw.usage.limit !== undefined && raw.usage.remaining !== undefined) {
    result.weekly = makeQuota(raw.usage.limit, raw.usage.used, raw.usage.remaining, raw.usage.resetTime)
  }

  // 套餐档位
  const lvl = raw.user && raw.user.membership && raw.user.membership.level
  if (lvl) {
    result.plan = LEVEL_MAP[lvl] || String(lvl).replace(/^LEVEL_/, '')
  }

  if (raw.parallel && raw.parallel.limit !== undefined) {
    result.parallel = toNum(raw.parallel.limit)
  }

  return result
}

/** 按已用百分比取色：<50% 绿 / 50-80% 黄 / >80% 红 */
export function colorFor(pct) {
  if (pct === null || pct === undefined) return '#8e8e93'
  if (pct < 50) return '#30d158'
  if (pct <= 80) return '#ffd60a'
  return '#ff453a'
}

/** 重置倒计时文本 */
export function countdownText(nowMs, resetMs) {
  if (!resetMs) return '--'
  let diff = resetMs - nowMs
  if (diff <= 0) return '即将重置'
  const sec = Math.floor(diff / 1000)
  const d = Math.floor(sec / 86400)
  const h = Math.floor((sec % 86400) / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  if (d > 0) return d + '天' + h + '时'
  if (h > 0) return h + '时' + m + '分'
  if (m > 0) return m + '分' + s + '秒'
  return s + '秒'
}

/** Date ms → 'HH:MM' */
export function fmtTime(ms) {
  if (!ms) return '--'
  const d = new Date(ms)
  const hh = d.getHours() < 10 ? '0' + d.getHours() : '' + d.getHours()
  const mm = d.getMinutes() < 10 ? '0' + d.getMinutes() : '' + d.getMinutes()
  return hh + ':' + mm
}

export default { parseUsages, colorFor, countdownText, fmtTime }
