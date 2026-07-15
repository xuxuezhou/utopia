import { Link, useNavigate } from 'react-router-dom'
import { Heart, X } from 'lucide-react'
import type { Task, ContentPost, User, Ad } from '../lib/types'
import { useStore } from '../lib/store'
import { Avatar, Cover, LevelBadge, Points, PlusBadge, PromoTag, VerifyDot, fmtDate, fmtTime, toast } from './ui'

// ============ 任务卡(小红书式:封面 / 两行标题 / 作者行+积分 / 灰色元信息) ============
// promoted:该任务处于付费/补贴加速中 —— 必须明确标注,不得伪装成自然推荐
export function TaskCard({ task, promoted = false }: { task: Task; promoted?: boolean }) {
  const { state } = useStore()
  const nav = useNavigate()
  const publisher = state.users.find(u => u.id === task.publisherId)
  const applying = task.applicants.filter(a => a.status === 'pending').length
  const showStatus = !['open', 'applied'].includes(task.status)

  return (
    <div className="cursor-pointer card-hover fade-up" onClick={() => nav(`/task/${task.id}`)}>
      <Cover seed={task.id} emoji={task.images[0] ?? '🤝'} hue={(task.id.charCodeAt(1) * 47) % 360}>
        <span className="absolute left-2 top-2 chip bg-white/85 text-ink-500 backdrop-blur !px-2">{task.online ? '线上' : '求助'}</span>
        {showStatus && (
          <span className="absolute right-2 top-2 chip bg-black/45 text-white backdrop-blur !px-2">
            {{ matched: '已匹配', starting_soon: '即将开始', in_progress: '进行中', pending_confirm: '待确认', completed: '已完成', cancelled: '已取消', disputed: '争议中', blocked: '已下架' }[task.status as string]}
          </span>
        )}
        {promoted && <span className="absolute left-2 bottom-2 chip bg-white/90 text-ink-400 backdrop-blur !px-1.5 !py-0 !text-[10px]">推广</span>}
      </Cover>
      <div className="pt-2 px-0.5">
        <h3 className="text-[14px] leading-[1.35] font-medium text-ink-900 line-clamp-2">{task.title}</h3>
        <div className="flex items-center gap-1.5 mt-2">
          <Avatar user={publisher} size={20} link={false} />
          <span className="text-xs text-ink-500 truncate">{publisher?.name}</span>
          {publisher && <VerifyDot level={publisher.level} />}
          <PlusBadge user={publisher} />
          <span className="flex-1" />
          <Points value={task.points} size="sm" />
        </div>
        <div className="text-xs text-ink-300 mt-1">
          {!task.online && task.distanceKm > 0 && `${task.distanceKm} km · `}
          {fmtDate(task.date, task.startTime)}
          {applying > 0 && ` · ${applying}人想帮`}
        </div>
      </div>
    </div>
  )
}

// ============ 本地广告卡:明确标注「广告」,可一键减少此类内容 ============
export function AdCard({ ad }: { ad: Ad }) {
  const { actions } = useStore()
  return (
    <div className="fade-up">
      <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '4/5', background: `linear-gradient(160deg, oklch(0.97 0.02 ${ad.hue}), oklch(0.92 0.05 ${(ad.hue + 30) % 360}))` }}>
        <div className="absolute inset-0 flex items-center justify-center text-5xl">{ad.emoji}</div>
        <span className="absolute left-2 top-2"><PromoTag text="广告" /></span>
        <button
          className="absolute right-1.5 top-1.5 w-6 h-6 rounded-full bg-white/70 text-ink-400 flex items-center justify-center cursor-pointer"
          aria-label="减少此类广告"
          onClick={e => { e.stopPropagation(); actions.hideAdCategory(ad.category); toast(`已减少「${ad.category}」类广告`) }}
        ><X size={13} strokeWidth={2} /></button>
      </div>
      <div className="pt-2 px-0.5">
        <h3 className="text-[14px] leading-[1.35] font-medium text-ink-900 line-clamp-2">{ad.title}</h3>
        <p className="text-xs text-ink-400 mt-1 line-clamp-2">{ad.body}</p>
        <div className="text-xs text-ink-300 mt-1.5">{ad.advertiser} · {ad.category}</div>
      </div>
    </div>
  )
}

// ============ 内容卡 ============
export function PostCard({ post }: { post: ContentPost }) {
  const { state, actions } = useStore()
  const nav = useNavigate()
  const author = state.users.find(u => u.id === post.authorId)

  return (
    <div className="cursor-pointer card-hover fade-up" onClick={() => nav(`/post/${post.id}`)}>
      <Cover seed={post.id} emoji={post.coverEmoji} hue={post.coverHue}>
        {post.taskId && <span className="absolute left-2 top-2 chip bg-white/85 text-leaf-600 backdrop-blur !px-2">✓ 真实互助</span>}
      </Cover>
      <div className="pt-2 px-0.5">
        <h3 className="text-[14px] leading-[1.35] font-medium text-ink-900 line-clamp-2">{post.title}</h3>
        <div className="flex items-center gap-1.5 mt-2">
          <Avatar user={author} size={20} link={false} />
          <span className="text-xs text-ink-500 truncate">{author?.name}</span>
          {author && <VerifyDot level={author.level} />}
          <PlusBadge user={author} />
          <span className="flex-1" />
          <button
            className={`flex items-center gap-1 text-xs cursor-pointer ${post.likedByMe ? 'text-coral-500' : 'text-ink-400'}`}
            onClick={e => { e.stopPropagation(); actions.toggleReaction(post.id, 'like') }}
          >
            <Heart size={14} className={post.likedByMe ? 'fill-coral-500 like-pop' : ''} strokeWidth={1.8} />
            {post.likes}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ 信任护照(详情/认证页使用) ============
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
    <div className={compact ? '' : 'card p-5'}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[15px]">信任护照</h3>
        <LevelBadge level={user.level} />
      </div>
      <div className="flex flex-wrap gap-1.5 mb-4">
        <span className={`chip ${v.phone ? 'bg-leaf-50 text-leaf-600' : 'bg-cream-100 text-ink-300'}`}>{v.phone ? '✓' : '○'} 手机已验证</span>
        <span className={`chip ${v.identity ? 'bg-leaf-50 text-leaf-600' : 'bg-cream-100 text-ink-300'}`}>{v.identity ? '✓' : '○'} 身份已验证</span>
        <span className={`chip ${v.community ? 'bg-leaf-50 text-leaf-600' : 'bg-cream-100 text-ink-300'}`}>{v.community ? '✓' : '○'} 社区已验证</span>
        {v.skill.map(s => <span key={s} className="chip bg-violet-50 text-violet-600">★ {s}(已验证)</span>)}
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
          为保护隐私,身份证件、精确地址、积分余额与位置历史不会向其他用户公开。
        </p>
      )}
    </div>
  )
}

// ============ 用户行 ============
export function UserRow({ user, extra, onClick }: { user: User; extra?: React.ReactNode; onClick?: () => void }) {
  const inner = (
    <div className="flex items-center gap-3">
      <Avatar user={user} size={40} link={false} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="font-medium text-sm">{user.name}</span>
          <VerifyDot level={user.level} />
          <PlusBadge user={user} />
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
