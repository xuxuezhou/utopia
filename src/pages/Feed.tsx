import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useStore } from '../lib/store'
import { PostCard, TaskCard } from '../components/cards'
import { Avatar, Empty, fmtTime } from '../components/ui'

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'story', label: '互助故事' },
  { key: 'event', label: '社区活动' },
  { key: 'skill', label: '技能分享' },
  { key: 'thanks', label: '感谢笔记' },
  { key: 'guide', label: '生活指南' },
]

export default function Feed() {
  const { state } = useStore()
  const [tab, setTab] = useState<'discover' | 'nearby'>('discover')
  const [filter, setFilter] = useState('all')

  const posts = useMemo(() => {
    let list = state.posts
    if (filter !== 'all') list = list.filter(p => p.kind === filter || (filter === 'story' && p.kind === 'milestone'))
    return list
  }, [state.posts, filter])

  const nearbyTasks = useMemo(() =>
    state.tasks.filter(t => ['open', 'applied'].includes(t.status) && t.publisherId !== state.currentUserId),
  [state.tasks, state.currentUserId])

  return (
    <div>
      {/* Tab 切换 */}
      <div className="flex items-center gap-6 mb-5">
        {([['discover', '发现'], ['nearby', '附近互助']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`text-lg font-semibold pb-1 border-b-2 transition cursor-pointer ${tab === k ? 'text-ink-900 border-coral-500' : 'text-ink-300 border-transparent hover:text-ink-500'}`}>
            {label}
          </button>
        ))}
        <div className="flex-1" />
        {tab === 'discover' && (
          <div className="hidden sm:flex gap-1.5">
            {FILTERS.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)}
                className={`chip cursor-pointer ${filter === f.key ? 'bg-ink-900 text-white' : 'bg-white text-ink-500 hover:bg-cream-200'}`}>{f.label}</button>
            ))}
          </div>
        )}
      </div>

      {tab === 'discover' ? (
        <div className="masonry columns-2 md:columns-3 lg:columns-4">
          {posts.map(p => <PostCard key={p.id} post={p} />)}
        </div>
      ) : (
        <div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyTasks.map(t => <TaskCard key={t.id} task={t} />)}
          </div>
          <div className="text-center mt-6">
            <Link to="/nearby" className="btn-outline">查看全部附近任务 →</Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ============ 内容详情 ============
export function PostDetail() {
  const { id } = useParams()
  const { state, actions } = useStore()
  const [comment, setComment] = useState('')
  const post = state.posts.find(p => p.id === id)
  if (!post) return <Empty text="内容不存在或已删除" />
  const author = state.users.find(u => u.id === post.authorId)
  const task = state.tasks.find(t => t.id === post.taskId)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="card overflow-hidden fade-up">
        <div className="h-52 flex items-center justify-center text-8xl"
          style={{ background: `linear-gradient(135deg, oklch(0.95 0.04 ${post.coverHue}), oklch(0.9 0.06 ${(post.coverHue + 40) % 360}))` }}>
          {post.coverEmoji}
        </div>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Avatar user={author} size={40} />
            <div className="flex-1">
              <Link to={`/user/${author?.id}`} className="font-medium text-sm">{author?.name}</Link>
              <div className="text-xs text-ink-300">{fmtTime(post.createdAt)}</div>
            </div>
            {author && state.currentUserId !== author.id && (
              <button className={`btn ${state.following.includes(author.id) ? 'btn-outline' : 'btn-secondary'} !py-1 !px-3 !text-xs`}
                onClick={() => actions.toggleFollow(author.id)}>
                {state.following.includes(author.id) ? '已关注' : '＋ 关注'}
              </button>
            )}
          </div>
          <h1 className="text-xl font-semibold mb-3">{post.title}</h1>
          <p className="text-[15px] text-ink-700 leading-relaxed whitespace-pre-line">{post.body}</p>
          {task && (
            <Link to={`/task/${task.id}`} className="block mt-4 p-3 rounded-xl bg-leaf-50 text-sm hover:bg-leaf-100 transition">
              ✓ 来源于真实完成的互助任务:「{task.title}」({task.points} pt)
            </Link>
          )}
          <div className="flex flex-wrap gap-1.5 mt-4">
            {post.tags.map(t => <span key={t} className="chip bg-cream-200 text-ink-400"># {t}</span>)}
          </div>
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-cream-200 text-sm">
            <button className="cursor-pointer hover:scale-105 transition" onClick={() => actions.toggleReaction(post.id, 'like')}>
              {post.likedByMe ? '❤️' : '🤍'} 点赞 {post.likes}
            </button>
            <button className="cursor-pointer hover:scale-105 transition" onClick={() => actions.toggleReaction(post.id, 'save')}>
              {post.savedByMe ? '⭐' : '☆'} 收藏 {post.saves}
            </button>
            <button className="cursor-pointer hover:scale-105 transition" onClick={() => actions.toggleReaction(post.id, 'thank')}>
              🙏 感谢 {post.thanks}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-5 mt-4">
        <h3 className="font-semibold text-sm mb-3">评论 {post.comments.length}</h3>
        <div className="space-y-3 mb-4">
          {post.comments.map(c => {
            const u = state.users.find(x => x.id === c.userId)
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar user={u} size={30} />
                <div>
                  <div className="text-xs text-ink-400">{u?.name} · {fmtTime(c.createdAt)}</div>
                  <div className="text-sm mt-0.5">{c.text}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2">
          <input className="input" placeholder="说点温暖的话…" value={comment} onChange={e => setComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) { actions.addComment(post.id, comment.trim()); setComment('') } }} />
          <button className="btn-primary" disabled={!comment.trim()} onClick={() => { actions.addComment(post.id, comment.trim()); setComment('') }}>发送</button>
        </div>
      </div>
    </div>
  )
}
