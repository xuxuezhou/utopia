import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore, useCurrentUser, poolBalance } from '../lib/store'
import { hasPlusBenefits } from '../lib/monetize'
import { PostCard, TaskCard, UserRow } from '../components/cards'
import { Empty, Section, toast } from '../components/ui'

const VIS_LABEL = { public: '公开', apply: '申请加入', invite: '邀请制', org_verified: '机构验证' }

export default function Circles() {
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const member = hasPlusBenefits(me)
  const joined = me.communityIds.map(cid => state.communities.find(c => c.id === cid)).filter(Boolean)
  return (
    <div>
      <h1 className="text-xl font-semibold mb-1">Utopia 圈子</h1>
      <p className="text-sm text-ink-400 mb-5">大学、公寓、街区、公司和兴趣社群——高密度社区让互助更容易发生。</p>

      {/* Plus 多社区管理 */}
      {joined.length > 0 && (
        <div className="card p-4 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-sm">我的圈子管理</h3>
            <span className="text-[10px] text-coral-500 font-semibold">Plus</span>
            {!member && <span className="text-xs text-ink-300">🔒 会员可集中管理多个圈子</span>}
          </div>
          <p className="text-[11px] text-ink-300 mb-3">主圈子会展示在你的个人主页;设置只影响展示,不影响任何圈子内权限。</p>
          <div className="space-y-2">
            {joined.map((c, i) => (
              <div key={c!.id} className="flex items-center gap-2.5 bg-cream-50 rounded-xl px-3 py-2.5">
                <span className="text-lg">{c!.emoji}</span>
                <Link to={`/circle/${c!.id}`} className="text-sm font-medium truncate">{c!.name}</Link>
                {i === 0 && <span className="chip !py-0 !px-1.5 !text-[10px] bg-coral-50 text-coral-600">主圈子</span>}
                <span className="flex-1" />
                {member ? (
                  <>
                    {i !== 0 && <button className="btn-outline !py-1 !text-xs" onClick={() => { actions.setPrimaryCommunity(c!.id); toast(`已把「${c!.name}」设为主圈子`) }}>设为主圈子</button>}
                    <button className="btn-ghost !py-1 !text-xs" onClick={() => {
                      if (confirm(`确定退出「${c!.name}」吗?`)) { actions.leaveCommunity(c!.id); toast('已退出圈子') }
                    }}>退出</button>
                  </>
                ) : (
                  <button className="btn-ghost !py-1 !text-xs" onClick={() => toast('多社区管理是 Plus / Pro 会员功能')}>管理 🔒</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {state.communities.map(c => {
          const joined = me.communityIds.includes(c.id)
          const taskCount = state.tasks.filter(t => t.communityId === c.id && ['open', 'applied'].includes(t.status)).length
          return (
            <Link key={c.id} to={`/circle/${c.id}`} className="card card-hover p-5 block fade-up">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-violet-50 flex items-center justify-center text-2xl">{c.emoji}</div>
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-xs text-ink-400">{c.memberCount} 位成员 · {VIS_LABEL[c.visibility]}</div>
                </div>
              </div>
              <p className="text-sm text-ink-500 line-clamp-2 mb-3">{c.intro}</p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-violet-600">{taskCount} 个进行中的互助</span>
                {joined ? <span className="chip bg-leaf-50 text-leaf-600">✓ 已加入</span> : <span className="chip bg-coral-50 text-coral-600">去看看 →</span>}
              </div>
              {/* 社区目标 */}
              <div className="mt-3 pt-3 border-t border-cream-200">
                <div className="flex justify-between text-[11px] text-ink-400 mb-1">
                  <span>🎯 {c.goal.title}</span>
                  <span>{c.goal.current}/{c.goal.target} {c.goal.unit}</span>
                </div>
                <div className="h-1.5 rounded-full bg-cream-200 overflow-hidden">
                  <div className="h-full bg-violet-400 rounded-full" style={{ width: `${Math.min(100, c.goal.current / c.goal.target * 100)}%` }} />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function CircleDetail() {
  const { id } = useParams()
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const c = state.communities.find(x => x.id === id)
  const tasks = useMemo(() => state.tasks.filter(t => t.communityId === id && ['open', 'applied'].includes(t.status)), [state.tasks, id])
  const posts = useMemo(() => state.posts.filter(p => p.communityId === id), [state.posts, id])
  const members = useMemo(() => state.users.filter(u => u.communityIds.includes(id!)).slice(0, 6), [state.users, id])
  if (!c) return <Empty text="圈子不存在" />
  const joined = me.communityIds.includes(c.id)
  const pool = poolBalance(state, 'sys:community_pool')

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card p-6 mb-4 fade-up">
        <div className="flex items-start gap-4 flex-wrap">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center text-3xl">{c.emoji}</div>
          <div className="flex-1 min-w-52">
            <h1 className="text-xl font-semibold">{c.name}</h1>
            <p className="text-sm text-ink-500 mt-1">{c.intro}</p>
            <div className="text-xs text-ink-400 mt-2">{c.memberCount} 位成员 · {VIS_LABEL[c.visibility]} · 管理员 {c.adminIds.map(a => state.users.find(u => u.id === a)?.name).filter(Boolean).join('、') || 'Utopia 团队'}</div>
          </div>
          {!joined
            ? <button className="btn-primary" onClick={() => actions.joinCommunity(c.id)}>{c.visibility === 'public' ? '加入圈子' : '申请加入'}</button>
            : <span className="chip bg-leaf-50 text-leaf-600 !py-2 !px-4">✓ 已加入</span>}
        </div>
        {/* 目标进度 */}
        <div className="mt-5 bg-violet-50 rounded-xl p-4">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-medium">🎯 {c.goal.title}</span>
            <span className="text-violet-600 font-semibold">{c.goal.current} / {c.goal.target} {c.goal.unit}</span>
          </div>
          <div className="h-2 rounded-full bg-white overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${Math.min(100, c.goal.current / c.goal.target * 100)}%` }} />
          </div>
          <div className="text-[11px] text-ink-400 mt-1.5">社区关怀池当前约 {Math.max(pool, 0)} pt,用于支持公益任务</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_300px] gap-4 items-start">
        <div className="space-y-5">
          <Section title={`圈内互助(${tasks.length})`}>
            {tasks.length === 0
              ? <Empty text="圈子里暂时没有进行中的互助任务" />
              : <div className="grid sm:grid-cols-2 gap-4">{tasks.map(t => <TaskCard key={t.id} task={t} />)}</div>}
          </Section>
          {posts.length > 0 && (
            <Section title="圈内动态">
              <div className="masonry columns-2">{posts.map(p => <PostCard key={p.id} post={p} />)}</div>
            </Section>
          )}
        </div>
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3">📅 活动日历</h3>
            <div className="space-y-2">
              {c.calendar.map(ev => (
                <div key={ev.title} className="flex gap-3 text-sm">
                  <span className="text-xs text-violet-600 font-medium shrink-0 bg-violet-50 rounded-lg px-2 py-1">{ev.date.slice(5)}</span>
                  <span className="text-ink-500">{ev.title}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-3">活跃成员</h3>
            <div className="space-y-3">
              {members.map(u => <UserRow key={u.id} user={u} />)}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="font-semibold text-sm mb-2">📜 圈子规则</h3>
            <ul className="text-xs text-ink-400 space-y-1.5 leading-relaxed list-disc pl-4">
              {c.rules.map(r => <li key={r}>{r}</li>)}
            </ul>
            <p className="text-[10px] text-ink-300 mt-3 pt-2 border-t border-cream-200">圈子管理员可审核成员、发布公告与公益任务、处理举报、查看匿名化社区健康数据;不能查看成员私信或精确位置。</p>
          </div>
        </div>
      </div>
    </div>
  )
}
