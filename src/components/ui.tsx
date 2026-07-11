import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { Task, TaskStatus, User, VerificationLevel, RiskTier } from '../lib/types'
import { CATEGORY_META } from '../lib/types'

// ============ 品牌 Logo:两个相互连接的 U ============
export function Logo({ size = 28, withText = true }: { size?: number; withText?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg width={size} height={size} viewBox="0 0 32 32" aria-label="Utopia">
        <rect width="32" height="32" rx="9" fill="#E5654A" />
        <path d="M8 9v7.5a5 5 0 0 0 10 0V9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
        <path d="M14 15.5V23a5 5 0 0 0 10 0v-7.5" fill="none" stroke="#FBDFD8" strokeWidth="3" strokeLinecap="round" />
      </svg>
      {withText && <span className="font-semibold tracking-tight text-ink-900" style={{ fontSize: size * 0.62 }}>Utopia</span>}
    </span>
  )
}

// ============ 头像 ============
export function Avatar({ user, size = 40, link = true }: { user?: User | null; size?: number; link?: boolean }) {
  if (!user) return <div className="rounded-full bg-cream-200" style={{ width: size, height: size }} />
  const el = (
    <div
      className="rounded-full flex items-center justify-center shrink-0 ring-1 ring-black/5"
      style={{ width: size, height: size, fontSize: size * 0.52, background: `oklch(0.92 0.05 ${user.avatarHue})` }}
      title={user.name}
    >
      {user.avatar}
    </div>
  )
  return link ? <Link to={`/user/${user.id}`}>{el}</Link> : el
}

// ============ 认证等级 ============
export const LEVEL_META: Record<VerificationLevel, { label: string; cls: string; icon: string }> = {
  0: { label: 'L0 基础账号', cls: 'bg-cream-200 text-ink-500', icon: '○' },
  1: { label: 'L1 基础实名', cls: 'bg-leaf-50 text-leaf-600', icon: '✓' },
  2: { label: 'L2 可信社区成员', cls: 'bg-leaf-100 text-leaf-700', icon: '✓✓' },
  3: { label: 'L3 专项认证', cls: 'bg-violet-100 text-violet-600', icon: '★' },
}
export function LevelBadge({ level, short = false }: { level: VerificationLevel; short?: boolean }) {
  const m = LEVEL_META[level]
  return <span className={`chip ${m.cls}`}>{m.icon} {short ? `L${level}` : m.label}</span>
}

// ============ 任务状态 ============
export const STATUS_META: Record<TaskStatus, { label: string; cls: string }> = {
  open: { label: '等待申请', cls: 'bg-leaf-50 text-leaf-600' },
  applied: { label: '已有申请', cls: 'bg-leaf-100 text-leaf-700' },
  matched: { label: '已匹配', cls: 'bg-violet-100 text-violet-600' },
  starting_soon: { label: '即将开始', cls: 'bg-amber-100 text-amber-600' },
  in_progress: { label: '进行中', cls: 'bg-coral-100 text-coral-600' },
  pending_confirm: { label: '待确认', cls: 'bg-amber-100 text-amber-600' },
  completed: { label: '已完成', cls: 'bg-cream-200 text-ink-500' },
  cancelled: { label: '已取消', cls: 'bg-cream-200 text-ink-400' },
  disputed: { label: '争议中', cls: 'bg-coral-100 text-coral-700' },
  blocked: { label: '已被安全审核阻止', cls: 'bg-ink-700 text-white' },
}
export function StatusBadge({ status }: { status: TaskStatus }) {
  const m = STATUS_META[status]
  return <span className={`chip ${m.cls}`}>{m.label}</span>
}

export const TIER_META: Record<RiskTier, { label: string; cls: string }> = {
  T0: { label: 'T0 · 线上低风险', cls: 'bg-leaf-50 text-leaf-600' },
  T1: { label: 'T1 · 公共场所', cls: 'bg-leaf-50 text-leaf-600' },
  T2: { label: 'T2 · 需较高信任', cls: 'bg-amber-100 text-amber-600' },
  T3: { label: 'T3 · 受监管禁止', cls: 'bg-coral-100 text-coral-700' },
  T4: { label: 'T4 · 永久禁止', cls: 'bg-ink-700 text-white' },
}
export function TierBadge({ tier }: { tier: RiskTier }) {
  const m = TIER_META[tier]
  return <span className={`chip ${m.cls}`}>{m.label}</span>
}

export function Points({ value, size = 'md' }: { value: number; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-sm' : 'text-lg'
  return <span className={`font-semibold text-amber-600 ${cls}`}>{value} <span className="text-[0.7em] font-medium">pt</span></span>
}

export function CategoryChip({ cat }: { cat: Task['category'] }) {
  const m = CATEGORY_META[cat]
  return <span className="chip bg-cream-200 text-ink-500">{m.emoji} {m.label}</span>
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
    <div className="card p-10 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm text-ink-400">{text}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 bg-ink-900/40" onClick={onClose}>
      <div
        className={`bg-white rounded-t-3xl sm:rounded-3xl w-full ${wide ? 'sm:max-w-2xl' : 'sm:max-w-md'} max-h-[88vh] overflow-y-auto shadow-card-hover fade-up`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-3 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-ink-900">{title}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-cream-200 text-ink-400 cursor-pointer">✕</button>
        </div>
        <div className="px-6 pb-6">{children}</div>
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
