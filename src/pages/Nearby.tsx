import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Map, LayoutGrid } from 'lucide-react'
import { useStore, useCurrentUser } from '../lib/store'
import { TaskCard } from '../components/cards'
import { CATEGORY_META, type Task, type TaskCategory } from '../lib/types'
import { Empty, Points } from '../components/ui'

type Sort = 'recommend' | 'distance' | 'newest' | 'earliest'
const SORTS: [Sort, string][] = [['recommend', '推荐'], ['distance', '最近'], ['newest', '最新'], ['earliest', '最早开始']]

export default function Nearby() {
  const { state } = useStore()
  const me = useCurrentUser()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [sort, setSort] = useState<Sort>('recommend')
  const [cat, setCat] = useState<TaskCategory | 'all'>('all')
  const [onlyCircle, setOnlyCircle] = useState(false)
  const [onlyVerified, setOnlyVerified] = useState(false)
  const nav = useNavigate()

  const tasks = useMemo(() => {
    let list = state.tasks.filter(t => ['open', 'applied'].includes(t.status))
    if (cat !== 'all') list = list.filter(t => t.category === cat)
    if (onlyCircle && me) list = list.filter(t => t.communityId && me.communityIds.includes(t.communityId))
    if (onlyVerified) list = list.filter(t => (state.users.find(u => u.id === t.publisherId)?.level ?? 0) >= 1)
    const score = (t: Task) => {
      // 30%技能 20%时间 15%距离 15%信任 10%社区 10%新用户曝光
      let s = 0
      if (me) {
        const skillHit = t.skillsRequired.some(sk => me.skills.includes(sk))
        s += skillHit ? 30 : 0
        s += 20
        s += Math.max(0, 15 - t.distanceKm * 3)
        const pub = state.users.find(u => u.id === t.publisherId)
        s += (pub?.stats.onTimeRate ?? 90) * 0.15
        if (t.communityId && me.communityIds.includes(t.communityId)) s += 10
      }
      return s
    }
    return [...list].sort((a, b) => {
      if (sort === 'distance') return (a.online ? 99 : a.distanceKm) - (b.online ? 99 : b.distanceKm)
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt)
      if (sort === 'earliest') return `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)
      return score(b) - score(a)
    })
  }, [state.tasks, state.users, cat, sort, onlyCircle, onlyVerified, me])

  return (
    <div>
      <div className="flex items-center gap-2 py-1">
        <h1 className="text-lg font-semibold flex-1">附近互助</h1>
        <button className="p-2 text-ink-500 cursor-pointer" onClick={() => setView(v => v === 'list' ? 'map' : 'list')} aria-label="切换视图">
          {view === 'list' ? <Map size={19} strokeWidth={1.8} /> : <LayoutGrid size={19} strokeWidth={1.8} />}
        </button>
      </div>

      {/* 排序 + 轻筛选 */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
        {SORTS.map(([k, label]) => (
          <button key={k} onClick={() => setSort(k)} className={`chip cursor-pointer !py-1.5 !px-3 shrink-0 ${sort === k ? 'bg-ink-900 text-white' : 'bg-cream-100 text-ink-500'}`}>{label}</button>
        ))}
        <span className="w-px bg-cream-300 shrink-0 my-1" />
        <button onClick={() => setOnlyCircle(v => !v)} className={`chip cursor-pointer !py-1.5 !px-3 shrink-0 ${onlyCircle ? 'bg-ink-900 text-white' : 'bg-cream-100 text-ink-500'}`}>仅看所在圈子</button>
        <button onClick={() => setOnlyVerified(v => !v)} className={`chip cursor-pointer !py-1.5 !px-3 shrink-0 ${onlyVerified ? 'bg-ink-900 text-white' : 'bg-cream-100 text-ink-500'}`}>已认证</button>
      </div>
      <div className="flex gap-4 overflow-x-auto no-scrollbar py-1.5 mb-2">
        <button onClick={() => setCat('all')} className={`shrink-0 text-sm cursor-pointer ${cat === 'all' ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}>全部</button>
        {(Object.keys(CATEGORY_META) as TaskCategory[]).slice(0, 12).map(c => (
          <button key={c} onClick={() => setCat(c)} className={`shrink-0 text-sm cursor-pointer ${cat === c ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}>
            {CATEGORY_META[c].label}
          </button>
        ))}
      </div>

      {view === 'list' ? (
        tasks.length === 0
          ? <Empty text="这个筛选下暂时没有任务,换个类别试试,或者发布一个你的请求。" />
          : <div className="masonry columns-2 md:columns-3 lg:columns-4 xl:columns-5">{tasks.map(t => <TaskCard key={t.id} task={t} />)}</div>
      ) : (
        <MapMode tasks={tasks} onPick={id => nav(`/task/${id}`)} />
      )}
    </div>
  )
}

// 模糊地图:仅显示大致区域,不暴露精确位置
function MapMode({ tasks, onPick }: { tasks: Task[]; onPick: (id: string) => void }) {
  const [active, setActive] = useState<Task | null>(null)
  const pos = (id: string) => {
    let h = 0
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 9973
    return { x: 12 + (h % 74), y: 14 + (Math.floor(h / 89) % 62) }
  }
  return (
    <div className="rounded-2xl overflow-hidden border border-cream-200">
      <div className="relative h-[480px] bg-cream-50">
        <svg className="absolute inset-0 w-full h-full" aria-hidden>
          <defs>
            <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#F0F0F0" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path d="M0,300 Q 250,220 500,300 T 1200,260" stroke="#DCEEE4" strokeWidth="26" fill="none" opacity="0.8" />
          <path d="M180,0 L 260,600" stroke="#F1EDE4" strokeWidth="34" fill="none" />
          <path d="M0,120 L 1200,180" stroke="#F1EDE4" strokeWidth="24" fill="none" />
          <circle cx="70%" cy="30%" r="60" fill="#E7F3EC" />
          <circle cx="20%" cy="70%" r="46" fill="#E7F3EC" />
        </svg>
        <div className="absolute left-3 top-3 chip bg-white/90 text-ink-500 shadow-card">🔒 仅显示大致区域,精确地点在匹配后按需公开</div>
        <div className="absolute" style={{ left: '48%', top: '52%' }}>
          <div className="w-4 h-4 rounded-full bg-violet-500 ring-4 ring-violet-400/25" />
          <div className="text-[10px] text-violet-600 font-medium mt-0.5">我</div>
        </div>
        {tasks.map(t => {
          const p = pos(t.id)
          return (
            <button key={t.id} className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group" style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={() => setActive(t)}>
              <div className="absolute inset-0 -m-4 rounded-full bg-coral-400/10 group-hover:bg-coral-400/20 transition" />
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base shadow-card transition group-hover:scale-110 ${active?.id === t.id ? 'bg-coral-500' : 'bg-white'}`}>
                {CATEGORY_META[t.category].emoji}
              </div>
            </button>
          )
        })}
        {active && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:w-80 pop p-4 cursor-pointer" onClick={() => onPick(active.id)}>
            <div className="flex items-start justify-between gap-2">
              <div className="font-medium text-sm">{active.title}</div>
              <Points value={active.points} size="sm" />
            </div>
            <div className="text-xs text-ink-400 mt-1">📍 {active.locationText} · 距你约 {active.distanceKm} km</div>
            <div className="text-xs text-coral-500 mt-2">查看详情 →</div>
          </div>
        )}
      </div>
    </div>
  )
}
