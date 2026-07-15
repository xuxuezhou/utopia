import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Heart, Star, Search, HandHeart } from 'lucide-react'
import { useStore, useCurrentUser, nowISO } from '../lib/store'
import { AdCard, PostCard, TaskCard } from '../components/cards'
import { Avatar, Empty, VerifyDot, fmtTime, toast } from '../components/ui'
import { PROMO_INTERVAL, hasPlusBenefits } from '../lib/monetize'
import type { Ad, ContentPost, Task, TaskCategory } from '../lib/types'

type FeedItem =
  | { kind: 'post'; post: ContentPost; at: string }
  | { kind: 'task'; task: Task; at: string; promoted?: boolean }
  | { kind: 'ad'; ad: Ad }

const CHANNELS: { key: string; label: string; cats?: TaskCategory[]; postTags?: string[] }[] = [
  { key: 'rec', label: '推荐' },
  { key: 'urgent', label: '即时帮助', cats: ['errand', 'digital', 'moving', 'other'] },
  { key: 'sports', label: '运动', cats: ['sports'] },
  { key: 'company', label: '陪伴', cats: ['chat', 'companion'] },
  { key: 'study', label: '学习', cats: ['tutoring', 'language'] },
  { key: 'errand', label: '跑腿', cats: ['errand', 'moving'] },
  { key: 'pet', label: '宠物', cats: ['pet'] },
  { key: 'skill', label: '技能', cats: ['photography', 'digital', 'installation'] },
  { key: 'community', label: '社区', cats: ['newcomer', 'community'] },
  { key: 'charity', label: '公益', cats: ['community'] },
]

export default function Feed() {
  const { state } = useStore()
  const me = useCurrentUser()
  const nav = useNavigate()
  const [tab, setTab] = useState<'follow' | 'discover' | 'nearby'>('discover')
  const [channel, setChannel] = useState('rec')

  const items = useMemo<FeedItem[]>(() => {
    const ch = CHANNELS.find(c => c.key === channel)!
    const openTasks = state.tasks.filter(t => ['open', 'applied'].includes(t.status))
    const posts = state.posts

    let list: FeedItem[] = []
    if (tab === 'follow') {
      list = [
        ...posts.filter(p => state.following.includes(p.authorId)).map(p => ({ kind: 'post' as const, post: p, at: p.createdAt })),
        ...openTasks.filter(t => state.following.includes(t.publisherId)).map(t => ({ kind: 'task' as const, task: t, at: t.createdAt })),
      ]
    } else if (tab === 'nearby') {
      list = openTasks
        .slice().sort((a, b) => (a.online ? 99 : a.distanceKm) - (b.online ? 99 : b.distanceKm))
        .map(t => ({ kind: 'task' as const, task: t, at: t.createdAt }))
    } else {
      list = [
        ...posts.map(p => ({ kind: 'post' as const, post: p, at: p.createdAt })),
        ...openTasks.map(t => ({ kind: 'task' as const, task: t, at: t.createdAt })),
      ].sort((a, b) => b.at.localeCompare(a.at))
    }

    if (ch.cats) {
      list = list.filter(it => it.kind !== 'task'
        ? (it.kind === 'post' && (ch.key === 'community' ? !!it.post.communityId : ch.key === 'skill' ? it.post.kind === 'skill' : ch.key === 'charity' ? it.post.kind === 'event' : false))
        : ch.cats!.includes(it.task.category))
    }

    // ---- 推广位注入(只在「发现·推荐」;关注/附近/垂直频道保持纯自然内容) ----
    // 规则:每 PROMO_INTERVAL 张内容最多 1 个推广位;明确标注;同一发布者不连续;
    // 用户可减少推广密度;Plus 会员基本无广告;隐藏类目的广告不出现。
    if (tab === 'discover' && channel === 'rec') {
      const prefs = me?.adPrefs
      const now = nowISO()
      const interval = prefs?.reducePromos ? PROMO_INTERVAL * 2 : PROMO_INTERVAL

      // 加速中的任务:从自然位置提出,插入推广位并标注(不重复出现)
      const boostedIds = state.boosts.filter(b => b.expiresAt > now).map(b => b.taskId)
      const boostedItems: FeedItem[] = []
      const seenPublisher = new Set<string>()
      for (const id of boostedIds) {
        const idx = list.findIndex(it => it.kind === 'task' && it.task.id === id)
        if (idx < 0) continue
        const it = list[idx] as Extract<FeedItem, { kind: 'task' }>
        if (seenPublisher.has(it.task.publisherId)) continue // 同一发布者不占多个推广位
        seenPublisher.add(it.task.publisherId)
        list.splice(idx, 1)
        boostedItems.push({ ...it, promoted: true })
      }

      // 本地广告:Plus/Pro 几乎无广告;尊重隐藏类目
      const ads: FeedItem[] = hasPlusBenefits(me) ? [] :
        state.ads.filter(a => !prefs?.hiddenAdCategories?.includes(a.category)).map(ad => ({ kind: 'ad' as const, ad }))

      // 交替填充推广位:加速任务优先,其后广告
      const promoQueue: FeedItem[] = []
      const maxLen = Math.max(boostedItems.length, ads.length)
      for (let i = 0; i < maxLen; i++) {
        if (boostedItems[i]) promoQueue.push(boostedItems[i])
        if (ads[i]) promoQueue.push(ads[i])
      }
      let pos = 4 // 首个推广位不占首屏最顶部
      for (const promo of promoQueue) {
        if (pos > list.length) break
        list.splice(pos, 0, promo)
        pos += interval + 1
      }
    }
    return list
  }, [state.tasks, state.posts, state.following, state.boosts, state.ads, me, tab, channel])

  return (
    <div className="-mt-1">
      {/* 移动端顶栏:文字 Tab + 搜索 */}
      <div className="md:hidden sticky top-[var(--safe-top)] z-30 bg-white/95 backdrop-blur -mx-3 px-3" data-tour="feed-tabs">
        <div className="flex items-center h-11">
          <div className="flex-1 flex items-center justify-center gap-7">
            {([['follow', '关注'], ['discover', '发现'], ['nearby', '附近']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`relative py-2 text-[16px] cursor-pointer transition-colors ${tab === k ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}>
                {label}
                {tab === k && <span className="absolute left-1/2 -translate-x-1/2 bottom-0.5 w-5 h-[3px] rounded-full bg-coral-500" />}
              </button>
            ))}
          </div>
          <button className="p-2 text-ink-700 cursor-pointer" data-tour="nav-search" onClick={() => nav('/search')} aria-label="搜索">
            <Search size={20} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* 桌面端 Tab */}
      <div className="hidden md:flex items-center gap-6 mb-1" data-tour="feed-tabs">
        {([['follow', '关注'], ['discover', '发现'], ['nearby', '附近']] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`relative pb-2 text-[17px] cursor-pointer transition-colors ${tab === k ? 'text-ink-900 font-semibold' : 'text-ink-400 hover:text-ink-600'}`}>
            {label}
            {tab === k && <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-5 h-[3px] rounded-full bg-coral-500" />}
          </button>
        ))}
      </div>

      {/* 频道 */}
      <div className="flex gap-5 overflow-x-auto no-scrollbar py-2.5 mb-1 -mx-3 px-3 md:mx-0 md:px-0">
        {CHANNELS.map(c => (
          <button key={c.key} onClick={() => setChannel(c.key)}
            className={`shrink-0 text-sm cursor-pointer transition-colors ${channel === c.key ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <Empty icon={tab === 'follow' ? '👀' : '🌿'} text={tab === 'follow' ? '关注一些有意思的邻居,这里就会热闹起来。' : '这个频道暂时安静,换一个看看。'} />
      ) : (
        <div className="masonry columns-2 md:columns-3 lg:columns-4 xl:columns-5">
          {items.map(it => it.kind === 'post'
            ? <PostCard key={`p${it.post.id}`} post={it.post} />
            : it.kind === 'ad'
              ? <AdCard key={`ad${it.ad.id}`} ad={it.ad} />
              : <TaskCard key={`t${it.task.id}`} task={it.task} promoted={it.promoted} />)}
        </div>
      )}
    </div>
  )
}

// ============ 内容详情(小红书式笔记页) ============
export function PostDetail() {
  const { id } = useParams()
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const nav = useNavigate()
  const [comment, setComment] = useState('')
  const post = state.posts.find(p => p.id === id)
  if (!post) return <Empty text="内容不存在或已删除" />
  const author = state.users.find(u => u.id === post.authorId)
  const task = state.tasks.find(t => t.id === post.taskId)
  const community = state.communities.find(c => c.id === post.communityId)
  const following = author ? state.following.includes(author.id) : false

  return (
    <div className="max-w-xl mx-auto pb-20">
      {/* 封面 */}
      <div className="-mx-3 md:mx-0 relative">
        <PostCover post={post} />
        <button className="absolute left-3 top-3 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center cursor-pointer backdrop-blur" onClick={() => nav(-1)}>←</button>
        <span className="absolute right-3 top-3 chip bg-black/35 text-white backdrop-blur">1 / 1</span>
      </div>

      {/* 作者行 */}
      <div className="flex items-center gap-2.5 py-3.5">
        <Avatar user={author} size={38} />
        <div className="flex-1 min-w-0">
          <Link to={`/user/${author?.id}`} className="text-sm font-medium text-ink-900 flex items-center gap-1">
            {author?.name} {author && <VerifyDot level={author.level} />}
          </Link>
          <div className="text-xs text-ink-300">{community ? `${community.name} · ` : ''}{fmtTime(post.createdAt)}</div>
        </div>
        {author && state.currentUserId !== author.id && (
          <button className={`btn !py-1.5 !px-4 !text-[13px] ${following ? 'bg-cream-100 text-ink-400' : 'border border-coral-500 text-coral-500 hover:bg-coral-50'}`}
            onClick={() => { actions.toggleFollow(author.id); toast(following ? '已取消关注' : '已关注') }}>
            {following ? '已关注' : '关注'}
          </button>
        )}
      </div>

      <h1 className="text-[19px] font-semibold text-ink-900 leading-snug mb-2">{post.title}</h1>
      <p className="text-[15px] text-ink-700 leading-[1.7] whitespace-pre-line">{post.body}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-sm text-violet-500">
        {post.tags.map(t => <span key={t}>#{t}</span>)}
      </div>

      {task && (
        <Link to={`/task/${task.id}`} className="flex items-center gap-2 mt-4 bg-cream-100 rounded-xl px-4 py-3 text-sm text-ink-700 hover:bg-cream-200 transition">
          <HandHeart size={17} className="text-leaf-500" strokeWidth={1.8} />
          来源于真实完成的互助:「{task.title}」<span className="text-coral-500 font-medium ml-auto shrink-0">{task.points} pt</span>
        </Link>
      )}

      {/* 社区活动:报名(所有人)+ 签到管理(Pro 组织者) */}
      {post.kind === 'event' && <EventPanel post={post} me={me} />}

      {/* 互动行 */}
      <div className="flex items-center gap-6 py-4 border-b border-cream-200 text-sm text-ink-500">
        <button className="flex items-center gap-1.5 cursor-pointer" onClick={() => actions.toggleReaction(post.id, 'like')}>
          <Heart size={19} strokeWidth={1.8} className={post.likedByMe ? 'fill-coral-500 text-coral-500 like-pop' : ''} /> {post.likes}
        </button>
        <button className="flex items-center gap-1.5 cursor-pointer" onClick={() => { actions.toggleReaction(post.id, 'save'); if (!post.savedByMe) toast('已收藏') }}>
          <Star size={19} strokeWidth={1.8} className={post.savedByMe ? 'fill-amber-500 text-amber-500' : ''} /> {post.saves}
        </button>
        <button className="flex items-center gap-1.5 cursor-pointer" onClick={() => { actions.toggleReaction(post.id, 'thank'); if (!post.thankedByMe) toast('已感谢') }}>
          🙏 {post.thanks}
        </button>
      </div>

      {/* 评论 */}
      <div className="py-4">
        <div className="text-sm text-ink-400 mb-4">共 {post.comments.length} 条评论</div>
        <div className="space-y-4 mb-5">
          {post.comments.map(c => {
            const u = state.users.find(x => x.id === c.userId)
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar user={u} size={32} />
                <div className="min-w-0">
                  <div className="text-xs text-ink-400">{u?.name}</div>
                  <div className="text-sm text-ink-700 mt-0.5 leading-relaxed">{c.text}</div>
                  <div className="text-[11px] text-ink-300 mt-1">{fmtTime(c.createdAt)}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2">
          <input className="input !rounded-full" placeholder="说点温暖的话…" value={comment} onChange={e => setComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) { actions.addComment(post.id, comment.trim()); setComment('') } }} />
          <button className="btn-primary shrink-0" disabled={!comment.trim()} onClick={() => { actions.addComment(post.id, comment.trim()); setComment('') }}>发送</button>
        </div>
      </div>
    </div>
  )
}

// 社区活动面板:报名对所有人开放;报名名单与签到是 Pro 组织者工具
function EventPanel({ post, me }: { post: ContentPost; me: NonNullable<ReturnType<typeof useCurrentUser>> }) {
  const { state, actions } = useStore()
  const attendees = post.attendees ?? []
  const checkedIn = post.checkedIn ?? []
  const joined = attendees.includes(me.id)
  const isOrganizer = post.authorId === me.id

  return (
    <div className="mt-4 bg-cream-50 rounded-2xl p-4">
      <div className="flex items-center gap-2.5">
        <div className="flex -space-x-2">
          {attendees.slice(0, 5).map(uid => <Avatar key={uid} user={state.users.find(u => u.id === uid)} size={26} link={false} />)}
        </div>
        <span className="text-sm text-ink-500">{attendees.length > 0 ? `${attendees.length} 人已报名` : '还没有人报名,来做第一个吧'}</span>
        <span className="flex-1" />
        {!isOrganizer && (
          <button className={`!py-1.5 !px-4 !text-[13px] ${joined ? 'btn bg-cream-200 text-ink-500' : 'btn-primary'}`}
            onClick={() => { actions.toggleAttend(post.id); toast(joined ? '已取消报名' : '报名成功 🙌') }}>
            {joined ? '已报名' : '报名参加'}
          </button>
        )}
      </div>
      {isOrganizer && attendees.length > 0 && (
        me.pro?.active ? (
          <div className="mt-3 pt-3 border-t border-cream-200">
            <div className="text-xs text-ink-400 mb-2">报名名单与签到 <span className="chip !py-0 !px-1.5 !text-[10px] bg-ink-900 text-white">Pro</span> · 已签到 {checkedIn.length}/{attendees.length}</div>
            <div className="space-y-1.5">
              {attendees.map(uid => {
                const u = state.users.find(x => x.id === uid)
                const ok = checkedIn.includes(uid)
                return (
                  <label key={uid} className="flex items-center gap-2.5 cursor-pointer text-sm">
                    <input type="checkbox" className="accent-leaf-500 w-4 h-4" checked={ok} onChange={() => actions.toggleCheckIn(post.id, uid)} />
                    <Avatar user={u} size={24} link={false} />
                    <span className={ok ? 'text-ink-400 line-through' : 'text-ink-700'}>{u?.name}</span>
                    {ok && <span className="text-[11px] text-leaf-600">✓ 已签到</span>}
                  </label>
                )
              })}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-ink-300 mt-3 pt-3 border-t border-cream-200">
            🔒 报名名单与现场签到是 <Link to="/plus" className="text-violet-600">Utopia Pro</Link> 的活动组织工具。
          </p>
        )
      )}
    </div>
  )
}

function PostCover({ post }: { post: ContentPost }) {
  const [broken, setBroken] = useState(false)
  return (
    <div className="relative w-full overflow-hidden md:rounded-2xl bg-cream-100" style={{ aspectRatio: '4/3' }}>
      {!broken
        ? <img src={`https://picsum.photos/seed/utopia-${post.id}/800/600`} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => setBroken(true)} />
        : <div className="absolute inset-0 flex items-center justify-center text-7xl" style={{ background: `linear-gradient(160deg, oklch(0.97 0.02 ${post.coverHue}), oklch(0.93 0.04 ${(post.coverHue + 30) % 360}))` }}>{post.coverEmoji}</div>}
    </div>
  )
}
