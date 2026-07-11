import type { RiskTier, TaskCategory } from './types'

// 本地日期字符串 YYYY-MM-DD(避免 toISOString 的 UTC 偏移把"明天"解析成"今天")
export function localDateStr(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export interface RiskResult {
  tier: RiskTier
  flags: string[]
  blocked: boolean
  blockReason?: string
  needsReview: boolean
  education?: string
}

// T4 永久禁止(关键词规则,作为无 AI 时的降级方案)
const T4_RULES: { re: RegExp; flag: string; edu: string }[] = [
  { re: /礼品卡|gift\s*card|充值卡/i, flag: '礼品卡交易', edu: '要求代购礼品卡是最常见的诈骗手法之一。正规互助任务不会要求你先付钱。' },
  { re: /垫付|先(帮我)?(买|付|转)|先行支付|代付.*(再|然后)/, flag: '要求垫付现金', edu: 'Utopia 的积分托管机制保护双方,任何要求你先垫付现金的任务都存在极高诈骗风险。' },
  { re: /验证码|密码|账号.{0,4}(给|发)|登录我的/, flag: '索要账号/验证码', edu: '永远不要向他人提供验证码或密码,平台工作人员也不会索要。' },
  { re: /比特币|虚拟币|加密货币|usdt|提现|套现|积分.{0,6}(换|兑).{0,4}(钱|现金)/i, flag: '积分套现/虚拟币', edu: 'Utopia 积分不能兑换现金或虚拟货币,任何此类交易均被禁止。' },
  { re: /代考|替考|代写论文/, flag: '学术不端', edu: '代考与代写属于学术不端行为,平台永久禁止。' },
  { re: /约炮|情色|性服务|裸聊/, flag: '色情交易', edu: '' },
  { re: /毒品|大麻|枪支|武器|弹药/, flag: '毒品/武器', edu: '' },
  { re: /跟踪|偷拍|查.{0,4}(住址|行踪|开房)/, flag: '跟踪/侵犯隐私', edu: '' },
  { re: /传销|拉人头|发展下线/, flag: '传销', edu: '' },
]

// T3 受监管/高后果 — MVP 禁止发布
const T3_RULES: { re: RegExp; flag: string }[] = [
  { re: /(接|送|看|照顾|陪).{0,6}(孩子|小孩|儿童|幼儿|娃)|放学|幼儿园/, flag: '涉及未成年人接送/看护' },
  { re: /(输液|打针|喂药|护理|换药|术后|病人照护)/, flag: '涉及医疗护理' },
  { re: /心理(治疗|咨询|辅导)|抑郁.{0,4}治/, flag: '涉及心理治疗' },
  { re: /开车.{0,8}(送|接|载)|载我|顺风车|代驾/, flag: '涉及驾车载客' },
  { re: /(改|接|修).{0,4}(电路|燃气|煤气)|高空作业|爬窗/, flag: '涉及危险维修' },
  { re: /打官司|法律代理|出庭/, flag: '涉及法律代理' },
  { re: /(炒股|理财|投资).{0,6}(带|指导|代操)/, flag: '涉及投资理财' },
  { re: /报税|税务筹划/, flag: '涉及专业税务' },
]

const T2_RULES: { re: RegExp; flag: string }[] = [
  { re: /宠物|喂猫|喂狗|遛狗|猫|狗/, flag: '宠物照看' },
  { re: /上门|来我家|到我家|家里|住宅|浇花|房间/, flag: '进入私人住宅' },
  { re: /搬(运|家|东西)|抬/, flag: '搬运物品' },
  { re: /安装|组装|修/, flag: '简单安装维修' },
  { re: /老人|长辈.{0,6}(陪|教)/, flag: '长时间陪伴老人' },
]

const SENSITIVE_PRIVACY = /(\d+号楼\d+|\d{3,4}室|门牌|详细地址.{0,3}[:是])/

export function assessRisk(text: string, opts?: { online?: boolean; enterHome?: boolean; points?: number }): RiskResult {
  const flags: string[] = []
  let education: string | undefined

  for (const r of T4_RULES) {
    if (r.re.test(text)) {
      flags.push(r.flag)
      education = r.edu || education
      return { tier: 'T4', flags, blocked: true, needsReview: true, education,
        blockReason: `该任务涉及「${r.flag}」,属于平台永久禁止的内容,无法发布。` }
    }
  }
  for (const r of T3_RULES) {
    if (r.re.test(text)) {
      flags.push(r.flag)
      return { tier: 'T3', flags, blocked: true, needsReview: true,
        blockReason: '该任务涉及受监管或高风险服务,目前 Utopia 暂不支持发布。',
        education: '为了每一位社区成员的安全,涉及未成年人、医疗、驾驶载客等受监管服务暂不开放。' }
    }
  }

  let tier: RiskTier = opts?.online ? 'T0' : 'T1'
  for (const r of T2_RULES) {
    if (r.re.test(text)) { flags.push(r.flag); tier = 'T2' }
  }
  if (opts?.enterHome && tier !== 'T2') { tier = 'T2'; flags.push('进入私人住宅') }

  let needsReview = false
  if (SENSITIVE_PRIVACY.test(text)) { flags.push('描述包含精确住址,已提示模糊化'); needsReview = true }
  if ((opts?.points ?? 0) > 500) { flags.push('积分异常偏高'); needsReview = true }

  return { tier, flags, blocked: false, needsReview, education }
}

// 聊天风控
export function assessMessage(text: string): { warning?: string; blocked?: boolean } {
  if (/验证码|密码告诉|账号密码/.test(text))
    return { blocked: true, warning: '检测到索要验证码或密码,消息已被拦截。请立即举报对方。' }
  if (/礼品卡|垫付|先转账|先付/.test(text))
    return { blocked: true, warning: '检测到疑似诈骗内容(垫付/礼品卡),消息已被拦截。' }
  if (/微信|加v|vx|站外|支付宝转/i.test(text))
    return { warning: '检测到疑似站外交易引导。为保障积分托管与安全记录,请保持站内沟通。' }
  if (/滚|傻|贱|威胁|弄死/.test(text))
    return { warning: '请保持友善沟通。骚扰与威胁将导致账号限制。' }
  if (/\d+号楼\d+|\d{3,4}室/.test(text))
    return { warning: '你正在发送精确住址。建议仅在任务确实需要时告知,并优先选择公共场所。' }
  return {}
}

// ============ 自然语言 → 结构化任务(无外部 AI 的降级实现) ============

export interface ParsedDraft {
  title: string
  category: TaskCategory
  online: boolean
  date: string
  startTime: string
  durationMin: number
  locationText: string
  skills: string[]
  suggestMin: number
  suggestMax: number
}

const CAT_RULES: { re: RegExp; cat: TaskCategory; online?: boolean; skills?: string[] }[] = [
  { re: /网球/, cat: 'sports', skills: ['网球'] },
  { re: /羽毛球/, cat: 'sports', skills: ['羽毛球'] },
  { re: /跑步|晨跑|夜跑/, cat: 'sports', skills: ['跑步'] },
  { re: /拍照|摄影|拍.{0,3}(照片|写真)/, cat: 'photography', skills: ['摄影'] },
  { re: /快递|取.{0,3}(件|包裹)|跑腿|带.{0,3}(饭|咖啡)/, cat: 'errand', skills: ['跑腿'] },
  { re: /英语|日语|中文|口语|语言/, cat: 'language', skills: ['语言练习'] },
  { re: /辅导|作业|考试|复习|答疑|简历/, cat: 'tutoring', skills: ['学习辅导'] },
  { re: /photoshop|ps|手机|电脑|软件|数码|智能/i, cat: 'digital', skills: ['数码设备'] },
  { re: /安装|组装|家具|书架/, cat: 'installation', skills: ['简单安装'] },
  { re: /猫|狗|宠物|喂食/, cat: 'pet', skills: ['宠物'] },
  { re: /陪.{0,3}(聊|说话|倾诉)|聊天|倾听/, cat: 'chat', online: true, skills: ['陪聊'] },
  { re: /展览|美术馆|艺术馆|音乐会|电影|逛/, cat: 'companion', skills: ['活动陪同'] },
  { re: /公益|清理|志愿/, cat: 'community', skills: [] },
  { re: /搬/, cat: 'moving', skills: ['搬运'] },
]

export function parseNaturalTask(text: string): ParsedDraft {
  let category: TaskCategory = 'other'
  let online = /在线|线上|视频|语音|远程/.test(text)
  let skills: string[] = []
  for (const r of CAT_RULES) {
    if (r.re.test(text)) {
      category = r.cat
      skills = r.skills ?? []
      if (r.online && !/线下|见面|一起去/.test(text)) online = true
      break
    }
  }

  // 时长
  let durationMin = 60
  const hm = text.match(/(\d+(?:\.\d+)?)\s*(个)?小时/)
  const mm = text.match(/(\d+)\s*分钟/)
  if (hm) durationMin = Math.round(parseFloat(hm[1]) * 60)
  else if (mm) durationMin = parseInt(mm[1])
  else if (category === 'chat') durationMin = 30
  else if (category === 'errand') durationMin = 20

  // 日期
  const now = new Date()
  const target = new Date(now)
  const wd = text.match(/周([一二三四五六日天])|星期([一二三四五六日天])/)
  if (/明天/.test(text)) target.setDate(now.getDate() + 1)
  else if (/后天/.test(text)) target.setDate(now.getDate() + 2)
  else if (wd) {
    const map: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 }
    const want = map[wd[1] || wd[2]]
    let diff = (want - now.getDay() + 7) % 7
    if (diff === 0) diff = 7
    target.setDate(now.getDate() + diff)
  } else target.setDate(now.getDate() + 1)
  const date = localDateStr(target)

  // 时间
  let startTime = '14:00'
  const tm = text.match(/(\d{1,2})[点:](\d{0,2})/)
  if (/上午/.test(text)) startTime = '10:00'
  if (/中午/.test(text)) startTime = '12:00'
  if (/晚上|傍晚/.test(text)) startTime = '19:00'
  if (tm) {
    let h = parseInt(tm[1])
    if (/下午|晚/.test(text) && h < 12) h += 12
    startTime = `${String(h).padStart(2, '0')}:${tm[2] ? tm[2].padStart(2, '0') : '00'}`
  }

  // 地点
  let locationText = online ? '线上' : '待商定的公共场所'
  const loc = text.match(/在(.{2,12}?)(附近|旁边|里|进行|,|。|$)/)
  if (!online && loc) locationText = loc[1] + (loc[2] === '附近' ? '附近' : '')
  if (/学校|校园/.test(text) && !online) locationText = '学校附近'

  // 标题:截取核心诉求
  let title = text.replace(/^(我想|我需要|想找|帮我|请人|找人|找一个人|找个)/, '').slice(0, 20)
  if (!title) title = text.slice(0, 20)
  title = title.replace(/[,。,.].*$/, '')
  if (title.length < 4) title = text.slice(0, 18)

  const { min, max } = suggestPoints({ durationMin, online, category, skills })
  return { title, category, online, date, startTime, durationMin, locationText, skills, suggestMin: min, suggestMax: max }
}

// 积分建议:基于时长、类别、技能、线下不便程度
export function suggestPoints(p: { durationMin: number; online: boolean; category: TaskCategory; skills: string[] }): { min: number; max: number } {
  let base = Math.max(20, Math.round(p.durationMin * 0.9))
  if (!p.online) base = Math.round(base * 1.25)          // 线下不便程度
  if (['photography', 'tutoring', 'digital', 'installation'].includes(p.category)) base = Math.round(base * 1.3) // 技能要求
  if (p.category === 'errand') base = Math.max(30, Math.round(base * 0.9))
  const min = Math.round(base * 0.8 / 10) * 10
  const max = Math.round(base * 1.4 / 10) * 10
  return { min: Math.max(min, 20), max: Math.max(max, min + 20) }
}
