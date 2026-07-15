import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore, useCurrentUser, nowISO } from '../lib/store'
import { BOOST_PACKAGES, boostEligibility, boostQuota, monthKey, subsidyHint, PROMO_INTERVAL } from '../lib/monetize'
import type { BoostPackageId } from '../lib/types'
import { Modal, toast } from '../components/ui'

export default function Boost() {
  const { taskId } = useParams()
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const nav = useNavigate()
  const [pkg, setPkg] = useState<BoostPackageId | ''>('')
  const [pay, setPay] = useState(false)

  const task = state.tasks.find(t => t.id === taskId)
  if (!task) return <div className="py-16 text-center text-sm text-ink-400">任务不存在</div>

  const elig = boostEligibility(state, task, me)
  const quota = boostQuota(me, monthKey(nowISO()))
  const hint = subsidyHint(state, task)
  const chosen = BOOST_PACKAGES.find(p => p.id === pkg)
  const existing = state.boosts.find(b => b.taskId === task.id && b.expiresAt > nowISO())

  const buy = (source: 'paid' | 'free' | 'plus') => {
    const res = actions.purchaseBoost(task.id, pkg as BoostPackageId, source)
    if (res.ok) { setPay(false); toast('加速已生效,展示时会标注「推广」'); nav(`/task/${task.id}`) }
    else toast(res.reason ?? '购买失败')
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-8">
      <h1 className="text-xl font-semibold pt-2">任务加速</h1>
      <div className="card p-4 flex items-center gap-3">
        <span className="text-2xl">{task.images[0] ?? '🤝'}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{task.title}</div>
          <div className="text-xs text-ink-400">{task.date} {task.startTime} · {task.points} pt</div>
        </div>
        <Link to={`/task/${task.id}`} className="text-xs text-violet-600 shrink-0">查看任务</Link>
      </div>

      <div className="card p-4 text-xs text-ink-400 leading-relaxed">
        加速用<b className="text-ink-700">现金</b>购买有限的额外曝光,展示时明确标注「推广」。
        加速<b className="text-ink-700">不能</b>购买积分、不改变匹配算法、只把任务展示给更多<b className="text-ink-700">合格</b>的候选人,也不承诺一定有人申请或完成。
        所有免费任务都保有基础曝光:出现在社区最新任务流、展示给附近合适的用户、获得至少一次匹配推荐、可被搜索和分享。
        信息流中每 {PROMO_INTERVAL} 张内容最多出现 1 个推广位。
      </div>

      {existing && (
        <div className="card p-4 bg-leaf-50/50 !border-leaf-100 text-sm text-leaf-700">
          🚀 该任务已有生效中的加速({BOOST_PACKAGES.find(p => p.id === existing.packageId)?.label}),数据见 <Link to="/promo" className="underline">推广效果</Link>。
        </div>
      )}

      {!elig.ok ? (
        <div className="card p-5">
          <h2 className="font-semibold text-sm mb-2">该任务暂时不能加速</h2>
          <ul className="space-y-1.5">
            {elig.reasons.map(r => <li key={r} className="text-sm text-coral-600 flex gap-2"><span>·</span>{r}</li>)}
          </ul>
          <p className="text-[11px] text-ink-300 mt-3">涉及儿童、医疗、驾驶、身体接触、私人住宅、金融、法律、异常高积分、被举报或审核中的任务不开放付费推广;这一限制不能通过付费绕过。</p>
        </div>
      ) : (
        <>
          {hint && <div className="card p-3.5 bg-amber-50/60 !border-amber-100 text-sm text-amber-700">💡 {hint}</div>}
          <div className="space-y-2.5">
            {BOOST_PACKAGES.map(p => (
              <button key={p.id} onClick={() => setPkg(p.id)}
                className={`card p-4 w-full text-left cursor-pointer transition flex items-center gap-3.5 ${pkg === p.id ? '!border-coral-500 bg-coral-50/40' : 'hover:border-cream-300'}`}>
                <span className="text-2xl">{p.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-medium">{p.label}</span>
                  <span className="block text-xs text-ink-400 mt-0.5">{p.desc} · 覆盖:{p.scope}</span>
                </span>
                <span className="font-semibold text-coral-500 shrink-0">¥{p.priceCny}</span>
              </button>
            ))}
          </div>
          <div className="card p-4 text-xs text-ink-400">
            本月免费额度:<b className="text-ink-700">{quota.freeLeft}</b> 次(每位用户每月 1 次)
            {me.plus?.active && <> · Plus 额度:<b className="text-ink-700">{quota.plusLeft}</b> 次</>}
            {!me.plus?.active && <> · <Link to="/plus" className="text-violet-600">Plus 会员</Link>每月另有 3 次免费加速</>}
          </div>
          <button className="btn-primary w-full" disabled={!pkg} onClick={() => setPay(true)}>
            {chosen ? `选择「${chosen.label}」` : '选择一个加速套餐'}
          </button>
          <p className="text-[11px] text-ink-300 text-center">固定套餐定价,无竞价排名 · 公益任务与长期无人申请的合理任务可获免费或补贴加速</p>
        </>
      )}

      <Modal open={pay && !!chosen} onClose={() => setPay(false)} title={`确认加速 · ${chosen?.label ?? ''}`}>
        <p className="text-xs text-ink-400 mb-4 leading-relaxed">
          {chosen?.desc}。展示时将标注「推广」。付费只扩大合格候选人范围,不覆盖匹配算法,不承诺结果。
        </p>
        <div className="space-y-2">
          {quota.freeLeft > 0 && <button className="btn-green w-full" onClick={() => buy('free')}>使用本月免费额度(¥0)</button>}
          {quota.plusLeft > 0 && <button className="btn-secondary w-full" onClick={() => buy('plus')}>使用 Plus 额度(¥0,剩 {quota.plusLeft} 次)</button>}
          <button className="btn-primary w-full" onClick={() => buy('paid')}>支付 ¥{chosen?.priceCny}(演示支付)</button>
        </div>
        <p className="text-[11px] text-ink-300 mt-3 text-center">现金只购买曝光工具,不能购买或兑换积分</p>
      </Modal>
    </div>
  )
}
