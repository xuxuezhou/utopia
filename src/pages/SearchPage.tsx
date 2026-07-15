import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, ArrowLeft, X, SlidersHorizontal } from 'lucide-react'
import { useStore, useCurrentUser } from '../lib/store'
import { hasPlusBenefits } from '../lib/monetize'
import { PostCard, TaskCard, UserRow } from '../components/cards'
import { Empty, toast } from '../components/ui'
import { CATEGORY_META, type SavedSearch } from '../lib/types'

type AdvFilters = SavedSearch['filters']
const ADV_DEFAULT: AdvFilters = { online: 'all', minPoints: 0, maxPoints: 500, maxKm: 20 }

const HOT = ['找网球搭档', '取快递', '英语练习', '陪聊', '拍照', '喂猫', '新生引导', '周末活动']
const TABS = ['综合', '任务', '用户', '圈子', '分享'] as const
const FILTERS = ['附近', '今天', '线上', '高积分', '已认证'] as const

export default function SearchPage() {
  const { state, actions } = useStore()
  const me = useCurrentUser()
  const member = hasPlusBenefits(me)
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [committed, setCommitted] = useState('')
  const [tab, setTab] = useState<typeof TABS[number]>('综合')
  const [filters, setFilters] = useState<string[]>([])
  const [advOpen, setAdvOpen] = useState(false)
  const [adv, setAdv] = useState<AdvFilters>(ADV_DEFAULT)
  const advActive = member && (adv.online !== 'all' || adv.minPoints > 0 || adv.maxPoints < 500 || adv.maxKm < 20)
  const [history, setHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('utopia-search-history') ?? '[]') } catch { return [] }
  })

  const commit = (text: string) => {
    const t = text.trim()
    if (!t) return
    setQ(t); setCommitted(t)
    const h = [t, ...history.filter(x => x !== t)].slice(0, 8)
    setHistory(h)
    localStorage.setItem('utopia-search-history', JSON.stringify(h))
  }

  const results = useMemo(() => {
    if (!committed) return null
    const kw = committed.toLowerCase()
    const hit = (s?: string) => !!s && s.toLowerCase().includes(kw)
    let tasks = state.tasks.filter(t => !['blocked', 'cancelled'].includes(t.status) && (hit(t.title) || hit(t.description) || t.skillsRequired.some(hit) || hit(CATEGORY_META[t.category].label)))
    const users = state.users.filter(u => hit(u.name) || hit(u.bio) || u.skills.some(hit))
    const circles = state.communities.filter(c => hit(c.name) || hit(c.intro))
    const posts = state.posts.filter(p => hit(p.title) || hit(p.body) || p.tags.some(hit))
    // 轻量筛选
    if (filters.includes('附近')) tasks = tasks.filter(t => !t.online && t.distanceKm <= 3)
    if (filters.includes('今天')) tasks = tasks.filter(t => t.date === new Date().toISOString().slice(0, 10) || t.date <= '2026-07-12')
    if (filters.includes('线上')) tasks = tasks.filter(t => t.online)
    if (filters.includes('高积分')) tasks = tasks.filter(t => t.points >= 100)
    if (filters.includes('已认证')) tasks = tasks.filter(t => (state.users.find(u => u.id === t.publisherId)?.level ?? 0) >= 1)
    // 会员高级筛选(Plus/Pro)
    if (advActive) {
      if (adv.online === 'online') tasks = tasks.filter(t => t.online)
      if (adv.online === 'offline') tasks = tasks.filter(t => !t.online)
      tasks = tasks.filter(t => t.points >= adv.minPoints && t.points <= adv.maxPoints && (t.online || t.distanceKm <= adv.maxKm))
    }
    return { tasks, users, circles, posts }
  }, [committed, filters, state, advActive, adv])

  return (
    <div className="max-w-3xl mx-auto">
      {/* 搜索框 */}
      <div className="sticky top-[var(--safe-top)] md:top-0 z-30 bg-white -mx-3 px-3 py-2 flex items-center gap-2">
        <button className="p-1.5 text-ink-700 cursor-pointer md:hidden" onClick={() => nav(-1)}><ArrowLeft size={20} strokeWidth={1.8} /></button>
        <div className="flex-1 flex items-center gap-2 bg-cream-100 rounded-full px-4 py-2">
          <Search size={16} className="text-ink-300" strokeWidth={1.8} />
          <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-300" placeholder="搜索任务、用户或社区"
            value={q} autoFocus onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && commit(q)} />
          {q && <button className="cursor-pointer text-ink-300" onClick={() => { setQ(''); setCommitted('') }}><X size={15} /></button>}
        </div>
        <button className="text-sm text-coral-500 font-medium cursor-pointer shrink-0" onClick={() => commit(q)}>搜索</button>
      </div>

      {!results ? (
        <div className="pt-4 space-y-6">
          {member && (me?.savedSearches?.length ?? 0) > 0 && (
            <div>
              <div className="text-sm font-medium text-ink-900 mb-2.5">已保存的搜索 <span className="text-[10px] text-coral-500 font-semibold">Plus</span></div>
              <div className="flex flex-wrap gap-2">
                {me!.savedSearches!.map(ss => (
                  <span key={ss.id} className="chip bg-coral-50 text-coral-600 !py-1.5 !px-3 inline-flex items-center gap-1.5">
                    <button className="cursor-pointer" onClick={() => { setAdv(ss.filters); setAdvOpen(true); commit(ss.query || ss.name) }}>🔔 {ss.name}</button>
                    <button className="cursor-pointer text-coral-300" onClick={() => actions.deleteSearch(ss.id)}><X size={12} /></button>
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-ink-300 mt-2">符合条件的新任务发布时会即时通知你。</p>
            </div>
          )}
          {history.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-sm font-medium text-ink-900">搜索历史</span>
                <button className="text-xs text-ink-300 cursor-pointer" onClick={() => { setHistory([]); localStorage.removeItem('utopia-search-history') }}>清空</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {history.map(h => <button key={h} className="chip bg-cream-100 text-ink-500 !py-1.5 !px-3 cursor-pointer" onClick={() => commit(h)}>{h}</button>)}
              </div>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-ink-900 mb-2.5">猜你想搜</div>
            <div className="flex flex-wrap gap-2">
              {HOT.map(h => <button key={h} className="chip bg-cream-100 text-ink-500 !py-1.5 !px-3 cursor-pointer" onClick={() => commit(h)}>{h}</button>)}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-ink-900 mb-2.5">附近热门</div>
            <div className="space-y-2.5">
              {state.tasks.filter(t => ['open', 'applied'].includes(t.status)).slice(0, 5).map((t, i) => (
                <Link key={t.id} to={`/task/${t.id}`} className="flex items-center gap-3 text-sm text-ink-700">
                  <span className={`w-4 text-center font-semibold ${i < 3 ? 'text-coral-500' : 'text-ink-300'}`}>{i + 1}</span>
                  <span className="truncate">{t.title}</span>
                  <span className="text-coral-500 text-xs ml-auto shrink-0">{t.points} pt</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="pt-1">
          {/* 结果 Tab */}
          <div className="flex gap-6 border-b border-cream-200 mb-3">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`relative pb-2.5 text-sm cursor-pointer ${tab === t ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}>
                {t}
                {tab === t && <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-4 h-[3px] rounded-full bg-coral-500" />}
              </button>
            ))}
          </div>
          {(tab === '任务' || tab === '综合') && (
            <>
              <div className="flex gap-2 mb-4 overflow-x-auto no-scrollbar items-center">
                {FILTERS.map(f => (
                  <button key={f} onClick={() => setFilters(v => v.includes(f) ? v.filter(x => x !== f) : [...v, f])}
                    className={`chip cursor-pointer !py-1.5 !px-3 shrink-0 ${filters.includes(f) ? 'bg-ink-900 text-white' : 'bg-cream-100 text-ink-500'}`}>{f}</button>
                ))}
                <button
                  className={`chip cursor-pointer !py-1.5 !px-3 shrink-0 inline-flex items-center gap-1 ${advOpen || advActive ? 'bg-coral-500 text-white' : 'bg-cream-100 text-ink-500'}`}
                  onClick={() => member ? setAdvOpen(v => !v) : toast('高级筛选是 Plus/Pro 会员功能')}>
                  <SlidersHorizontal size={12} /> 高级筛选{!member && ' 🔒'}
                </button>
              </div>
              {advOpen && member && (
                <div className="card p-4 mb-4 space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <label className="label">形式</label>
                      <select className="input !py-1.5 !text-xs" value={adv.online} onChange={e => setAdv(a => ({ ...a, online: e.target.value as AdvFilters['online'] }))}>
                        <option value="all">全部</option><option value="online">仅线上</option><option value="offline">仅线下</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">积分 ≥ {adv.minPoints}</label>
                      <input type="range" min={0} max={300} step={10} value={adv.minPoints} onChange={e => setAdv(a => ({ ...a, minPoints: +e.target.value }))} className="w-full accent-coral-500" />
                    </div>
                    <div>
                      <label className="label">积分 ≤ {adv.maxPoints}</label>
                      <input type="range" min={50} max={500} step={10} value={adv.maxPoints} onChange={e => setAdv(a => ({ ...a, maxPoints: +e.target.value }))} className="w-full accent-coral-500" />
                    </div>
                    <div>
                      <label className="label">距离 ≤ {adv.maxKm} km</label>
                      <input type="range" min={1} max={20} value={adv.maxKm} onChange={e => setAdv(a => ({ ...a, maxKm: +e.target.value }))} className="w-full accent-coral-500" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-outline !py-1.5 !text-xs" onClick={() => setAdv(ADV_DEFAULT)}>重置</button>
                    <button className="btn-primary !py-1.5 !text-xs" onClick={() => {
                      const name = prompt('给这组条件起个名字(命中的新任务会即时通知你):', committed || '我的搜索条件')
                      if (name) { actions.saveSearch(name, committed, adv); toast('已保存,新任务命中时会通知你 🔔') }
                    }}>💾 保存条件并订阅提醒</button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === '用户' ? (
            results.users.length === 0 ? <Empty text="没有找到相关用户" /> :
              <div className="space-y-4 py-2">{results.users.map(u => <UserRow key={u.id} user={u} />)}</div>
          ) : tab === '圈子' ? (
            results.circles.length === 0 ? <Empty text="没有找到相关圈子" /> :
              <div className="space-y-2 py-2">
                {results.circles.map(c => (
                  <Link key={c.id} to={`/circle/${c.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-cream-50">
                    <span className="w-11 h-11 rounded-xl bg-cream-100 flex items-center justify-center text-xl">{c.emoji}</span>
                    <span>
                      <span className="block text-sm font-medium">{c.name}</span>
                      <span className="block text-xs text-ink-400">{c.memberCount} 位成员</span>
                    </span>
                  </Link>
                ))}
              </div>
          ) : (
            (() => {
              const cards = [
                ...(tab !== '分享' ? results.tasks.map(t => <TaskCard key={`t${t.id}`} task={t} />) : []),
                ...(tab !== '任务' ? results.posts.map(p => <PostCard key={`p${p.id}`} post={p} />) : []),
              ]
              return cards.length === 0
                ? <Empty text={`没有找到与「${committed}」相关的内容,试试发布一个求助?`} action={<Link to="/publish" className="btn-primary">发布求助</Link>} />
                : <div className="masonry columns-2 md:columns-3 lg:columns-4">{cards}</div>
            })()
          )}
        </div>
      )}
    </div>
  )
}
