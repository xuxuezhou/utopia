// ============ Utopia 核心数据模型 ============

export type VerificationLevel = 0 | 1 | 2 | 3
// L0 基础账号 / L1 基础实名 / L2 可信社区成员 / L3 专项认证

export type RiskTier = 'T0' | 'T1' | 'T2' | 'T3' | 'T4'
// T0 线上低风险 / T1 公共场所低风险 / T2 较高信任要求 / T3 受监管禁止 / T4 永久禁止

export type TaskStatus =
  | 'open'          // 等待申请
  | 'applied'       // 已有申请
  | 'matched'       // 已匹配
  | 'starting_soon' // 即将开始
  | 'in_progress'   // 进行中
  | 'pending_confirm' // 待确认
  | 'completed'     // 已完成
  | 'cancelled'     // 已取消
  | 'disputed'      // 争议中
  | 'blocked'       // 被安全审核阻止

export type TaskCategory =
  | 'chat' | 'sports' | 'photography' | 'errand' | 'tutoring'
  | 'language' | 'digital' | 'installation' | 'pet' | 'companion'
  | 'community' | 'newcomer' | 'moving' | 'other'

export const CATEGORY_META: Record<TaskCategory, { label: string; emoji: string }> = {
  chat: { label: '陪聊倾听', emoji: '💬' },
  sports: { label: '运动搭档', emoji: '🎾' },
  photography: { label: '摄影拍照', emoji: '📷' },
  errand: { label: '顺路跑腿', emoji: '📦' },
  tutoring: { label: '学习辅导', emoji: '📚' },
  language: { label: '语言练习', emoji: '🗣️' },
  digital: { label: '数码帮助', emoji: '📱' },
  installation: { label: '简单安装', emoji: '🔧' },
  pet: { label: '宠物照看', emoji: '🐱' },
  companion: { label: '活动陪同', emoji: '🎨' },
  community: { label: '社区公益', emoji: '🌱' },
  newcomer: { label: '新居民引导', emoji: '🧭' },
  moving: { label: '搬运帮忙', emoji: '📦' },
  other: { label: '其他互助', emoji: '🤝' },
}

export interface User {
  id: string
  name: string
  avatar: string          // emoji 头像
  avatarHue: number       // 头像背景色相
  avatarUrl?: string      // 用户上传的头像(dataURL,优先于默认头像)
  bgUrl?: string          // 个人主页背景图(dataURL)
  bio: string
  city: string
  languages: string[]
  communityIds: string[]
  skills: string[]        // 我可以帮助
  needs: string[]         // 我可能需要
  level: VerificationLevel
  verifications: { phone: boolean; identity: boolean; community: boolean; skill: string[] }
  joinedAt: string
  lastActiveAt: string
  stats: {
    helped: number        // 帮助他人次数
    received: number      // 获得帮助次数
    onTimeRate: number    // 准时率 0-100
    cancelRate: number    // 取消率 0-100
    repeatRate: number    // 重复合作率 0-100
    wouldRepeat: number   // 愿意再次合作 0-100
  }
  offerCards: string[]    // “我可以帮助”长期卡片
  emergencyContact?: string
  allowOffline: boolean
  maxDistanceKm: number
  blocked: string[]
  restricted?: string     // 平台限制状态说明
  // ---- 商业化(均与信任/认证无关) ----
  plus?: PlusState
  pro?: ProState
  adPrefs?: AdPrefs
  boostQuota?: { month: string; freeUsed: number; plusUsed: number }  // 每月配额:所有人 1 次免费,Plus 另有 3 次
  // ---- Plus 效率工具的数据 ----
  savedSearches?: SavedSearch[]
  taskTemplates?: { id: string; name: string; text: string }[]
  taskDrafts?: { id: string; text: string; scheduledAt?: string; createdAt: string }[]
  profileTheme?: { hue: number }   // Plus 主页装扮:签名色(无 bgUrl 时作为主页背景渐变)
}

// Plus:保存的搜索条件(命中的新任务会即时通知)
export interface SavedSearch {
  id: string
  name: string
  query: string           // 关键词,可为空
  filters: { online: 'all' | 'online' | 'offline'; minPoints: number; maxPoints: number; maxKm: number }
}

export interface Community {
  id: string
  name: string
  type: 'university' | 'apartment' | 'block' | 'company' | 'coworking' | 'interest' | 'org'
  emoji: string
  intro: string
  memberCount: number
  visibility: 'public' | 'apply' | 'invite' | 'org_verified'
  goal: { title: string; current: number; target: number; unit: string }
  rules: string[]
  adminIds: string[]
  calendar: { date: string; title: string }[]
}

export interface Task {
  id: string
  title: string
  description: string
  category: TaskCategory
  online: boolean
  publicPlace: boolean      // 线下时:是否公共场所(否=上门)
  enterHome: boolean
  date: string              // YYYY-MM-DD
  startTime: string         // HH:mm
  durationMin: number
  locationText: string      // 模糊地点(街区/公共场所名)
  distanceKm: number        // 对当前用户的大致距离
  skillsRequired: string[]
  headcount: number
  doneCriteria: string
  points: number
  serviceFee: number        // 系统服务积分(锁定时一并托管)
  visibility: 'all' | 'nearby' | 'community' | 'followers' | 'invited'
  communityId?: string
  riskTier: RiskTier
  riskFlags: string[]
  status: TaskStatus
  publisherId: string
  helperId?: string
  applicants: TaskApplication[]
  createdAt: string
  deadline: string          // 申请截止
  cancelPolicy: string
  images: string[]          // emoji 场景占位
  startedAt?: string
  submittedAt?: string
  completedAt?: string
  cancelledBy?: string
  cancelReason?: string
  blockReason?: string
  chatId?: string
  reviews: Review[]
  storyId?: string
  comments?: { id: string; userId: string; text: string; createdAt: string }[]  // 任务问答评论
  recommendReason?: string
}

export interface TaskApplication {
  id: string
  userId: string
  intro: string             // 一句话介绍
  why: string
  availability: string
  hasEquipment: boolean
  question?: string
  createdAt: string
  status: 'pending' | 'selected' | 'declined'
}

export interface Review {
  id: string
  taskId: string
  fromId: string
  toId: string
  onTime: boolean
  fulfilled: boolean
  clearComm: number         // 1-5
  respectBoundary: number   // 1-5
  wouldRepeat: boolean
  note: string
  createdAt: string
  published: boolean        // 双向盲评:双方都评或到期才公开
}

export type LedgerType =
  | 'signup_bonus' | 'task_lock' | 'task_release' | 'task_refund'
  | 'cancel_compensation' | 'dispute_freeze' | 'dispute_ruling'
  | 'community_grant' | 'points_burn' | 'safety_compensation' | 'manual_adjust'

export const LEDGER_TYPE_LABEL: Record<LedgerType, string> = {
  signup_bonus: '新用户奖励',
  task_lock: '任务锁定',
  task_release: '任务释放',
  task_refund: '任务退款',
  cancel_compensation: '取消补偿',
  dispute_freeze: '争议冻结',
  dispute_ruling: '争议裁决',
  community_grant: '社区补贴',
  points_burn: '积分销毁',
  safety_compensation: '安全补偿',
  manual_adjust: '人工调整',
}

// 系统账户: 'sys:issuer' 发行 / 'sys:escrow' 托管 / 'sys:burn' 销毁
// 'sys:community_pool' 社区关怀池 / 'sys:safety_pool' 安全补偿池
export interface LedgerEntry {
  id: string
  taskId?: string
  from: string
  to: string
  amount: number
  type: LedgerType
  createdAt: string
  effectiveAt: string
  status: 'settled' | 'locked' | 'frozen' | 'reversed'
  riskFlag?: string
  operator: 'system' | 'admin' | 'user'
  memo: string
}

export interface ChatMessage {
  id: string
  fromId: string
  text: string
  createdAt: string
  system?: boolean
  riskWarning?: string
  blocked?: boolean
}

export interface ChatThread {
  id: string
  taskId?: string
  memberIds: string[]
  messages: ChatMessage[]
}

export interface Dispute {
  id: string
  taskId: string
  openedBy: string
  reason: string
  claimA?: string           // 发布者陈述
  claimB?: string           // 帮助者陈述
  evidence: { by: string; text: string; kind: 'chat' | 'photo' | 'other' }[]
  aiSummary?: string
  status: 'open' | 'reviewing' | 'resolved' | 'appealed' | 'closed'
  ruling?: { toHelper: number; toPublisher: number; note: string; admin: string; at: string }
  appeal?: { by: string; text: string; result?: string }
  createdAt: string
}

export interface SafetyIncident {
  id: string
  severity: 'S1' | 'S2' | 'S3' | 'S4'
  taskId?: string
  userId?: string
  summary: string
  status: 'open' | 'handling' | 'resolved'
  log: { admin: string; at: string; action: string; basis: string; notified: boolean }[]
  createdAt: string
}

export interface Report {
  id: string
  fromId: string
  targetType: 'user' | 'task' | 'content' | 'message'
  targetId: string
  reason: string
  detail: string
  status: 'pending' | 'verified' | 'dismissed'
  createdAt: string
}

export interface ContentPost {
  id: string
  authorId: string
  kind: 'story' | 'event' | 'skill' | 'thanks' | 'guide' | 'milestone'
  title: string
  body: string
  coverEmoji: string
  coverHue: number
  taskId?: string           // 来源于真实完成的任务
  communityId?: string
  likes: number
  saves: number
  thanks: number
  likedByMe?: boolean
  savedByMe?: boolean
  thankedByMe?: boolean
  comments: { id: string; userId: string; text: string; createdAt: string }[]
  createdAt: string
  tags: string[]
  attendees?: string[]      // 活动报名(kind=event;所有人可报名)
  checkedIn?: string[]      // 现场签到(Pro 组织者管理)
}

export interface Notification {
  id: string
  userId: string
  icon: string
  title: string
  body: string
  link?: string
  read: boolean
  createdAt: string
}

export interface AuditLog {
  id: string
  admin: string
  action: string
  target: string
  basis: string
  createdAt: string
}

// ============ 商业化(出售便利与曝光,不出售安全、信任与公平) ============

// Utopia Plus 会员:与身份/社区/技能认证完全无关,只提升使用效率
export interface PlusState {
  active: boolean
  plan: 'monthly' | 'yearly'
  since: string
  renewsAt: string
}

// Utopia Pro:Plus 的进阶版(含全部 Plus 权益)+ 专业工具,不能购买好评或信任
export interface ProState {
  active: boolean
  plan?: 'monthly' | 'yearly'
  since: string
  headline: string          // 专业主页标题
  portfolio: string[]       // 作品集(文字条目演示)
  weeklySlots: string[]     // 可用时间表
  autoReply?: string
}

// 每用户广告与推广偏好
export interface AdPrefs {
  reducePromos: boolean         // 减少信息流推广密度
  hiddenAdCategories: string[]  // 隐藏的广告类目
  personalized: boolean         // 是否允许基于兴趣标签的本地广告(默认开,可关)
}

export type BoostPackageId = 'community' | 'nearby' | 'instant' | 'reach' | 'revive'

// 任务加速订单:现金购买有限曝光;现金永远买不到积分
export interface Boost {
  id: string
  taskId: string
  buyerId: string
  packageId: BoostPackageId
  source: 'paid' | 'free_quota' | 'plus_quota' | 'subsidy'
  priceCny: number          // free/plus/subsidy 为 0
  createdAt: string
  expiresAt: string
  // 推广漏斗数据:自然曝光与推广曝光分开统计
  stats: { organicViews: number; boostedViews: number; detailVisits: number; qualifiedApplicants: number; matched: boolean }
}

export type CashTxType =
  | 'plus_subscribe' | 'pro_subscribe' | 'boost'
  | 'org_license' | 'sponsorship' | 'verify_service'

export const CASH_TX_LABEL: Record<CashTxType, string> = {
  plus_subscribe: 'Plus 会员',
  pro_subscribe: 'Pro 订阅',
  boost: '任务加速',
  org_license: '机构版授权',
  sponsorship: '品牌公益赞助',
  verify_service: '验证服务(成本价)',
}

// 现金流水:与积分账本完全隔离,不存在互相兑换的通道
export interface CashTx {
  id: string
  type: CashTxType
  userId?: string
  orgName?: string
  amountCny: number
  memo: string
  createdAt: string
}

// 本地情境广告(球场/咖啡馆/宠物店等),必须标注,不进入聊天/任务执行/安全中心
export interface Ad {
  id: string
  advertiser: string
  title: string
  body: string
  category: string          // 本地类目:运动场地/社区咖啡/宠物/课程/社区服务
  emoji: string
  hue: number
}

// 机构版客户(B2B2C:机构付费,成员免费)
export interface Institution {
  id: string
  name: string
  type: 'university' | 'apartment' | 'company' | 'coworking' | 'senior' | 'nonprofit' | 'org'
  emoji: string
  plan: string
  seats: number
  annualCny: number
  communityId?: string
  sso: boolean
  since: string
}

// 品牌公益赞助:必须明确显示赞助方
export interface Sponsorship {
  id: string
  brand: string
  campaign: string
  kind: string              // 公园清洁/长者数字课堂/新居民支持…
  amountCny: number
  communityId?: string
  taskIds: string[]
  since: string
}

export interface AppState {
  schemaVersion?: number    // 持久化结构版本,不匹配时重建种子数据
  currentUserId: string | null
  onboarded: boolean
  users: User[]
  communities: Community[]
  tasks: Task[]
  ledger: LedgerEntry[]
  chats: ChatThread[]
  disputes: Dispute[]
  incidents: SafetyIncident[]
  reports: Report[]
  posts: ContentPost[]
  notifications: Notification[]
  auditLogs: AuditLog[]
  following: string[]       // 当前用户关注的用户/圈子 id
  feedFilter?: string
  savedTasks?: string[]     // 当前用户收藏的任务
  // ---- 商业化 ----
  boosts: Boost[]
  cashLedger: CashTx[]      // 现金流水,与积分账本完全隔离
  ads: Ad[]
  institutions: Institution[]
  sponsorships: Sponsorship[]
}
