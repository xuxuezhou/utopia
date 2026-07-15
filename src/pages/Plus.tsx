import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, useCurrentUser } from '../lib/store'
import { PLUS_BENEFITS, PLUS_EXCLUSIONS, PLUS_PRICE, PLUS_PROMISE, FREE_CAPABILITIES } from '../lib/monetize'
import { Modal, PlusBadge, toast } from '../components/ui'

export default function Plus() {
  const { actions } = useStore()
  const me = useCurrentUser()!
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [pay, setPay] = useState(false)
  const active = me.plus?.active

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <div className="text-center pt-4">
        <div className="inline-flex items-center gap-2 text-2xl font-bold">
          <svg width="26" height="26" viewBox="0 0 24 24"><path d="M12 2l2.6 6.2 6.7.5-5.1 4.4 1.6 6.6L12 16.2l-5.8 3.5 1.6-6.6-5.1-4.4 6.7-.5z" fill="#FF3B4F" /></svg>
          Utopia Plus
        </div>
        <p className="text-sm text-ink-500 mt-3 leading-relaxed max-w-md mx-auto">{PLUS_PROMISE}</p>
      </div>

      {active ? (
        <div className="card p-5 bg-gradient-to-br from-coral-50 to-white !border-coral-100">
          <div className="flex items-center gap-2 font-semibold">你已是 Plus 会员 <PlusBadge user={me} /></div>
          <div className="text-xs text-ink-400 mt-1">{me.plus!.plan === 'yearly' ? '年付' : '月付'} · 下次续费 {me.plus!.renewsAt} · 本月剩余 Plus 加速额度会显示在任务加速页</div>
          <button className="btn-ghost !py-1.5 !text-xs mt-3" onClick={() => { actions.cancelPlus(); toast('已取消续费,权益保留至本期结束(演示即时生效)') }}>取消订阅</button>
        </div>
      ) : (
        <div className="card p-5">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {(['yearly', 'monthly'] as const).map(p => (
              <button key={p} onClick={() => setPlan(p)}
                className={`rounded-xl border p-4 text-left cursor-pointer transition ${plan === p ? 'border-coral-500 bg-coral-50/50' : 'border-cream-200 hover:border-cream-300'}`}>
                <div className="text-sm font-semibold">{p === 'yearly' ? '年付' : '月付'}</div>
                <div className="text-xl font-bold text-coral-500 mt-1">¥{PLUS_PRICE[p]}<span className="text-xs font-normal text-ink-400">/{p === 'yearly' ? '年' : '月'}</span></div>
                {p === 'yearly' && <div className="text-[11px] text-leaf-600 mt-0.5">相当于 ¥9.8/月</div>}
              </button>
            ))}
          </div>
          <button className="btn-primary w-full" onClick={() => setPay(true)}>开通 Utopia Plus</button>
          <p className="text-[11px] text-ink-300 text-center mt-2">随时可取消 · 用现金支付,与积分完全无关</p>
        </div>
      )}

      <div>
        <h2 className="font-semibold mb-3">Plus 提供的便利</h2>
        <div className="grid sm:grid-cols-2 gap-2.5">
          {PLUS_BENEFITS.map(b => (
            <div key={b.title} className="card p-3.5 flex gap-3">
              <span className="text-xl">{b.icon}</span>
              <span>
                <span className="block text-sm font-medium">{b.title}</span>
                <span className="block text-xs text-ink-400 mt-0.5 leading-relaxed">{b.desc}</span>
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 !border-cream-300">
        <h2 className="font-semibold mb-1">Plus 不会带来的东西</h2>
        <p className="text-xs text-ink-400 mb-3">会员与真实身份认证、社区认证、技能认证完全分开。付费不代表更安全或更可信。</p>
        <ul className="space-y-1.5">
          {PLUS_EXCLUSIONS.map(x => (
            <li key={x} className="text-sm text-ink-500 flex items-center gap-2"><span className="text-ink-300">✕</span>{x}</li>
          ))}
        </ul>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold mb-1">免费用户拥有完整的互助闭环</h2>
        <p className="text-xs text-ink-400 mb-3">这些能力永远免费,不会因为你不付费而被削弱:</p>
        <div className="flex flex-wrap gap-1.5">
          {FREE_CAPABILITIES.map(c => <span key={c} className="chip bg-leaf-50 text-leaf-600">✓ {c}</span>)}
        </div>
        <p className="text-[11px] text-ink-300 mt-3">
          身份认证始终免费 → <Link to="/trust" className="text-violet-600">信任与认证</Link> · 广告偏好可随时调整 → <Link to="/safety" className="text-violet-600">安全中心</Link>
        </p>
      </div>

      <Modal open={pay} onClose={() => setPay(false)} title="确认订阅(演示支付)">
        <p className="text-sm text-ink-500 mb-1">Utopia Plus · {plan === 'yearly' ? `年付 ¥${PLUS_PRICE.yearly}` : `月付 ¥${PLUS_PRICE.monthly}`}</p>
        <p className="text-xs text-ink-400 mb-4 leading-relaxed">现金只用于购买效率工具,不能购买积分、信任分或任何安全权限。这是一次演示支付,不会产生真实扣款。</p>
        <button className="btn-primary w-full" onClick={() => { actions.subscribePlus(plan); setPay(false); toast('欢迎加入 Utopia Plus ✦') }}>确认支付</button>
      </Modal>
    </div>
  )
}
