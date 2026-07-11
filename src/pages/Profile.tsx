import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore, useCurrentUser } from '../lib/store'
import { PostCard, TrustPassport } from '../components/cards'
import { Avatar, Empty, LevelBadge, Points } from '../components/ui'
import { ReportModal } from './TaskDetail'

export default function Profile() {
  const { id } = useParams()
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const nav = useNavigate()
  const [report, setReport] = useState(false)
  const user = state.users.find(u => u.id === id)

  const isMe = id === me.id
  const myNeeds = useMemo(() => state.tasks.filter(t => t.publisherId === id && ['open', 'applied'].includes(t.status)), [state.tasks, id])
  const completed = useMemo(() => state.tasks.filter(t => (t.publisherId === id || t.helperId === id) && t.status === 'completed'), [state.tasks, id])
  const posts = useMemo(() => state.posts.filter(p => p.authorId === id), [state.posts, id])
  const publicReviews = useMemo(() =>
    state.tasks.flatMap(t => t.reviews).filter(r => r.toId === id && r.published).slice(0, 6),
  [state.tasks, id])

  if (!user) return <Empty text="用户不存在" />
  const blocked = me.blocked.includes(user.id)

  return (
    <div className="max-w-4xl mx-auto">
      {/* 头部 */}
      <div className="card p-6 mb-4 fade-up">
        <div className="flex items-start gap-4 flex-wrap">
          <Avatar user={user} size={72} link={false} />
          <div className="flex-1 min-w-48">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold">{user.name}</h1>
              <LevelBadge level={user.level} />
              {user.restricted && <span className="chip bg-coral-100 text-coral-700">⚠ 受限</span>}
            </div>
            <p className="text-sm text-ink-500 mt-1">{user.bio}</p>
            <div className="text-xs text-ink-400 mt-2 flex flex-wrap gap-x-3 gap-y-1">
              <span>📍 {user.city}</span>
              <span>🗣 {user.languages.join(' / ')}</span>
              {user.communityIds.map(cid => {
                const c = state.communities.find(x => x.id === cid)
                return c ? <Link key={cid} to={`/circle/${cid}`} className="text-violet-600">{c.emoji} {c.name}</Link> : null
              })}
            </div>
          </div>
          {!isMe && (
            <div className="flex gap-2">
              <button className={`btn ${state.following.includes(user.id) ? 'btn-outline' : 'btn-primary'}`} onClick={() => actions.toggleFollow(user.id)}>
                {state.following.includes(user.id) ? '已关注' : '＋ 关注'}
              </button>
              <button className="btn-outline" onClick={() => nav(`/messages/${actions.startDM(user.id)}`)}>私信</button>
              <button className="btn-ghost !px-2" title={blocked ? '取消屏蔽' : '屏蔽'} onClick={() => blocked ? actions.unblockUser(user.id) : actions.blockUser(user.id)}>{blocked ? '🔓' : '🚫'}</button>
              <button className="btn-ghost !px-2" title="举报" onClick={() => setReport(true)}>🚩</button>
            </div>
          )}
          {isMe && <Link to="/trust" className="btn-outline">管理认证</Link>}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="space-y-4">
          {/* 我可以提供的帮助 */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3">🤲 {isMe ? '我' : 'TA'} 可以帮助</h3>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {user.skills.map(s => <span key={s} className="chip bg-leaf-50 text-leaf-600">{s}</span>)}
              {user.skills.length === 0 && <span className="text-xs text-ink-300">还没有添加技能</span>}
            </div>
            {user.offerCards.length > 0 && (
              <div className="space-y-2">
                {user.offerCards.map(c => (
                  <div key={c} className="bg-cream-100 rounded-xl px-4 py-3 text-sm flex items-center justify-between gap-3">
                    <span>💡 {c}</span>
                    {!isMe && <button className="btn-secondary !py-1 !px-3 !text-xs shrink-0" onClick={() => nav(`/messages/${actions.startDM(user.id)}`)}>联系 TA</button>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 需要的帮助 */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3">🙋 {isMe ? '我' : 'TA'} 需要的帮助</h3>
            {myNeeds.length === 0
              ? <span className="text-xs text-ink-300">目前没有进行中的请求</span>
              : myNeeds.map(t => (
                <Link key={t.id} to={`/task/${t.id}`} className="flex items-center justify-between py-2.5 border-b border-cream-200 last:border-0 hover:text-coral-600 transition">
                  <span className="text-sm">{t.images[0]} {t.title}</span>
                  <Points value={t.points} size="sm" />
                </Link>
              ))}
          </div>

          {/* 收到的评价 */}
          {publicReviews.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold mb-3">⭐ 收到的评价</h3>
              <div className="space-y-3">
                {publicReviews.map(r => (
                  <div key={r.id} className="bg-cream-100 rounded-xl p-3 text-sm">
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {r.onTime && <span className="chip bg-leaf-50 text-leaf-600">准时</span>}
                      {r.fulfilled && <span className="chip bg-leaf-50 text-leaf-600">完成约定</span>}
                      {r.wouldRepeat && <span className="chip bg-violet-100 text-violet-600">愿意再次合作</span>}
                    </div>
                    <p className="text-ink-500 text-xs">{r.note}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 近期内容 */}
          {posts.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">近期内容</h3>
              <div className="masonry columns-2">
                {posts.slice(0, 6).map(p => <PostCard key={p.id} post={p} />)}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <TrustPassport user={user} />
          <div className="card p-4 text-xs text-ink-400">
            已完成 {completed.length} 次可见互助 · 加入于 {user.joinedAt.slice(0, 10)}
          </div>
        </div>
      </div>
      <ReportModal open={report} onClose={() => setReport(false)} targetType="user" targetId={user.id} />
    </div>
  )
}
