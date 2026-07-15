import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useStore } from '../lib/store'

// 新手教程:逐步导航到每个功能页,底部浮层讲解;任何时候可跳过
const STEPS: { route: string; emoji: string; title: string; desc: string }[] = [
  { route: '/', emoji: '🏠', title: '发现页', desc: '双列信息流,汇集附近的求助任务和真实互助分享。所有付费内容都会明确标注「推广」或「广告」,不会伪装成自然推荐。' },
  { route: '/nearby', emoji: '📍', title: '附近互助', desc: '按距离查看身边的任务,顺手帮个忙就能获得积分。线下任务只显示大致位置,精确地址在匹配后按需告知。' },
  { route: '/publish', emoji: '🙋', title: '发布求助', desc: '像发朋友圈一样说出需求,系统自动整理时间地点并给出积分建议。涉及儿童、医疗、驾驶、垫付现金等高风险内容会被安全审核直接拦截,无法绕过。' },
  { route: '/task/t1', emoji: '🤝', title: '一次完整互助', desc: '申请 → 发布者查看信任护照并选择 → 积分托管锁定 → 完成确认 → 双向盲评。全程站内聊天,发生分歧可申请平台裁决。' },
  { route: '/points', emoji: '💠', title: '积分中心', desc: '积分只在用户互助中流动:发布时托管、完成后释放、服务积分部分销毁。不能提现,也永远不能用现金购买。' },
  { route: '/circles', emoji: '🏘', title: '圈子', desc: '大学、公寓、街区和兴趣圈子让互助更容易发生。加入后,圈子的活动会自动出现在你的日历里。' },
  { route: '/calendar', emoji: '📅', title: '我的日历(免费)', desc: 'Google 式月视图汇总你的互助安排与圈子活动,可一键导出 .ics 到系统日历。日历是基础能力,对所有人免费。' },
  { route: '/safety', emoji: '🛡️', title: '安全中心', desc: '举报、屏蔽、紧急联系、争议记录和广告偏好都在这里。安全功能对所有用户免费——安全永远不出售。' },
  { route: '/plus', emoji: '✦', title: 'Utopia Plus', desc: '订阅只买便利:几乎无广告、高级筛选、保存搜索提醒、任务模板草稿、每月 3 次免费加速。不提高信任分,不影响匹配公平,每张权益卡都标注了实际入口。' },
  { route: '/plus', emoji: '💼', title: 'Utopia Pro', desc: 'Plus 的进阶版,包含全部 Plus 权益,再加专业技能主页、私信自动回复、活动报名签到和数据分析。不能购买好评、认证或优先信任。' },
  { route: '/promo', emoji: '🚀', title: '任务加速与推广数据', desc: '现金可以为任务购买有限的额外曝光(固定套餐、明确标注),但买不到积分、改不了匹配算法;所有免费任务都保有基础曝光,每人每月还有 1 次免费加速。' },
  { route: '/admin', emoji: '🧭', title: '管理员后台', desc: '任务审核、争议裁决、积分账本、商业化红线全部透明可查。教程到这里就结束了——去发布你的第一个求助,或者顺手帮身边人一个忙吧!' },
]

export default function Tour() {
  const { state, actions } = useStore()
  const nav = useNavigate()
  const step = state.tourStep

  useEffect(() => {
    if (step !== undefined && STEPS[step]) nav(STEPS[step].route)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  if (step === undefined || !STEPS[step]) return null
  const s = STEPS[step]
  const last = step === STEPS.length - 1

  return (
    <div key={step} className="fixed inset-x-3 bottom-[calc(4.5rem+var(--safe-bottom))] md:inset-x-auto md:right-8 md:bottom-8 md:w-96 z-[60] fade-up">
      <div className="bg-ink-900 text-white rounded-2xl p-4 shadow-card">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] text-white/60 font-medium">新手教程 {step + 1}/{STEPS.length}</span>
          <span className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
            <span className="block h-full bg-coral-400 rounded-full transition-all" style={{ width: `${(step + 1) / STEPS.length * 100}%` }} />
          </span>
          <button className="flex items-center gap-0.5 text-[11px] text-white/60 hover:text-white cursor-pointer" onClick={() => actions.endTour()}>
            跳过 <X size={12} />
          </button>
        </div>
        <div className="flex gap-3">
          <span className="text-2xl">{s.emoji}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold">{s.title}</div>
            <p className="text-xs text-white/75 leading-relaxed mt-1">{s.desc}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          {step > 0 && (
            <button className="flex-none px-3.5 py-1.5 rounded-full text-xs text-white/70 bg-white/10 hover:bg-white/20 cursor-pointer transition"
              onClick={() => actions.setTourStep(step - 1)}>上一步</button>
          )}
          <span className="flex-1" />
          <button className="px-4 py-1.5 rounded-full text-xs font-semibold bg-coral-500 hover:bg-coral-400 cursor-pointer transition"
            onClick={() => last ? actions.endTour() : actions.setTourStep(step + 1)}>
            {last ? '开始使用 Utopia' : '继续'}
          </button>
        </div>
      </div>
    </div>
  )
}
