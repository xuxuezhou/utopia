import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, useCurrentUser } from '../lib/store'
import {
  PLUS_BENEFITS, PLUS_EXCLUSIONS, PLUS_PRICE, PLUS_PROMISE,
  PRO_FEATURES, PRO_EXCLUSIONS, PRO_PRICE, FREE_CAPABILITIES,
} from '../lib/monetize'
import { Modal, PlusBadge, toast } from '../components/ui'

type Cycle = 'monthly' | 'yearly'

// 会员订阅页:Free → Plus → Pro 三档并列,Pro 为 Plus 的进阶版(含全部 Plus 权益)
export default function Plus() {
  const { actions } = useStore()
  const me = useCurrentUser()!
  const [cycle, setCycle] = useState<Cycle>('yearly')
  const [pay, setPay] = useState<'' | 'plus' | 'pro'>('')
  const isPro = !!me.pro?.active
  const isPlus = !!me.plus?.active

  const TIERS = [
    {
      key: 'free',
      name: '免费',
      price: '¥0',
      unit: '',
      tagline: '完整的互助闭环,永远免费',
      features: FREE_CAPABILITIES,
      cta: !isPlus && !isPro ? '当前方案' : '基础能力,人人可用',
      disabled: true,
      highlight: false,
    },
    {
      key: 'plus',
      name: 'Plus',
      price: `¥${PLUS_PRICE[cycle]}`,
      unit: cycle === 'yearly' ? '/年' : '/月',
      tagline: '更高效地使用平台',
      features: [
        '几乎无广告', '高级搜索与保存条件', '新任务即时提醒',
        '任务模板、草稿与预约发布', '曝光与申请数据', '每月 3 次免费任务加速',
      ],
      cta: isPro ? '已包含于 Pro' : isPlus ? '当前方案' : '开通 Plus',
      disabled: isPro || isPlus,
      highlight: !isPro && !isPlus,
    },
    {
      key: 'pro',
      name: 'Pro',
      price: `¥${PRO_PRICE[cycle]}`,
      unit: cycle === 'yearly' ? '/年' : '/月',
      tagline: '全部 Plus 权益 + 专业工具',
      features: [
        '✦ 包含全部 Plus 权益', '专业技能主页与作品集', '可用时间表与自动回复',
        '任务管理与数据分析', '社区活动工具',
      ],
      cta: isPro ? '当前方案' : isPlus ? '升级到 Pro' : '开通 Pro',
      disabled: isPro,
      highlight: isPlus && !isPro,
    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div className="text-center pt-4">
        <h1 className="text-2xl font-bold">升级你的 Utopia</h1>
        <p className="text-sm text-ink-500 mt-3 leading-relaxed max-w-md mx-auto">{PLUS_PROMISE}</p>
      </div>

      {/* 计费周期切换 */}
      <div className="flex justify-center">
        <div className="inline-flex bg-cream-100 rounded-full p-1">
          {(['yearly', 'monthly'] as const).map(c => (
            <button key={c} onClick={() => setCycle(c)}
              className={`px-4 py-1.5 rounded-full text-sm cursor-pointer transition ${cycle === c ? 'bg-white shadow-card font-medium text-ink-900' : 'text-ink-400'}`}>
              {c === 'yearly' ? '年付 · 省 1/3' : '月付'}
            </button>
          ))}
        </div>
      </div>

      {/* 三档方案 */}
      <div className="grid sm:grid-cols-3 gap-3 items-stretch">
        {TIERS.map(t => (
          <div key={t.key} className={`card p-5 flex flex-col relative ${t.highlight ? '!border-coral-400 shadow-card' : ''}`}>
            {t.highlight && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 chip bg-coral-500 text-white !text-[10px]">{t.key === 'pro' ? '推荐升级' : '最受欢迎'}</span>}
            <div className="font-semibold">{t.name}</div>
            <div className="mt-2"><span className="text-2xl font-bold text-ink-900">{t.price}</span><span className="text-xs text-ink-400">{t.unit}</span></div>
            <div className="text-xs text-ink-400 mt-1 mb-4">{t.tagline}</div>
            <ul className="space-y-2 flex-1">
              {t.features.map(f => (
                <li key={f} className="text-[13px] text-ink-700 flex gap-2 leading-snug">
                  <span className={t.key === 'free' ? 'text-leaf-500' : 'text-coral-500'}>✓</span>{f}
                </li>
              ))}
            </ul>
            <button
              className={`w-full mt-5 !text-[13px] ${t.disabled ? 'btn bg-cream-100 text-ink-300 cursor-default' : t.key === 'pro' ? 'btn bg-ink-900 text-white hover:bg-ink-700' : 'btn-primary'}`}
              disabled={t.disabled}
              onClick={() => (t.key === 'plus' || t.key === 'pro') && setPay(t.key as 'plus' | 'pro')}
            >{t.cta}</button>
          </div>
        ))}
      </div>

      {/* 当前订阅状态 */}
      {(isPlus || isPro) && (
        <div className="card p-4 flex items-center gap-2 flex-wrap text-sm">
          <PlusBadge user={me} />
          <span className="text-ink-700">{isPro ? `Pro ${me.pro!.plan === 'yearly' ? '年付' : '月付'} · 自 ${me.pro!.since.slice(0, 10)}` : `Plus ${me.plus!.plan === 'yearly' ? '年付' : '月付'} · 下次续费 ${me.plus!.renewsAt}`}</span>
          <span className="flex-1" />
          <button className="btn-ghost !py-1 !text-xs" onClick={() => {
            if (isPro) actions.cancelPro(); else actions.cancelPlus()
            toast('已取消续费(演示即时生效)')
          }}>取消订阅</button>
        </div>
      )}

      {/* 权益详情 */}
      <div>
        <h2 className="font-semibold mb-3">Plus 提供的便利(Pro 全部包含)</h2>
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

      <div>
        <h2 className="font-semibold mb-1">Pro 附加的专业工具</h2>
        <p className="text-xs text-ink-400 mb-3">面向高频技能贡献者与社区组织者,在全部 Plus 权益之上:</p>
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
      </div>

      {/* Pro 工作台(已开通) */}
      {isPro && (
        <div className="card p-5 bg-gradient-to-br from-violet-50/60 to-white">
          <div className="font-semibold text-sm">你的 Pro 专业主页 · {me.pro!.headline}</div>
          <div className="text-xs text-ink-400 mt-2 space-y-1">
            {me.pro!.weeklySlots.length > 0 && <div>🗓 可用时间:{me.pro!.weeklySlots.join(' / ')}</div>}
            {me.pro!.portfolio.length > 0 && <div>🖼 作品集:{me.pro!.portfolio.join(' · ')}</div>}
            {me.pro!.autoReply && <div>💬 自动回复已开启</div>}
          </div>
          <p className="text-[11px] text-ink-300 mt-3">专业主页展示在你的个人页,内容可随时编辑(演示数据)。</p>
        </div>
      )}

      {/* 反向承诺 */}
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="card p-5 !border-cream-300">
          <h2 className="font-semibold text-sm mb-1">Plus 不会带来的东西</h2>
          <p className="text-xs text-ink-400 mb-3">会员与身份、社区、技能认证完全分开,付费不代表更安全或更可信。</p>
          <ul className="space-y-1.5">
            {PLUS_EXCLUSIONS.map(x => <li key={x} className="text-[13px] text-ink-500 flex items-center gap-2"><span className="text-ink-300">✕</span>{x}</li>)}
          </ul>
        </div>
        <div className="card p-5 !border-cream-300">
          <h2 className="font-semibold text-sm mb-1">Pro 不能做的事</h2>
          <p className="text-xs text-ink-400 mb-3">你的信任护照、评价与匹配排序只由真实互助行为决定。</p>
          <ul className="space-y-1.5">
            {PRO_EXCLUSIONS.map(x => <li key={x} className="text-[13px] text-ink-500 flex items-center gap-2"><span className="text-ink-300">✕</span>{x}</li>)}
          </ul>
        </div>
      </div>

      <div className="card p-4 text-[11px] text-ink-300 leading-relaxed text-center">
        免费用户永远拥有完整互助闭环。身份认证始终免费 → <Link to="/trust" className="text-violet-600">信任与认证</Link> · 广告偏好随时可调 → <Link to="/safety" className="text-violet-600">安全中心</Link> · 订阅用现金支付,与积分完全无关
      </div>

      <Modal open={!!pay} onClose={() => setPay('')} title="确认订阅(演示支付)">
        <p className="text-sm text-ink-500 mb-1">
          Utopia {pay === 'pro' ? 'Pro' : 'Plus'} · {cycle === 'yearly' ? '年付' : '月付'} ¥{pay === 'pro' ? PRO_PRICE[cycle] : PLUS_PRICE[cycle]}
        </p>
        {pay === 'pro' && isPlus && <p className="text-xs text-amber-600 mb-1">升级后 Pro 覆盖你的 Plus 权益,原 Plus 建议同时取消续费。</p>}
        <p className="text-xs text-ink-400 mb-4 leading-relaxed">现金只用于购买效率与专业工具,不能购买积分、信任分或任何安全权限。这是一次演示支付,不会产生真实扣款。</p>
        <button className="btn-primary w-full" onClick={() => {
          if (pay === 'pro') { actions.subscribePro(cycle); if (isPlus) actions.cancelPlus() }
          else actions.subscribePlus(cycle)
          setPay(''); toast(pay === 'pro' ? 'Utopia Pro 已开通(含全部 Plus 权益)' : '欢迎加入 Utopia Plus')
        }}>确认支付</button>
      </Modal>
    </div>
  )
}
