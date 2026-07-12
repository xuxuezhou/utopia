/* eslint-disable react-refresh/only-export-components */
import { Link } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import type { Task, TaskStatus, User, VerificationLevel, RiskTier } from '../lib/types'
import { CATEGORY_META } from '../lib/types'

// ============ 品牌 Logo:两个相互连接的 U ============
export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Utopia">
        <rect width="32" height="32" rx="9" fill="#FF3B4F" />
        <path d="M8 9v7.5a5 5 0 0 0 10 0V9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M14 15.5V23a5 5 0 0 0 10 0v-7.5" fill="none" stroke="#FFD3D8" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {withText && <span className="font-semibold tracking-tight text-ink-900" style={{ fontSize: size * 0.62 }}>Utopia</span>}
    </span>
  )
}

// ============ 头像:真实感照片,加载失败回退 emoji ============
export function Avatar({ user, size = 40, link = true }: { user?: User | null; size?: number; link?: boolean }) {
  const [broken, setBroken] = useState(false)
  if (!user) return <div className="rounded-full bg-cream-200" style={{ width: size, height: size }} />
  const src = user.avatarUrl ?? `https://i.pravatar.cc/${size >= 60 ? 160 : 80}?u=utopia-${user.id}`
  const el = (
    <span
      className="relative rounded-full flex items-center justify-center shrink-0 overflow-hidden ring-1 ring-black/5 select-none"
      style={{ width: size, height: size, fontSize: size * 0.52, background: `oklch(0.93 0.04 ${user.avatarHue})` }}
      title={user.name}
    >
      {user.avatar}
      {(user.avatarUrl || !broken) && (
        <img
          src={src}
          alt="" loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      )}
    </span>
  )
  return link ? <Link to={`/user/${user.id}`} onClick={e => e.stopPropagation()}>{el}</Link> : el
}

// 读取本地图片并压缩为 dataURL(存 LocalStorage,控制体积)
export function pickImage(maxSize: number): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * scale)
        canvas.height = Math.round(img.height * scale)
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
        URL.revokeObjectURL(url)
        resolve(canvas.toDataURL('image/jpeg', 0.82))
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
      img.src = url
    }
    input.click()
  })
}

// ============ 内容封面:真实照片优先,失败回退浅色模板 ============
export function Cover({ seed, emoji, hue, ratio, rounded = true, children }: {
  seed: string; emoji: string; hue: number; ratio?: string; rounded?: boolean; children?: ReactNode
}) {
  const [loaded, setLoaded] = useState(false)
  const [broken, setBroken] = useState(false)
  let h = 0
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) % 9973
  const ar = ratio ?? ['3/4', '4/5', '1/1', '3/4', '4/5'][h % 5]
  const px = ar === '1/1' ? 400 : ar === '4/5' ? 500 : 533
  return (
    <div
      className={`relative w-full overflow-hidden ${rounded ? 'rounded-xl' : ''} ${!loaded && !broken ? 'skeleton' : ''}`}
      style={{ aspectRatio: ar, background: broken ? `linear-gradient(160deg, oklch(0.97 0.02 ${hue}), oklch(0.94 0.035 ${(hue + 30) % 360}))` : undefined }}
    >
      {!broken && (
        <img
          src={`https://picsum.photos/seed/utopia-${seed}/400/${px}`}
          alt="" loading="lazy"
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setLoaded(true)}
          onError={() => setBroken(true)}
        />
      )}
      {broken && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="text-4xl">{emoji}</span>
        </div>
      )}
      {children}
    </div>
  )
}

// ============ 认证等级 ============
export const LEVEL_META: Record<VerificationLevel, { label: string; cls: string; icon: string }> = {
  0: { label: 'L0 基础账号', cls: 'bg-cream-100 text-ink-400', icon: '○' },
  1: { label: 'L1 基础实名', cls: 'bg-leaf-50 text-leaf-600', icon: '✓' },
  2: { label: 'L2 可信社区成员', cls: 'bg-leaf-50 text-leaf-700', icon: '✓✓' },
  3: { label: 'L3 专项认证', cls: 'bg-violet-50 text-violet-600', icon: '★' },
}
export function LevelBadge({ level, short = false }: { level: VerificationLevel; short?: boolean }) {
  const m = LEVEL_META[level]
  return <span className={`chip ${m.cls}`}>{m.icon} {short ? `L${level}` : m.label}</span>
}

// 用户名旁的小认证点(小红书式,不做勋章墙)
export function VerifyDot({ level }: { level: VerificationLevel }) {
  if (level < 1) return null
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="inline-block shrink-0" aria-label="已认证">
      <circle cx="7" cy="7" r="7" fill={level >= 3 ? '#4D7CFE' : '#F5A623'} />
      <path d="M4 7l2 2 4-4" stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ============ 任务状态 ============
export const STATUS_META: Record<TaskStatus, { label: string; cls: string }> = {
  open: { label: '等待申请', cls: 'bg-leaf-50 text-leaf-600' },
  applied: { label: '已有申请', cls: 'bg-leaf-50 text-leaf-700' },
  matched: { label: '已匹配', cls: 'bg-violet-50 text-violet-600' },
  starting_soon: { label: '即将开始', cls: 'bg-amber-50 text-amber-600' },
  in_progress: { label: '进行中', cls: 'bg-coral-50 text-coral-600' },
  pending_confirm: { label: '待确认', cls: 'bg-amber-50 text-amber-600' },
  completed: { label: '已完成', cls: 'bg-cream-100 text-ink-400' },
  cancelled: { label: '已取消', cls: 'bg-cream-100 text-ink-300' },
  disputed: { label: '争议中', cls: 'bg-coral-50 text-coral-700' },
  blocked: { label: '已被安全审核阻止', cls: 'bg-ink-700 text-white' },
}
export function StatusBadge({ status }: { status: TaskStatus }) {
  const m = STATUS_META[status]
  return <span className={`chip ${m.cls}`}>{m.label}</span>
}

export const TIER_META: Record<RiskTier, { label: string; cls: string }> = {
  T0: { label: 'T0 · 线上低风险', cls: 'bg-leaf-50 text-leaf-600' },
  T1: { label: 'T1 · 公共场所', cls: 'bg-leaf-50 text-leaf-600' },
  T2: { label: 'T2 · 需较高信任', cls: 'bg-amber-50 text-amber-600' },
  T3: { label: 'T3 · 受监管禁止', cls: 'bg-coral-50 text-coral-700' },
  T4: { label: 'T4 · 永久禁止', cls: 'bg-ink-700 text-white' },
}
export function TierBadge({ tier }: { tier: RiskTier }) {
  const m = TIER_META[tier]
  return <span className={`chip ${m.cls}`}>{m.label}</span>
}

// 积分:红色主强调
export function Points({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-[13px]' : 'text-base'
  return <span className={`font-semibold text-coral-500 ${cls}`}>{value}<span className="text-[0.72em] font-medium ml-0.5">pt</span></span>
}

export function CategoryChip({ cat }: { cat: Task['category'] }) {
  const m = CATEGORY_META[cat]
  return <span className="chip bg-cream-100 text-ink-500">{m.emoji} {m.label}</span>
}

// ============ 布局辅助 ============
export function Section({ title, extra, children, className = '' }: { title: string; extra?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {extra}
      </div>
      {children}
    </section>
  )
}

export function Empty({ icon = '🌿', text, action }: { icon?: string; text: string; action?: ReactNode }) {
  return (
    <div className="py-16 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm text-ink-400">{text}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/40" onClick={onClose}>
      <div
        className={`bg-white rounded-t-2xl sm:rounded-2xl w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[88vh] overflow-y-auto shadow-card sheet-up`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-ink-900 text-[15px]">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-cream-100 text-ink-400 cursor-pointer">✕</button>
        </div>
        <div className="px-5 pb-6">{children}</div>
      </div>
    </div>
  )
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: string; tone?: 'coral' | 'leaf' | 'amber' | 'violet' }) {
  const toneCls = tone === 'coral' ? 'text-coral-600' : tone === 'leaf' ? 'text-leaf-600' : tone === 'amber' ? 'text-amber-600' : tone === 'violet' ? 'text-violet-600' : 'text-ink-900'
  return (
    <div className="card p-4">
      <div className="text-xs text-ink-400 mb-1">{label}</div>
      <div className={`text-xl font-semibold ${toneCls}`}>{value}</div>
      {sub && <div className="text-[11px] text-ink-300 mt-0.5">{sub}</div>}
    </div>
  )
}

// ============ 轻提示 Toast ============
export function toast(msg: string) {
  window.dispatchEvent(new CustomEvent('utopia:toast', { detail: msg }))
}

export function ToastHost() {
  const [msg, setMsg] = useState<{ text: string; key: number } | null>(null)
  useEffect(() => {
    const on = (e: Event) => setMsg({ text: (e as CustomEvent<string>).detail, key: Date.now() })
    window.addEventListener('utopia:toast', on)
    return () => window.removeEventListener('utopia:toast', on)
  }, [])
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2000)
    return () => clearTimeout(t)
  }, [msg])
  if (!msg) return null
  return (
    <div key={msg.key} className="fixed left-1/2 bottom-24 z-[70] toast-anim pointer-events-none">
      <div className="bg-ink-900/90 text-white text-sm rounded-full px-4 py-2 whitespace-nowrap">{msg.text}</div>
    </div>
  )
}

export function fmtTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 60000
  if (diff < 1) return '刚刚'
  if (diff < 60) return `${Math.floor(diff)} 分钟前`
  if (diff < 60 * 24) return `${Math.floor(diff / 60)} 小时前`
  if (diff < 60 * 24 * 7) return `${Math.floor(diff / 1440)} 天前`
  return iso.slice(5, 10).replace('-', '/')
}

export function fmtDate(date: string, time?: string): string {
  const d = new Date(date + 'T00:00:00')
  const wd = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return `${date.slice(5).replace('-', '月')}日 ${wd}${time ? ' ' + time : ''}`
}
