import { useState } from 'react'
import { useStore, useCurrentUser } from '../lib/store'
import { PRO_FEATURES, PRO_EXCLUSIONS, PRO_PRICE } from '../lib/monetize'
import { Modal, toast } from '../components/ui'

// Utopia Pro:面向高频技能贡献者与社区组织者的专业工具
export default function Pro() {
  const { actions } = useStore()
  const me = useCurrentUser()!
  const [pay, setPay] = useState(false)
  const active = me.pro?.active

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <div className="text-center pt-4">
        <div className="text-2xl font-bold">Utopia Pro 💼</div>
        <p className="text-sm text-ink-500 mt-2 leading-relaxed max-w-md mx-auto">
          如果你经常用技能帮助别人,或者在组织社区活动,Pro 帮你把这件事做得更顺手。
        </p>
      </div>

      {active ? (
        <div className="card p-5 bg-gradient-to-br from-violet-50 to-white">
          <div className="font-semibold text-sm">你已开通 Pro · {me.pro!.headline}</div>
          <div className="text-xs text-ink-400 mt-2 space-y-1">
            {me.pro!.weeklySlots.length > 0 && <div>🗓 可用时间:{me.pro!.weeklySlots.join(' / ')}</div>}
            {me.pro!.portfolio.length > 0 && <div>🖼 作品集:{me.pro!.portfolio.join(' · ')}</div>}
            {me.pro!.autoReply && <div>💬 自动回复已开启</div>}
          </div>
          <p className="text-[11px] text-ink-300 mt-3">专业主页展示在你的个人页,内容可随时编辑(演示数据)。</p>
        </div>
      ) : (
        <div className="card p-5 text-center">
          <div className="text-2xl font-bold text-coral-500">¥{PRO_PRICE}<span className="text-sm font-normal text-ink-400">/月</span></div>
          <button className="btn-primary w-full mt-3" onClick={() => setPay(true)}>开通 Utopia Pro</button>
          <p className="text-[11px] text-ink-300 mt-2">随时可取消 · 与积分和信任体系完全无关</p>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-2.5">
        {PRO_FEATURES.map(f => (
          <div key={f.title} className="card p-3.5 flex gap-3">
            <span className="text-xl">{f.icon}</span>
            <span>
              <span className="block text-sm font-medium">{f.title}</span>
              <span className="block text-xs text-ink-400 mt-0.5 leading-relaxed">{f.desc}</span>
            </span>
          </div>
        ))}
      </div>

      <div className="card p-5 !border-cream-300">
        <h2 className="font-semibold text-sm mb-2">Pro 不能做的事</h2>
        <div className="flex flex-wrap gap-1.5">
          {PRO_EXCLUSIONS.map(x => <span key={x} className="chip bg-cream-100 text-ink-500">✕ {x}</span>)}
        </div>
        <p className="text-[11px] text-ink-300 mt-3">你的信任护照、评价与匹配排序只由真实互助行为决定。</p>
      </div>

      <Modal open={pay} onClose={() => setPay(false)} title="确认订阅(演示支付)">
        <p className="text-xs text-ink-400 mb-4 leading-relaxed">Utopia Pro · 月付 ¥{PRO_PRICE}。现金只购买专业工具,不影响信任、评价与匹配。这是一次演示支付。</p>
        <button className="btn-primary w-full" onClick={() => { actions.subscribePro(); setPay(false); toast('Utopia Pro 已开通') }}>确认支付</button>
      </Modal>
    </div>
  )
}
