import { useStore } from '../lib/store'
import { ORG_AUDIENCES, ORG_FEATURES } from '../lib/monetize'
import { toast } from '../components/ui'

// 机构版 Utopia:B2B2C —— 机构付费,普通成员免费使用
export default function Org() {
  const { state } = useStore()

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-8">
      <div className="text-center pt-4">
        <div className="text-2xl font-bold">机构版 Utopia</div>
        <p className="text-sm text-ink-500 mt-2 leading-relaxed max-w-md mx-auto">
          为你的大学、公寓、企业或社区组织搭建私有互助网络。机构付费,每一位成员免费使用完整功能。
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-1.5">
        {ORG_AUDIENCES.map(a => <span key={a} className="chip bg-cream-100 text-ink-500">{a}</span>)}
      </div>

      <div className="grid sm:grid-cols-2 gap-2.5" data-tour="org-page">
        {ORG_FEATURES.map(f => (
          <div key={f.title} className="card p-3.5 flex gap-3">
            <span className="text-xl">{f.icon}</span>
            <span>
              <span className="block text-sm font-medium">{f.title}</span>
              <span className="block text-xs text-ink-400 mt-0.5 leading-relaxed">{f.desc}</span>
            </span>
          </div>
        ))}
      </div>

      <div>
        <h2 className="font-semibold mb-3">正在使用机构版的社区</h2>
        <div className="card divide-y divide-cream-200">
          {state.institutions.map(o => (
            <div key={o.id} className="p-4 flex items-center gap-3">
              <span className="text-2xl">{o.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{o.name}</div>
                <div className="text-xs text-ink-400 mt-0.5">{o.plan} · {o.seats.toLocaleString()} 席位 · {o.sso ? '已接入 SSO' : '名单认证'} · 自 {o.since}</div>
              </div>
              <span className="text-sm font-semibold text-ink-700 shrink-0">¥{(o.annualCny / 1000).toFixed(1)}k/年</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="font-semibold text-sm mb-2">品牌公益赞助</h2>
        <p className="text-xs text-ink-400 mb-3 leading-relaxed">品牌可以赞助公园清洁、老年数字技能帮助、新居民支持等真实社区公益。赞助方会被明确展示 —— 我们不把普通广告伪装成公益。</p>
        <div className="space-y-2">
          {state.sponsorships.map(s => (
            <div key={s.id} className="bg-cream-100 rounded-xl px-3.5 py-3">
              <div className="text-sm font-medium">{s.campaign}</div>
              <div className="text-xs text-ink-400 mt-0.5">赞助方:{s.brand} · {s.kind} · ¥{s.amountCny.toLocaleString()} · 覆盖 {s.taskIds.length} 个公益任务</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5 text-center">
        <p className="text-sm text-ink-500 mb-3">想为你的机构或品牌了解更多?</p>
        <button className="btn-primary" onClick={() => toast('演示环境:已记录你的意向,商务团队会与你联系')}>联系商务合作</button>
        <p className="text-[11px] text-ink-300 mt-2">机构数据仅提供匿名化趋势,绝不包含成员个人数据</p>
      </div>
    </div>
  )
}
