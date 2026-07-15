import { Link } from 'react-router-dom'
import { useStore, useCurrentUser } from '../lib/store'
import { BOOST_PACKAGES, hasPlusBenefits } from '../lib/monetize'
import { Stat } from '../components/ui'

// 推广效果数据:自然曝光与推广曝光分开呈现,让付费效果透明可核对
export default function Promo() {
  const { state } = useStore()
  const me = useCurrentUser()!
  const myBoosts = state.boosts.filter(b => b.buyerId === me.id)
  const myOpenTasks = state.tasks.filter(t => t.publisherId === me.id && ['open', 'applied'].includes(t.status))
  const totals = myBoosts.reduce((a, b) => ({
    organic: a.organic + b.stats.organicViews, boosted: a.boosted + b.stats.boostedViews,
    visits: a.visits + b.stats.detailVisits, apps: a.apps + b.stats.qualifiedApplicants,
    matched: a.matched + (b.stats.matched ? 1 : 0),
  }), { organic: 0, boosted: 0, visits: 0, apps: 0, matched: 0 })

  const srcLabel = { paid: '付费', free_quota: '免费额度', plus_quota: 'Plus 额度', subsidy: '平台补贴' }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <h1 className="text-xl font-semibold pt-2">推广效果</h1>

      {myBoosts.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          <Stat label="自然曝光" value={totals.organic} />
          <Stat label="推广曝光" value={totals.boosted} tone="coral" />
          <Stat label="详情访问" value={totals.visits} />
          <Stat label="合格申请" value={totals.apps} tone="leaf" />
          <Stat label="最终匹配" value={totals.matched} tone="violet" />
        </div>
      )}

      <div className="space-y-3">
        {myBoosts.map(b => {
          const t = state.tasks.find(x => x.id === b.taskId)
          const pkg = BOOST_PACKAGES.find(p => p.id === b.packageId)
          if (!t) return null
          const funnel: [string, number][] = [
            ['自然曝光', b.stats.organicViews], ['推广曝光', b.stats.boostedViews],
            ['详情访问', b.stats.detailVisits], ['合格申请', b.stats.qualifiedApplicants],
          ]
          const max = Math.max(...funnel.map(f => f[1]), 1)
          return (
            <div key={b.id} className="card p-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <Link to={`/task/${t.id}`} className="text-sm font-medium">{t.title}</Link>
                <span className="chip bg-cream-100 text-ink-500">{pkg?.icon} {pkg?.label}</span>
                <span className="chip bg-cream-100 text-ink-400">{srcLabel[b.source]}{b.priceCny > 0 ? ` ¥${b.priceCny}` : ''}</span>
              </div>
              <div className="space-y-1.5">
                {funnel.map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="w-14 text-ink-400 shrink-0">{k}</span>
                    <span className="flex-1 h-4 bg-cream-100 rounded-full overflow-hidden">
                      <span className={`block h-full rounded-full ${k === '推广曝光' ? 'bg-coral-300' : 'bg-cream-300'}`} style={{ width: `${Math.max(4, v / max * 100)}%` }} />
                    </span>
                    <span className="w-8 text-right font-medium text-ink-700">{v}</span>
                  </div>
                ))}
                <div className="text-xs text-ink-400 pt-1">最终匹配:{b.stats.matched ? '✓ 已匹配' : '未匹配(推广不承诺匹配结果)'}</div>
              </div>
            </div>
          )
        })}
        {myBoosts.length === 0 && (
          <div className="card p-6 text-center text-sm text-ink-400">
            还没有推广记录。加速是可选的 —— 你的任务已经拥有基础曝光。
          </div>
        )}
      </div>

      <div className="card p-5" data-tour="promo-base">
        <h2 className="font-semibold text-sm mb-1">你的任务的基础曝光(免费保障)</h2>
        <p className="text-xs text-ink-400 mb-3">每个通过审核的任务,无论是否付费,都会:出现在所属社区最新任务流、展示给附近合适的用户、获得至少一次匹配推荐、可被搜索与分享。</p>
        <div className="space-y-2">
          {myOpenTasks.map(t => {
            let h = 0; for (const c of t.id) h = (h * 31 + c.charCodeAt(0)) % 997
            return (
              <Link key={t.id} to={`/task/${t.id}`} className="flex items-center justify-between bg-cream-100 rounded-xl px-3.5 py-2.5 hover:bg-cream-200 transition text-sm">
                <span className="truncate">{t.images[0]} {t.title}</span>
                <span className="text-xs text-ink-400 shrink-0 ml-2">
                  {hasPlusBenefits(me) ? `自然曝光 ${40 + h % 80} · 申请 ${t.applicants.length}` : `申请 ${t.applicants.length}`}
                </span>
              </Link>
            )
          })}
          {myOpenTasks.length === 0 && <p className="text-sm text-ink-300">当前没有开放中的任务。</p>}
          {!hasPlusBenefits(me) && myOpenTasks.length > 0 && (
            <p className="text-[11px] text-ink-300">🔒 每个任务的详细曝光与申请漏斗是 <Link to="/plus" className="text-violet-600">Plus / Pro</Link> 功能;基础曝光本身对所有任务始终有效。</p>
          )}
        </div>
      </div>
    </div>
  )
}
