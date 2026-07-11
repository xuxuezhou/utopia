import { Link, useNavigate } from 'react-router-dom'
import type { Task, ContentPost, User } from '../lib/types'
import { useStore } from '../lib/store'
import { Avatar, CategoryChip, LevelBadge, Points, StatusBadge, fmtDate, fmtTime } from './ui'

// ============ 任务卡(附近互助) ============
export function TaskCard({ task }: { task: Task }) {
  const { state } = useStore()
  const nav = useNavigate()
  const publisher = state.users.find(u => u.id === task.publisherId)
  const canApply = ['open', 'applied'].includes(task.status) && task.publisherId !== state.currentUserId

  return (
    <div className="card card-hover p-4 cursor-pointer fade-up" onClick={() => nav(`/task/${task.id}`)}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-semibold text-[15px] leading-snug text-ink-900">{task.images[0]} {task.title}</h3>
        <Points value={task.points} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        <CategoryChip cat={task.category} />
        <span className="chip bg-cream-200 text-ink-500">{task.online ? '💻 线上' : task.publicPlace ? '🏞 公共场所' : '🏠 上门'}</span>
        {task.status !== 'open' && <StatusBadge status={task.status} />}
        {task.riskFlags.slice(0, 1).map(f => <span key={f} className="chip bg-amber-100 text-amber-600">⚠ {f}</span>)}
      </div>
      <div className="text-xs text-ink-400 space-y-1 mb-3">
        <div>🗓 {fmtDate(task.date, task.startTime)} · 约 {task.durationMin >= 60 ? `${task.durationMin / 60} 小时` : `${task.durationMin} 分钟`}</div>
        <div>📍 {task.locationText}{!task.online && task.distanceKm > 0 && ` · 距你约 ${task.distanceKm} km`}</div>
      </div>
      {task.recommendReason && (
        <div className="text-[11px] text-violet-600 bg-violet-50 rounded-lg px-2.5 py-1.5 mb-3">✨ 为什么推荐给我:{task.recommendReason}</div>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-cream-200">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar user={publisher} size={28} link={false} />
          <span className="text-xs text-ink-500 truncate">{publisher?.name}</span>
          {publisher && <LevelBadge level={publisher.level} short />}
        </div>
        <div className="flex items-center gap-2">
          {task.applicants.filter(a => a.status === 'pending').length > 0 && (
            <span className="text-[11px] text-ink-300">{task.applicants.filter(a => a.status === 'pending').length} 人已申请</span>
          )}
          {canApply && <span className="btn-secondary !py-1 !px-3 !text-xs">申请提供帮助</span>}
        </div>
      </div>
    </div>
  )
}

// ============ 内容卡(发现信息流,小红书式) ============
const KIND_LABEL: Record<ContentPost['kind'], string> = {
  story: '互助故事', event: '社区活动', skill: '技能分享', thanks: '感谢笔记', guide: '生活指南', milestone: '里程碑',
}

export function PostCard({ post }: { post: ContentPost }) {
  const { state, actions } = useStore()
  const nav = useNavigate()
  const author = state.users.find(u => u.id === post.authorId)
  const community = state.communities.find(c => c.id === post.communityId)

  return (
    <div className="card card-hover overflow-hidden cursor-pointer fade-up" onClick={() => nav(`/post/${post.id}`)}>
      <div
        className="flex items-center justify-center text-6xl"
        style={{ background: `linear-gradient(135deg, oklch(0.95 0.04 ${post.coverHue}), oklch(0.9 0.06 ${(post.coverHue + 40) % 360}))`, height: 120 + (post.id.charCodeAt(post.id.length - 1) % 4) * 28 }}
      >
        {post.coverEmoji}
      </div>
      <div className="p-3.5">
        <div className="flex gap-1.5 mb-2">
          <span className="chip bg-violet-50 text-violet-600">{KIND_LABEL[post.kind]}</span>
          {post.taskId && <span className="chip bg-leaf-50 text-leaf-600">✓ 真实互助</span>}
        </div>
        <h3 className="font-semibold text-[14px] leading-snug mb-1.5">{post.title}</h3>
        <p className="text-xs text-ink-400 line-clamp-2 mb-3">{post.body}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar user={author} size={22} link={false} />
            <span className="text-xs text-ink-500 truncate">{author?.name}</span>
            {community && <span className="text-[10px] text-ink-300 truncate">· {community.name}</span>}
          </div>
          <div className="flex items-center gap-2.5 text-xs text-ink-300 shrink-0">
            <button className="hover:text-coral-500 cursor-pointer" onClick={e => { e.stopPropagation(); actions.toggleReaction(post.id, 'like') }}>
              {post.likedByMe ? '❤️' : '🤍'} {post.likes}
            </button>
            <button className="hover:text-amber-500 cursor-pointer" onClick={e => { e.stopPropagation(); actions.toggleReaction(post.id, 'thank') }}>
              🙏 {post.thanks}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============ 信任护照 ============
export function TrustPassport({ user, compact = false }: { user: User; compact?: boolean }) {
  const v = user.verifications
  const rows: [string, string][] = [
    ['已完成互助', `${user.stats.helped + user.stats.received} 次`],
    ['帮助他人', `${user.stats.helped} 次`],
    ['获得帮助', `${user.stats.received} 次`],
    ['准时率', `${user.stats.onTimeRate}%`],
    ['取消率', `${user.stats.cancelRate}%`],
    ['重复合作率', `${user.stats.repeatRate}%`],
    ['愿意再次合作', `${user.stats.wouldRepeat}%`],
    ['最近活跃', fmtTime(user.lastActiveAt)],
  ]
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">🛂 信任护照</h3>
        <LevelBadge level={user.level} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className={`chip ${v.phone ? 'bg-leaf-50 text-leaf-600' : 'bg-cream-200 text-ink-300'}`}>{v.phone ? '✓' : '○'} 手机已验证</span>
        <span className={`chip ${v.identity ? 'bg-leaf-50 text-leaf-600' : 'bg-cream-200 text-ink-300'}`}>{v.identity ? '✓' : '○'} 身份已验证</span>
        <span className={`chip ${v.community ? 'bg-leaf-50 text-leaf-600' : 'bg-cream-200 text-ink-300'}`}>{v.community ? '✓' : '○'} 社区已验证</span>
        {v.skill.map(s => <span key={s} className="chip bg-violet-100 text-violet-600">★ {s}(已验证)</span>)}
      </div>
      <div className={`grid ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-4'} gap-3`}>
        {rows.slice(0, compact ? 4 : 8).map(([k, val]) => (
          <div key={k}>
            <div className="text-[11px] text-ink-300">{k}</div>
            <div className="text-sm font-semibold text-ink-700">{val}</div>
          </div>
        ))}
      </div>
      {!compact && (
        <p className="text-[11px] text-ink-300 mt-4 pt-3 border-t border-cream-200">
          🔒 为保护隐私,身份证件、精确地址、积分余额与位置历史不会向其他用户公开。
        </p>
      )}
    </div>
  )
}

// ============ 用户行卡(申请列表等) ============
export function UserRow({ user, extra, onClick }: { user: User; extra?: React.ReactNode; onClick?: () => void }) {
  const inner = (
    <div className="flex items-center gap-3">
      <Avatar user={user} size={40} link={false} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{user.name}</span>
          <LevelBadge level={user.level} short />
        </div>
        <div className="text-xs text-ink-400 truncate">{user.bio}</div>
      </div>
      {extra}
    </div>
  )
  return onClick
    ? <div className="cursor-pointer" onClick={onClick}>{inner}</div>
    : <Link to={`/user/${user.id}`} className="block">{inner}</Link>
}
