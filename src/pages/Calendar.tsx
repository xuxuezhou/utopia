import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore, useCurrentUser } from '../lib/store'
import { toast } from '../components/ui'
import type { Task } from '../lib/types'

// 内置日历(免费功能):我的互助安排 + 所在圈子的社区活动
interface CalItem {
  date: string          // YYYY-MM-DD
  time?: string
  title: string
  kind: 'task' | 'community'
  link?: string
  task?: Task
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日']

export default function CalendarPage() {
  const { state } = useStore()
  const me = useCurrentUser()!
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() }) // m: 0-11
  const [selected, setSelected] = useState(todayStr)

  const items = useMemo<CalItem[]>(() => {
    const mine: CalItem[] = state.tasks
      .filter(t => (t.publisherId === me.id || t.helperId === me.id) && !['cancelled', 'blocked'].includes(t.status))
      .map(t => ({ date: t.date, time: t.startTime, title: `${t.images[0] ?? '🤝'} ${t.title}`, kind: 'task' as const, link: `/task/${t.id}`, task: t }))
    const community: CalItem[] = state.communities
      .filter(c => me.communityIds.includes(c.id))
      .flatMap(c => c.calendar.map(e => ({ date: e.date, title: `${c.emoji} ${e.title}`, kind: 'community' as const, link: `/circle/${c.id}` })))
    return [...mine, ...community].sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))
  }, [state.tasks, state.communities, me])

  const byDate = useMemo(() => {
    const m = new Map<string, CalItem[]>()
    for (const it of items) {
      if (!m.has(it.date)) m.set(it.date, [])
      m.get(it.date)!.push(it)
    }
    return m
  }, [items])

  // 当月网格(周一开头)
  const first = new Date(ym.y, ym.m, 1)
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`),
  ]

  const dayItems = byDate.get(selected) ?? []
  const upcoming = items.filter(it => it.date >= todayStr).slice(0, 12)

  // 导出所有即将到来的安排为 .ics(免费)
  const exportAll = () => {
    const p = (n: number) => String(n).padStart(2, '0')
    const events = upcoming.map(it => {
      const startTime = it.time ?? '09:00'
      const start = `${it.date.replace(/-/g, '')}T${startTime.replace(':', '')}00`
      const endDate = new Date(`${it.date}T${startTime}:00`)
      endDate.setMinutes(endDate.getMinutes() + (it.task?.durationMin ?? 60))
      const end = `${endDate.getFullYear()}${p(endDate.getMonth() + 1)}${p(endDate.getDate())}T${p(endDate.getHours())}${p(endDate.getMinutes())}00`
      return ['BEGIN:VEVENT', `UID:${it.date}-${it.title.slice(0, 8)}@utopia`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${it.title.replace(/^\S+\s/, '')}`, 'END:VEVENT'].join('\r\n')
    })
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Utopia//Calendar//CN', ...events, 'END:VCALENDAR'].join('\r\n')
    const a = document.createElement('a')
    a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
    a.download = 'utopia-calendar.ics'
    a.click()
    toast(`已导出 ${upcoming.length} 条日程`)
  }

  const prevMonth = () => setYm(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 })
  const nextMonth = () => setYm(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 })

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-xl font-semibold">我的日历</h1>
        <button className="btn-outline !py-1.5 !text-xs" onClick={exportAll}>📤 导出 .ics</button>
      </div>
      <p className="text-xs text-ink-400 -mt-2">互助安排与圈子活动都在这里,对所有用户免费。</p>

      {/* 月历 */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <button className="p-1.5 text-ink-400 cursor-pointer hover:text-ink-700" onClick={prevMonth}><ChevronLeft size={18} /></button>
          <div className="font-semibold text-sm">{ym.y} 年 {ym.m + 1} 月</div>
          <button className="p-1.5 text-ink-400 cursor-pointer hover:text-ink-700" onClick={nextMonth}><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] text-ink-300 mb-1.5">
          {WEEK.map(w => <div key={w}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} />
            const has = byDate.has(d)
            const isToday = d === todayStr
            const isSel = d === selected
            return (
              <button key={d} onClick={() => setSelected(d)}
                className={`relative mx-auto w-9 h-9 rounded-full text-[13px] cursor-pointer transition
                  ${isSel ? 'bg-coral-500 text-white font-semibold' : isToday ? 'bg-coral-50 text-coral-600 font-semibold' : 'text-ink-700 hover:bg-cream-100'}`}>
                {+d.slice(8)}
                {has && !isSel && <span className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-1 h-1 rounded-full bg-coral-400" />}
              </button>
            )
          })}
        </div>
      </div>

      {/* 选中日期的安排 */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-2.5">{selected.slice(5).replace('-', ' 月 ')} 日{selected === todayStr ? ' · 今天' : ''}</h3>
        {dayItems.length === 0 && <p className="text-sm text-ink-300">这一天没有安排。</p>}
        <div className="space-y-2">
          {dayItems.map((it, i) => (
            <Link key={i} to={it.link ?? '#'} className="flex items-center gap-3 bg-cream-100 rounded-xl px-3.5 py-2.5 hover:bg-cream-200 transition text-sm">
              <span className="text-xs text-ink-400 w-11 shrink-0">{it.time ?? '全天'}</span>
              <span className="truncate flex-1">{it.title}</span>
              <span className={`chip !py-0 !px-1.5 !text-[10px] shrink-0 ${it.kind === 'task' ? 'bg-coral-50 text-coral-600' : 'bg-violet-50 text-violet-600'}`}>
                {it.kind === 'task' ? '互助' : '圈子活动'}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* 即将到来 */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-2.5">即将到来</h3>
        {upcoming.length === 0 && <p className="text-sm text-ink-300">暂无即将到来的安排,去附近看看有什么可以帮忙的?</p>}
        <div className="space-y-2">
          {upcoming.map((it, i) => (
            <Link key={i} to={it.link ?? '#'} className="flex items-center gap-3 text-sm hover:bg-cream-50 rounded-lg px-2 py-1.5 -mx-2 transition">
              <span className="text-xs text-ink-400 w-20 shrink-0">{it.date.slice(5).replace('-', '/')}{it.time ? ` ${it.time}` : ''}</span>
              <span className="truncate">{it.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
