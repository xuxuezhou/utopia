import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, useCurrentUser, availablePoints, lockedPoints, pendingPoints, subsidyPoints } from '../lib/store'
import { LEDGER_TYPE_LABEL } from '../lib/types'
import { Modal } from '../components/ui'

export default function Points() {
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const [donate, setDonate] = useState(false)
  const [amount, setAmount] = useState(10)
  const [filter, setFilter] = useState<'all' | 'in' | 'out'>('all')

  const entries = useMemo(() =>
    state.ledger.filter(e => e.from === me.id || e.to === me.id)
      .filter(e => filter === 'all' || (filter === 'in' ? e.to === me.id : e.from === me.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  [state.ledger, me.id, filter])

  const nameOf = (acc: string) => {
    if (acc === me.id) return '我'
    const sys: Record<string, string> = {
      'sys:issuer': 'Utopia 发行', 'sys:escrow': '平台托管', 'sys:burn': '积分销毁',
      'sys:community_pool': '社区关怀池', 'sys:safety_pool': '安全补偿池',
    }
    return sys[acc] ?? state.users.find(u => u.id === acc)?.name ?? acc
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-xl font-semibold mb-5">积分中心</h1>

      <div className="card p-6 mb-4 bg-gradient-to-br from-coral-50 to-white !border-coral-100">
        <div className="text-sm text-ink-400 mb-1">Utopia Points</div>
        <div className="text-4xl font-bold text-coral-500">{availablePoints(state, me.id)} <span className="text-lg font-medium">pt</span></div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div><div className="text-xs text-ink-400">锁定积分</div><div className="font-semibold">{lockedPoints(state, me.id)} pt</div></div>
          <div><div className="text-xs text-ink-400">待结算</div><div className="font-semibold text-leaf-600">{pendingPoints(state, me.id)} pt</div></div>
          <div><div className="text-xs text-ink-400">获得的补贴</div><div className="font-semibold text-violet-600">{subsidyPoints(state, me.id)} pt</div></div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-2">如何获得积分</h3>
          <ul className="text-xs text-ink-400 space-y-1.5 leading-relaxed">
            <li>🤝 完成互助任务与公益任务</li>
            <li>🛡️ 完成身份认证(+100 pt)、首次帮助他人(+100 pt)</li>
            <li>🏘 参加社区互助活动、经核实的安全举报</li>
          </ul>
          <Link to="/nearby" className="btn-secondary w-full mt-3 !py-2">去帮助身边的人</Link>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold text-sm mb-2">帮助链 · 社区关怀池</h3>
          <p className="text-xs text-ink-400 leading-relaxed mb-3">把一小部分积分捐入社区关怀池,用于支持公益任务与需要帮助的成员。A 帮助了 B,B 又帮助了 C——善意会流动。</p>
          <button className="btn-green w-full !py-2" onClick={() => setDonate(true)}>捐入关怀池</button>
        </div>
      </div>

      <div className="card p-3 mb-4 text-[11px] text-ink-300 leading-relaxed">
        ⓘ 积分只能在 Utopia 内使用:不能提现、不能购买、不能兑换现金或加密货币、不能自由转账、不产生利息,也不与任何法定货币固定挂钩。
      </div>

      {/* 账本 */}
      <div className="card">
        <div className="flex items-center justify-between p-4 border-b border-cream-200">
          <h3 className="font-semibold">积分账本</h3>
          <div className="flex gap-1">
            {([['all', '全部'], ['in', '收入'], ['out', '支出']] as const).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`chip cursor-pointer ${filter === k ? 'bg-ink-900 text-white' : 'bg-cream-200 text-ink-500'}`}>{l}</button>
            ))}
          </div>
        </div>
        <div className="divide-y divide-cream-200 max-h-[28rem] overflow-y-auto">
          {entries.map(e => {
            const incoming = e.to === me.id
            const task = e.taskId ? state.tasks.find(t => t.id === e.taskId) : null
            return (
              <div key={e.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{LEDGER_TYPE_LABEL[e.type]}
                    <span className={`chip ml-2 ${e.status === 'settled' ? 'bg-leaf-50 text-leaf-600' : e.status === 'locked' ? 'bg-amber-100 text-amber-600' : e.status === 'frozen' ? 'bg-coral-100 text-coral-600' : 'bg-cream-200 text-ink-400'}`}>
                      {{ settled: '已生效', locked: '锁定中', frozen: '已冻结', reversed: '已冲销' }[e.status]}
                    </span>
                  </div>
                  <div className="text-xs text-ink-400 truncate mt-0.5">
                    {nameOf(e.from)} → {nameOf(e.to)} · {e.memo}
                    {task && <Link to={`/task/${task.id}`} className="text-violet-600"> · {task.title.slice(0, 12)}…</Link>}
                  </div>
                  <div className="text-[10px] text-ink-300 mt-0.5">{e.createdAt.replace('T', ' ')} · 交易号 {e.id}</div>
                </div>
                <div className={`font-semibold shrink-0 ${incoming && e.status === 'settled' ? 'text-leaf-600' : 'text-ink-500'}`}>
                  {incoming ? '+' : '−'}{e.amount} pt
                </div>
              </div>
            )
          })}
          {entries.length === 0 && <div className="p-8 text-center text-sm text-ink-300">暂无记录</div>}
        </div>
      </div>

      <Modal open={donate} onClose={() => setDonate(false)} title="捐入社区关怀池">
        <p className="text-sm text-ink-400 mb-4">关怀池积分由圈子管理员用于发布公益任务与补贴需要帮助的成员,每一笔都有账本记录。</p>
        <div className="flex gap-2 mb-4">
          {[5, 10, 20, 50].map(v => (
            <button key={v} onClick={() => setAmount(v)} className={`chip cursor-pointer !py-2 !px-4 ${amount === v ? 'bg-leaf-500 text-white' : 'bg-cream-200 text-ink-500'}`}>{v} pt</button>
          ))}
        </div>
        <button className="btn-green w-full" onClick={() => {
          if (actions.donateToPool(amount)) setDonate(false)
        }}>确认捐出 {amount} pt</button>
      </Modal>
    </div>
  )
}
