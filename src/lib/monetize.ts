// ============ 商业化业务规则 ============
// 核心原则:出售便利、效率和额外曝光;不出售安全、信任、公平和基础可见性。
// 现金与积分严格分离:现金只购买会员/推广/平台工具,永远不能购买、兑换或提现积分。

import type { AppState, BoostPackageId, Task, User } from './types'

// ---------- 会员体系:Free → Plus → Pro(Pro 包含全部 Plus 权益) ----------

export const PLUS_PRICE = { monthly: 15, yearly: 118 } // ¥,演示定价

// Pro 是 Plus 的进阶版:全部 Plus 权益 + 专业工具
export function hasPlusBenefits(user?: User | null): boolean {
  return !!(user?.plus?.active || user?.pro?.active)
}

// Plus 提供的只有便利;where 指向功能实际所在的页面,planned 表示演示版尚未开放
export interface BenefitItem {
  icon: string; title: string; desc: string
  where?: { to: string; label: string }
  planned?: boolean
}
export const PLUS_BENEFITS: BenefitItem[] = [
  { icon: '🧹', title: '几乎无广告', desc: '移除信息流中的绝大部分本地广告', where: { to: '/', label: '首页信息流(自动生效)' } },
  { icon: '🔍', title: '高级搜索与筛选', desc: '按形式、积分区间、距离组合筛选', where: { to: '/search', label: '搜索结果页 →「高级筛选」' } },
  { icon: '💾', title: '保存搜索条件', desc: '常用的筛选组合一键复用', where: { to: '/search', label: '高级筛选 →「保存条件」' } },
  { icon: '🔔', title: '新任务即时提醒', desc: '符合你保存条件的新任务第一时间通知', where: { to: '/search', label: '保存搜索条件后自动生效' } },
  { icon: '📋', title: '常用任务模板', desc: '每周网球、定期取快递……一键再次发布', where: { to: '/publish', label: '发布页 →「保存为模板」' } },
  { icon: '📝', title: '草稿与预约发布', desc: '写好后定时发布,不用掐点', where: { to: '/publish', label: '发布页 →「存草稿 / 预约」' } },
  { icon: '📊', title: '任务曝光与申请数据', desc: '看到自己任务的曝光、访问和申请漏斗', where: { to: '/promo', label: '推广效果页' } },
  { icon: '🚀', title: '每月 3 次免费任务加速', desc: '相当于普通用户免费额度的 3 倍', where: { to: '/mytasks', label: '自己的任务详情 →「任务加速」' } },
  { icon: '🎨', title: '主页装扮', desc: '为个人主页选择专属签名色背景', where: { to: '/user/me', label: '个人主页 →「主页装扮」' } },
  { icon: '🏘', title: '多社区管理', desc: '集中管理加入的圈子,设置主圈子或退出', where: { to: '/circles', label: '圈子页 →「我的圈子管理」' } },
]

// Plus 明确不提供的(反向承诺,页面必须展示)
export const PLUS_EXCLUSIONS: string[] = [
  '不提高信任分或认证等级',
  '不提高评价权重',
  '没有任何高于免费用户的安全权限',
  '不获得自动优先匹配',
  '不能绕过身份与技能认证',
  '不能删除差评或安全记录',
]

export const PLUS_PROMISE =
  'Utopia Plus 帮助你更高效地使用平台,但不会影响你的可信度,也不会降低免费用户获得帮助的基本机会。'

// 免费用户的完整能力(页面展示用)
export const FREE_CAPABILITIES: string[] = [
  '浏览全部内容和任务', '发布和认领任务', '基础匹配推荐', '站内聊天',
  '身份认证(始终免费)', '完整积分系统', '内置日历与 .ics 导出', '举报、屏蔽、申诉与全部安全功能',
]

// ---------- 任务加速 ----------

export interface BoostPackage {
  id: BoostPackageId
  label: string
  icon: string
  priceCny: number
  desc: string
  scope: string
}

// 固定套餐,不做无限竞价排名
export const BOOST_PACKAGES: BoostPackage[] = [
  { id: 'community', label: '社区加速', icon: '🏘', priceCny: 6, desc: '提高任务在所属圈子里的曝光', scope: '所属圈子成员' },
  { id: 'nearby', label: '附近加速', icon: '📍', priceCny: 9, desc: '扩大到更远但仍合理范围内的附近用户', scope: '约 2 倍常规距离内的合适用户' },
  { id: 'instant', label: '即时加速', icon: '⚡', priceCny: 12, desc: '未来 6 小时内增加展示频率', scope: '当前在线的附近用户' },
  { id: 'reach', label: '精准提醒', icon: '🔔', priceCny: 9, desc: '通知技能、时间和距离都符合的用户', scope: '合格候选人(不超过 30 人)' },
  { id: 'revive', label: '重新激活', icon: '♻️', priceCny: 6, desc: '重新推荐长时间无人申请的任务', scope: '错过首次推荐的合适用户' },
]

export const BOOST_LABELS = ['推广', '任务加速', '赞助展示'] // 合法标注文案

// 敏感类目关键词:不得付费推广(儿童/医疗/驾驶/身体接触/私人住宅/金融/法律)
const BOOST_SENSITIVE = /(孩子|小孩|儿童|幼儿|接送|放学|医疗|护理|打针|喂药|心理|开车|载|驾驶|按摩|推拿|理疗|贷款|借钱|理财|投资|法律|律师|合同审查)/

export interface BoostEligibility {
  ok: boolean
  reasons: string[]         // 不通过的原因(全部列出)
}

// 付费推广资格:付费只能扩大合格曝光,不能绕过任何安全与匹配规则
export function boostEligibility(state: AppState, task: Task, buyer: User): BoostEligibility {
  const reasons: string[] = []
  if (!['open', 'applied'].includes(task.status)) reasons.push('只有等待申请中的任务可以加速')
  if (task.publisherId !== buyer.id) reasons.push('只有发布者本人可以为任务购买加速')
  if (task.riskTier === 'T3' || task.riskTier === 'T4') reasons.push('该任务未通过安全审核,不能推广')
  if (task.riskTier === 'T2') reasons.push('涉及私人住宅、宠物照看等较高信任要求的任务不开放付费推广')
  if (task.riskFlags.length > 0) reasons.push(`任务带有风险标记(${task.riskFlags.join('、')}),需先通过人工复核`)
  if (BOOST_SENSITIVE.test(`${task.title} ${task.description}`)) reasons.push('涉及儿童、医疗、驾驶、身体接触、金融或法律等敏感内容,不得付费推广')
  if (task.points > 500) reasons.push('积分异常偏高的任务不能推广')
  if (buyer.level < 1) reasons.push('完成基础身份认证(免费)后才能购买推广')
  if (buyer.restricted) reasons.push('账号处于限制状态,暂不能购买推广')
  const reported = state.reports.some(r => r.targetType === 'task' && r.targetId === task.id && r.status === 'pending')
  if (reported) reasons.push('任务有待处理的举报,审核完成前不能推广')
  const start = new Date(`${task.date}T${task.startTime}:00`).getTime()
  if (start < Date.now()) reasons.push('任务开始时间已过')
  return { ok: reasons.length === 0, reasons }
}

// 每月加速配额:所有用户 1 次免费;Plus/Pro 会员另有 3 次
export function boostQuota(user: User, monthKey: string): { freeLeft: number; plusLeft: number } {
  const q = user.boostQuota?.month === monthKey ? user.boostQuota : { month: monthKey, freeUsed: 0, plusUsed: 0 }
  return {
    freeLeft: Math.max(0, 1 - q.freeUsed),
    plusLeft: hasPlusBenefits(user) ? Math.max(0, 3 - q.plusUsed) : 0,
  }
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

// 任务是否有生效中的加速(用于信息流推广位与标注)
export function activeBoost(state: AppState, taskId: string, nowIso: string) {
  return state.boosts.find(b => b.taskId === taskId && b.expiresAt > nowIso)
}

// 免费/补贴加速资格:新用户首个任务、公益任务、长期无人申请的合理任务
export function subsidyHint(state: AppState, task: Task): string | null {
  if (task.category === 'community') return '公益任务可申请平台补贴加速'
  const published = state.tasks.filter(t => t.publisherId === task.publisherId).length
  if (published <= 1) return '新用户的首个任务可获得一次免费加速'
  const ageDays = (Date.now() - new Date(task.createdAt).getTime()) / 86400000
  if (ageDays >= 3 && task.applicants.length === 0) return '任务超过 3 天无人申请,可免费使用「重新激活」'
  return null
}

// ---------- 信息流推广密度 ----------

// 每 PROMO_INTERVAL 张内容最多 1 个推广位(规格要求 12–20)
export const PROMO_INTERVAL = 14

// ---------- 广告 ----------

export const AD_CATEGORIES = ['运动场地', '社区咖啡', '宠物服务', '活动场地', '本地课程', '社区服务']

// 禁止用于广告定向的数据(后台展示红线用)
export const AD_TARGETING_FORBIDDEN = [
  '私聊内容', '精确住址', '实时位置', '儿童信息', '医疗或心理状态', '用户遇到的具体困难', '敏感任务描述',
]

export const AD_PLACEMENT_FORBIDDEN = [
  '开屏广告', '强制插屏', '聊天页面', '任务执行页面', '安全中心', '伪装成普通用户任务的商业内容',
]

// ---------- Utopia Pro(Plus 的进阶版) ----------

export const PRO_PRICE = { monthly: 25, yearly: 198 } // ¥,演示定价,含全部 Plus 权益

export const PRO_FEATURES: BenefitItem[] = [
  { icon: '💼', title: '专业技能主页', desc: '展示技能、经验与服务范围的专属版块', where: { to: '/plus', label: '本页 Pro 工作台编辑,展示在个人主页' } },
  { icon: '🗓', title: '可用时间表', desc: '公开你每周可提供帮助的时间段', where: { to: '/plus', label: 'Pro 工作台 →「编辑专业主页」' } },
  { icon: '🖼', title: '作品集', desc: '摄影、辅导、维修等成果展示', where: { to: '/plus', label: 'Pro 工作台 →「编辑专业主页」' } },
  { icon: '📥', title: '任务管理', desc: '集中管理申请、进行中与历史任务', where: { to: '/mytasks', label: '我的任务' } },
  { icon: '💬', title: '自动回复', desc: '新私信首条自动应答,不错过任何请求', where: { to: '/plus', label: 'Pro 工作台设置,私信中生效' } },
  { icon: '📈', title: '数据分析', desc: '帮助次数、准时率、合作意愿与响应速度', where: { to: '/plus', label: '本页 Pro 工作台' } },
  { icon: '🎪', title: '社区活动工具', desc: '活动报名名单与现场签到管理', where: { to: '/', label: '活动笔记详情 → 报名与签到(组织者)' } },
]

export const PRO_EXCLUSIONS: string[] = [
  '不能购买好评', '不能购买认证', '不能获得优先信任', '不能自动抢任务',
]

// ---------- 机构版 ----------

export const ORG_AUDIENCES = ['大学', '公寓', '企业', '联合办公空间', '社区组织', '老年社区', '非营利机构']

export const ORG_FEATURES: { icon: string; title: string; desc: string }[] = [
  { icon: '🔒', title: '私有互助圈', desc: '仅本机构成员可见的互助社区' },
  { icon: '✉️', title: '成员认证', desc: '机构邮箱或成员名单认证' },
  { icon: '👥', title: '成员管理', desc: '批量导入、分组与权限' },
  { icon: '🌱', title: '社区任务与公益活动', desc: '组织迎新、清洁日、技能分享' },
  { icon: '🛡', title: '安全与举报后台', desc: '机构管理员处理内部举报' },
  { icon: '📊', title: '匿名化社区数据', desc: '互助活跃度与需求趋势(不含个人数据)' },
  { icon: '💠', title: '社区积分补贴', desc: '机构注入关怀池,补贴成员互助' },
  { icon: '🎨', title: '品牌定制', desc: '机构标识与欢迎页定制' },
  { icon: '🔑', title: 'SSO 单点登录', desc: '对接机构现有账号体系' },
]

// ---------- 验证服务(按成本收费) ----------

export const VERIFY_SERVICES: { id: string; label: string; costCny: number; note: string }[] = [
  { id: 'background', label: '背景调查', costCny: 39, note: '第三方数据源成本' },
  { id: 'driving', label: '驾驶记录核验', costCny: 19, note: '交管数据接口成本' },
  { id: 'license', label: '专业执照验证', costCny: 29, note: '发证机构核验成本' },
  { id: 'skill_advanced', label: '高级技能认证', costCny: 49, note: '专业评审成本' },
]

export const VERIFY_DISCLAIMER =
  '基础身份认证永远免费。以上项目只收取真实产生的第三方成本;付费不代表一定通过,没有付费也不代表用户不可信。'
