import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore, poolBalance } from '../lib/store'
import { LEDGER_TYPE_LABEL, type Task } from '../lib/types'
import { Avatar, LevelBadge, Modal, Stat, StatusBadge, TierBadge } from '../components/ui'

const SECTIONS = [
  { key: 'overview', label: '总览', icon: '📊' },
  { key: 'users', label: '用户管理', icon: '👥' },
  { key: 'tasks', label: '任务审核', icon: '📋' },
  { key: 'incidents', label: '安全事件', icon: '🚨' },
  { key: 'reports', label: '举报中心', icon: '🚩' },
  { key: 'disputes', label: '争议处理', icon: '⚖️' },
  { key: 'ledger', label: '积分账本', icon: '📒' },
  { key: 'economy', label: '积分经济', icon: '💠' },
  { key: 'audit', label: '审计日志', icon: '🧾' },
]

export default function Admin() {
  const { section = 'overview' } = useParams()
  const nav = useNavigate()

  return (
    <div className="grid md:grid-cols-[200px_1fr] gap-5 items-start">
      <div className="card p-2 md:sticky md:top-20">
        <div className="px-3 py-2 text-xs font-semibold text-ink-300 uppercase tracking-wide">Utopia Admin</div>
        <div className="flex md:flex-col gap-1 overflow-x-auto">
          {SECTIONS.map(s => (
            <button key={s.key} onClick={() => nav(`/admin/${s.key}`)}
              className={`text-left px-3 py-2 rounded-lg text-sm shrink-0 cursor-pointer transition ${section === s.key ? 'bg-ink-900 text-white' : 'text-ink-500 hover:bg-cream-100'}`}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="min-w-0">
        {section === 'overview' && <Overview />}
        {section === 'users' && <Users />}
        {section === 'tasks' && <Tasks />}
        {section === 'incidents' && <Incidents />}
        {section === 'reports' && <Reports />}
        {section === 'disputes' && <Disputes />}
        {section === 'ledger' && <Ledger />}
        {section === 'economy' && <Economy />}
        {section === 'audit' && <Audit />}
      </div>
    </div>
  )
}

function Overview() {
  const { state } = useStore()
  const tasks = state.tasks
  const done = tasks.filter(t => t.status === 'completed').length
  const matchedPlus = tasks.filter(t => ['matched', 'starting_soon', 'in_progress', 'pending_confirm', 'completed', 'disputed'].includes(t.status)).length
  const published = tasks.filter(t => t.status !== 'blocked').length
  const cancelled = tasks.filter(t => t.status === 'cancelled').length
  const circulating = state.users.reduce((a, u) => a + Math.max(0, state.ledger.reduce((b, e) => b + (e.to === u.id && e.status === 'settled' ? e.amount : 0) - (e.from === u.id ? e.amount : 0), 0)), 0)
  const locked = state.ledger.filter(e => e.status === 'locked' || e.status === 'frozen').reduce((a, e) => a + e.amount, 0)
  const issued = state.ledger.filter(e => e.from === 'sys:issuer').reduce((a, e) => a + e.amount, 0)
  const burned = state.ledger.filter(e => e.to === 'sys:burn').reduce((a, e) => a + e.amount, 0)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-semibold mb-1">北极星指标</h2>
        <div className="card p-5 bg-gradient-to-br from-coral-50 to-cream-50">
          <div className="text-sm text-ink-400">每周成功完成且双方满意的真实互助任务数</div>
          <div className="text-4xl font-bold text-coral-600 mt-1">{done}</div>
          <div className="text-xs text-leaf-600 mt-1">↑ 较上周 +18%(演示数据)</div>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="日活用户" value={state.users.length * 47} sub="DAU(模拟)" />
        <Stat label="新注册" value={Math.round(state.users.length * 3.2)} sub="近7天" />
        <Stat label="发布任务数" value={published} />
        <Stat label="匹配率" value={`${Math.round(matchedPlus / Math.max(published, 1) * 100)}%`} tone="leaf" />
        <Stat label="完成率" value={`${Math.round(done / Math.max(matchedPlus, 1) * 100)}%`} tone="leaf" />
        <Stat label="平均匹配时间" value="3.4h" sub="模拟" />
        <Stat label="取消率" value={`${Math.round(cancelled / Math.max(published, 1) * 100)}%`} tone="amber" />
        <Stat label="争议率" value={`${(state.disputes.length / Math.max(published, 1) * 100).toFixed(1)}%`} tone="amber" />
        <Stat label="安全举报" value={state.reports.length} tone="coral" />
        <Stat label="严重安全事件" value={state.incidents.filter(i => i.severity === 'S3' || i.severity === 'S4').length} tone="coral" />
        <Stat label="流通积分" value={`${circulating} pt`} tone="amber" />
        <Stat label="锁定积分" value={`${locked} pt`} />
        <Stat label="累计发行" value={`${issued} pt`} />
        <Stat label="累计销毁" value={`${burned} pt`} />
      </div>
    </div>
  )
}

function Users() {
  const { state, actions } = useStore()
  const [target, setTarget] = useState('')
  const [amount, setAmount] = useState(0)
  const [basis, setBasis] = useState('')
  const u = state.users.find(x => x.id === target)

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">用户管理({state.users.length})</h2>
      <div className="card divide-y divide-cream-200">
        {state.users.map(user => {
          const taskCount = state.tasks.filter(t => t.publisherId === user.id || t.helperId === user.id).length
          const reportCount = state.reports.filter(r => r.targetType === 'user' && r.targetId === user.id).length
          return (
            <div key={user.id} className="p-4 flex items-center gap-3 flex-wrap">
              <Avatar user={user} size={38} />
              <div className="flex-1 min-w-40">
                <div className="flex items-center gap-2">
                  <Link to={`/user/${user.id}`} className="font-medium text-sm">{user.name}</Link>
                  <LevelBadge level={user.level} short />
                  {user.restricted && <span className="chip bg-coral-100 text-coral-700">受限</span>}
                </div>
                <div className="text-xs text-ink-400 mt-0.5">
                  {taskCount} 个任务 · 被举报 {reportCount} 次 · 取消率 {user.stats.cancelRate}% · {user.communityIds.length} 个社区
                </div>
                {user.restricted && <div className="text-[11px] text-coral-600 mt-0.5">{user.restricted}</div>}
              </div>
              <div className="flex gap-1.5">
                <button className="btn-outline !py-1 !text-xs" onClick={() => setTarget(user.id)}>账本调整</button>
                <button className="btn-danger !py-1 !text-xs" onClick={() => {
                  const note = user.restricted ? '' : prompt('限制说明(留空取消):', '发布高价值任务受限 7 天') ?? ''
                  actions.adminRestrictUser(user.id, note)
                }}>{user.restricted ? '解除限制' : '限制'}</button>
              </div>
            </div>
          )
        })}
      </div>

      <Modal open={!!target} onClose={() => setTarget('')} title={`账本调整 · ${u?.name ?? ''}`}>
        <p className="text-xs text-ink-400 mb-3">管理员不能直接修改余额。此操作会创建一条带审计记录的「人工调整」账本条目。</p>
        <div className="space-y-3">
          <input type="number" className="input" placeholder="调整数量(负数为扣除)" value={amount || ''} onChange={e => setAmount(+e.target.value)} />
          <input className="input" placeholder="依据(必填,将写入审计日志)" value={basis} onChange={e => setBasis(e.target.value)} />
          <button className="btn-primary w-full" disabled={!amount || !basis.trim()} onClick={() => {
            actions.adminAdjustLedger(target, amount, basis.trim())
            setTarget(''); setAmount(0); setBasis('')
          }}>创建账本调整</button>
        </div>
      </Modal>
    </div>
  )
}

function Tasks() {
  const { state, actions } = useStore()
  const [tab, setTab] = useState<'flagged' | 'blocked' | 'all'>('flagged')
  const flagged = state.tasks.filter(t => t.riskFlags.length > 0 && t.status !== 'blocked')
  const blocked = state.tasks.filter(t => t.status === 'blocked')
  const list = tab === 'flagged' ? flagged : tab === 'blocked' ? blocked : state.tasks

  const Row = ({ t }: { t: Task }) => {
    const pub = state.users.find(u => u.id === t.publisherId)
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
          <Link to={`/task/${t.id}`} className="font-medium text-sm">{t.title}</Link>
          <StatusBadge status={t.status} />
          <TierBadge tier={t.riskTier} />
          <span className="text-xs text-amber-600">{t.points} pt</span>
        </div>
        <div className="text-xs text-ink-400 mb-2">发布者 {pub?.name} · {t.date} {t.startTime} · {t.locationText}</div>
        {t.riskFlags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {t.riskFlags.map(f => <span key={f} className="chip bg-coral-100 text-coral-700">⚠ {f}</span>)}
          </div>
        )}
        {t.blockReason && <div className="text-xs bg-cream-100 rounded-lg p-2 mb-2">拦截原因:{t.blockReason}</div>}
        {t.status !== 'blocked' && t.status !== 'completed' && t.status !== 'cancelled' && (
          <button className="btn-danger !py-1 !text-xs" onClick={() => {
            const reason = prompt('下架原因(将通知用户并写入审计日志):', '违反社区安全规则')
            if (reason) actions.adminBlockTask(t.id, reason)
          }}>人工下架</button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold">任务审核</h2>
        <div className="flex gap-1.5">
          {([['flagged', `风险标记 ${flagged.length}`], ['blocked', `已拦截 ${blocked.length}`], ['all', `全部 ${state.tasks.length}`]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} className={`chip cursor-pointer ${tab === k ? 'bg-ink-900 text-white' : 'bg-white text-ink-500'}`}>{l}</button>
          ))}
        </div>
      </div>
      <p className="text-xs text-ink-400">重点:涉及儿童 / 医疗 / 现金 / 驾驶 / 身体接触 / 住宅 / 异常高积分 / 疑似诈骗</p>
      <div className="card divide-y divide-cream-200">
        {list.length === 0 && <div className="p-6 text-sm text-ink-300 text-center">没有需要处理的任务</div>}
        {list.map(t => <Row key={t.id} t={t} />)}
      </div>
    </div>
  )
}

function Incidents() {
  const { state, actions } = useStore()
  const SEV: Record<string, { label: string; cls: string }> = {
    S1: { label: 'S1 体验问题', cls: 'bg-cream-200 text-ink-500' },
    S2: { label: 'S2 平台违规', cls: 'bg-amber-100 text-amber-600' },
    S3: { label: 'S3 严重安全事件', cls: 'bg-coral-100 text-coral-700' },
    S4: { label: 'S4 现实紧急事件', cls: 'bg-ink-700 text-white' },
  }
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">安全事件({state.incidents.filter(i => i.status !== 'resolved').length} 待处理)</h2>
      <div className="card divide-y divide-cream-200">
        {state.incidents.map(i => (
          <div key={i.id} className="p-4">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`chip ${SEV[i.severity].cls}`}>{SEV[i.severity].label}</span>
              <span className={`chip ${i.status === 'resolved' ? 'bg-leaf-50 text-leaf-600' : i.status === 'handling' ? 'bg-amber-100 text-amber-600' : 'bg-coral-100 text-coral-600'}`}>
                {{ open: '待处理', handling: '处理中', resolved: '已解决' }[i.status]}
              </span>
              <span className="text-[10px] text-ink-300">{i.createdAt.replace('T', ' ')}</span>
            </div>
            <div className="text-sm">{i.summary}</div>
            {i.taskId && <Link to={`/task/${i.taskId}`} className="text-xs text-violet-600">→ 关联任务</Link>}
            {i.log.length > 0 && (
              <div className="mt-2 space-y-1">
                {i.log.map((l, idx) => (
                  <div key={idx} className="text-[11px] text-ink-400 bg-cream-100 rounded-lg px-2.5 py-1.5">
                    {l.at.replace('T', ' ')} · {l.admin} · {l.action} · 依据:{l.basis} · {l.notified ? '已通知用户' : '未通知'}
                  </div>
                ))}
              </div>
            )}
            {i.status !== 'resolved' && (
              <div className="flex gap-1.5 mt-2">
                <button className="btn-outline !py-1 !text-xs" onClick={() => {
                  const action = prompt('处理动作:', '已联系双方核实,发出安全提醒')
                  if (action) actions.adminHandleIncident(i.id, action, '社区安全准则 §3', false)
                }}>记录处理</button>
                <button className="btn-green !py-1 !text-xs" onClick={() => {
                  const action = prompt('结案说明:', '核实完毕,风险已消除')
                  if (action) actions.adminHandleIncident(i.id, action, '安全流程 SOP-2', true)
                }}>结案</button>
              </div>
            )}
            {i.severity !== 'S1' && i.status !== 'resolved' && (
              <p className="text-[10px] text-ink-300 mt-1.5">⚠ S2 以上事件必须人工处理;AI 不得独立作出封禁或责任认定。</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Reports() {
  const { state, actions } = useStore()
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">举报中心({state.reports.filter(r => r.status === 'pending').length} 待审核)</h2>
      <div className="card divide-y divide-cream-200">
        {state.reports.map(r => {
          const from = state.users.find(u => u.id === r.fromId)
          return (
            <div key={r.id} className="p-4">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-medium text-sm">{r.reason}</span>
                <span className="chip bg-cream-200 text-ink-500">{{ user: '用户', task: '任务', content: '内容', message: '消息' }[r.targetType]} · {r.targetId}</span>
                <span className={`chip ${r.status === 'verified' ? 'bg-leaf-50 text-leaf-600' : r.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-cream-200 text-ink-400'}`}>
                  {{ pending: '待审核', verified: '已核实', dismissed: '已驳回' }[r.status]}
                </span>
              </div>
              <div className="text-xs text-ink-400">举报人 {from?.name} · {r.detail || '无补充'}</div>
              {r.status === 'pending' && (
                <div className="flex gap-1.5 mt-2">
                  <button className="btn-green !py-1 !text-xs" onClick={() => actions.adminReviewReport(r.id, 'verified')}>核实(+20pt 感谢举报人)</button>
                  <button className="btn-outline !py-1 !text-xs" onClick={() => actions.adminReviewReport(r.id, 'dismissed')}>驳回</button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function Disputes() {
  const { state, actions } = useStore()
  const [active, setActive] = useState('')
  const [toHelper, setToHelper] = useState(0)
  const [note, setNote] = useState('')
  const d = state.disputes.find(x => x.id === active)
  const t = d ? state.tasks.find(x => x.id === d.taskId) : null

  return (
    <div className="space-y-3">
      <h2 className="font-semibold">争议处理({state.disputes.filter(x => x.status === 'open' || x.status === 'reviewing' || x.status === 'appealed').length} 待处理)</h2>
      <div className="card divide-y divide-cream-200">
        {state.disputes.map(dis => {
          const task = state.tasks.find(x => x.id === dis.taskId)
          return (
            <div key={dis.id} className="p-4">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Link to={`/task/${dis.taskId}`} className="font-medium text-sm">{task?.title}</Link>
                <span className={`chip ${dis.status === 'resolved' || dis.status === 'closed' ? 'bg-leaf-50 text-leaf-600' : 'bg-amber-100 text-amber-600'}`}>
                  {{ open: '等待陈述', reviewing: '审核中', resolved: '已裁决', appealed: '申诉中', closed: '已结案' }[dis.status]}
                </span>
                <span className="text-xs text-amber-600">冻结 {task ? task.points + task.serviceFee : 0} pt</span>
              </div>
              <div className="text-xs text-ink-400 mb-1.5">{dis.reason}</div>
              {dis.aiSummary && <div className="text-xs bg-violet-50 rounded-lg p-2.5 mb-1.5">🤖 {dis.aiSummary}</div>}
              {dis.claimA && <div className="text-xs bg-cream-100 rounded-lg p-2 mb-1"><b>发布者:</b>{dis.claimA}</div>}
              {dis.claimB && <div className="text-xs bg-cream-100 rounded-lg p-2 mb-1"><b>帮助者:</b>{dis.claimB}</div>}
              {dis.evidence.map((e, i) => (
                <div key={i} className="text-[11px] text-ink-400 mt-1">📎 {state.users.find(u => u.id === e.by)?.name}:{e.text}</div>
              ))}
              {(dis.status === 'open' || dis.status === 'reviewing') && (
                <button className="btn-primary !py-1.5 !text-xs mt-2" onClick={() => { setActive(dis.id); setToHelper(Math.floor((task?.points ?? 0) / 2)); setNote('') }}>作出裁决</button>
              )}
              {dis.status === 'appealed' && (
                <div className="mt-2">
                  <div className="text-xs bg-amber-50 rounded-lg p-2 mb-1.5"><b>申诉:</b>{dis.appeal?.text}</div>
                  <button className="btn-outline !py-1 !text-xs" onClick={() => {
                    const result = prompt('申诉复核结论:', '维持原裁决。已复核证据,原处理符合社区规则。')
                    if (result) actions.resolveAppeal(dis.id, result)
                  }}>复核申诉</button>
                </div>
              )}
              {dis.ruling && <div className="text-xs text-leaf-600 mt-1.5">✓ 裁决:{dis.ruling.note}(帮助者 {dis.ruling.toHelper} pt / 发布者 {dis.ruling.toPublisher} pt)</div>}
            </div>
          )
        })}
      </div>

      <Modal open={!!d && !!t} onClose={() => setActive('')} title="争议裁决">
        {d && t && (
          <div className="space-y-3">
            <p className="text-xs text-ink-400">冻结总额 {t.points + t.serviceFee} pt。裁决将创建带审计记录的账本条目,双方都会收到解释,并可申诉一次。</p>
            <div>
              <label className="label">释放给帮助者:{toHelper} pt</label>
              <input type="range" min={0} max={t.points} step={5} value={toHelper} onChange={e => setToHelper(+e.target.value)} className="w-full accent-coral-500" />
              <div className="text-xs text-ink-400 mt-1">退回发布者:{t.points - toHelper} pt · 服务积分 {t.serviceFee} pt 进入安全补偿池</div>
            </div>
            <textarea className="input" rows={3} placeholder="裁决说明(必填,双方可见)" value={note} onChange={e => setNote(e.target.value)} />
            <button className="btn-primary w-full" disabled={!note.trim()} onClick={() => {
              actions.resolveDispute(d.id, { toHelper, toPublisher: t.points - toHelper, note: note.trim() })
              setActive('')
            }}>确认裁决</button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function Ledger() {
  const { state } = useStore()
  const nameOf = (acc: string) => {
    const sys: Record<string, string> = { 'sys:issuer': '发行', 'sys:escrow': '托管', 'sys:burn': '销毁', 'sys:community_pool': '社区池', 'sys:safety_pool': '安全池' }
    return sys[acc] ?? state.users.find(u => u.id === acc)?.name ?? acc
  }
  const entries = [...state.ledger].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">积分账本({entries.length} 条)</h2>
      <p className="text-xs text-ink-400">账本为追加式记录,管理员只能通过「人工调整」创建新条目,不能修改历史。</p>
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-ink-400 border-b border-cream-200">
              <th className="p-3">交易号</th><th className="p-3">类型</th><th className="p-3">来源→目标</th>
              <th className="p-3 text-right">积分</th><th className="p-3">状态</th><th className="p-3">来源</th><th className="p-3">时间</th><th className="p-3">备注</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cream-200">
            {entries.map(e => (
              <tr key={e.id} className="hover:bg-cream-50">
                <td className="p-3 font-mono text-[10px]">{e.id}</td>
                <td className="p-3">{LEDGER_TYPE_LABEL[e.type]}</td>
                <td className="p-3">{nameOf(e.from)} → {nameOf(e.to)}</td>
                <td className="p-3 text-right font-medium">{e.amount}</td>
                <td className="p-3">
                  <span className={`chip ${e.status === 'settled' ? 'bg-leaf-50 text-leaf-600' : e.status === 'locked' ? 'bg-amber-100 text-amber-600' : e.status === 'frozen' ? 'bg-coral-100 text-coral-600' : 'bg-cream-200 text-ink-400'}`}>
                    {{ settled: '生效', locked: '锁定', frozen: '冻结', reversed: '冲销' }[e.status]}
                  </span>
                </td>
                <td className="p-3">{{ system: '系统', admin: '管理员', user: '用户' }[e.operator]}</td>
                <td className="p-3 whitespace-nowrap">{e.createdAt.slice(5, 16).replace('T', ' ')}</td>
                <td className="p-3 max-w-48 truncate" title={e.memo}>{e.memo}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Economy() {
  const { state } = useStore()
  const issued = state.ledger.filter(e => e.from === 'sys:issuer' && e.status === 'settled').reduce((a, e) => a + e.amount, 0)
  const burned = state.ledger.filter(e => e.to === 'sys:burn').reduce((a, e) => a + e.amount, 0)
  const locked = state.ledger.filter(e => e.status === 'locked' || e.status === 'frozen').reduce((a, e) => a + e.amount, 0)
  const balances = state.users.map(u => Math.max(0, state.ledger.reduce((b, e) => b + (e.to === u.id && e.status === 'settled' ? e.amount : 0) - (e.from === u.id ? e.amount : 0), 0)))
  const circulating = balances.reduce((a, b) => a + b, 0)
  const zero = balances.filter(b => b === 0).length
  const avg = Math.round(circulating / Math.max(balances.length, 1))
  const sorted = [...balances].sort((a, b) => b - a)
  const top20 = sorted.slice(0, Math.ceil(sorted.length * 0.2)).reduce((a, b) => a + b, 0)
  const community = poolBalance(state, 'sys:community_pool')
  const safety = poolBalance(state, 'sys:safety_pool')

  return (
    <div className="space-y-4">
      <h2 className="font-semibold">积分经济</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="总发行量" value={`${issued} pt`} tone="amber" />
        <Stat label="流通量" value={`${circulating} pt`} />
        <Stat label="锁定量" value={`${locked} pt`} sub="托管+冻结" />
        <Stat label="累计销毁" value={`${burned} pt`} tone="coral" />
        <Stat label="社区关怀池" value={`${Math.max(community, 0)} pt`} tone="violet" />
        <Stat label="安全补偿池" value={`${Math.max(safety, 0)} pt`} tone="leaf" />
        <Stat label="用户平均余额" value={`${avg} pt`} />
        <Stat label="零积分用户" value={`${Math.round(zero / Math.max(balances.length, 1) * 100)}%`} />
        <Stat label="积分集中度" value={`${Math.round(top20 / Math.max(circulating, 1) * 100)}%`} sub="Top 20% 持有占比" />
        <Stat label="发行/销毁比" value={burned ? (issued / burned).toFixed(1) : '—'} />
        <Stat label="流通速度" value="0.9/周" sub="模拟" />
        <Stat label="异常循环交易" value="0" tone="leaf" sub="互刷检测(规则引擎)" />
      </div>
      <div className="card p-4 text-xs text-ink-400 leading-relaxed">
        服务积分在任务完成时三路拆分:约 40% 销毁(供应调节)、30% 进入社区关怀池、30% 进入安全补偿池。系统费用不是现金收入,而是积分供应调节机制。
      </div>
    </div>
  )
}

function Audit() {
  const { state } = useStore()
  return (
    <div className="space-y-3">
      <h2 className="font-semibold">审计日志({state.auditLogs.length})</h2>
      <div className="card divide-y divide-cream-200">
        {state.auditLogs.map(l => (
          <div key={l.id} className="p-4 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">{l.action}</span>
              <span className="chip bg-cream-200 text-ink-500">{l.admin}</span>
              <span className="text-[10px] text-ink-300">{l.createdAt.replace('T', ' ')}</span>
            </div>
            <div className="text-xs text-ink-400 mt-1">对象:{l.target} · 依据:{l.basis}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
