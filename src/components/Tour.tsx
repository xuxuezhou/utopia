import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { useStore } from '../lib/store'

// 交互式新手教程:聚光灯高亮真实按钮,点击真实按钮推进;信息型步骤用「继续」。
// anchor 对应页面元素上的 data-tour 属性;advance='click' 表示必须点击高亮元素才前进。
interface Step {
  anchor?: string
  route?: string          // 该步所在页面;不在时自动跳转
  routePrefix?: string    // 判断"已在正确页面"的前缀(如任意任务详情)
  advance: 'click' | 'next'
  emoji: string
  title: string
  desc: string
}

const STEPS: Step[] = [
  { route: '/', advance: 'next', emoji: '👋', title: '欢迎来到 Utopia', desc: '接下来跟着高亮的按钮,亲手把所有功能点一遍(包括 Plus 和 Pro)。右上角随时可以跳过。' },
  { anchor: 'feed-tabs', route: '/', advance: 'next', emoji: '🏠', title: '三个信息流', desc: '「关注 / 发现 / 附近」三个流,下方还有频道栏。信息流里的付费内容都会明确标注「推广」或「广告」,不会伪装成自然推荐。' },
  { anchor: 'nav-search', route: '/', advance: 'click', emoji: '🔍', title: '搜索', desc: '点击高亮的搜索入口——任务、用户、圈子、分享都能搜。' },
  { anchor: 'search-bar', route: '/search', advance: 'next', emoji: '🎚', title: '高级筛选与保存条件', desc: '输入关键词回车后,结果页有「高级筛选」(形式/积分/距离);Plus 会员可保存条件,命中的新任务会即时通知你。' },
  { anchor: 'nav-nearby', advance: 'click', emoji: '📍', title: '附近互助', desc: '点击「附近」——按距离浏览身边的任务,线下任务只显示大致位置。' },
  { anchor: 'task-card', route: '/nearby', advance: 'click', emoji: '🃏', title: '打开一个任务', desc: '点击任意一张任务卡,看看一次互助长什么样。' },
  { anchor: 'task-info', route: '/task/t1', routePrefix: '/task/', advance: 'next', emoji: '🤝', title: '任务详情', desc: '时间地点、托管积分、完成标准一目了然;可以留言提问、收藏分享,右下角申请提供帮助。发布者能查看申请者的信任护照,自己的任务还可以「任务加速」和「添加到日历」。' },
  { anchor: 'nav-publish', advance: 'click', emoji: '➕', title: '发布', desc: '点击高亮的发布按钮——求助、提供帮助、分享故事、发起社区活动都从这里开始。' },
  { anchor: 'sheet-help', advance: 'click', emoji: '🙋', title: '发布求助', desc: '点击「发布求助」。' },
  { anchor: 'publish-input', route: '/publish', advance: 'next', emoji: '✍️', title: '自然语言发布', desc: '像聊天一样描述需求,系统自动整理时间地点并建议积分;涉及儿童、医疗、驾驶、垫付现金等高风险内容会被直接拦截。Plus 会员还有任务模板和草稿/预约发布。' },
  { anchor: 'nav-messages', advance: 'click', emoji: '💬', title: '消息', desc: '点击「消息」——任务聊天与私信都在站内,内置防诈骗风控提醒;Pro 用户可设置私信自动回复。' },
  { anchor: 'nav-me', advance: 'click', emoji: '🙂', title: '我的主页', desc: '点击「我」,看看你的个人主页。' },
  { anchor: 'profile-decorate', route: '/user/me', routePrefix: '/user/', advance: 'next', emoji: '🎨', title: '主页与信任', desc: '上传头像和背景对所有人免费;「装扮」签名色是 Plus 权益;Pro 用户在这里展示专业主页。点信任信息一行可查看完整信任护照——它只由真实互助行为决定。' },
  { anchor: 'profile-settings', advance: 'click', emoji: '⚙️', title: '设置菜单', desc: '点击右上角的设置齿轮——我的任务、积分、圈子、认证、安全中心和会员订阅入口都在里面。' },
  { anchor: 'menu-calendar', advance: 'click', emoji: '📅', title: '我的日历', desc: '点击「我的日历」。' },
  { anchor: 'calendar-grid', route: '/calendar', advance: 'next', emoji: '🗓', title: '内置日历(免费)', desc: 'Google 式月视图,汇总你的互助安排与圈子活动,可整体导出 .ics 到系统日历。日历对所有用户免费。' },
  { anchor: 'points-card', route: '/points', advance: 'next', emoji: '💠', title: '积分中心', desc: '积分只在互助中流动:发布时托管、完成后释放、服务积分部分销毁进入社区/安全池。不能提现,现金永远买不到积分;还可以捐入社区关怀池。' },
  { anchor: 'circles-manage', route: '/circles', advance: 'next', emoji: '🏘', title: '圈子与活动', desc: '大学、公寓、街区圈子让互助更容易发生;圈子活动所有人可报名,组织者(Pro)有报名名单与现场签到。Plus 会员可在这里集中管理主圈子。' },
  { anchor: 'safety-adprefs', route: '/safety', advance: 'next', emoji: '🛡️', title: '安全中心(免费)', desc: '举报、屏蔽、紧急联系、争议记录,以及广告与推广偏好都在这里。安全功能对所有人免费——安全永远不出售。' },
  { anchor: 'plus-tiers', route: '/plus', advance: 'next', emoji: '✦', title: '会员订阅', desc: '免费 / Plus / Pro 三档。Plus 只买便利:几乎无广告、高级筛选、模板草稿、每月 3 次免费加速——不提高信任分,不影响匹配公平。' },
  { anchor: 'plus-pro', route: '/plus', advance: 'next', emoji: '💼', title: 'Utopia Pro', desc: 'Plus 的进阶版:包含全部 Plus 权益,再加专业主页、自动回复、活动签到、数据分析。不能购买好评、认证或优先信任。' },
  { anchor: 'promo-base', route: '/promo', advance: 'next', emoji: '🚀', title: '任务加速与推广数据', desc: '现金可为任务购买有限曝光(固定套餐、明确标注),每人每月 1 次免费;所有免费任务都保有基础曝光,漏斗数据完全透明。' },
  { anchor: 'org-page', route: '/org', advance: 'next', emoji: '🏛', title: '机构版与公益赞助', desc: '大学/公寓/企业付费开通私有互助圈,成员免费使用;品牌公益活动明示赞助方;验证服务只按第三方成本收费。' },
  { anchor: 'admin-nav', route: '/admin', advance: 'next', emoji: '🧭', title: '管理员后台', desc: '任务审核、争议裁决、积分账本、商业化红线全部透明可查。教程到此结束——去发布你的第一个求助,或顺手帮身边人一个忙吧!' },
]

export default function Tour() {
  const { state, actions } = useStore()
  const nav = useNavigate()
  const loc = useLocation()
  const step = state.tourStep
  const s = step !== undefined ? STEPS[step] : undefined
  const [rect, setRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const [stuck, setStuck] = useState(false)
  const tick = useRef(0)

  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!s || step === undefined) return
    setStuck(false); tick.current = 0
    // 不在该步所在页面时自动前往
    const onRoute = !s.route || loc.pathname.startsWith(s.routePrefix ?? s.route)
    if (!onRoute) nav(s.route!)

    let el: HTMLElement | null = null
    let scrolled = false
    const advance = () => actions.setTourStep(step + 1)
    const check = () => {
      tick.current++
      if (!s.anchor) { setVisible(false); return }
      const found = [...document.querySelectorAll<HTMLElement>(`[data-tour="${s.anchor}"]`)]
        .find(c => { const r = c.getBoundingClientRect(); return r.width > 2 && r.height > 2 }) ?? null
      if (found) {
        if (found !== el) {
          if (el) { el.removeEventListener('click', advance, true); el.removeAttribute('data-tour-current') }
          el = found
          scrolled = false
          el.setAttribute('data-tour-current', '1')
          if (s.advance === 'click') el.addEventListener('click', advance, { capture: true })
        }
        const r = el.getBoundingClientRect()
        // 目标不在舒适视野内时,平滑滚动到屏幕中部(只滚一次)
        if (!scrolled && (r.top < 70 || r.bottom > window.innerHeight - 230)) {
          scrolled = true
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        } else if (r.top >= -10 && r.bottom <= window.innerHeight + 10) {
          scrolled = true
        }
        // 聚光灯位置带过渡动画,在新旧目标之间平滑滑移
        setRect({ left: r.left, top: r.top, width: r.width, height: r.height })
        setVisible(true)
      } else {
        setVisible(false)  // 淡出而非消失,找到新目标后滑移过去
        if (tick.current > 25) setStuck(true)   // 3 秒仍找不到目标,提供跳过此步
      }
    }
    check()
    const iv = setInterval(check, 120)
    return () => {
      clearInterval(iv)
      if (el) { el.removeEventListener('click', advance, true); el.removeAttribute('data-tour-current') }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  if (!s || step === undefined) return null
  const last = step === STEPS.length - 1
  // 目标靠近底部时,卡片改到顶部,避免遮挡
  const cardOnTop = visible && rect !== null && rect.top + rect.height > window.innerHeight - 260

  return (
    <>
      {/* 聚光灯:压暗四周,圈出目标按钮;不拦截点击;步骤切换时平滑滑移/淡入淡出 */}
      {rect && (
        <div
          className={`fixed z-[65] pointer-events-none rounded-xl border-2 border-coral-400 transition-all duration-300 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
          style={{
            left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(17,17,17,0.45)',
          }}
        />
      )}
      <div className={`fixed inset-x-3 md:inset-x-auto md:right-8 md:w-96 z-[66] transition-all duration-300 ${cardOnTop ? 'top-[calc(var(--safe-top)+0.75rem)] md:top-6' : 'bottom-[calc(4.5rem+var(--safe-bottom))] md:bottom-8'}`}>
        <div className="bg-ink-900 text-white rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] text-white/60 font-medium whitespace-nowrap">新手教程 {step + 1}/{STEPS.length}</span>
            <span className="flex-1 h-1 rounded-full bg-white/15 overflow-hidden">
              <span className="block h-full bg-coral-400 rounded-full transition-all" style={{ width: `${(step + 1) / STEPS.length * 100}%` }} />
            </span>
            <button className="flex items-center gap-0.5 text-[11px] text-white/60 hover:text-white cursor-pointer" onClick={() => actions.endTour()}>
              跳过 <X size={12} />
            </button>
          </div>
          <div className="flex gap-3 fade-up" key={step}>
            <span className="text-2xl">{s.emoji}</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{s.title}</div>
              <p className="text-xs text-white/75 leading-relaxed mt-1">{s.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            {s.advance === 'click' ? (
              <>
                <span className="text-xs text-coral-300 font-medium">👆 点击页面上高亮的按钮继续</span>
                <span className="flex-1" />
                {stuck && (
                  <button className="text-[11px] text-white/50 hover:text-white cursor-pointer underline" onClick={() => actions.setTourStep(step + 1)}>跳过这一步</button>
                )}
              </>
            ) : (
              <>
                {step > 0 && (
                  <button className="flex-none px-3.5 py-1.5 rounded-full text-xs text-white/70 bg-white/10 hover:bg-white/20 cursor-pointer transition"
                    onClick={() => actions.setTourStep(step - 1)}>上一步</button>
                )}
                <span className="flex-1" />
                <button className="px-4 py-1.5 rounded-full text-xs font-semibold bg-coral-500 hover:bg-coral-400 cursor-pointer transition"
                  onClick={() => last ? actions.endTour() : actions.setTourStep(step + 1)}>
                  {step === 0 ? '开始导览' : last ? '开始使用 Utopia' : '继续'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
