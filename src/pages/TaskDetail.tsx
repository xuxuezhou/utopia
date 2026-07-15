import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, Star, MapPin, Share2, Sparkles, Users, CircleCheck, MessageCircle } from 'lucide-react'
import { useStore, useCurrentUser, nowISO } from '../lib/store'
import { TrustPassport, UserRow } from '../components/cards'
import { Avatar, Empty, Modal, PromoTag, StatusBadge, TierBadge, VerifyDot, fmtDate, fmtTime, toast } from '../components/ui'
import { activeBoost, boostEligibility, BOOST_PACKAGES } from '../lib/monetize'
import { CATEGORY_META, type Review, type Task } from '../lib/types'

export default function TaskDetail() {
  const { id } = useParams()
  const { state, actions } = useStore()
  const me = useCurrentUser()
  const nav = useNavigate()
  const [modal, setModal] = useState<'' | 'apply' | 'cancel' | 'dispute' | 'review' | 'story' | 'report' | 'confirm' | 'trust'>('')
  const [comment, setComment] = useState('')
  const [coverBroken, setCoverBroken] = useState(false)

  const task = state.tasks.find(t => t.id === id)
  const publisher = state.users.find(u => u.id === task?.publisherId)
  const helper = state.users.find(u => u.id === task?.helperId)
  const dispute = state.disputes.find(d => d.taskId === id)

  if (!task || !me) return <Empty text="任务不存在" />
  const isPublisher = task.publisherId === me.id
  const isHelper = task.helperId === me.id
  const participant = isPublisher || isHelper
  const myApplication = task.applicants.find(a => a.userId === me.id)
  const canApply = ['open', 'applied'].includes(task.status) && !isPublisher && !myApplication
  const active = ['matched', 'starting_soon', 'in_progress', 'pending_confirm'].includes(task.status)
  const myReview = task.reviews.find(r => r.fromId === me.id)
  const theirReview = task.reviews.find(r => r.toId === me.id)
  const comments = task.comments ?? []
  const saved = (state.savedTasks ?? []).includes(task.id)
  const following = publisher ? state.following.includes(publisher.id) : false
  const pendingApps = task.applicants.filter(a => a.status === 'pending')

  if (task.status === 'blocked' && !isPublisher) return <Empty icon="🚫" text="该任务未通过安全审核,已被阻止展示。" />

  const tags = [
    CATEGORY_META[task.category].label,
    task.online ? '线上互助' : task.locationText.replace(/附近$/, ''),
    ...(task.communityId ? [state.communities.find(c => c.id === task.communityId)?.name ?? ''] : []),
  ].filter(Boolean)

  const shareTask = () => {
    navigator.clipboard?.writeText(location.href).catch(() => {})
    toast('链接已复制')
  }

  return (
    <div className="max-w-xl mx-auto pb-24">
      {/* 封面 */}
      <div className="-mx-3 md:mx-0 relative">
        <div className="relative w-full overflow-hidden md:rounded-2xl bg-cream-100" style={{ aspectRatio: '4/3' }}>
          {!coverBroken
            ? <img src={`https://picsum.photos/seed/utopia-${task.id}/800/600`} alt="" className="absolute inset-0 w-full h-full object-cover" onError={() => setCoverBroken(true)} />
            : <div className="absolute inset-0 flex items-center justify-center text-7xl" style={{ background: `linear-gradient(160deg, oklch(0.97 0.02 ${(task.id.charCodeAt(1) * 47) % 360}), oklch(0.93 0.04 ${(task.id.charCodeAt(1) * 47 + 30) % 360}))` }}>{task.images[0] ?? '🤝'}</div>}
        </div>
        <button className="absolute left-3 top-3 w-8 h-8 rounded-full bg-black/30 text-white flex items-center justify-center cursor-pointer backdrop-blur" onClick={() => nav(-1)}>
          <ArrowLeft size={17} strokeWidth={2} />
        </button>
        <div className="absolute right-3 top-3 flex gap-1.5">
          <span className="chip bg-black/35 text-white backdrop-blur">1 / 1</span>
        </div>
        <div className="absolute left-3 bottom-3 flex gap-1.5">
          <StatusBadge status={task.status} />
          {task.riskFlags.map(f => <span key={f} className="chip bg-black/40 text-amber-100 backdrop-blur">⚠ {f}</span>)}
        </div>
      </div>

      {/* 被阻止(发布者可见) */}
      {task.status === 'blocked' && (
        <div className="mt-4 bg-cream-100 rounded-2xl p-4">
          <div className="font-semibold text-[15px] mb-1">🚫 该任务已被安全审核阻止</div>
          <p className="text-sm text-ink-500">{task.blockReason}</p>
          <p className="text-xs text-ink-300 mt-2">风险标记:{task.riskFlags.join('、')} · 修改积分或措辞无法绕过审核。如有异议可前往安全中心申诉。</p>
        </div>
      )}

      {/* 发布者行 */}
      <div className="flex items-center gap-2.5 py-3.5">
        <Avatar user={publisher} size={38} />
        <div className="flex-1 min-w-0">
          <Link to={`/user/${publisher?.id}`} className="text-sm font-medium text-ink-900 flex items-center gap-1">
            {publisher?.name} {publisher && <VerifyDot level={publisher.level} />}
          </Link>
          <button className="text-xs text-ink-300 cursor-pointer hover:text-ink-500" onClick={() => setModal('trust')}>
            帮助过 {publisher?.stats.helped ?? 0} 次 · 查看信任护照
          </button>
        </div>
        {!isPublisher && publisher && (
          <button className={`btn !py-1.5 !px-4 !text-[13px] ${following ? 'bg-cream-100 text-ink-400' : 'border border-coral-500 text-coral-500 hover:bg-coral-50'}`}
            onClick={() => { actions.toggleFollow(publisher.id); toast(following ? '已取消关注' : '已关注') }}>
            {following ? '已关注' : '关注'}
          </button>
        )}
      </div>

      {/* 标题与正文 */}
      <h1 className="text-[19px] font-semibold text-ink-900 leading-snug mb-2">{task.title}</h1>
      <p className="text-[15px] text-ink-700 leading-[1.7] whitespace-pre-line">{task.description}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-sm text-violet-500">
        {tags.map(t => <span key={t}>#{t}</span>)}
      </div>

      {/* 结构化信息 */}
      <div className="mt-4 bg-cream-100 rounded-xl px-4 py-3.5 space-y-2.5 text-sm text-ink-700" data-tour="task-info">
        <div className="flex items-center gap-2.5"><Calendar size={16} className="text-ink-400 shrink-0" strokeWidth={1.8} />{fmtDate(task.date, task.startTime)} · 约 {task.durationMin >= 60 ? `${task.durationMin / 60} 小时` : `${task.durationMin} 分钟`}</div>
        <div className="flex items-center gap-2.5"><MapPin size={16} className="text-ink-400 shrink-0" strokeWidth={1.8} />{task.online ? '线上进行' : `${task.locationText}${task.distanceKm > 0 ? ` · 距离你 ${task.distanceKm} km` : ''} · ${task.publicPlace ? '公共场所' : '需要上门'}`}</div>
        <div className="flex items-center gap-2.5"><Sparkles size={16} className="text-ink-400 shrink-0" strokeWidth={1.8} /><span className="text-coral-500 font-semibold">{task.points} pt</span><span className="text-ink-300 text-xs">另 {task.serviceFee} pt 服务积分,匹配后一并托管</span></div>
        <div className="flex items-center gap-2.5"><Users size={16} className="text-ink-400 shrink-0" strokeWidth={1.8} />需要 {task.headcount} 人{task.skillsRequired.length > 0 && ` · ${task.skillsRequired.join('、')}`}</div>
        <div className="flex items-center gap-2.5"><CircleCheck size={16} className="text-ink-400 shrink-0" strokeWidth={1.8} />{task.doneCriteria}</div>
        {!task.online && <p className="text-[11px] text-ink-300 pt-1 border-t border-cream-300">仅显示大致位置,精确地点在匹配后按需告知 · {task.cancelPolicy}</p>}
        {task.riskTier !== 'T0' && task.riskTier !== 'T1' && <div className="pt-0.5"><TierBadge tier={task.riskTier} /></div>}
      </div>

      {/* 日历同步(免费):把匹配好的互助写入系统日历 */}
      {participant && active && (
        <div className="mt-3 flex items-center gap-3 text-xs">
          <button className="text-violet-600 cursor-pointer" onClick={() => downloadIcs(task)}>📅 添加到日历(.ics)</button>
          <Link to="/calendar" className="text-ink-400">查看我的日历 →</Link>
        </div>
      )}

      {/* 推广标注与发布者加速入口 */}
      <TaskBoostRow task={task} isPublisher={isPublisher} />

      {/* 申请者预览 / 发布者的申请管理 */}
      {['open', 'applied'].includes(task.status) && !isPublisher && pendingApps.length > 0 && (
        <div className="flex items-center gap-2 mt-4 text-sm text-ink-400">
          <div className="flex -space-x-2">
            {pendingApps.slice(0, 3).map(a => <Avatar key={a.id} user={state.users.find(u => u.id === a.userId)} size={24} link={false} />)}
          </div>
          已有 {pendingApps.length} 人申请
        </div>
      )}

      {isPublisher && ['open', 'applied'].includes(task.status) && (
        <div className="mt-5">
          <h3 className="font-semibold text-[15px] mb-3">收到的申请({pendingApps.length})</h3>
          {pendingApps.length === 0 && (
            <p className="text-sm text-ink-400">还没有人申请。任务已对{{ all: '所有人', nearby: '附近用户', community: '仅所在社区', followers: '仅关注者', invited: '仅受邀者' }[task.visibility]}可见,匹配的成员会收到推荐。</p>
          )}
          <div className="space-y-3">
            {pendingApps.map(a => {
              const u = state.users.find(x => x.id === a.userId)!
              return (
                <div key={a.id} className="bg-cream-50 rounded-2xl p-4">
                  <UserRow user={u} extra={
                    <div className="text-right text-xs text-ink-400 shrink-0">
                      <div>帮助过 {u.stats.helped} 次</div>
                      <div>准时 {u.stats.onTimeRate}%</div>
                    </div>
                  } />
                  <div className="mt-3 text-sm text-ink-700 space-y-1">
                    <div>「{a.intro}」</div>
                    <div className="text-ink-500 text-[13px]">{a.why} · {a.availability}{a.hasEquipment && ' · 自带设备'}</div>
                    {a.question && <div className="text-ink-500 text-[13px]">提问:{a.question}</div>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Link to={`/user/${u.id}`} className="btn-outline !py-1.5 flex-1">查看主页</Link>
                    <button className="btn-primary !py-1.5 flex-1" onClick={() => {
                      const res = actions.selectHelper(task.id, u.id)
                      if (!res.ok) toast(res.reason ?? '操作失败')
                      else toast('已选择,积分已托管')
                    }}>选择 TA(托管 {task.points + task.serviceFee} pt)</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 争议面板 */}
      {dispute && participant && <DisputePanel taskId={task.id} />}

      {/* 执行面板 */}
      {active && participant && (
        <ExecutionPanel task={task} isPublisher={isPublisher} onConfirm={() => setModal('confirm')} onDispute={() => setModal('dispute')} onCancel={() => setModal('cancel')} />
      )}

      {/* 帮助者信息(参与者可见) */}
      {helper && participant && (
        <div className="mt-4 bg-cream-50 rounded-2xl p-4">
          <div className="text-xs text-ink-400 mb-2">帮助者</div>
          <UserRow user={helper} />
        </div>
      )}

      {/* 评价区 */}
      {task.status === 'completed' && participant && (
        <div className="mt-5">
          <h3 className="font-semibold text-[15px] mb-3">双向评价</h3>
          {!myReview
            ? <button className="btn-primary" onClick={() => setModal('review')}>写下你的评价</button>
            : !myReview.published
              ? <p className="text-sm text-ink-400">✓ 你已完成评价。评价将在双方都提交后(或评价期结束时)同时公开,避免互相影响。</p>
              : null}
          {theirReview?.published && (
            <div className="mt-3 bg-cream-50 rounded-2xl p-4 text-sm space-y-1">
              <div className="font-medium">{state.users.find(u => u.id === theirReview.fromId)?.name} 对你的评价:</div>
              <div className="flex flex-wrap gap-1.5 my-2">
                <span className={`chip ${theirReview.onTime ? 'bg-leaf-50 text-leaf-600' : 'bg-coral-50 text-coral-600'}`}>{theirReview.onTime ? '✓ 准时' : '未准时'}</span>
                <span className={`chip ${theirReview.fulfilled ? 'bg-leaf-50 text-leaf-600' : 'bg-coral-50 text-coral-600'}`}>{theirReview.fulfilled ? '✓ 完成约定' : '未完成约定'}</span>
                <span className="chip bg-cream-100 text-ink-500">沟通 {theirReview.clearComm}/5</span>
                <span className="chip bg-cream-100 text-ink-500">尊重边界 {theirReview.respectBoundary}/5</span>
                <span className={`chip ${theirReview.wouldRepeat ? 'bg-violet-50 text-violet-600' : 'bg-cream-100 text-ink-400'}`}>{theirReview.wouldRepeat ? '💜 愿意再次合作' : '暂不考虑再合作'}</span>
              </div>
              <p className="text-ink-500">{theirReview.note}</p>
            </div>
          )}
          {myReview?.published && task.storyId === undefined && (
            <button className="btn-secondary mt-4" onClick={() => setModal('story')}>✍️ 把这次互助发布为故事</button>
          )}
          {task.storyId && <Link to={`/post/${task.storyId}`} className="block text-sm text-coral-500 mt-3">→ 查看这次互助的故事</Link>}
        </div>
      )}

      {/* 评论问答 */}
      <div className="mt-6 pt-4 border-t border-cream-200">
        <div className="text-sm text-ink-400 mb-4">共 {comments.length} 条评论 · 敏感信息请申请后私聊,不要公开电话与精确地址</div>
        <div className="space-y-4">
          {comments.map(c => {
            const u = state.users.find(x => x.id === c.userId)
            return (
              <div key={c.id} className="flex gap-2.5">
                <Avatar user={u} size={32} />
                <div className="min-w-0">
                  <div className="text-xs text-ink-400">{u?.name}{c.userId === task.publisherId && <span className="chip bg-cream-100 text-ink-400 ml-1.5 !text-[10px]">发布者</span>}</div>
                  <div className="text-sm text-ink-700 mt-0.5 leading-relaxed">{c.text}</div>
                  <div className="text-[11px] text-ink-300 mt-1">{fmtTime(c.createdAt)}</div>
                </div>
              </div>
            )
          })}
          {comments.length === 0 && <p className="text-sm text-ink-300 py-3">还没有评论,问问细节吧。</p>}
        </div>
        <button className="text-xs text-ink-300 mt-5 cursor-pointer hover:text-coral-500" onClick={() => setModal('report')}>🚩 举报该任务</button>
      </div>

      {/* 底部固定操作栏 */}
      {task.status !== 'blocked' && (
        <div className="fixed bottom-0 inset-x-0 md:left-56 z-40 bg-white border-t border-cream-200 pb-[var(--safe-bottom)] md:pb-0">
          <div className="max-w-xl mx-auto flex items-center gap-3 px-4 py-2.5">
            <div className="flex-1 flex items-center gap-2 bg-cream-100 rounded-full px-4 py-2">
              <input className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-300" placeholder="想问点什么…"
                value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && comment.trim()) { actions.addTaskComment(task.id, comment.trim()); setComment(''); toast('已发布提问') } }} />
              {comment.trim() && <button className="text-coral-500 text-sm font-medium cursor-pointer" onClick={() => { actions.addTaskComment(task.id, comment.trim()); setComment(''); toast('已发布提问') }}>发送</button>}
            </div>
            <button className="flex flex-col items-center text-ink-500 cursor-pointer" onClick={() => { const on = actions.toggleSaveTask(task.id); toast(on ? '已收藏' : '已取消收藏') }} aria-label="收藏">
              <Star size={21} strokeWidth={1.8} className={saved ? 'fill-amber-500 text-amber-500' : ''} />
            </button>
            <button className="flex flex-col items-center text-ink-500 cursor-pointer" onClick={shareTask} aria-label="分享">
              <Share2 size={20} strokeWidth={1.8} />
            </button>
            {canApply && <button className="btn-primary !px-5 !py-2.5 shrink-0 whitespace-nowrap" onClick={() => setModal('apply')}>申请提供帮助</button>}
            {myApplication?.status === 'pending' && <button className="btn !px-5 !py-2.5 shrink-0 whitespace-nowrap bg-cream-100 text-ink-400" disabled>已申请</button>}
            {participant && task.chatId && <button className="btn-primary !px-5 !py-2.5 shrink-0 whitespace-nowrap" onClick={() => nav(`/messages/${task.chatId}`)}><MessageCircle size={16} strokeWidth={2} /> 任务聊天</button>}
            {!participant && !canApply && !myApplication && ['matched', 'starting_soon', 'in_progress', 'pending_confirm'].includes(task.status) && (
              <button className="btn !px-5 !py-2.5 bg-cream-100 text-ink-400" disabled>已匹配</button>
            )}
            {task.status === 'completed' && participant && !myReview && <button className="btn-primary !px-5 !py-2.5" onClick={() => setModal('review')}>写评价</button>}
          </div>
        </div>
      )}

      {/* ===== 弹窗 ===== */}
      <ApplyModal open={modal === 'apply'} onClose={() => setModal('')} task={task} />
      <CancelModal open={modal === 'cancel'} onClose={() => setModal('')} task={task} />
      <ConfirmModal open={modal === 'confirm'} onClose={() => setModal('')} task={task} onDispute={() => setModal('dispute')} />
      <DisputeModal open={modal === 'dispute'} onClose={() => setModal('')} task={task} />
      <ReviewModal open={modal === 'review'} onClose={() => setModal('')} task={task} />
      <StoryModal open={modal === 'story'} onClose={() => setModal('')} task={task} />
      <ReportModal open={modal === 'report'} onClose={() => setModal('')} targetType="task" targetId={task.id} />
      <Modal open={modal === 'trust'} onClose={() => setModal('')} title={`${publisher?.name} 的信任护照`}>
        {publisher && <TrustPassport user={publisher} compact />}
        <p className="text-[11px] text-ink-300 mt-4">为保护隐私,身份证件、精确地址、积分余额与位置历史不会向其他用户公开。</p>
      </Modal>
    </div>
  )
}

// ============ 日历同步(Plus/Pro 权益):生成 .ics 文件 ============
function downloadIcs(task: Task) {
  const p = (n: number) => String(n).padStart(2, '0')
  const start = `${task.date.replace(/-/g, '')}T${task.startTime.replace(':', '')}00`
  const endDate = new Date(`${task.date}T${task.startTime}:00`)
  endDate.setMinutes(endDate.getMinutes() + task.durationMin)
  const end = `${endDate.getFullYear()}${p(endDate.getMonth() + 1)}${p(endDate.getDate())}T${p(endDate.getHours())}${p(endDate.getMinutes())}00`
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Utopia//Mutual Aid//CN', 'BEGIN:VEVENT',
    `UID:${task.id}@utopia`, `DTSTART:${start}`, `DTEND:${end}`,
    `SUMMARY:Utopia 互助:${task.title}`, `LOCATION:${task.online ? '线上' : task.locationText}`,
    `DESCRIPTION:${task.doneCriteria} · ${task.points} pt`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n')
  const a = document.createElement('a')
  a.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics)
  a.download = `utopia-${task.id}.ics`
  a.click()
  toast('已生成日历文件')
}

// ============ 推广标注 + 发布者加速入口 ============
// 任何生效中的加速对所有用户可见地标注;发布者可见数据与购买入口
function TaskBoostRow({ task, isPublisher }: { task: Task; isPublisher: boolean }) {
  const { state } = useStore()
  const me = useCurrentUser()!
  const boost = activeBoost(state, task.id, nowISO())
  const pkg = boost && BOOST_PACKAGES.find(p => p.id === boost.packageId)
  const canBoost = isPublisher && ['open', 'applied'].includes(task.status) && boostEligibility(state, task, me).ok

  if (boost) {
    return (
      <div className="mt-3 flex items-center gap-2 flex-wrap text-xs text-ink-400">
        <PromoTag text="任务加速" />
        <span>该任务使用了{pkg?.label}{boost.source === 'subsidy' ? '(平台公益补贴)' : ''} · 只扩大合格曝光,不影响匹配与申请规则</span>
        {isPublisher && (
          <Link to="/promo" className="text-violet-600">
            推广数据:自然曝光 {boost.stats.organicViews} · 推广曝光 {boost.stats.boostedViews} · 合格申请 {boost.stats.qualifiedApplicants} →
          </Link>
        )}
      </div>
    )
  }
  if (!canBoost) return null
  return (
    <div className="mt-3 flex items-center justify-between bg-cream-50 rounded-xl px-4 py-3">
      <span className="text-sm text-ink-500">🚀 想让更多合适的人看到?</span>
      <Link to={`/boost/${task.id}`} className="btn-outline !py-1.5 !text-xs shrink-0">任务加速</Link>
    </div>
  )
}

// ============ 执行面板 ============
function ExecutionPanel({ task, isPublisher, onConfirm, onDispute, onCancel }: { task: Task; isPublisher: boolean; onConfirm: () => void; onDispute: () => void; onCancel: () => void }) {
  const { actions } = useStore()
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (task.status !== 'in_progress' || !task.startedAt) return
    const startedAt = task.startedAt
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - new Date(startedAt).getTime()) / 60000)))
    tick()
    const timer = setInterval(tick, 60000)
    return () => clearInterval(timer)
  }, [task.status, task.startedAt])
  const code = useMemo(() => String(((task.id.charCodeAt(1) || 7) * 1237) % 9000 + 1000), [task.id])

  return (
    <div className="mt-5 bg-cream-50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[15px]">任务执行</h3>
        <StatusBadge status={task.status} />
      </div>

      {(task.status === 'matched' || task.status === 'starting_soon') && (
        <div>
          <p className="text-sm text-ink-500 mb-3">积分已托管锁定({task.points} pt + {task.serviceFee} pt 服务积分)。到达约定时间后,双方确认开始。</p>
          <div className="flex items-center gap-3 mb-4 bg-white rounded-xl p-3">
            <div className="text-2xl font-mono font-bold tracking-widest text-ink-700">{code}</div>
            <div className="text-xs text-ink-400">一次性开始验证码 · 线下见面时互相核对,或双方各自点击开始</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn-primary" onClick={() => actions.startTask(task.id)}>确认开始任务</button>
            <Link to="/safety" className="btn-outline">分享给可信联系人</Link>
            <button className="btn-ghost" onClick={onCancel}>取消任务</button>
          </div>
        </div>
      )}

      {task.status === 'in_progress' && (
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-3xl font-mono font-bold text-coral-600">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, '0')}</div>
            <div className="text-xs text-ink-400">已进行时长(时:分)· 约定 {task.durationMin} 分钟</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {!isPublisher && <button className="btn-green" onClick={() => actions.submitComplete(task.id)}>✓ 提交完成</button>}
            {isPublisher && <button className="btn-outline" onClick={() => actions.submitComplete(task.id)}>标记为待确认</button>}
            <button className="btn-outline" onClick={() => toast('已向可信联系人报平安')}>我很安全</button>
            <Link to="/safety" className="btn-outline">请求平台帮助</Link>
            <button className="btn-ghost" onClick={onCancel}>取消任务</button>
          </div>
          <p className="text-[11px] text-ink-300 mt-3">遇到紧急情况请直接拨打当地紧急服务电话(如 110 / 120)。平台客服不是紧急救援机构。</p>
        </div>
      )}

      {task.status === 'pending_confirm' && (
        <div>
          {isPublisher ? (
            <div>
              <p className="text-sm text-ink-500 mb-3">帮助者已提交完成,请确认结果。逾期未响应,低风险任务将自动释放积分。</p>
              <div className="flex gap-2 flex-wrap">
                <button className="btn-green" onClick={onConfirm}>确认结果</button>
                <button className="btn-danger" onClick={onDispute}>发起争议</button>
                <button className="btn-ghost" onClick={onCancel}>取消任务</button>
              </div>
              <p className="text-[11px] text-amber-600 mt-2">⚠ 帮助者已提交完成,此时取消将按临近取消补偿处理</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-ink-500">✓ 你已提交完成,等待发布者确认。确认后 {task.points} pt 将进入你的账户。</p>
              <button className="btn-ghost mt-2" onClick={onCancel}>取消任务</button>
            </div>
          )}
        </div>
      )}
      <p className="text-[11px] text-ink-300 mt-3 pt-3 border-t border-cream-200">
        安全提醒:首次合作建议选择公共场所;任何要求垫付现金、购买礼品卡的行为都是诈骗。
      </p>
    </div>
  )
}

// ============ 申请弹窗 ============
function ApplyModal({ open, onClose, task }: { open: boolean; onClose: () => void; task: Task }) {
  const { actions } = useStore()
  const me = useCurrentUser()!
  const [intro, setIntro] = useState('')
  const [why, setWhy] = useState('')
  const [avail, setAvail] = useState('约定时间都可以')
  const [equip, setEquip] = useState(false)
  const [question, setQuestion] = useState('')

  const levelNeed = task.riskTier === 'T2' ? 2 : task.riskTier === 'T1' ? 1 : 0
  const levelOk = me.level >= levelNeed

  return (
    <Modal open={open} onClose={onClose} title="申请提供帮助">
      {!levelOk ? (
        <div className="text-sm text-ink-500">
          <p>该任务为 {task.riskTier} 级({task.riskTier === 'T2' ? '需较高信任,如宠物照看、进入住宅等' : '公共场所任务'}),需要 <b>Level {levelNeed}</b> 及以上认证。</p>
          <p className="mt-2">你当前是 Level {me.level}。完成{levelNeed === 1 ? '基础实名认证' : '社区验证并积累成功互助记录'}后即可申请。</p>
          <Link to="/trust" className="btn-primary mt-4 w-full" onClick={onClose}>前往信任与认证中心</Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <label className="label">一句话介绍</label>
            <input className="input" placeholder="如:湖畔大学研二,常年打网球" value={intro} onChange={e => setIntro(e.target.value)} />
          </div>
          <div>
            <label className="label">为什么适合这个任务</label>
            <textarea className="input" rows={2} placeholder="说说你的相关经验或技能" value={why} onChange={e => setWhy(e.target.value)} />
          </div>
          <div>
            <label className="label">可用时间</label>
            <input className="input" value={avail} onChange={e => setAvail(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={equip} onChange={e => setEquip(e.target.checked)} className="accent-coral-500" />
            我有任务需要的设备(如球拍、相机、工具)
          </label>
          <div>
            <label className="label">给发布者的问题(可选)</label>
            <input className="input" placeholder="如:场地需要我预订吗?" value={question} onChange={e => setQuestion(e.target.value)} />
          </div>
          <button className="btn-primary w-full !py-3" disabled={!intro.trim() || !why.trim()} onClick={() => {
            actions.applyToTask(task.id, { userId: me.id, intro: intro.trim(), why: why.trim(), availability: avail, hasEquipment: equip, question: question.trim() || undefined })
            onClose(); toast('申请已提交')
          }}>提交申请</button>
          <p className="text-[11px] text-ink-300 text-center">发布者会看到你的信任护照摘要(不含隐私信息)</p>
        </div>
      )}
    </Modal>
  )
}

// ============ 取消弹窗(展示影响) ============
function CancelModal({ open, onClose, task }: { open: boolean; onClose: () => void; task: Task }) {
  const { actions } = useStore()
  const me = useCurrentUser()!
  const nav = useNavigate()
  const [reason, setReason] = useState('')
  const [done, setDone] = useState('')
  const isPublisher = task.publisherId === me.id
  const hours = (new Date(`${task.date}T${task.startTime}:00`).getTime() - Date.now()) / 3600000
  // pending_confirm:对方已交付,取消一律按临近取消补偿处理(与 cancelTask 行为一致)
  const near = hours < 24 || task.status === 'pending_confirm'
  const comp = Math.ceil(task.points * 0.2)

  return (
    <Modal open={open} onClose={onClose} title="取消任务">
      {done ? (
        <div>
          <p className="text-sm text-ink-700 leading-relaxed">{done}</p>
          <button className="btn-primary w-full mt-4" onClick={() => { onClose(); nav('/mytasks') }}>知道了</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="bg-amber-50 rounded-xl p-4 text-sm text-ink-700 leading-relaxed">
            <div className="font-medium mb-1">取消的影响</div>
            {!task.helperId ? '任务尚未匹配,可以直接关闭,没有积分变动。'
              : isPublisher
                ? near
                  ? `${task.status === 'pending_confirm' ? '帮助者已提交完成,此时取消将按临近取消处理' : '距开始不足 24 小时'}:${comp} pt 将补偿给帮助者,其余退回你的账户;你的可靠度会下降,多次临时取消将限制发布高价值任务。${task.status === 'pending_confirm' ? '如对完成结果有异议,建议发起争议而不是取消。' : ''}`
                  : `距开始还有 ${Math.round(hours)} 小时:托管积分将全额退回你的账户。`
                : near
                  ? '临时取消:积分全额退回发布者,你的可靠度将明显降低;多次临时取消或无故未到场会暂时冻结认领权限。'
                  : '提前取消:积分全额退回发布者,对你的可靠度有轻微影响。'}
          </div>
          <div>
            <label className="label">取消原因</label>
            <textarea className="input" rows={2} placeholder="告诉对方原因,是基本的尊重" value={reason} onChange={e => setReason(e.target.value)} />
          </div>
          <button className="btn-danger w-full" disabled={!reason.trim()} onClick={() => {
            const summary = actions.cancelTask(task.id, me.id, reason.trim())
            setDone(summary || '任务已取消。')
          }}>确认取消</button>
        </div>
      )}
    </Modal>
  )
}

// ============ 发布者确认结果 ============
function ConfirmModal({ open, onClose, task, onDispute }: { open: boolean; onClose: () => void; task: Task; onDispute: () => void }) {
  const { actions } = useStore()
  return (
    <Modal open={open} onClose={onClose} title="确认任务结果">
      <p className="text-sm text-ink-500 mb-4">完成标准:{task.doneCriteria}</p>
      <div className="space-y-2">
        <button className="w-full btn-green !py-3" onClick={() => { actions.confirmComplete(task.id, 'done'); onClose(); toast('已确认完成,积分已释放') }}>
          ✓ 确认完成 — 释放 {task.points} pt 给帮助者
        </button>
        <button className="w-full btn-outline !py-3" onClick={() => { actions.confirmComplete(task.id, 'partial'); onClose(); toast('已按部分完成结算') }}>
          ◐ 部分完成 — 释放 {Math.floor(task.points / 2)} pt,其余退回
        </button>
        <button className="w-full btn-danger !py-3" onClick={() => { onClose(); onDispute() }}>
          ✕ 未完成 — 冻结积分并发起争议
        </button>
      </div>
      <p className="text-[11px] text-ink-300 mt-3">确认完成后,{task.serviceFee} pt 服务积分将按规则销毁并进入社区关怀池与安全补偿池。</p>
    </Modal>
  )
}

// ============ 争议弹窗 ============
function DisputeModal({ open, onClose, task }: { open: boolean; onClose: () => void; task: Task }) {
  const { actions } = useStore()
  const me = useCurrentUser()!
  const [reason, setReason] = useState('任务未按约定完成')
  const [claim, setClaim] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="发起争议">
      <div className="space-y-3">
        <div className="bg-coral-50 rounded-xl p-3 text-xs text-ink-500 leading-relaxed">
          发起争议后,托管积分将被冻结。双方可提交陈述与证据,系统会生成中立摘要,由人工审核裁决。裁决支持一次申诉。AI 不会独立作出裁决。
        </div>
        <div>
          <label className="label">争议原因</label>
          <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
            {['任务未按约定完成', '对方未到场', '完成质量与约定不符', '时长与约定不符', '沟通中存在不当行为', '其他'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="label">你的陈述</label>
          <textarea className="input" rows={3} placeholder="客观描述发生了什么" value={claim} onChange={e => setClaim(e.target.value)} />
        </div>
        <button className="btn-danger w-full" disabled={!claim.trim()} onClick={() => {
          actions.openDispute(task.id, me.id, reason, claim.trim())
          onClose()
        }}>冻结积分并提交争议</button>
      </div>
    </Modal>
  )
}

// ============ 争议进行面板 ============
function DisputePanel({ taskId }: { taskId: string }) {
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const [evidence, setEvidence] = useState('')
  const [statement, setStatement] = useState('')
  const [appeal, setAppeal] = useState('')
  const d = state.disputes.find(x => x.taskId === taskId)
  if (!d) return null
  const task = state.tasks.find(t => t.id === taskId)!
  const isPublisher = me.id === task.publisherId
  const myClaim = isPublisher ? d.claimA : d.claimB

  return (
    <div className="mt-5 bg-amber-50 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-[15px]">⚖️ 争议处理</h3>
        <span className="chip bg-white text-amber-600">{{ open: '等待双方陈述', reviewing: '人工审核中', resolved: '已裁决', appealed: '申诉中', closed: '已结案' }[d.status]}</span>
      </div>
      <div className="text-sm text-ink-500 space-y-2">
        <div><span className="text-ink-400">原因:</span>{d.reason} · 托管积分已冻结</div>
        {d.claimA && <div className="bg-white rounded-lg p-3"><b>发布者陈述:</b>{d.claimA}</div>}
        {d.claimB && <div className="bg-white rounded-lg p-3"><b>帮助者陈述:</b>{d.claimB}</div>}
        {d.aiSummary && <div className="bg-violet-50 rounded-lg p-3 text-xs"><b>🤖 AI 中立摘要(仅供人工参考):</b>{d.aiSummary}</div>}
        {d.evidence.length > 0 && (
          <div>
            <div className="text-xs text-ink-400 mb-1">已提交证据:</div>
            {d.evidence.map((e, i) => (
              <div key={i} className="text-xs bg-white rounded-lg p-2 mb-1">
                {{ chat: '💬 聊天记录', photo: '📷 照片', other: '📄 其他' }[e.kind]} · {state.users.find(u => u.id === e.by)?.name}:{e.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {(d.status === 'open' || d.status === 'reviewing') && (
        <div className="mt-4 space-y-2">
          {!myClaim && (
            <div className="flex gap-2">
              <input className="input !bg-white" placeholder="补充你的陈述" value={statement} onChange={e => setStatement(e.target.value)} />
              <button className="btn-outline shrink-0" disabled={!statement.trim()} onClick={() => { actions.addDisputeStatement(d.id, me.id, statement.trim()); setStatement('') }}>提交陈述</button>
            </div>
          )}
          <div className="flex gap-2">
            <input className="input !bg-white" placeholder="提交证据(描述聊天记录/照片内容)" value={evidence} onChange={e => setEvidence(e.target.value)} />
            <button className="btn-outline shrink-0" disabled={!evidence.trim()} onClick={() => { actions.addEvidence(d.id, me.id, evidence.trim(), 'other'); setEvidence('') }}>提交证据</button>
          </div>
          <p className="text-[11px] text-ink-400">证据提交后进入人工审核。管理员将在后台作出积分处理决定。</p>
        </div>
      )}

      {d.status === 'resolved' && d.ruling && (
        <div className="mt-4">
          <div className="bg-leaf-50 rounded-xl p-4 text-sm">
            <div className="font-medium mb-1">裁决结果</div>
            <p className="text-ink-500">{d.ruling.note}</p>
            <p className="text-xs text-ink-400 mt-1">帮助者获得 {d.ruling.toHelper} pt · 发布者退回 {d.ruling.toPublisher} pt · 处理人 {d.ruling.admin}</p>
          </div>
          {!d.appeal && (
            <div className="flex gap-2 mt-3">
              <input className="input !bg-white" placeholder="如不认同,可提交一次申诉" value={appeal} onChange={e => setAppeal(e.target.value)} />
              <button className="btn-outline shrink-0" disabled={!appeal.trim()} onClick={() => { actions.appealDispute(d.id, me.id, appeal.trim()); setAppeal('') }}>申诉</button>
            </div>
          )}
        </div>
      )}
      {d.status === 'appealed' && <p className="text-sm text-amber-600 mt-3">申诉已提交,等待复核。</p>}
      {d.status === 'closed' && d.appeal?.result && (
        <div className="bg-white rounded-xl p-3 text-sm mt-3"><b>申诉结果:</b>{d.appeal.result}</div>
      )}
    </div>
  )
}

// ============ 评价弹窗 ============
function ReviewModal({ open, onClose, task }: { open: boolean; onClose: () => void; task: Task }) {
  const { actions } = useStore()
  const me = useCurrentUser()!
  const toId = task.publisherId === me.id ? task.helperId! : task.publisherId
  const [r, setR] = useState<Omit<Review, 'id' | 'createdAt' | 'published' | 'taskId'>>({
    fromId: me.id, toId, onTime: true, fulfilled: true, clearComm: 5, respectBoundary: 5, wouldRepeat: true, note: '',
  })
  return (
    <Modal open={open} onClose={onClose} title="双向盲评">
      <p className="text-xs text-ink-400 mb-4">评价在双方都提交后同时公开。请只评价与任务相关的表现,不允许评价外貌、种族、性别、宗教、口音、残障等与任务无关的特征。</p>
      <div className="space-y-3">
        <ToggleRow label="是否准时" value={r.onTime} onChange={v => setR({ ...r, onTime: v })} />
        <ToggleRow label="是否完成约定" value={r.fulfilled} onChange={v => setR({ ...r, fulfilled: v })} />
        <RateRow label="沟通是否清楚" value={r.clearComm} onChange={v => setR({ ...r, clearComm: v })} />
        <RateRow label="是否尊重边界" value={r.respectBoundary} onChange={v => setR({ ...r, respectBoundary: v })} />
        <ToggleRow label="愿意再次合作" value={r.wouldRepeat} onChange={v => setR({ ...r, wouldRepeat: v })} />
        <textarea className="input" rows={3} placeholder="补充说明(会公开给对方)" value={r.note} onChange={e => setR({ ...r, note: e.target.value })} />
        <button className="btn-primary w-full" onClick={() => { actions.submitReview(task.id, r); onClose(); toast('评价已提交') }}>提交评价</button>
      </div>
    </Modal>
  )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        <button className={`chip cursor-pointer ${value ? 'bg-leaf-500 text-white' : 'bg-cream-100 text-ink-400'}`} onClick={() => onChange(true)}>是</button>
        <button className={`chip cursor-pointer ${!value ? 'bg-coral-500 text-white' : 'bg-cream-100 text-ink-400'}`} onClick={() => onChange(false)}>否</button>
      </div>
    </div>
  )
}
function RateRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <button key={i} className={`text-lg cursor-pointer ${i <= value ? 'text-amber-500' : 'text-cream-300'}`} onClick={() => onChange(i)}>★</button>
        ))}
      </div>
    </div>
  )
}

// ============ 互助故事弹窗 ============
function StoryModal({ open, onClose, task }: { open: boolean; onClose: () => void; task: Task }) {
  const { actions } = useStore()
  const nav = useNavigate()
  const [title, setTitle] = useState(`一次关于「${task.title.slice(0, 12)}」的互助`)
  const [body, setBody] = useState('')
  const [hideName, setHideName] = useState(true)
  const [agree, setAgree] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title="发布互助故事">
      <div className="space-y-3">
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
        <textarea className="input" rows={4} placeholder="这次互助带给你什么?写下来,让善意被更多人看见。" value={body} onChange={e => setBody(e.target.value)} />
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={hideName} onChange={e => setHideName(e.target.checked)} className="accent-coral-500" />
          隐藏对方姓名与精确位置
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="accent-coral-500" />
          我已获得对方同意发布这段经历
        </label>
        <button className="btn-primary w-full" disabled={!body.trim() || !agree} onClick={() => {
          actions.publishStory(task.id, { title, body: body.trim(), hideName, coverEmoji: task.images[0] || '🤝' })
          onClose(); toast('故事已发布'); nav('/')
        }}>发布到发现页</button>
      </div>
    </Modal>
  )
}

// ============ 举报弹窗(复用) ============
export function ReportModal({ open, onClose, targetType, targetId }: { open: boolean; onClose: () => void; targetType: 'user' | 'task' | 'content' | 'message'; targetId: string }) {
  const { actions } = useStore()
  const [reason, setReason] = useState('疑似诈骗')
  const [detail, setDetail] = useState('')
  return (
    <Modal open={open} onClose={onClose} title="举报">
      <div className="space-y-3">
        <select className="input" value={reason} onChange={e => setReason(e.target.value)}>
          {['疑似诈骗', '骚扰或威胁', '涉及违禁内容', '虚假信息', '泄露他人隐私', '其他安全问题'].map(r => <option key={r}>{r}</option>)}
        </select>
        <textarea className="input" rows={3} placeholder="补充细节,帮助安全团队更快核实" value={detail} onChange={e => setDetail(e.target.value)} />
        <button className="btn-danger w-full" onClick={() => { actions.report(targetType, targetId, reason, detail); onClose(); toast('举报已提交') }}>提交举报</button>
        <p className="text-[11px] text-ink-300 text-center">经核实的高质量安全举报会获得积分感谢</p>
      </div>
    </Modal>
  )
}
