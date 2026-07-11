import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore, useCurrentUser } from '../lib/store'
import { TaskCard } from '../components/cards'
import { CATEGORY_META, type Task, type TaskCategory } from '../lib/types'
import { Empty, Points } from '../components/ui'

type Sort = 'recommend' | 'distance' | 'newest' | 'earliest'
const SORTS: [Sort, string][] = [['recommend', '推荐排序'], ['distance', '最近距离'], ['newest', '最新发布'], ['earliest', '最早开始']]

export default function Nearby() {
  const { state } = useStore()
  const me = useCurrentUser()
  const nav = useNavigate()
  const [view, setView] = useState<'list' | 'map'>('list')
  const [sort, setSort] = useState<Sort>('recommend')
  const [cat, setCat] = useState<TaskCategory | 'all'>('all')
  const [onlyCircle, setOnlyCircle] = useState(false)
  const [onlyVerified, setOnlyVerified] = useState(false)

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
        s += 20 // 时间可用性(演示:默认可用)
        s += Math.max(0, 15 - t.distanceKm * 3)
        const pub = state.users.find(u => u.id === t.publisherId)
        s += (pub?.stats.onTimeRate ?? 90) * 0.15
        if (t.communityId && me.communityIds.includes(t.communityId)) s += 10
      }
      return s
    }
    return [...list].sort((a, b) => {
      if (sort === 'distance') return a.distanceKm - b.distanceKm
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt)
      if (sort === 'earliest') return `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`)
      return score(b) - score(a)
    })
  }, [state.tasks, state.users, cat, sort, onlyCircle, onlyVerified, me])

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-semibold">附近互助</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-white border border-cream-300 p-0.5">
            {(['list', 'map'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded-lg text-sm cursor-pointer ${view === v ? 'bg-ink-900 text-white' : 'text-ink-400'}`}>
                {v === 'list' ? '☰ 列表' : '🗺 地图'}
              </button>
            ))}
          </div>
          <select className="input !w-auto !py-1.5" value={sort} onChange={e => setSort(e.target.value as Sort)}>
            {SORTS.map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </div>
      </div>

      {/* 筛选 */}
      <div className="flex gap-1.5 overflow-x-auto pb-3 mb-2 -mx-1 px-1">
        <button onClick={() => setCat('all')} className={`chip cursor-pointer shrink-0 ${cat === 'all' ? 'bg-ink-900 text-white' : 'bg-white text-ink-500'}`}>全部</button>
        {(Object.keys(CATEGORY_META) as TaskCategory[]).slice(0, 12).map(c => (
          <button key={c} onClick={() => setCat(c)} className={`chip cursor-pointer shrink-0 ${cat === c ? 'bg-ink-900 text-white' : 'bg-white text-ink-500'}`}>
            {CATEGORY_META[c].emoji} {CATEGORY_META[c].label}
          </button>
        ))}
        <span className="w-px bg-cream-300 shrink-0" />
        <button onClick={() => setOnlyCircle(v => !v)} className={`chip cursor-pointer shrink-0 ${onlyCircle ? 'bg-violet-500 text-white' : 'bg-white text-ink-500'}`}>仅看所在圈子</button>
        <button onClick={() => setOnlyVerified(v => !v)} className={`chip cursor-pointer shrink-0 ${onlyVerified ? 'bg-leaf-500 text-white' : 'bg-white text-ink-500'}`}>仅看已认证</button>
      </div>

      {view === 'list' ? (
        tasks.length === 0
          ? <Empty text="这个筛选下暂时没有任务,换个类别试试,或者发布一个你的请求。" />
          : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{tasks.map(t => <TaskCard key={t.id} task={t} />)}</div>
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
    <div className="card overflow-hidden">
      <div className="relative h-[480px] bg-leaf-50">
        {/* 风格化街区底图 */}
        <svg className="absolute inset-0 w-full h-full" aria-hidden>
          <defs>
            <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#D5EEDF" strokeWidth="1.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          <path d="M0,300 Q 250,220 500,300 T 1200,260" stroke="#BFE3D0" strokeWidth="26" fill="none" opacity="0.7" />
          <path d="M180,0 L 260,600" stroke="#EDE6D6" strokeWidth="34" fill="none" />
          <path d="M0,120 L 1200,180" stroke="#EDE6D6" strokeWidth="24" fill="none" />
          <circle cx="70%" cy="30%" r="60" fill="#D5EEDF" />
          <circle cx="20%" cy="70%" r="46" fill="#D5EEDF" />
        </svg>
        <div className="absolute left-3 top-3 chip bg-white/90 text-ink-500 shadow-card">🔒 地图仅显示大致区域,精确地点在匹配后按需公开</div>
        {/* 我的位置 */}
        <div className="absolute" style={{ left: '48%', top: '52%' }}>
          <div className="w-4 h-4 rounded-full bg-violet-500 ring-4 ring-violet-400/30" />
          <div className="text-[10px] text-violet-600 font-medium mt-0.5">我</div>
        </div>
        {tasks.map(t => {
          const p = pos(t.id)
          return (
            <button key={t.id} className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group" style={{ left: `${p.x}%`, top: `${p.y}%` }}
              onClick={() => setActive(t)}>
              <div className="absolute inset-0 -m-4 rounded-full bg-coral-400/15 group-hover:bg-coral-400/25 transition" />
              <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base shadow-card transition group-hover:scale-110 ${active?.id === t.id ? 'bg-coral-500' : 'bg-white'}`}>
                {CATEGORY_META[t.category].emoji}
              </div>
            </button>
          )
        })}
        {active && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:w-80 card p-4 cursor-pointer" onClick={() => onPick(active.id)}>
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-sm">{active.images[0]} {active.title}</div>
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
