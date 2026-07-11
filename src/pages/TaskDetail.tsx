import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore, useCurrentUser } from '../lib/store'
import { TrustPassport, UserRow } from '../components/cards'
import { Avatar, CategoryChip, Empty, LevelBadge, Modal, Points, StatusBadge, TierBadge, fmtDate } from '../components/ui'
import type { Review, Task } from '../lib/types'

export default function TaskDetail() {
  const { id } = useParams()
  const { state, actions } = useStore()
  const me = useCurrentUser()
  const task = state.tasks.find(t => t.id === id)
  const [modal, setModal] = useState<'' | 'apply' | 'cancel' | 'dispute' | 'evidence' | 'review' | 'story' | 'report' | 'confirm'>('')

  const publisher = state.users.find(u => u.id === task?.publisherId)
  const helper = state.users.find(u => u.id === task?.helperId)
  const dispute = state.disputes.find(d => d.taskId === id)

  if (!task || !me) return <Empty text="任务不存在" />
  const isPublisher = task.publisherId === me.id
  const isHelper = task.helperId === me.id
  const myApplication = task.applicants.find(a => a.userId === me.id)
  const canApply = ['open', 'applied'].includes(task.status) && !isPublisher && !myApplication
  const active = ['matched', 'starting_soon', 'in_progress', 'pending_confirm'].includes(task.status)
  const myReview = task.reviews.find(r => r.fromId === me.id)
  const theirReview = task.reviews.find(r => r.toId === me.id)

  if (task.status === 'blocked' && !isPublisher) return <Empty icon="🚫" text="该任务未通过安全审核,已被阻止展示。" />

  return (
    <div className="max-w-4xl mx-auto grid lg:grid-cols-[1fr_320px] gap-5 items-start">
      <div className="space-y-4">
        {/* 被阻止提示(发布者可见) */}
        {task.status === 'blocked' && (
          <div className="card p-5 border-l-4 border-ink-700 fade-up">
            <div className="font-semibold mb-1">🚫 该任务已被安全审核阻止</div>
            <p className="text-sm text-ink-500">{task.blockReason}</p>
            <p className="text-xs text-ink-300 mt-2">风险标记:{task.riskFlags.join('、')} · 修改积分或措辞无法绕过审核。如有异议可前往安全中心申诉。</p>
          </div>
        )}

        {/* 主卡 */}
        <div className="card p-6 fade-up">
          <div className="flex items-start justify-between gap-3 mb-3">
            <h1 className="text-xl font-semibold leading-snug">{task.images.join(' ')} {task.title}</h1>
            <Points value={task.points} size="lg" />
          </div>
          <div className="flex flex-wrap gap-1.5 mb-4">
            <StatusBadge status={task.status} />
            <CategoryChip cat={task.category} />
            <TierBadge tier={task.riskTier} />
            <span className="chip bg-cream-200 text-ink-500">{task.online ? '💻 线上' : task.publicPlace ? '🏞 公共场所' : '🏠 上门'}</span>
            {task.riskFlags.map(f => <span key={f} className="chip bg-amber-100 text-amber-600">⚠ {f}</span>)}
          </div>
          <p className="text-[15px] text-ink-700 leading-relaxed whitespace-pre-line mb-5">{task.description}</p>
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <Info label="🗓 时间" value={`${fmtDate(task.date, task.startTime)} · 约 ${task.durationMin >= 60 ? `${task.durationMin / 60} 小时` : `${task.durationMin} 分钟`}`} />
            <Info label="📍 地点" value={`${task.locationText}${!task.online && task.distanceKm > 0 ? ` · 距你约 ${task.distanceKm} km` : ''}`} />
            <Info label="✅ 完成标准" value={task.doneCriteria} />
            <Info label="🎯 所需技能" value={task.skillsRequired.length ? task.skillsRequired.join('、') : '无特殊要求'} />
            <Info label="👥 人数" value={`${task.headcount} 人`} />
            <Info label="↩️ 取消规则" value={task.cancelPolicy} />
          </div>
          {!task.online && (
            <p className="text-[11px] text-ink-300 mt-4 pt-3 border-t border-cream-200">
              🔒 仅显示大致位置。精确地点在匹配后、且任务确实需要时才会告知帮助者。
            </p>
          )}
        </div>

        {/* 争议面板 */}
        {dispute && (isPublisher || isHelper) && <DisputePanel taskId={task.id} />}

        {/* 执行面板 */}
        {active && (isPublisher || isHelper) && (
          <ExecutionPanel task={task} isPublisher={isPublisher} onConfirm={() => setModal('confirm')} onDispute={() => setModal('dispute')} />
        )}

        {/* 申请列表(发布者) */}
        {isPublisher && ['open', 'applied'].includes(task.status) && (
          <div className="card p-5">
            <h3 className="font-semibold mb-3">收到的申请({task.applicants.filter(a => a.status === 'pending').length})</h3>
            {task.applicants.filter(a => a.status === 'pending').length === 0 && (
              <p className="text-sm text-ink-400">还没有人申请。任务已对{{ all: '所有人', nearby: '附近用户', community: '所在社区', followers: '关注者', invited: '受邀者' }[task.visibility]}可见,匹配的成员会收到推荐。</p>
            )}
            <div className="space-y-4">
              {task.applicants.filter(a => a.status === 'pending').map(a => {
                const u = state.users.find(x => x.id === a.userId)!
                return (
                  <div key={a.id} className="border border-cream-200 rounded-xl p-4">
                    <UserRow user={u} extra={
                      <div className="text-right text-xs text-ink-400 shrink-0">
                        <div>帮助过 {u.stats.helped} 次</div>
                        <div>准时 {u.stats.onTimeRate}% · 取消 {u.stats.cancelRate}%</div>
                      </div>
                    } />
                    <div className="mt-3 text-sm bg-cream-100 rounded-lg p-3 space-y-1">
                      <div><span className="text-ink-400">介绍:</span>{a.intro}</div>
                      <div><span className="text-ink-400">为什么适合:</span>{a.why}</div>
                      <div><span className="text-ink-400">可用时间:</span>{a.availability}{a.hasEquipment && ' · 自带所需设备'}</div>
                      {a.question && <div><span className="text-ink-400">提问:</span>{a.question}</div>}
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link to={`/user/${u.id}`} className="btn-outline !py-1.5 flex-1">查看主页</Link>
                      <button className="btn-primary !py-1.5 flex-1" onClick={() => {
                        const res = actions.selectHelper(task.id, u.id)
                        if (!res.ok) alert(res.reason)
                      }}>选择 TA(托管 {task.points + task.serviceFee} pt)</button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 评价区 */}
        {task.status === 'completed' && (isPublisher || isHelper) && (
          <div className="card p-5">
            <h3 className="font-semibold mb-3">双向评价</h3>
            {!myReview
              ? <button className="btn-primary" onClick={() => setModal('review')}>写下你的评价</button>
              : !myReview.published
                ? <p className="text-sm text-ink-400">✓ 你已完成评价。评价将在双方都提交后(或评价期结束时)同时公开,避免互相影响。</p>
                : null}
            {theirReview?.published && (
              <div className="mt-3 bg-cream-100 rounded-xl p-4 text-sm space-y-1">
                <div className="font-medium">{state.users.find(u => u.id === theirReview.fromId)?.name} 对你的评价:</div>
                <div className="flex flex-wrap gap-1.5 my-2">
                  <span className={`chip ${theirReview.onTime ? 'bg-leaf-50 text-leaf-600' : 'bg-coral-100 text-coral-600'}`}>{theirReview.onTime ? '✓ 准时' : '未准时'}</span>
                  <span className={`chip ${theirReview.fulfilled ? 'bg-leaf-50 text-leaf-600' : 'bg-coral-100 text-coral-600'}`}>{theirReview.fulfilled ? '✓ 完成约定' : '未完成约定'}</span>
                  <span className="chip bg-cream-200 text-ink-500">沟通 {theirReview.clearComm}/5</span>
                  <span className="chip bg-cream-200 text-ink-500">尊重边界 {theirReview.respectBoundary}/5</span>
                  <span className={`chip ${theirReview.wouldRepeat ? 'bg-violet-100 text-violet-600' : 'bg-cream-200 text-ink-400'}`}>{theirReview.wouldRepeat ? '💜 愿意再次合作' : '暂不考虑再合作'}</span>
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
      </div>

      {/* 侧栏 */}
      <div className="space-y-4">
        <div className="card p-5">
          <div className="flex items-center gap-3 mb-3">
            <Avatar user={publisher} size={44} />
            <div>
              <Link to={`/user/${publisher?.id}`} className="font-medium text-sm">{publisher?.name}</Link>
              <div className="mt-0.5"><LevelBadge level={publisher?.level ?? 0} short /></div>
            </div>
          </div>
          <p className="text-xs text-ink-400 mb-3">{publisher?.bio}</p>
          {publisher && <TrustPassport user={publisher} compact />}
        </div>

        {canApply && (
          <button className="btn-primary w-full !py-3 !text-base" onClick={() => setModal('apply')}>🙋 申请提供帮助</button>
        )}
        {myApplication?.status === 'pending' && (
          <div className="card p-4 text-sm text-ink-500">✓ 已申请,等待发布者选择。你的介绍:「{myApplication.intro}」</div>
        )}
        {task.chatId && (isPublisher || isHelper) && (
          <Link to={`/messages/${task.chatId}`} className="btn-green w-full !py-3">💬 打开任务聊天</Link>
        )}
        {helper && (isPublisher || isHelper) && (
          <div className="card p-4">
            <div className="text-xs text-ink-400 mb-2">帮助者</div>
            <UserRow user={helper} />
          </div>
        )}
        {active && (isPublisher || isHelper) && (
          <div>
            <button className="btn-danger w-full" onClick={() => setModal('cancel')}>取消任务</button>
            {task.status === 'pending_confirm' && (
              <p className="text-[11px] text-amber-600 mt-1.5 text-center">⚠ 帮助者已提交完成,此时取消将按临近取消补偿处理</p>
            )}
          </div>
        )}
        {!isPublisher && (
          <button className="btn-ghost w-full" onClick={() => setModal('report')}>🚩 举报该任务</button>
        )}
        {active && (
          <div className="card p-4 text-xs text-ink-400 leading-relaxed">
            🛡️ <span className="font-medium text-ink-500">安全提醒:</span>首次合作建议选择公共场所;可在安全中心把任务分享给可信联系人;任何要求垫付现金、购买礼品卡的行为都是诈骗。
          </div>
        )}
      </div>

      {/* ===== 弹窗们 ===== */}
      <ApplyModal open={modal === 'apply'} onClose={() => setModal('')} task={task} />
      <CancelModal open={modal === 'cancel'} onClose={() => setModal('')} task={task} />
      <ConfirmModal open={modal === 'confirm'} onClose={() => setModal('')} task={task} onDispute={() => setModal('dispute')} />
      <DisputeModal open={modal === 'dispute'} onClose={() => setModal('')} task={task} />
      <ReviewModal open={modal === 'review'} onClose={() => setModal('')} task={task} />
      <StoryModal open={modal === 'story'} onClose={() => setModal('')} task={task} />
      <ReportModal open={modal === 'report'} onClose={() => setModal('')} targetType="task" targetId={task.id} />
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cream-100 rounded-xl p-3">
      <div className="text-[11px] text-ink-400 mb-0.5">{label}</div>
      <div className="text-sm text-ink-700">{value}</div>
    </div>
  )
}

// ============ 执行面板 ============
function ExecutionPanel({ task, isPublisher, onConfirm, onDispute }: { task: Task; isPublisher: boolean; onConfirm: () => void; onDispute: () => void }) {
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
    <div className="card p-5 border-l-4 border-coral-400">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">任务执行</h3>
        <StatusBadge status={task.status} />
      </div>

      {(task.status === 'matched' || task.status === 'starting_soon') && (
        <div>
          <p className="text-sm text-ink-500 mb-3">积分已托管锁定({task.points} pt + {task.serviceFee} pt 服务积分)。到达约定时间后,双方确认开始。</p>
          <div className="flex items-center gap-3 mb-4 bg-cream-100 rounded-xl p-3">
            <div className="text-2xl font-mono font-bold tracking-widest text-ink-700">{code}</div>
            <div className="text-xs text-ink-400">一次性开始验证码 · 线下见面时互相核对,或双方各自点击开始</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button className="btn-primary" onClick={() => actions.startTask(task.id)}>▶ 确认开始任务</button>
            <Link to="/safety" className="btn-outline">分享给可信联系人</Link>
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
            <button className="btn-outline">🟢 我很安全(定时确认)</button>
            <Link to="/safety" className="btn-outline">⚠ 请求平台帮助</Link>
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
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-500">✓ 你已提交完成,等待发布者确认。确认后 {task.points} pt 将进入你的账户。</p>
          )}
        </div>
      )}
    </div>
  )
}

// ============ 申请弹窗 ============
function ApplyModal({ open, onClose, task }: { open: boolean; onClose: () => void; task: Task }) {
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const [intro, setIntro] = useState('')
  const [why, setWhy] = useState('')
  const [avail, setAvail] = useState('约定时间都可以')
  const [equip, setEquip] = useState(false)
  const [question, setQuestion] = useState('')

  const levelNeed = task.riskTier === 'T2' ? 2 : task.riskTier === 'T1' ? 1 : 0
  const levelOk = me.level >= levelNeed
  void state

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
            onClose()
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
        <button className="w-full btn-green !py-3" onClick={() => { actions.confirmComplete(task.id, 'done'); onClose() }}>
          ✓ 确认完成 — 释放 {task.points} pt 给帮助者
        </button>
        <button className="w-full btn-outline !py-3" onClick={() => { actions.confirmComplete(task.id, 'partial'); onClose() }}>
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
    <div className="card p-5 border-l-4 border-amber-500">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">⚖️ 争议处理</h3>
        <span className="chip bg-amber-100 text-amber-600">{{ open: '等待双方陈述', reviewing: '人工审核中', resolved: '已裁决', appealed: '申诉中', closed: '已结案' }[d.status]}</span>
      </div>
      <div className="text-sm text-ink-500 space-y-2">
        <div><span className="text-ink-400">原因:</span>{d.reason} · 托管积分已冻结</div>
        {d.claimA && <div className="bg-cream-100 rounded-lg p-3"><b>发布者陈述:</b>{d.claimA}</div>}
        {d.claimB && <div className="bg-cream-100 rounded-lg p-3"><b>帮助者陈述:</b>{d.claimB}</div>}
        {d.aiSummary && <div className="bg-violet-50 rounded-lg p-3 text-xs"><b>🤖 AI 中立摘要(仅供人工参考):</b>{d.aiSummary}</div>}
        {d.evidence.length > 0 && (
          <div>
            <div className="text-xs text-ink-400 mb-1">已提交证据:</div>
            {d.evidence.map((e, i) => (
              <div key={i} className="text-xs bg-cream-100 rounded-lg p-2 mb-1">
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
              <input className="input" placeholder="补充你的陈述" value={statement} onChange={e => setStatement(e.target.value)} />
              <button className="btn-outline shrink-0" disabled={!statement.trim()} onClick={() => { actions.addDisputeStatement(d.id, me.id, statement.trim()); setStatement('') }}>提交陈述</button>
            </div>
          )}
          <div className="flex gap-2">
            <input className="input" placeholder="提交证据(描述聊天记录/照片内容)" value={evidence} onChange={e => setEvidence(e.target.value)} />
            <button className="btn-outline shrink-0" disabled={!evidence.trim()} onClick={() => { actions.addEvidence(d.id, me.id, evidence.trim(), 'other'); setEvidence('') }}>提交证据</button>
          </div>
          <p className="text-[11px] text-ink-300">证据提交后进入人工审核。管理员将在后台作出积分处理决定。</p>
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
              <input className="input" placeholder="如不认同,可提交一次申诉" value={appeal} onChange={e => setAppeal(e.target.value)} />
              <button className="btn-outline shrink-0" disabled={!appeal.trim()} onClick={() => { actions.appealDispute(d.id, me.id, appeal.trim()); setAppeal('') }}>申诉</button>
            </div>
          )}
        </div>
      )}
      {d.status === 'appealed' && <p className="text-sm text-amber-600 mt-3">申诉已提交,等待复核。</p>}
      {d.status === 'closed' && d.appeal?.result && (
        <div className="bg-cream-100 rounded-xl p-3 text-sm mt-3"><b>申诉结果:</b>{d.appeal.result}</div>
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
        <button className="btn-primary w-full" onClick={() => { actions.submitReview(task.id, r); onClose() }}>提交评价</button>
      </div>
    </Modal>
  )
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1">
        <button className={`chip cursor-pointer ${value ? 'bg-leaf-500 text-white' : 'bg-cream-200 text-ink-400'}`} onClick={() => onChange(true)}>是</button>
        <button className={`chip cursor-pointer ${!value ? 'bg-coral-500 text-white' : 'bg-cream-200 text-ink-400'}`} onClick={() => onChange(false)}>否</button>
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
          <button key={i} className="text-lg cursor-pointer" onClick={() => onChange(i)}>{i <= value ? '★' : '☆'}</button>
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
          onClose(); nav('/')
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
        <button className="btn-danger w-full" onClick={() => { actions.report(targetType, targetId, reason, detail); onClose() }}>提交举报</button>
        <p className="text-[11px] text-ink-300 text-center">经核实的高质量安全举报会获得积分感谢</p>
      </div>
    </Modal>
  )
}
