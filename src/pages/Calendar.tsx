import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore, useCurrentUser } from '../lib/store'
import { toast } from '../components/ui'
import type { Task } from '../lib/types'

// 内置日历(免费,Google Calendar 式月视图):我的互助安排 + 所在圈子的社区活动
interface CalItem {
  date: string          // YYYY-MM-DD
  time?: string
  title: string
  kind: 'task' | 'community'
  link?: string
  task?: Task
}

const WEEK = ['一', '二', '三', '四', '五', '六', '日']
const KIND_CLS = {
  task: 'bg-coral-100 text-coral-700',
  community: 'bg-violet-50 text-violet-600',
}

export default function CalendarPage() {
  const { state } = useStore()
  const me = useCurrentUser()!
  const today = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const todayStr = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`
  const [ym, setYm] = useState({ y: today.getFullYear(), m: today.getMonth() }) // m: 0-11
  const [selected, setSelected] = useState(todayStr)

  const items = useMemo<CalItem[]>(() => {
    const mine: CalItem[] = state.tasks
      .filter(t => (t.publisherId === me.id || t.helperId === me.id) && !['cancelled', 'blocked'].includes(t.status))
      .map(t => ({ date: t.date, time: t.startTime, title: t.title, kind: 'task' as const, link: `/task/${t.id}`, task: t }))
    const community: CalItem[] = state.communities
      .filter(c => me.communityIds.includes(c.id))
      .flatMap(c => c.calendar.map(e => ({ date: e.date, title: e.title, kind: 'community' as const, link: `/circle/${c.id}` })))
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

  // 当月网格(周一开头,补齐整周)
  const first = new Date(ym.y, ym.m, 1)
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate()
  const lead = (first.getDay() + 6) % 7
  const cells: (string | null)[] = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${ym.y}-${p(ym.m + 1)}-${p(i + 1)}`),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const dayItems = byDate.get(selected) ?? []
  const upcoming = items.filter(it => it.date >= todayStr).slice(0, 12)

  // 导出所有即将到来的安排为 .ics(免费)
  const exportAll = () => {
    const events = upcoming.map(it => {
      const startTime = it.time ?? '09:00'
      const start = `${it.date.replace(/-/g, '')}T${startTime.replace(':', '')}00`
      const endDate = new Date(`${it.date}T${startTime}:00`)
      endDate.setMinutes(endDate.getMinutes() + (it.task?.durationMin ?? 60))
      const end = `${endDate.getFullYear()}${p(endDate.getMonth() + 1)}${p(endDate.getDate())}T${p(endDate.getHours())}${p(endDate.getMinutes())}00`
      return ['BEGIN:VEVENT', `UID:${it.date}-${it.title.slice(0, 8)}@utopia`, `DTSTART:${start}`, `DTEND:${end}`, `SUMMARY:${it.title}`, 'END:VEVENT'].join('\r\n')
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
  const goToday = () => { setYm({ y: today.getFullYear(), m: today.getMonth() }); setSelected(todayStr) }

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-8">
      {/* 顶栏:月份导航 + 今天 + 导出 */}
      <div className="flex items-center gap-1.5 pt-2">
        <h1 className="text-lg font-semibold shrink-0 mr-1">我的日历</h1>
        <button className="btn-outline !py-1 !px-2.5 !text-xs shrink-0 whitespace-nowrap" onClick={goToday}>今天</button>
        <span className="flex-1" />
        <button className="p-1 text-ink-400 cursor-pointer hover:text-ink-700" onClick={prevMonth} aria-label="上个月"><ChevronLeft size={18} /></button>
        <div className="font-medium text-[13px] whitespace-nowrap text-center">{ym.y}年{ym.m + 1}月</div>
        <button className="p-1 text-ink-400 cursor-pointer hover:text-ink-700" onClick={nextMonth} aria-label="下个月"><ChevronRight size={18} /></button>
        <button className="btn-outline !py-1 !px-2.5 !text-xs shrink-0 whitespace-nowrap" onClick={exportAll}>导出 .ics</button>
      </div>
      <p className="text-xs text-ink-400 -mt-2">
        互助安排与圈子活动都在这里,对所有用户免费 ·
        <span className="inline-flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-sm bg-coral-400 inline-block" />互助</span>
        <span className="inline-flex items-center gap-1 ml-2"><span className="w-2 h-2 rounded-sm bg-violet-400 inline-block" />圈子活动</span>
      </p>

      {/* Google 式月视图:格子内直接显示事件条 */}
      <div className="card overflow-hidden">
        <div className="grid grid-cols-7 text-center text-[11px] text-ink-400 border-b border-cream-200 py-1.5">
          {WEEK.map(w => <div key={w}>{w}</div>)}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            if (!d) return <div key={`e${i}`} className={`min-h-16 md:min-h-24 border-cream-100 ${i % 7 !== 0 ? 'border-l' : ''} ${i >= 7 ? 'border-t' : ''} bg-cream-50/40`} />
            const evts = byDate.get(d) ?? []
            const isToday = d === todayStr
            const isSel = d === selected
            const maxShow = 2
            return (
              <button key={d} onClick={() => setSelected(d)}
                className={`min-h-16 md:min-h-24 border-cream-100 ${i % 7 !== 0 ? 'border-l' : ''} ${i >= 7 ? 'border-t' : ''}
                  p-0.5 md:p-1 text-left align-top cursor-pointer transition hover:bg-cream-50 ${isSel ? 'bg-coral-50/50' : ''}`}>
                <div className="flex justify-center md:justify-start mb-0.5">
                  <span className={`w-6 h-6 flex items-center justify-center rounded-full text-[12px] ${isToday ? 'bg-coral-500 text-white font-semibold' : isSel ? 'text-coral-600 font-semibold' : 'text-ink-700'}`}>
                    {+d.slice(8)}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {evts.slice(0, maxShow).map((e, j) => (
                    <div key={j} className={`px-1 py-px rounded text-[9px] md:text-[10px] leading-snug truncate ${KIND_CLS[e.kind]}`}>
                      {e.time && <span className="hidden md:inline">{e.time} </span>}{e.title}
                    </div>
                  ))}
                  {evts.length > maxShow && <div className="px-1 text-[9px] text-ink-400">还有 {evts.length - maxShow} 项</div>}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* 选中日期的安排 */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-2.5">{+selected.slice(5, 7)} 月 {+selected.slice(8)} 日{selected === todayStr ? ' · 今天' : ''}</h3>
        {dayItems.length === 0 && <p className="text-sm text-ink-300">这一天没有安排。</p>}
        <div className="space-y-1.5">
          {dayItems.map((it, i) => (
            <Link key={i} to={it.link ?? '#'} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-cream-50 transition text-sm">
              <span className={`w-1 self-stretch rounded-full ${it.kind === 'task' ? 'bg-coral-400' : 'bg-violet-400'}`} />
              <span className="text-xs text-ink-400 w-11 shrink-0">{it.time ?? '全天'}</span>
              <span className="truncate flex-1">{it.title}</span>
              <span className={`chip !py-0 !px-1.5 !text-[10px] shrink-0 ${KIND_CLS[it.kind]}`}>{it.kind === 'task' ? '互助' : '圈子活动'}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 即将到来(日程视图) */}
      <div className="card p-4">
        <h3 className="font-semibold text-sm mb-2.5">即将到来</h3>
        {upcoming.length === 0 && <p className="text-sm text-ink-300">暂无即将到来的安排,去附近看看有什么可以帮忙的?</p>}
        <div className="space-y-1.5">
          {upcoming.map((it, i) => (
            <Link key={i} to={it.link ?? '#'} className="flex items-center gap-3 text-sm hover:bg-cream-50 rounded-lg px-2 py-1.5 -mx-2 transition">
              <span className={`w-1 self-stretch rounded-full ${it.kind === 'task' ? 'bg-coral-400' : 'bg-violet-400'}`} />
              <span className="text-xs text-ink-400 w-20 shrink-0">{it.date.slice(5).replace('-', '/')}{it.time ? ` ${it.time}` : ''}</span>
              <span className="truncate">{it.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
