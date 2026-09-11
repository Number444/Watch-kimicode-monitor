/**
 * Kimi Code usages 接口响应解析 + 视图模型工具（纯函数，无系统依赖）
 *
 * 响应结构（字段为字符串数字，已用量 = limit - remaining）：
 * {
 *   limits: [ { detail: {limit, remaining, resetTime(ms)},
 *               window: {duration: 300, timeUnit: 'TIME_UNIT_MINUTE'} } ],  // 5h 滚动窗口
 *   usage:  { limit, remaining, resetTime(ISO) },                          // 周窗口
 *   user:   { membership: { level: 'LEVEL_BASIC|LEVEL_INTERMEDIATE|LEVEL_ADVANCED' } },
 *   parallel: { limit }
 * }
 * 边缘情况：全新（0% 已用）的 5h 窗口只返回 window 描述符、无 quota 字段 → 视为 100% 剩余
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

function makeQuota(limit, remaining, resetTime) {
  const l = toNum(limit)
  const r = toNum(remaining)
  return {
    pct: (l !== null && l > 0 && r !== null) ? Math.round(r * 100 / l) : null,
    remaining: r,
    limit: l,
    resetMs: toMs(resetTime)
  }
}

export function parseUsages(raw) {
  const result = {
    plan: '--',
    fiveHour: { pct: null, remaining: null, limit: null, resetMs: 0 },
    weekly: { pct: null, remaining: null, limit: null, resetMs: 0 },
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
      result.fiveHour = makeQuota(d.limit, d.remaining, d.resetTime)
    } else {
      // 全新窗口：只返回 window 描述符 → 100% 剩余
      result.fiveHour = { pct: 100, remaining: null, limit: null, resetMs: 0 }
    }
  }

  // 周窗口
  if (raw.usage && raw.usage.limit !== undefined && raw.usage.remaining !== undefined) {
    result.weekly = makeQuota(raw.usage.limit, raw.usage.remaining, raw.usage.resetTime)
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

/** 按余量百分比取色：>50% 绿 / 20-50% 黄 / <20% 红 */
export function colorFor(pct) {
  if (pct === null || pct === undefined) return '#8e8e93'
  if (pct > 50) return '#30d158'
  if (pct >= 20) return '#ffd60a'
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
