// ============ Utopia 演示种子数据 ============
// 纯数据文件:所有时间均为字面量,不使用 Date.now()

import type {
  AppState, AuditLog, ChatMessage, ChatThread, Community, ContentPost,
  Dispute, LedgerEntry, LedgerType, Notification, Report, Review,
  SafetyIncident, Task, TaskApplication, User,
} from '../lib/types'

// ---------- 小工具(减少重复) ----------

const ver = (level: 0 | 1 | 2 | 3, skill: string[] = []) => ({
  phone: true,
  identity: level >= 1,
  community: level >= 2,
  skill,
})

type UserDefaults = 'city' | 'languages' | 'blocked' | 'allowOffline' | 'needs' | 'offerCards'
const U = (u: Omit<User, UserDefaults> & Partial<Pick<User, UserDefaults>>): User => ({
  city: '滨江市',
  languages: ['中文'],
  blocked: [],
  allowOffline: true,
  needs: [],
  offerCards: [],
  ...u,
})

type TaskDefaults =
  | 'online' | 'publicPlace' | 'enterHome' | 'headcount'
  | 'skillsRequired' | 'applicants' | 'reviews' | 'riskFlags'
const T = (t: Omit<Task, TaskDefaults> & Partial<Pick<Task, TaskDefaults>>): Task => ({
  online: false,
  publicPlace: true,
  enterHome: false,
  headcount: 1,
  skillsRequired: [],
  applicants: [],
  reviews: [],
  riskFlags: [],
  ...t,
})

const app = (
  id: string, userId: string, status: TaskApplication['status'],
  intro: string, why: string, availability: string, createdAt: string,
  extra?: Partial<TaskApplication>,
): TaskApplication => ({
  id, userId, status, intro, why, availability, createdAt,
  hasEquipment: false,
  ...extra,
})

const rv = (
  id: string, taskId: string, fromId: string, toId: string,
  note: string, createdAt: string, extra?: Partial<Review>,
): Review => ({
  id, taskId, fromId, toId, note, createdAt,
  onTime: true, fulfilled: true, clearComm: 5, respectBoundary: 5,
  wouldRepeat: true, published: true,
  ...extra,
})

const msg = (
  id: string, fromId: string, text: string, createdAt: string,
  extra?: Partial<ChatMessage>,
): ChatMessage => ({ id, fromId, text, createdAt, ...extra })

export function buildSeedState(): AppState {
  // ---------- 账本工具 ----------
  let lseq = 0
  const led = (i: {
    taskId?: string; from: string; to: string; amount: number; type: LedgerType
    createdAt: string; memo: string; status?: LedgerEntry['status']
    operator?: LedgerEntry['operator']; riskFlag?: string
  }): LedgerEntry => ({
    id: 'L' + (++lseq),
    from: i.from,
    to: i.to,
    amount: i.amount,
    type: i.type,
    createdAt: i.createdAt,
    effectiveAt: i.createdAt,
    status: i.status ?? 'settled',
    operator: i.operator ?? 'system',
    memo: i.memo,
    ...(i.taskId ? { taskId: i.taskId } : {}),
    ...(i.riskFlag ? { riskFlag: i.riskFlag } : {}),
  })

  // 完成任务的完整积分链:锁定 → 释放 + 服务费三路拆分(销毁/社区池/安全池)
  const chain = (
    taskId: string, title: string, publisher: string, helper: string,
    points: number, fee: number, split: [number, number, number],
    lockAt: string, doneAt: string,
  ): LedgerEntry[] => [
    led({ taskId, from: publisher, to: 'sys:escrow', amount: points + fee, type: 'task_lock', createdAt: lockAt, memo: `「${title}」积分与服务费托管锁定` }),
    led({ taskId, from: 'sys:escrow', to: helper, amount: points, type: 'task_release', createdAt: doneAt, memo: `「${title}」完成,积分释放给帮助者` }),
    led({ taskId, from: 'sys:escrow', to: 'sys:burn', amount: split[0], type: 'points_burn', createdAt: doneAt, memo: '服务积分销毁(约40%)' }),
    led({ taskId, from: 'sys:escrow', to: 'sys:community_pool', amount: split[1], type: 'community_grant', createdAt: doneAt, memo: '服务积分注入社区关怀池' }),
    led({ taskId, from: 'sys:escrow', to: 'sys:safety_pool', amount: split[2], type: 'safety_compensation', createdAt: doneAt, memo: '服务积分注入安全补偿池' }),
  ]

  const lock = (taskId: string, title: string, publisher: string, amount: number, at: string): LedgerEntry =>
    led({ taskId, from: publisher, to: 'sys:escrow', amount, type: 'task_lock', createdAt: at, status: 'locked', memo: `「${title}」积分与服务费托管锁定` })

  // ---------- 社区(6) ----------
  const communities: Community[] = [
    {
      id: 'c1', name: '湖畔大学', type: 'university', emoji: '🎓',
      intro: '湖畔大学官方互助社区,覆盖在校学生与教职工。从代取快递到考前互助,校园里的事一起解决。',
      memberCount: 2680, visibility: 'public',
      goal: { title: '本月完成500小时互助', current: 342, target: 500, unit: '小时' },
      rules: [
        '线下见面优先选择校内公共场所',
        '代取物品需出示预约或取件凭证',
        '禁止任何形式的代写代考类互助',
        '22:00 后不建议发布线下任务',
      ],
      adminIds: ['u22'],
      calendar: [
        { date: '2026-07-12', title: '转学生·新生答疑会' },
        { date: '2026-07-18', title: '湖畔夜跑活动(操场集合)' },
        { date: '2026-07-25', title: '期末互助自习室开放日' },
      ],
    },
    {
      id: 'c2', name: '青藤公寓', type: 'apartment', emoji: '🏠',
      intro: '青藤公寓 1-6 栋住户社区。取快递、喂猫浇花、搬点小东西,邻里之间搭把手。',
      memberCount: 860, visibility: 'apply',
      goal: { title: '本月完成80次邻里互助', current: 47, target: 80, unit: '次' },
      rules: [
        '上门类任务建议开启行程分享',
        '进入他人住宅前请核对双方认证等级',
        '公共区域任务优先在物业报备',
      ],
      adminIds: ['u14'],
      calendar: [
        { date: '2026-07-13', title: '天台电影夜' },
        { date: '2026-07-20', title: '闲置物品交换市集' },
      ],
    },
    {
      id: 'c3', name: '梧桐街区', type: 'block', emoji: '🌳',
      intro: '梧桐路两侧六个小区的开放街区社区,老住户多、烟火气足,周末常有公园清理和街角市集。',
      memberCount: 1920, visibility: 'public',
      goal: { title: '本月完成4场公园清理', current: 2, target: 4, unit: '场' },
      rules: [
        '公益类任务积分由社区关怀池补贴',
        '为老人服务的任务请优先选择白天时段',
        '商户求助需标注经营用途',
        '街区活动照片发布前请征得当事人同意',
      ],
      adminIds: ['u2'],
      calendar: [
        { date: '2026-07-11', title: '梧桐公园清理日' },
        { date: '2026-07-19', title: '街角市集' },
        { date: '2026-07-26', title: '街区老照片展' },
      ],
    },
    {
      id: 'c4', name: '星洲科技园', type: 'company', emoji: '💼',
      intro: '星洲科技园入驻企业员工社区。午间技能分享、球局拼场、通勤顺路帮带,工作之外多点连接。',
      memberCount: 2840, visibility: 'apply',
      goal: { title: '本月举办10场午间技能分享', current: 6, target: 10, unit: '场' },
      rules: [
        '任务时间请避开工作日 10:00-12:00 核心工时',
        '园区内任务优先约在中庭与咖啡区',
        '禁止发布与本职工作利益冲突的任务',
      ],
      adminIds: ['u5'],
      calendar: [
        { date: '2026-07-16', title: '午间分享:零基础Python' },
        { date: '2026-07-23', title: '园区羽毛球友谊赛' },
      ],
    },
    {
      id: 'c5', name: '城南网球俱乐部', type: 'interest', emoji: '🎾',
      intro: '城南片区网球爱好者俱乐部,从零基础陪练到周末约战都有人接。新手第一次来会有人带热身。',
      memberCount: 420, visibility: 'apply',
      goal: { title: '本月完成60小时新手陪练', current: 38, target: 60, unit: '小时' },
      rules: [
        '球场任务默认公共场所,请勿改约私人场地',
        '新手陪练任务完成后双方需确认时长',
        '雨天取消不计入取消率',
      ],
      adminIds: ['u12'],
      calendar: [
        { date: '2026-07-12', title: '周日新手陪练日' },
        { date: '2026-07-19', title: '会员双打排位赛' },
        { date: '2026-07-26', title: '夜场灯光球局' },
      ],
    },
    {
      id: 'c6', name: '银发数字课堂', type: 'org', emoji: '🧓',
      intro: '公益组织认证社区,帮助长者跨过数字鸿沟:视频通话、手机缴费、挂号打车,一对一慢慢教。',
      memberCount: 350, visibility: 'org_verified',
      goal: { title: '本月帮助120位长者完成一次视频通话', current: 74, target: 120, unit: '位' },
      rules: [
        '志愿者需完成平台身份认证(L2 及以上)',
        '教学中不代操作支付,只演示与陪练',
        '涉及银行卡、密码的环节一律回避',
        '每次服务后请在社区打卡记录时长',
      ],
      adminIds: ['u8'],
      calendar: [
        { date: '2026-07-14', title: '手机缴费专题课' },
        { date: '2026-07-21', title: '防诈骗小课堂' },
        { date: '2026-07-28', title: '视频通话练习日' },
      ],
    },
  ]

  // ---------- 用户(22) ----------
  const users: User[] = [
    U({
      id: 'u1', name: '陈屿', avatar: '🧑‍💻', avatarHue: 16,
      bio: '湖畔大学软件工程研二,白天写代码,周末端相机。相信信任是最好的社交货币。',
      communityIds: ['c1', 'c3'],
      skills: ['摄影', '编程', '羽毛球', '跑步', '数码设备'],
      needs: ['吉他', '语言练习'],
      level: 2, verifications: ver(2, ['摄影']),
      joinedAt: '2025-09-12T10:00:00', lastActiveAt: '2026-07-10T08:40:00',
      stats: { helped: 23, received: 9, onTimeRate: 97, cancelRate: 2, repeatRate: 34, wouldRepeat: 96 },
      offerCards: ['周末可帮拍证件照/形象照,自带反光板', '远程帮你排查前端报错,30分钟内给思路'],
      emergencyContact: '138****2211 (姐姐)', allowOffline: true, maxDistanceKm: 5,
    }),
    U({
      id: 'u2', name: '苏晚晴', avatar: '📷', avatarHue: 205,
      bio: '自由摄影师,一个人带娃也想把日子过成作品。每月为街区老人免费拍两组肖像。',
      communityIds: ['c3'], skills: ['摄影', '绘画', '社区引导', '活动陪同'],
      needs: ['跑腿', '简单安装'],
      level: 2, verifications: ver(2, ['摄影']),
      joinedAt: '2025-03-18T09:20:00', lastActiveAt: '2026-07-09T22:15:00',
      stats: { helped: 86, received: 12, onTimeRate: 98, cancelRate: 1, repeatRate: 52, wouldRepeat: 99 },
      offerCards: ['每月免费为社区老人拍两组肖像'],
      maxDistanceKm: 4,
    }),
    U({
      id: 'u3', name: '王浩然', avatar: '🧑‍🎓', avatarHue: 230,
      bio: '湖畔大学大三,课不多的时候满校园跑。顺路的事招呼一声就行。',
      communityIds: ['c1'], skills: ['羽毛球', '跑腿', '学习辅导', '跑步', '语言练习'],
      level: 1, verifications: ver(1),
      joinedAt: '2025-10-05T14:00:00', lastActiveAt: '2026-07-10T07:50:00',
      stats: { helped: 18, received: 6, onTimeRate: 95, cancelRate: 3, repeatRate: 28, wouldRepeat: 93 },
      maxDistanceKm: 3,
    }),
    U({
      id: 'u4', name: '李桂芳', avatar: '👵', avatarHue: 40,
      bio: '66岁,退休纺织厂工人,女儿在外地。在银发课堂学会了视频通话,想学的还有很多。',
      communityIds: ['c6', 'c3'], skills: ['烘焙', '陪聊', '绘画', '宠物'],
      needs: ['数码设备', '活动陪同'],
      level: 1, verifications: ver(1),
      joinedAt: '2026-02-11T10:30:00', lastActiveAt: '2026-07-09T19:05:00',
      stats: { helped: 6, received: 21, onTimeRate: 100, cancelRate: 0, repeatRate: 45, wouldRepeat: 100 },
      maxDistanceKm: 2,
    }),
    U({
      id: 'u5', name: '周明轩', avatar: '🏃‍♂️', avatarHue: 120,
      bio: '星洲科技园产品经理,晨跑五公里是每天的开机键。三十岁开始学Python,不晚。',
      communityIds: ['c4'], skills: ['跑步', '网球', '搬运', '社区引导', '活动陪同', '羽毛球'],
      needs: ['编程', '学习辅导'],
      level: 2, verifications: ver(2),
      joinedAt: '2025-06-02T08:10:00', lastActiveAt: '2026-07-10T07:10:00',
      stats: { helped: 34, received: 15, onTimeRate: 96, cancelRate: 2, repeatRate: 41, wouldRepeat: 97 },
      offerCards: ['工作日早上6:30滨江步道带跑,配速随你'],
      maxDistanceKm: 6,
    }),
    U({
      id: 'u6', name: '赵雨桐', avatar: '👩‍💻', avatarHue: 280,
      bio: '后端工程师,久坐星人正在自救。第一次在平台上找网球搭档,意外地顺利。',
      communityIds: ['c4', 'c5'], skills: ['编程', '学习辅导', '数码设备', '网球', '烘焙'],
      level: 2, verifications: ver(2),
      joinedAt: '2025-08-21T11:40:00', lastActiveAt: '2026-07-09T21:30:00',
      stats: { helped: 27, received: 8, onTimeRate: 97, cancelRate: 1, repeatRate: 39, wouldRepeat: 95 },
      maxDistanceKm: 5,
    }),
    U({
      id: 'u7', name: '郑凯', avatar: '🧑‍💼', avatarHue: 30,
      bio: '医疗器械销售,常年出差,刚搬进青藤公寓。家里的事经常需要邻居搭把手。',
      communityIds: ['c2'], skills: ['搬运', '跑腿', '陪聊', '网球'],
      level: 1, verifications: ver(1),
      joinedAt: '2026-04-02T18:00:00', lastActiveAt: '2026-07-09T23:10:00',
      stats: { helped: 9, received: 14, onTimeRate: 92, cancelRate: 4, repeatRate: 22, wouldRepeat: 88 },
      maxDistanceKm: 4,
    }),
    U({
      id: 'u8', name: '何佳音', avatar: '👩‍🏫', avatarHue: 330,
      bio: '社工机构讲师,银发数字课堂负责人。教会一位老人视频通话,就少一份孤独。',
      communityIds: ['c6', 'c3'], skills: ['数码设备', '陪聊', '社区引导', '学习辅导', '活动陪同', '语言练习'],
      level: 3, verifications: ver(3, ['社工证']),
      joinedAt: '2025-01-15T09:00:00', lastActiveAt: '2026-07-10T09:20:00',
      stats: { helped: 118, received: 5, onTimeRate: 100, cancelRate: 0, repeatRate: 58, wouldRepeat: 100 },
      offerCards: ['每周二下午在社区活动室值班,长者数码问题随时问'],
      maxDistanceKm: 8,
    }),
    U({
      id: 'u9', name: 'Lucas·门德斯', avatar: '🧔', avatarHue: 260,
      bio: '来自巴西的交换生,中文在努力升级中。想找人一起看展、打球,顺便交换语言。',
      languages: ['中文(学习中)', 'Português', 'English'],
      communityIds: ['c1', 'c2'], skills: ['语言练习', '网球', '吉他', '跑步'],
      needs: ['社区引导', '语言练习'],
      level: 1, verifications: ver(1),
      joinedAt: '2026-03-28T16:20:00', lastActiveAt: '2026-07-09T20:45:00',
      stats: { helped: 7, received: 11, onTimeRate: 94, cancelRate: 3, repeatRate: 18, wouldRepeat: 92 },
      maxDistanceKm: 5,
    }),
    U({
      id: 'u10', name: '吴倩', avatar: '👩‍🦰', avatarHue: 350,
      bio: '电商运营,家有两只猫:年糕和汤圆。经常出差,最怕的就是猫没人管。',
      communityIds: ['c2'], skills: ['宠物', '跑腿', '烘焙', '陪聊'],
      needs: ['宠物', '跑腿'],
      level: 1, verifications: ver(1),
      joinedAt: '2025-11-09T13:30:00', lastActiveAt: '2026-07-10T08:05:00',
      stats: { helped: 15, received: 19, onTimeRate: 93, cancelRate: 4, repeatRate: 35, wouldRepeat: 91 },
      maxDistanceKm: 3,
    }),
    U({
      id: 'u11', name: '孙志强', avatar: '👷', avatarHue: 90,
      bio: '建材市场配送员,力气活找我就对了。装书桌、搬沙发,顺手的事。',
      communityIds: ['c3'], skills: ['搬运', '简单安装', '跑腿', '跑步'],
      level: 1, verifications: ver(1),
      joinedAt: '2025-07-14T07:50:00', lastActiveAt: '2026-07-09T21:55:00',
      stats: { helped: 41, received: 3, onTimeRate: 96, cancelRate: 2, repeatRate: 30, wouldRepeat: 94 },
      offerCards: ['工作日晚上7点后可接搬运/安装,自带工具'],
      maxDistanceKm: 6,
    }),
    U({
      id: 'u12', name: '罗雅琪', avatar: '🎾', avatarHue: 140,
      bio: '城南网球俱乐部教练助理,专治新手不敢上场。第一次来?我带你热身。',
      communityIds: ['c5'], skills: ['网球', '跑步', '活动陪同', '社区引导', '羽毛球'],
      level: 2, verifications: ver(2, ['网球教练(初级)']),
      joinedAt: '2025-05-20T10:10:00', lastActiveAt: '2026-07-10T06:55:00',
      stats: { helped: 72, received: 4, onTimeRate: 99, cancelRate: 1, repeatRate: 60, wouldRepeat: 98 },
      offerCards: ['周末上午可带新手陪练,球拍可以借你'],
      maxDistanceKm: 5,
    }),
    U({
      id: 'u13', name: '徐建国', avatar: '👴', avatarHue: 60,
      bio: '71岁,退休机械工程师,收藏了三十台老收音机。想找人聊聊天,也想学会手机挂号。',
      communityIds: ['c6', 'c3'], skills: ['陪聊', '绘画', '简单安装', '学习辅导'],
      needs: ['数码设备', '活动陪同', '陪聊'],
      level: 1, verifications: ver(1),
      joinedAt: '2026-01-20T15:00:00', lastActiveAt: '2026-07-10T09:00:00',
      stats: { helped: 4, received: 18, onTimeRate: 100, cancelRate: 0, repeatRate: 40, wouldRepeat: 100 },
      maxDistanceKm: 2,
    }),
    U({
      id: 'u14', name: '高梦洁', avatar: '👩‍🍳', avatarHue: 20,
      bio: '青藤公寓楼下烘焙小店「麦芽糖」店主,开店第100天。想学修图给店里做海报。',
      communityIds: ['c2'], skills: ['烘焙', '陪聊', '宠物', '活动陪同'],
      needs: ['数码设备', '摄影', '搬运'],
      level: 1, verifications: ver(1),
      joinedAt: '2025-12-01T09:45:00', lastActiveAt: '2026-07-09T20:20:00',
      stats: { helped: 22, received: 16, onTimeRate: 95, cancelRate: 2, repeatRate: 44, wouldRepeat: 96 },
      offerCards: ['每周三店里当日面包打烊前免费送社区老人'],
      maxDistanceKm: 3,
    }),
    U({
      id: 'u15', name: '方远', avatar: '🎸', avatarHue: 250,
      bio: '湖畔大学大一新生,吉他社成员。刚来这座城市,想多认识些人。',
      communityIds: ['c1'], skills: ['吉他', '跑步', '羽毛球', '跑腿'],
      needs: ['简单安装', '社区引导'],
      level: 0, verifications: ver(0),
      joinedAt: '2026-06-25T17:30:00', lastActiveAt: '2026-07-10T00:15:00',
      stats: { helped: 3, received: 4, onTimeRate: 90, cancelRate: 0, repeatRate: 10, wouldRepeat: 85 },
      maxDistanceKm: 3,
    }),
    U({
      id: 'u16', name: '秦岚', avatar: '👩‍💼', avatarHue: 300,
      bio: '市场总监,一半时间在出差。养了一阳台绿植,活下来的都是靠邻居。',
      communityIds: ['c4', 'c5'], skills: ['网球', '跑步', '语言练习', '活动陪同', '社区引导'],
      needs: ['跑腿', '宠物'],
      level: 2, verifications: ver(2),
      joinedAt: '2025-04-10T12:00:00', lastActiveAt: '2026-07-09T23:40:00',
      stats: { helped: 29, received: 24, onTimeRate: 94, cancelRate: 5, repeatRate: 36, wouldRepeat: 92 },
      maxDistanceKm: 5,
    }),
    U({
      id: 'u17', name: '杜若飞', avatar: '🧑‍🎨', avatarHue: 275,
      bio: '自由插画师,昼伏夜出。正在把十年的画整理成线上作品集,技术上需要救援。',
      communityIds: ['c3'], skills: ['绘画', '摄影', '陪聊', '数码设备'],
      needs: ['编程', '跑步'],
      level: 1, verifications: ver(1),
      joinedAt: '2025-09-30T22:00:00', lastActiveAt: '2026-07-10T01:20:00',
      stats: { helped: 13, received: 10, onTimeRate: 91, cancelRate: 4, repeatRate: 25, wouldRepeat: 90 },
      maxDistanceKm: 4,
    }),
    U({
      id: 'u18', name: '白雨薇', avatar: '👩‍🎓', avatarHue: 195,
      bio: '英语专业大四,刚拍完毕业照,正在告别校园的每一个角落。可以陪练口语。',
      languages: ['中文', 'English'],
      communityIds: ['c1'], skills: ['语言练习', '学习辅导', '陪聊', '活动陪同', '烘焙'],
      level: 1, verifications: ver(1),
      joinedAt: '2025-10-18T10:20:00', lastActiveAt: '2026-07-09T22:50:00',
      stats: { helped: 26, received: 7, onTimeRate: 98, cancelRate: 1, repeatRate: 33, wouldRepeat: 97 },
      maxDistanceKm: 3,
    }),
    U({
      id: 'u19', name: '冯大成', avatar: '🚴', avatarHue: 180,
      bio: '众包骑手,梧桐街区活地图。顺路单随手接,不顺路的也可以商量。',
      communityIds: ['c3'], skills: ['跑腿', '搬运', '简单安装', '跑步'],
      level: 1, verifications: ver(1),
      joinedAt: '2025-08-08T06:40:00', lastActiveAt: '2026-07-10T08:30:00',
      stats: { helped: 63, received: 2, onTimeRate: 94, cancelRate: 3, repeatRate: 29, wouldRepeat: 90 },
      maxDistanceKm: 8,
    }),
    U({
      id: 'u20', name: '韩雪', avatar: '👩‍⚕️', avatarHue: 10,
      bio: '宠物医院护士,家里常驻两猫一狗。周末在网球场,工作日在猫堆里。',
      communityIds: ['c5', 'c2'], skills: ['宠物', '网球', '陪聊', '跑步', '烘焙'],
      level: 2, verifications: ver(2, ['宠物护理']),
      joinedAt: '2025-07-01T14:15:00', lastActiveAt: '2026-07-09T21:00:00',
      stats: { helped: 48, received: 9, onTimeRate: 97, cancelRate: 2, repeatRate: 46, wouldRepeat: 98 },
      offerCards: ['可上门喂猫/遛狗,能看懂基础健康状况'],
      maxDistanceKm: 5,
    }),
    U({
      id: 'u21', name: '曹伟', avatar: '🧑', avatarHue: 340,
      bio: '自由职业,时间自由但计划常变。正在学着把答应的事放在日程第一位。',
      communityIds: ['c2'], skills: ['跑腿', '搬运', '数码设备', '陪聊'],
      level: 1, verifications: ver(1),
      joinedAt: '2026-05-12T20:00:00', lastActiveAt: '2026-07-10T02:40:00',
      stats: { helped: 12, received: 6, onTimeRate: 85, cancelRate: 8, repeatRate: 12, wouldRepeat: 80 },
      maxDistanceKm: 6,
      restricted: '多次临时取消,高价值任务发布受限 (至 2026-07-20)',
    }),
    U({
      id: 'u22', name: '顾晓阳', avatar: '🧑‍🏫', avatarHue: 210,
      bio: '湖畔大学学生事务办老师,校园社区管理员。新生的问题,没有太小的。',
      communityIds: ['c1'], skills: ['社区引导', '学习辅导', '语言练习', '活动陪同', '陪聊'],
      level: 3, verifications: ver(3, ['教职工认证']),
      joinedAt: '2025-02-26T09:30:00', lastActiveAt: '2026-07-10T09:10:00',
      stats: { helped: 95, received: 6, onTimeRate: 99, cancelRate: 0, repeatRate: 55, wouldRepeat: 99 },
      offerCards: ['每周一三下午办公室开放,新生事务随时来问'],
      maxDistanceKm: 4,
    }),
  ]

  // ---------- 任务(32) ----------
  const tasks: Task[] = [
    // ----- open ×8 -----
    T({
      id: 't1', title: '陪我在线聊30分钟', category: 'chat', online: true,
      description: '女儿出差两周了,想找个人聊聊天。可以听我讲老收音机的故事,也可以聊聊你们年轻人在忙什么。',
      date: '2026-07-11', startTime: '19:30', durationMin: 30,
      locationText: '线上语音', distanceKm: 0, points: 50, serviceFee: 3,
      doneCriteria: '完成30分钟语音聊天,双方确认', visibility: 'all',
      riskTier: 'T0', status: 'open', publisherId: 'u13',
      createdAt: '2026-07-09T16:20:00', deadline: '2026-07-11T18:00:00',
      cancelPolicy: '开始前2小时可无责取消', images: ['📻', '☕'],
      skillsRequired: ['陪聊'],
      recommendReason: '你有陪聊标签,可线上完成',
    }),
    T({
      id: 't2', title: '周日下午找网球搭档', category: 'sports',
      description: '久坐上班族想动起来,水平大概打了半年。找一位能对拉、偶尔喂喂球的搭档,结束后可以一起复盘。',
      date: '2026-07-12', startTime: '15:00', durationMin: 90,
      locationText: '城南网球俱乐部 2号场', distanceKm: 3.6, points: 100, serviceFee: 5,
      doneCriteria: '完成1小时对打并互相确认', visibility: 'all', communityId: 'c5',
      riskTier: 'T1', status: 'open', publisherId: 'u16',
      createdAt: '2026-07-08T21:00:00', deadline: '2026-07-12T12:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['🎾'],
      skillsRequired: ['网球'],
      recommendReason: '你关注的圈子里有人常约这块场地',
    }),
    T({
      id: 't3', title: '顺路帮我取一个快递', category: 'errand',
      description: '在青藤公寓菜鸟驿站,一个小件(化妆品),取件码发你。今天下班前取到就行,放我家门口的置物架。',
      date: '2026-07-10', startTime: '18:30', durationMin: 15,
      locationText: '青藤公寓菜鸟驿站', distanceKm: 2.4, points: 40, serviceFee: 2,
      doneCriteria: '取到快递并拍照放到指定位置', visibility: 'nearby',
      riskTier: 'T1', status: 'open', publisherId: 'u10',
      createdAt: '2026-07-10T08:10:00', deadline: '2026-07-10T17:30:00',
      cancelPolicy: '取件前可随时取消', images: ['📦'],
      skillsRequired: ['跑腿'],
      recommendReason: '距离你2.4公里,15分钟可完成',
    }),
    T({
      id: 't4', title: '教我使用基础Photoshop', category: 'digital',
      description: '开烘焙店的,想自己做新品海报,会拖图层就行的那种从零开始。我带笔记本,教会我抠图、加字、导出。',
      date: '2026-07-15', startTime: '14:00', durationMin: 90,
      locationText: '青藤公寓共享客厅', distanceKm: 2.6, points: 150, serviceFee: 8,
      doneCriteria: '独立完成一张新品海报并导出', visibility: 'all', communityId: 'c2',
      riskTier: 'T1', status: 'open', publisherId: 'u14',
      createdAt: '2026-07-08T10:30:00', deadline: '2026-07-14T22:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['🧁', '💻'],
      skillsRequired: ['数码设备'],
      recommendReason: '你会修图,她想学做烘焙海报',
    }),
    T({
      id: 't5', title: '周三晚羽毛球三缺一', category: 'sports',
      description: '实验室三个人常打,这周三缺一个。水平业余偶尔认真,输赢不重要,出汗最重要。',
      date: '2026-07-15', startTime: '19:00', durationMin: 90,
      locationText: '湖畔大学体育馆 3号场', distanceKm: 0.4, points: 80, serviceFee: 4,
      doneCriteria: '完成90分钟双打并互相确认', visibility: 'community', communityId: 'c1',
      riskTier: 'T1', status: 'open', publisherId: 'u1',
      createdAt: '2026-07-09T12:40:00', deadline: '2026-07-15T17:00:00',
      cancelPolicy: '开始前12小时可全额退回', images: ['🏸'],
      skillsRequired: ['羽毛球'],
    }),
    T({
      id: 't6', title: '陪我一起参观现代艺术馆', category: 'companion',
      description: '这周有一个南美摄影联展,我很想去,但一个人看展有点孤单,中文讲解也听不太懂。可以边看边帮我用中文聊聊作品吗?',
      date: '2026-07-18', startTime: '14:00', durationMin: 120,
      locationText: '市现代艺术馆', distanceKm: 4.2, points: 80, serviceFee: 4,
      doneCriteria: '完成2小时观展陪同,双方确认', visibility: 'all',
      riskTier: 'T1', status: 'open', publisherId: 'u9',
      createdAt: '2026-07-09T20:10:00', deadline: '2026-07-17T20:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['🖼️', '🎨'],
      skillsRequired: ['活动陪同'],
      recommendReason: '南美摄影联展,和你的摄影标签很搭',
    }),
    T({
      id: 't7', title: '教我用手机交水电费', category: 'digital',
      description: '上次课学会了视频通话,这次想学会自己交水电费和燃气费。我记性不太好,可能要多教两遍,谢谢你的耐心。',
      date: '2026-07-14', startTime: '10:00', durationMin: 60,
      locationText: '银发数字课堂活动室', distanceKm: 1.8, points: 60, serviceFee: 3,
      doneCriteria: '我能独立完成一次缴费演示(不实际支付)', visibility: 'community', communityId: 'c6',
      riskTier: 'T1', status: 'open', publisherId: 'u4',
      createdAt: '2026-07-08T09:00:00', deadline: '2026-07-13T20:00:00',
      cancelPolicy: '开始前4小时可无责取消', images: ['📱'],
      skillsRequired: ['数码设备'],
      recommendReason: '恰逢社区手机缴费专题课当天',
    }),
    T({
      id: 't8', title: '周六梧桐公园清理志愿', category: 'community', headcount: 6,
      description: '街区本月第3场公园清理,主要捡拾绿化带垃圾和清理小广告。手套、夹子、垃圾袋社区都备好了,来就行。',
      date: '2026-07-11', startTime: '09:00', durationMin: 120,
      locationText: '梧桐公园东门', distanceKm: 1.2, points: 30, serviceFee: 2,
      doneCriteria: '完成2小时清理并在社区打卡', visibility: 'all', communityId: 'c3',
      riskTier: 'T1', status: 'open', publisherId: 'u2',
      createdAt: '2026-07-07T15:30:00', deadline: '2026-07-11T08:00:00',
      cancelPolicy: '公益任务,开始前可随时取消', images: ['🌳', '🧤'],
      recommendReason: '你加入了梧桐街区,本月目标还差2场',
    }),

    // ----- applied ×5 -----
    T({
      id: 't9', title: '帮忙拍一组个人照片(求职用)', category: 'photography',
      description: '秋招要用的形象照和半身照,想要自然一点的,不要影楼风。我可以带三套衣服,地点就在校园里,大约一小时。',
      date: '2026-07-13', startTime: '16:00', durationMin: 60,
      locationText: '湖畔大学樱花道', distanceKm: 0.3, points: 120, serviceFee: 6,
      doneCriteria: '交付15张精选原图+3张精修', visibility: 'nearby',
      riskTier: 'T1', status: 'applied', publisherId: 'u1',
      createdAt: '2026-07-08T19:00:00', deadline: '2026-07-12T22:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['📷', '🌸'],
      skillsRequired: ['摄影'],
      applicants: [
        app('a1', 'u2', 'pending', '自由摄影师,拍过两百多组人像', '我常拍求职照,知道HR喜欢什么样的光。带一只85mm定焦来。', '周一至周五 15:00 后都可以', '2026-07-09T10:12:00', { hasEquipment: true }),
        app('a2', 'u17', 'pending', '插画师,懂构图和色彩', '虽然主业是画画,但平时也拍胶片,可以帮你拍出杂志感。', '仅周三周四有空', '2026-07-09T14:40:00', { hasEquipment: true, question: '樱花道下午逆光,可以接受换到图书馆前吗?' }),
      ],
    }),
    T({
      id: 't10', title: '帮我给猫喂一次食', category: 'pet',
      description: '周五晚出差一天,家里两只猫(年糕和汤圆)需要喂一次晚饭、铲一次猫砂。猫粮和用量都写好贴在冰箱上,全程约30分钟。',
      date: '2026-07-17', startTime: '19:00', durationMin: 30,
      locationText: '青藤公寓3栋', distanceKm: 2.5, points: 100, serviceFee: 5,
      doneCriteria: '完成喂食和铲砂,拍两张照片确认', visibility: 'community', communityId: 'c2',
      publicPlace: false, enterHome: true,
      riskTier: 'T2', riskFlags: ['进入私人住宅', '宠物照看'],
      status: 'applied', publisherId: 'u10',
      createdAt: '2026-07-09T09:30:00', deadline: '2026-07-16T22:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['🐱', '🍚'],
      skillsRequired: ['宠物'],
      applicants: [
        app('a3', 'u20', 'pending', '宠物医院护士,家有两猫一狗', '喂食铲砂是日常操作,还能顺便看看猫咪状态。', '周五 18:00-21:00 均可', '2026-07-09T12:05:00', { question: '两只猫对陌生人敏感吗?需要提前视频认识一下吗?' }),
        app('a4', 'u14', 'pending', '楼下烘焙店店主,养过猫', '就住隔壁栋,下班顺路。年糕来过我店门口,我们见过。', '周五打烊后 19:30 之后', '2026-07-09T18:22:00'),
      ],
    }),
    T({
      id: 't11', title: '每周英语口语练习30分钟', category: 'language', online: true,
      description: '准备雅思口语,想找人每周固定线上陪练30分钟,话题按 Part2 题库来。先试一次,合适的话长期约。',
      date: '2026-07-16', startTime: '20:00', durationMin: 30,
      locationText: '线上视频', distanceKm: 0, points: 60, serviceFee: 3,
      doneCriteria: '完成30分钟口语练习并给出3条改进建议', visibility: 'all',
      riskTier: 'T0', status: 'applied', publisherId: 'u3',
      createdAt: '2026-07-08T22:30:00', deadline: '2026-07-15T22:00:00',
      cancelPolicy: '开始前2小时可无责取消', images: ['🗣️'],
      skillsRequired: ['语言练习'],
      applicants: [
        app('a5', 'u18', 'pending', '英语专业大四,雅思口语7.5', '刚考完,题库还热乎,能帮你按考官思路练。', '每周四晚都可以', '2026-07-09T08:50:00'),
        app('a6', 'u9', 'pending', '母语葡语,英语流利', '我可以陪你练英语,你顺便帮我纠正中文,双赢!', '晚上 19:00 以后', '2026-07-09T21:15:00'),
      ],
    }),
    T({
      id: 't12', title: '帮我看看简历和自我介绍', category: 'tutoring', online: true,
      description: '工作五年想跳去医疗科技公司,简历改了三版还是不满意。想找人帮我把项目经历讲得更有说服力,顺便模拟一轮自我介绍。',
      date: '2026-07-14', startTime: '21:00', durationMin: 60,
      locationText: '线上视频', distanceKm: 0, points: 90, serviceFee: 5,
      doneCriteria: '输出一版修改后的简历要点+完成一次模拟自我介绍', visibility: 'all',
      riskTier: 'T0', status: 'applied', publisherId: 'u7',
      createdAt: '2026-07-09T23:00:00', deadline: '2026-07-14T18:00:00',
      cancelPolicy: '开始前2小时可无责取消', images: ['📄'],
      skillsRequired: ['学习辅导'],
      applicants: [
        app('a7', 'u6', 'pending', '后端工程师,帮同事改过不少简历', '技术团队视角+面试官视角都能给你,项目经历用STAR法重写。', '工作日 21:00 后', '2026-07-10T00:10:00'),
        app('a8', 'u16', 'pending', '市场总监,看了十年简历', '我从招聘方角度告诉你,哪些话HR只扫两秒。', '周二周四晚', '2026-07-10T07:45:00'),
      ],
    }),
    T({
      id: 't13', title: '带一位转学生熟悉校园半天', category: 'newcomer',
      description: '下周一有位从外省转来的同学报到,需要一位在校生带着走一遍:宿舍、食堂、图书馆、选课系统。学生事务办提供引导手册。',
      date: '2026-07-20', startTime: '09:30', durationMin: 180,
      locationText: '湖畔大学行政楼门口集合', distanceKm: 0.5, points: 80, serviceFee: 4,
      doneCriteria: '完成校园引导并帮其完成选课系统登录', visibility: 'community', communityId: 'c1',
      riskTier: 'T1', status: 'applied', publisherId: 'u22',
      createdAt: '2026-07-07T11:00:00', deadline: '2026-07-18T18:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['🧭', '🏫'],
      skillsRequired: ['社区引导'],
      applicants: [
        app('a9', 'u3', 'pending', '大三,校园活地图', '我大一时也被学长这样带过,想把这份接力传下去。', '周一全天有空', '2026-07-08T09:20:00'),
        app('a10', 'u15', 'pending', '大一新生,刚被引导过', '上个月我自己刚走过一遍流程,记忆最新鲜。', '周一上午可以', '2026-07-08T20:35:00'),
        app('a11', 'u18', 'pending', '大四学姐,做过迎新志愿者', '连做了三年迎新,选课系统的坑我都踩过。', '周一 9:00-13:00', '2026-07-09T15:10:00'),
      ],
    }),

    // ----- matched ×3 -----
    T({
      id: 't14', title: '代取图书馆预约的三本书', category: 'errand',
      description: '预约的三本书到馆了,但我这两天在赶论文。凭我的预约码在服务台代取,送到工科楼908就行。',
      date: '2026-07-11', startTime: '12:30', durationMin: 30,
      locationText: '湖畔大学图书馆服务台', distanceKm: 0.6, points: 40, serviceFee: 2,
      doneCriteria: '三本书送达工科楼908并当面确认', visibility: 'invited', communityId: 'c1',
      riskTier: 'T1', status: 'matched', publisherId: 'u1', helperId: 'u3',
      createdAt: '2026-07-09T10:00:00', deadline: '2026-07-11T11:00:00',
      cancelPolicy: '开始前12小时可全额退回', images: ['📚'],
      skillsRequired: ['跑腿'], chatId: 'ch1',
      applicants: [
        app('a12', 'u3', 'selected', '大三,每天路过图书馆', '中午下课正好顺路,举手之劳。', '周六中午可以', '2026-07-09T11:30:00'),
      ],
    }),
    T({
      id: 't15', title: '羽毛球陪练一小时', category: 'sports',
      description: '公司羽毛球赛下周开打,赛前想找人认真练一小时,重点练接杀和后场高远球。园区场地我来订。',
      date: '2026-07-12', startTime: '10:00', durationMin: 60,
      locationText: '星洲科技园羽毛球馆', distanceKm: 3.1, points: 80, serviceFee: 4,
      doneCriteria: '完成1小时对打并互相确认', visibility: 'all', communityId: 'c4',
      riskTier: 'T1', status: 'matched', publisherId: 'u5', helperId: 'u1',
      createdAt: '2026-07-08T12:20:00', deadline: '2026-07-11T22:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['🏸'],
      skillsRequired: ['羽毛球'], chatId: 'ch2',
      applicants: [
        app('a13', 'u1', 'selected', '校羽毛球院队替补,打了六年', '接杀和高远球正好是我的强项,可以带多球练。', '周日上午可以', '2026-07-08T15:40:00', { hasEquipment: true }),
        app('a14', 'u3', 'declined', '业余爱好者', '水平一般但体力好,可以陪跑动。', '周日全天', '2026-07-08T18:05:00'),
      ],
    }),
    T({
      id: 't16', title: '宿舍书桌安装', category: 'installation',
      description: '网购的电脑桌到了,一箱零件加一张看不懂的图纸。宿舍在6号楼一层,有工具的师傅优先,预计一小时内装完。',
      date: '2026-07-13', startTime: '19:00', durationMin: 60,
      locationText: '湖畔大学6号宿舍楼', distanceKm: 0.5, points: 70, serviceFee: 4,
      doneCriteria: '书桌安装完成且桌面平稳', visibility: 'nearby',
      publicPlace: false, enterHome: true,
      riskTier: 'T2', riskFlags: ['进入私人住宅'],
      status: 'matched', publisherId: 'u15', helperId: 'u11',
      createdAt: '2026-07-08T16:50:00', deadline: '2026-07-13T12:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['🔧', '🪑'],
      skillsRequired: ['简单安装'], chatId: 'ch3',
      applicants: [
        app('a15', 'u11', 'selected', '配送员,天天跟家具打交道', '这种桌子我装过至少二十张,带全套工具。', '周一晚 19:00 后', '2026-07-09T07:55:00', { hasEquipment: true }),
      ],
    }),

    // ----- starting_soon ×1 -----
    T({
      id: 't17', title: '明早滨江步道跑5公里', category: 'sports',
      description: '明早7点滨江步道南入口出发,配速6分半左右,跑完拉伸十分钟。一个人总是起不来,需要一个不放鸽子的搭档。',
      date: '2026-07-11', startTime: '07:00', durationMin: 45,
      locationText: '滨江步道南入口', distanceKm: 2.0, points: 50, serviceFee: 3,
      doneCriteria: '完成5公里并互相确认', visibility: 'all',
      riskTier: 'T1', status: 'starting_soon', publisherId: 'u16', helperId: 'u5',
      createdAt: '2026-07-09T13:10:00', deadline: '2026-07-10T22:00:00',
      cancelPolicy: '开始前12小时可全额退回', images: ['🏃', '🌅'],
      skillsRequired: ['跑步'], chatId: 'ch4',
      applicants: [
        app('a16', 'u5', 'selected', '晨跑十年,全马430', '我每天6点半就在滨江步道,你只要出现就行,剩下交给我。', '每天早上都可以', '2026-07-09T14:00:00'),
      ],
    }),

    // ----- in_progress ×2 -----
    T({
      id: 't18', title: '帮我把作品集网页部署上线', category: 'digital', online: true,
      description: '插画作品集网页本地能跑,但完全不懂部署和域名。希望远程带我操作一遍:买域名、部署、绑定,最好我自己以后能更新。',
      date: '2026-07-09', startTime: '20:30', durationMin: 90,
      locationText: '线上屏幕共享', distanceKm: 0, points: 150, serviceFee: 8,
      doneCriteria: '网站可通过域名访问,且我能独立更新一次内容', visibility: 'all',
      riskTier: 'T0', status: 'in_progress', publisherId: 'u17', helperId: 'u1',
      createdAt: '2026-07-07T23:40:00', deadline: '2026-07-09T18:00:00',
      cancelPolicy: '开始前2小时可无责取消', images: ['💻', '🎨'],
      skillsRequired: ['编程'], chatId: 'ch5', startedAt: '2026-07-09T20:30:00',
      applicants: [
        app('a17', 'u1', 'selected', '软件工程研二,部署过十几个站', '静态站部署20分钟搞定,剩下时间教你自己更新。', '晚上 20:00 后', '2026-07-08T09:15:00'),
        app('a18', 'u6', 'declined', '后端工程师', '可以帮忙,不过我更熟服务器端。', '周末白天', '2026-07-08T12:30:00'),
      ],
    }),
    T({
      id: 't19', title: '陪我去银行开通手机银行', category: 'companion',
      description: '想开通手机银行给孙子发红包,自己去问了一次没听懂。需要有人陪我去网点,帮我把柜员的话"翻译"成我能懂的。',
      date: '2026-07-10', startTime: '09:30', durationMin: 90,
      locationText: '梧桐路建设银行网点', distanceKm: 1.5, points: 100, serviceFee: 5,
      doneCriteria: '手机银行开通成功并演示一次转账流程(不实际转账)', visibility: 'community', communityId: 'c6',
      riskTier: 'T1', riskFlags: ['涉及金融操作,仅陪同指导,不代操作'],
      status: 'in_progress', publisherId: 'u13', helperId: 'u8',
      createdAt: '2026-07-08T10:20:00', deadline: '2026-07-10T08:00:00',
      cancelPolicy: '开始前12小时可全额退回', images: ['🏦'],
      skillsRequired: ['数码设备', '活动陪同'], chatId: 'ch6', startedAt: '2026-07-10T09:35:00',
      applicants: [
        app('a19', 'u8', 'selected', '银发课堂讲师,陪办过几十次', '银行流程我熟,涉及密码的环节我会回避,您放心。', '周五上午可以', '2026-07-08T11:00:00'),
      ],
    }),

    // ----- pending_confirm ×2 -----
    T({
      id: 't20', title: '顺路帮我取两件快递', category: 'errand',
      description: '两件快递在校门口驿站,一件文件一件键盘。我在实验室走不开,送到工科楼楼下找我就行。',
      date: '2026-07-09', startTime: '18:00', durationMin: 20,
      locationText: '湖畔大学东门驿站', distanceKm: 0.4, points: 40, serviceFee: 2,
      doneCriteria: '两件快递当面交接', visibility: 'nearby',
      riskTier: 'T1', status: 'pending_confirm', publisherId: 'u1', helperId: 'u19',
      createdAt: '2026-07-09T14:30:00', deadline: '2026-07-09T17:00:00',
      cancelPolicy: '取件前可随时取消', images: ['📦'],
      skillsRequired: ['跑腿'], chatId: 'ch7', submittedAt: '2026-07-09T18:40:00',
      applicants: [
        app('a20', 'u19', 'selected', '骑手,正好在这片跑单', '18点左右刚好路过东门,顺手的事。', '今天 17:30-19:00', '2026-07-09T15:10:00'),
        app('a21', 'u11', 'declined', '下班顺路', '晚上7点后可以帮取。', '19:00 后', '2026-07-09T15:40:00'),
      ],
    }),
    T({
      id: 't21', title: '出差期间帮我给绿植浇一次水', category: 'errand',
      description: '出差四天,阳台上一排绿萝和两盆龟背竹需要中途浇一次水。钥匙放物业前台,浇完拍张全景照给我就行。',
      date: '2026-07-09', startTime: '19:30', durationMin: 20,
      locationText: '星洲公寓B座', distanceKm: 3.4, points: 50, serviceFee: 3,
      doneCriteria: '完成浇水并拍照确认', visibility: 'all',
      publicPlace: false, enterHome: true,
      riskTier: 'T2', riskFlags: ['进入私人住宅'],
      status: 'pending_confirm', publisherId: 'u16', helperId: 'u10',
      createdAt: '2026-07-06T21:00:00', deadline: '2026-07-09T12:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['🪴'],
      chatId: 'ch8', submittedAt: '2026-07-09T20:10:00',
      applicants: [
        app('a22', 'u10', 'selected', '同小区邻居,养花多年', '我就住隔壁栋,龟背竹的浇法我懂,不会烂根。', '周四晚都可以', '2026-07-07T08:40:00'),
      ],
    }),

    // ----- completed ×6 -----
    T({
      id: 't22', title: '教我入门吉他和弦', category: 'tutoring',
      description: '一直想学吉他,琴买了半年还在吃灰。想学会 C、G、Am、F 四个和弦和基本扫弦,能弹一首简单的歌就算成功。',
      date: '2026-07-04', startTime: '15:00', durationMin: 60,
      locationText: '湖畔大学琴房', distanceKm: 0.3, points: 60, serviceFee: 3,
      doneCriteria: '能完整弹唱一段《平凡之路》副歌', visibility: 'community', communityId: 'c1',
      riskTier: 'T1', status: 'completed', publisherId: 'u1', helperId: 'u15',
      createdAt: '2026-07-01T20:00:00', deadline: '2026-07-03T22:00:00',
      cancelPolicy: '开始前12小时可全额退回', images: ['🎸'],
      skillsRequired: ['吉他'], completedAt: '2026-07-04T16:10:00', storyId: 'p6',
      applicants: [
        app('a23', 'u15', 'selected', '吉他社大一,弹了五年', 'F和弦大横按我有独家土办法,保证你一节课能按响。', '周六下午可以', '2026-07-02T10:20:00', { hasEquipment: true }),
      ],
      reviews: [
        rv('rv1', 't22', 'u1', 'u15', '教得特别有耐心,F和弦的"土办法"真的管用,一小时真弹出了副歌。', '2026-07-04T18:30:00'),
        rv('rv2', 't22', 'u15', 'u1', '学得很快,还请我喝了杯奶茶。第一次在平台接单,体验很好。', '2026-07-04T19:00:00'),
      ],
    }),
    T({
      id: 't23', title: '帮拍一组毕业纪念照', category: 'photography',
      description: '毕业前最后一周,想在樱花道、图书馆和宿舍楼下拍一组纪念照。风格自然就好,大概一小时,底片全要。',
      date: '2026-07-03', startTime: '17:00', durationMin: 60,
      locationText: '湖畔大学樱花道', distanceKm: 0.3, points: 120, serviceFee: 6,
      doneCriteria: '交付20张原图+5张精修', visibility: 'community', communityId: 'c1',
      riskTier: 'T1', status: 'completed', publisherId: 'u18', helperId: 'u1',
      createdAt: '2026-06-29T21:30:00', deadline: '2026-07-02T22:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['📷', '🎓'],
      skillsRequired: ['摄影'], chatId: 'ch10', completedAt: '2026-07-03T18:00:00', storyId: 'p2',
      applicants: [
        app('a24', 'u1', 'selected', '研二,校园人像拍了三年', '樱花道傍晚的光我很熟,17点逆光最出片。', '周五傍晚可以', '2026-06-30T08:45:00', { hasEquipment: true }),
        app('a25', 'u2', 'declined', '职业摄影师', '可以拍,但周五要接娃,时间要改到上午。', '仅上午', '2026-06-30T10:30:00', { hasEquipment: true }),
      ],
      reviews: [
        rv('rv3', 't23', 'u18', 'u1', '照片比我想象中好太多!精修给了8张,毕业最好的礼物。', '2026-07-04T09:20:00'),
        rv('rv4', 't23', 'u1', 'u18', '沟通清晰,提前把想要的感觉发了参考图,拍摄很顺利。', '2026-07-04T10:05:00'),
      ],
    }),
    T({
      id: 't24', title: '一对一Python入门辅导两小时', category: 'tutoring', online: true,
      description: '产品经理想学Python处理数据,看视频总是坚持不下来。想找人带我搭好环境,写出第一个能用的脚本。',
      date: '2026-06-27', startTime: '20:00', durationMin: 120,
      locationText: '线上屏幕共享', distanceKm: 0, points: 150, serviceFee: 8,
      doneCriteria: '独立写出一个读Excel并汇总的脚本', visibility: 'all',
      riskTier: 'T0', status: 'completed', publisherId: 'u5', helperId: 'u1',
      createdAt: '2026-06-24T12:00:00', deadline: '2026-06-27T12:00:00',
      cancelPolicy: '开始前2小时可无责取消', images: ['🐍', '💻'],
      skillsRequired: ['编程'], completedAt: '2026-06-27T22:05:00', storyId: 'p4',
      applicants: [
        app('a26', 'u1', 'selected', '研二,带过三个师弟入门', '两小时:前30分钟装环境,后90分钟直接写你工作里的真实需求。', '周六晚可以', '2026-06-24T18:20:00'),
        app('a27', 'u6', 'declined', '后端工程师', '可以教,不过我风格偏硬核。', '周日白天', '2026-06-25T09:00:00'),
      ],
      reviews: [
        rv('rv5', 't24', 'u5', 'u1', '用我自己的周报数据教我写脚本,下课就能用,这钱花得值。', '2026-06-28T08:30:00'),
        rv('rv6', 't24', 'u1', 'u5', '目标特别明确的学员,预习做得比我备课还认真。', '2026-06-28T09:10:00'),
      ],
    }),
    T({
      id: 't25', title: '周末网球新手对打', category: 'sports',
      description: '学了三个月网球,还没跟真人打过。想找位有耐心的搭档陪打一小时,不嫌弃我捡球时间比打球长。',
      date: '2026-07-05', startTime: '16:00', durationMin: 90,
      locationText: '城南网球俱乐部 5号场', distanceKm: 3.7, points: 100, serviceFee: 5,
      doneCriteria: '完成1小时对打并互相确认', visibility: 'all', communityId: 'c5',
      riskTier: 'T1', status: 'completed', publisherId: 'u6', helperId: 'u12',
      createdAt: '2026-07-01T13:00:00', deadline: '2026-07-04T20:00:00',
      cancelPolicy: '开始前24小时可全额退回,雨天顺延', images: ['🎾'],
      skillsRequired: ['网球'], completedAt: '2026-07-05T17:30:00', storyId: 'p1',
      applicants: [
        app('a28', 'u12', 'selected', '俱乐部教练助理', '带新手是我的日常,保证你这一小时打到的球比过去三个月都多。', '周日下午可以', '2026-07-01T15:30:00', { hasEquipment: true }),
        app('a29', 'u20', 'declined', '业余打了两年', '可以陪打,不过我周日要值班,得换时间。', '仅周六', '2026-07-02T09:10:00'),
      ],
      reviews: [
        rv('rv7', 't25', 'u6', 'u12', '雅琪太会教了,一小时下来我居然能连续对拉十拍。已经约好下周继续!', '2026-07-05T21:00:00'),
        rv('rv8', 't25', 'u12', 'u6', '进步飞快的学员,态度认真,捡球都在小跑。欢迎来俱乐部新手日。', '2026-07-05T21:40:00'),
      ],
    }),
    T({
      id: 't26', title: '教我和老姐妹用视频通话', category: 'digital',
      description: '我学会视频通话了,但我老姐妹还不会,她总说学不会。想请老师到社区活动室,把我们俩一起教会,以后我们天天视频。',
      date: '2026-07-06', startTime: '10:00', durationMin: 60,
      locationText: '银发数字课堂活动室', distanceKm: 1.8, points: 80, serviceFee: 4,
      doneCriteria: '两人互相拨通一次视频电话', visibility: 'community', communityId: 'c6',
      riskTier: 'T1', status: 'completed', publisherId: 'u4', helperId: 'u8',
      createdAt: '2026-07-03T09:40:00', deadline: '2026-07-05T18:00:00',
      cancelPolicy: '开始前4小时可无责取消', images: ['📱', '👵'],
      skillsRequired: ['数码设备'], completedAt: '2026-07-06T11:00:00', storyId: 'p3',
      applicants: [
        app('a30', 'u8', 'selected', '银发课堂讲师', '教两位一起学效果最好,互相就是最好的练习对象。', '周一上午可以', '2026-07-03T10:15:00'),
      ],
      reviews: [
        rv('rv9', 't26', 'u4', 'u8', '何老师教得慢、声音大、不嫌烦。我们俩当场就视频上了,她笑得像个孩子。', '2026-07-06T15:20:00'),
        rv('rv10', 't26', 'u8', 'u4', '李阿姨学得认真,还带了自己烤的桃酥。这样的任务我可以做一辈子。', '2026-07-06T16:00:00'),
      ],
    }),
    T({
      id: 't27', title: '帮忙搬十箱物料到店里', category: 'moving',
      description: '店里进了十箱面粉和包装盒,货车只送到公寓门口。需要帮忙搬到一楼店内,大约二十米,每箱15公斤左右。',
      date: '2026-07-02', startTime: '09:00', durationMin: 60,
      locationText: '青藤公寓南门 → 麦芽糖烘焙店', distanceKm: 2.6, points: 100, serviceFee: 5,
      doneCriteria: '十箱物料全部入店摆放到位', visibility: 'nearby', communityId: 'c2',
      riskTier: 'T1', status: 'completed', publisherId: 'u14', helperId: 'u11',
      createdAt: '2026-06-30T19:00:00', deadline: '2026-07-02T08:00:00',
      cancelPolicy: '开始前12小时可全额退回', images: ['📦', '🥖'],
      skillsRequired: ['搬运'], completedAt: '2026-07-02T10:40:00', storyId: 'p5',
      applicants: [
        app('a31', 'u11', 'selected', '配送员,搬运是本行', '15公斤的箱子小意思,我带个小推车,半小时搞定。', '周四上午可以', '2026-06-30T20:30:00', { hasEquipment: true }),
        app('a32', 'u19', 'declined', '骑手,有空可以搭把手', '上午要跑单,10点后才有空。', '10:30 后', '2026-07-01T07:20:00'),
      ],
      reviews: [
        rv('rv11', 't27', 'u14', 'u11', '志强师傅带着推车来的,还帮我把面粉按日期码好了,专业!送了他两个可颂。', '2026-07-02T12:00:00'),
        rv('rv12', 't27', 'u11', 'u14', '店主人很好,搬完还管早饭。距离近活儿轻,这单舒服。', '2026-07-02T12:30:00', { clearComm: 5, respectBoundary: 5 }),
      ],
    }),

    // ----- disputed ×1 -----
    T({
      id: 't28', title: '帮忙组装一个书架', category: 'installation',
      description: '五层实木书架,零件挺多,图纸只有英文。希望有经验的邻居帮忙装好,大概一个半小时。',
      date: '2026-07-07', startTime: '19:00', durationMin: 90,
      locationText: '青藤公寓5栋', distanceKm: 2.5, points: 120, serviceFee: 6,
      doneCriteria: '书架组装完成、放置平稳、五层可承重', visibility: 'all', communityId: 'c2',
      publicPlace: false, enterHome: true,
      riskTier: 'T2', riskFlags: ['进入私人住宅'],
      status: 'disputed', publisherId: 'u7', helperId: 'u1',
      createdAt: '2026-07-05T22:10:00', deadline: '2026-07-07T12:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['🪵', '🔧'],
      skillsRequired: ['简单安装'], chatId: 'ch9',
      startedAt: '2026-07-07T19:05:00', submittedAt: '2026-07-07T20:40:00',
      applicants: [
        app('a33', 'u1', 'selected', '研究生,宿舍家具都是自己装', '英文图纸没问题,我装过同款品牌的架子。', '周二晚可以', '2026-07-06T09:30:00', { hasEquipment: true }),
      ],
    }),

    // ----- cancelled ×2 -----
    T({
      id: 't29', title: '陪我去口腔医院拔智齿', category: 'companion',
      description: '约了周四上午拔智齿,医生说打麻药后最好有人陪同回家。找位靠谱的邻居陪我走一趟,来回大概两小时。',
      date: '2026-07-09', startTime: '09:00', durationMin: 120,
      locationText: '市口腔医院', distanceKm: 4.8, points: 80, serviceFee: 4,
      doneCriteria: '陪同就诊并送回小区门口', visibility: 'all',
      riskTier: 'T1', status: 'cancelled', publisherId: 'u9', helperId: 'u20',
      createdAt: '2026-07-06T14:00:00', deadline: '2026-07-08T18:00:00',
      cancelPolicy: '开始前24小时可全额退回,不足24小时扣10%补偿帮助者', images: ['🏥'],
      skillsRequired: ['活动陪同'],
      cancelledBy: 'u9', cancelReason: '门诊临时改期,提前不足24小时取消',
      applicants: [
        app('a34', 'u20', 'selected', '护士,陪诊有经验', '拔牙后的注意事项我可以顺便讲给你,冰袋我带。', '周四上午可以', '2026-07-06T16:20:00'),
      ],
    }),
    T({
      id: 't30', title: '帮忙把旧沙发搬下楼', category: 'moving',
      description: '换了新沙发,旧的三人位要搬到楼下回收点。楼里有电梯,主要是需要一个能搭把手的人,半小时搞定。',
      date: '2026-07-08', startTime: '19:30', durationMin: 30,
      locationText: '青藤公寓5栋', distanceKm: 2.5, points: 90, serviceFee: 5,
      doneCriteria: '沙发搬到回收点并拍照确认', visibility: 'community', communityId: 'c2',
      publicPlace: false, enterHome: true,
      riskTier: 'T2', riskFlags: ['进入私人住宅'],
      status: 'cancelled', publisherId: 'u7', helperId: 'u21',
      createdAt: '2026-07-05T11:30:00', deadline: '2026-07-08T12:00:00',
      cancelPolicy: '开始前12小时可全额退回', images: ['🛋️'],
      skillsRequired: ['搬运'],
      cancelledBy: 'u21', cancelReason: '帮手临时有事,开始前3小时取消',
      applicants: [
        app('a35', 'u21', 'selected', '住3栋,晚上有空', '有搬运经验,楼下见。', '周三晚可以', '2026-07-05T13:40:00'),
        app('a36', 'u11', 'declined', '专业搬运', '周三晚要先送一趟货,20:30后才能到。', '20:30 后', '2026-07-05T14:10:00'),
      ],
    }),

    // ----- blocked ×2 -----
    T({
      id: 't31', title: '每天下午帮接孩子放学', category: 'companion',
      description: '想找人每天下午4点从小学接7岁的女儿回家,周一到周五,长期合作。',
      date: '2026-07-13', startTime: '16:00', durationMin: 40,
      locationText: '梧桐路第一小学', distanceKm: 1.4, points: 200, serviceFee: 10,
      doneCriteria: '安全接送到家', visibility: 'all', communityId: 'c3',
      riskTier: 'T3', riskFlags: ['涉及未成年人', '定期重复任务'],
      status: 'blocked', publisherId: 'u2',
      createdAt: '2026-07-08T13:20:00', deadline: '2026-07-12T18:00:00',
      cancelPolicy: '开始前24小时可全额退回', images: ['🎒'],
      blockReason: '涉及未成年人接送,属于受监管服务',
    }),
    T({
      id: 't32', title: '帮我垫付买5张礼品卡再寄给我', category: 'errand',
      description: '急用5张1000元的电商礼品卡,你先垫付购买,拍卡密给我,积分加倍补偿,另外加微信细聊。',
      date: '2026-07-10', startTime: '12:00', durationMin: 30,
      locationText: '不限', distanceKm: 3.9, points: 200, serviceFee: 10,
      doneCriteria: '卡密拍照发送', visibility: 'all',
      riskTier: 'T4', riskFlags: ['疑似诈骗', '要求垫付资金', '引导站外交易'],
      status: 'blocked', publisherId: 'u21',
      createdAt: '2026-07-10T02:30:00', deadline: '2026-07-10T11:00:00',
      cancelPolicy: '—', images: ['💳'],
      blockReason: '疑似诈骗:要求垫付购买礼品卡',
    }),
  ]

  // ---------- 账本 ----------
  const ledger: LedgerEntry[] = [
    // 分阶段新用户奖励:手机验证50 / 完善资料50(L1+)/ 身份认证100(L2+)
    ...users.flatMap((u) => {
      const out = [
        led({ from: 'sys:issuer', to: u.id, amount: 50, type: 'signup_bonus', createdAt: u.joinedAt, memo: '新用户奖励:手机验证' }),
      ]
      if (u.level >= 1) {
        out.push(led({ from: 'sys:issuer', to: u.id, amount: 50, type: 'signup_bonus', createdAt: u.joinedAt, memo: '新用户奖励:完善资料' }))
      }
      if (u.level >= 2) {
        out.push(led({ from: 'sys:issuer', to: u.id, amount: 100, type: 'signup_bonus', createdAt: u.joinedAt, memo: '新用户奖励:身份认证' }))
      }
      return out
    }),

    // 社区补贴与人工调整(保证活跃发布者余额充足)
    led({ from: 'sys:community_pool', to: 'u18', amount: 100, type: 'community_grant', createdAt: '2026-06-15T10:00:00', memo: '毕业季校园互助补贴' }),
    led({ from: 'sys:community_pool', to: 'u5', amount: 150, type: 'community_grant', createdAt: '2026-06-20T09:00:00', memo: '六月「园区互助之星」社区补贴' }),
    led({ from: 'sys:community_pool', to: 'u14', amount: 100, type: 'community_grant', createdAt: '2026-06-20T09:05:00', memo: '青藤公寓商户共建补贴' }),
    led({ from: 'sys:community_pool', to: 'u7', amount: 150, type: 'community_grant', createdAt: '2026-07-01T09:00:00', memo: '新居民安家互助补贴' }),
    led({ from: 'sys:community_pool', to: 'u17', amount: 150, type: 'community_grant', createdAt: '2026-07-01T09:10:00', memo: '街区创作者扶持补贴' }),
    led({ from: 'sys:community_pool', to: 'u4', amount: 100, type: 'community_grant', createdAt: '2026-07-01T09:20:00', memo: '长者数字融入计划补贴' }),
    led({ from: 'sys:issuer', to: 'u13', amount: 100, type: 'manual_adjust', createdAt: '2026-07-01T15:00:00', operator: 'admin', memo: '补发六月长者数字融入补贴(客服工单#4821)' }),

    // 已完成任务的完整积分链
    ...chain('t24', '一对一Python入门辅导两小时', 'u5', 'u1', 150, 8, [3, 3, 2], '2026-06-24T18:30:00', '2026-06-27T22:05:00'),
    ...chain('t23', '帮拍一组毕业纪念照', 'u18', 'u1', 120, 6, [2, 2, 2], '2026-06-30T09:00:00', '2026-07-03T18:00:00'),
    ...chain('t27', '帮忙搬十箱物料到店里', 'u14', 'u11', 100, 5, [2, 2, 1], '2026-06-30T20:45:00', '2026-07-02T10:40:00'),
    ...chain('t22', '教我入门吉他和弦', 'u1', 'u15', 60, 3, [1, 1, 1], '2026-07-02T10:30:00', '2026-07-04T16:10:00'),
    ...chain('t25', '周末网球新手对打', 'u6', 'u12', 100, 5, [2, 2, 1], '2026-07-01T16:00:00', '2026-07-05T17:30:00'),
    ...chain('t26', '教我和老姐妹用视频通话', 'u4', 'u8', 80, 4, [1, 2, 1], '2026-07-03T10:20:00', '2026-07-06T11:00:00'),

    // 已取消任务:锁定 → 退款(+临近取消补偿)
    led({ taskId: 't30', from: 'u7', to: 'sys:escrow', amount: 95, type: 'task_lock', createdAt: '2026-07-05T13:50:00', memo: '「帮忙把旧沙发搬下楼」积分与服务费托管锁定' }),
    led({ taskId: 't29', from: 'u9', to: 'sys:escrow', amount: 84, type: 'task_lock', createdAt: '2026-07-06T16:30:00', memo: '「陪我去口腔医院拔智齿」积分与服务费托管锁定' }),
    led({ taskId: 't29', from: 'sys:escrow', to: 'u9', amount: 76, type: 'task_refund', createdAt: '2026-07-08T14:05:00', memo: '发布者取消,退款(扣除临近取消补偿)' }),
    led({ taskId: 't29', from: 'sys:escrow', to: 'u20', amount: 8, type: 'cancel_compensation', createdAt: '2026-07-08T14:05:00', memo: '发布者开始前不足24小时取消,补偿帮助者' }),
    led({ taskId: 't30', from: 'sys:escrow', to: 'u7', amount: 95, type: 'task_refund', createdAt: '2026-07-08T16:30:00', memo: '帮手临时取消,全额退回发布者' }),

    // 争议中任务:锁定 → 冻结
    led({ taskId: 't28', from: 'u7', to: 'sys:escrow', amount: 126, type: 'task_lock', createdAt: '2026-07-06T09:35:00', memo: '「帮忙组装一个书架」积分与服务费托管锁定' }),
    led({ taskId: 't28', from: 'sys:escrow', to: 'sys:escrow', amount: 126, type: 'dispute_freeze', createdAt: '2026-07-08T09:00:00', status: 'frozen', memo: '发布者对完成结果有异议,托管积分冻结待裁决' }),

    // 已匹配/进行中/待确认任务:锁定中
    lock('t15', '羽毛球陪练一小时', 'u5', 84, '2026-07-08T15:45:00'),
    lock('t18', '帮我把作品集网页部署上线', 'u17', 158, '2026-07-08T09:20:00'),
    lock('t19', '陪我去银行开通手机银行', 'u13', 105, '2026-07-08T11:05:00'),
    lock('t21', '出差期间帮我给绿植浇一次水', 'u16', 53, '2026-07-07T08:45:00'),
    lock('t16', '宿舍书桌安装', 'u15', 74, '2026-07-09T08:00:00'),
    lock('t14', '代取图书馆预约的三本书', 'u1', 42, '2026-07-09T11:35:00'),
    lock('t17', '明早滨江步道跑5公里', 'u16', 53, '2026-07-09T14:05:00'),
    lock('t20', '顺路帮我取两件快递', 'u1', 42, '2026-07-09T15:15:00'),
  ]

  // ---------- 聊天(11) ----------
  const chats: ChatThread[] = [
    {
      id: 'ch1', taskId: 't14', memberIds: ['u1', 'u3'],
      messages: [
        msg('ch1-m1', 'system', '📌 任务约定:7月11日 12:30 · 湖畔大学图书馆服务台 · 40pt · 三本书送达工科楼908', '2026-07-09T11:35:00', { system: true }),
        msg('ch1-m2', 'u1', '预约码发你了,书名是《分布式系统》那三本,服务台报我学号就行。', '2026-07-09T11:40:00'),
        msg('ch1-m3', 'u3', '收到~明天下课12:20左右到服务台,取完直接给你送过去。', '2026-07-09T12:02:00'),
        msg('ch1-m4', 'u1', '好,我在908,到楼下叫我一声就行,辛苦!', '2026-07-09T12:05:00'),
      ],
    },
    {
      id: 'ch2', taskId: 't15', memberIds: ['u5', 'u1'],
      messages: [
        msg('ch2-m1', 'system', '📌 任务约定:7月12日 10:00 · 星洲科技园羽毛球馆 · 80pt · 完成1小时对打并互相确认', '2026-07-08T15:45:00', { system: true }),
        msg('ch2-m2', 'u5', '场地订好了,3号场,馆里有饮水机。', '2026-07-08T16:00:00'),
        msg('ch2-m3', 'u1', '好的,我带两桶训练球。重点练接杀对吧?', '2026-07-08T16:12:00'),
        msg('ch2-m4', 'u5', '对,后场高远球也帮我盯一下,比赛总被压制。', '2026-07-08T16:15:00'),
        msg('ch2-m5', 'u1', '没问题。那个馆地板有点滑,穿抓地好点的鞋。', '2026-07-08T16:20:00'),
      ],
    },
    {
      id: 'ch3', taskId: 't16', memberIds: ['u15', 'u11'],
      messages: [
        msg('ch3-m1', 'system', '📌 任务约定:7月13日 19:00 · 湖畔大学6号宿舍楼 · 70pt · 书桌安装完成且桌面平稳', '2026-07-09T08:00:00', { system: true }),
        msg('ch3-m2', 'u11', '把图纸和零件包拍给我看下,我先确认零件全不全,免得白跑。', '2026-07-09T08:30:00'),
        msg('ch3-m3', 'u15', '拍好了,螺丝分了ABC三包,应该是全的。', '2026-07-09T09:10:00'),
        msg('ch3-m4', 'u15', '对了师傅,要不加个微信?我直接发你红包,平台还要扣服务费。', '2026-07-09T09:12:00', { riskWarning: '检测到疑似站外交易引导,请保持站内沟通' }),
        msg('ch3-m5', 'u11', '就走平台结吧,积分有托管,对咱俩都有保障。', '2026-07-09T09:20:00'),
        msg('ch3-m6', 'u15', '行,听师傅的😅 周一晚见。', '2026-07-09T09:22:00'),
      ],
    },
    {
      id: 'ch4', taskId: 't17', memberIds: ['u16', 'u5'],
      messages: [
        msg('ch4-m1', 'system', '📌 任务约定:7月11日 07:00 · 滨江步道南入口 · 50pt · 完成5公里并互相确认', '2026-07-09T14:05:00', { system: true }),
        msg('ch4-m2', 'u5', '明早6:55南入口的银杏树下等你,配速6分半,跑不动随时喊停。', '2026-07-10T21:00:00'),
        msg('ch4-m3', 'u16', '收到!闹钟已定三个,这次一定起得来。', '2026-07-10T21:20:00'),
      ],
    },
    {
      id: 'ch5', taskId: 't18', memberIds: ['u17', 'u1'],
      messages: [
        msg('ch5-m1', 'system', '📌 任务约定:7月9日 20:30 · 线上屏幕共享 · 150pt · 网站可访问且发布者能独立更新', '2026-07-08T09:20:00', { system: true }),
        msg('ch5-m2', 'u1', '域名想好了吗?一会儿共享屏幕我带你注册。', '2026-07-09T19:00:00'),
        msg('ch5-m3', 'u17', 'duruofei.art 还没被注册,我查过了(得意)。', '2026-07-09T19:10:00'),
        msg('ch5-m4', 'u1', '不错,很有辨识度。编辑器装好了吧?20:30准时开始。', '2026-07-09T19:15:00'),
        msg('ch5-m5', 'u17', '装好了!画都导出成webp了,今晚辛苦。', '2026-07-09T19:30:00'),
        msg('ch5-m6', 'u1', '部署一半了,域名解析要等十来分钟,先教你怎么更新作品。', '2026-07-09T21:40:00'),
      ],
    },
    {
      id: 'ch6', taskId: 't19', memberIds: ['u13', 'u8'],
      messages: [
        msg('ch6-m1', 'system', '📌 任务约定:7月10日 09:30 · 梧桐路建设银行网点 · 100pt · 开通手机银行并演示转账流程', '2026-07-08T11:05:00', { system: true }),
        msg('ch6-m2', 'u8', '徐叔,明天记得带身份证和银行卡。所有输密码的环节我都会转过身去,您自己操作。', '2026-07-09T17:00:00'),
        msg('ch6-m3', 'u13', '好的好的,我八点半就出门,老习惯,宁早勿晚。', '2026-07-09T17:30:00'),
        msg('ch6-m4', 'u8', '不用那么早,九点一刻网点门口见就行,我穿蓝色的马甲。', '2026-07-09T17:35:00'),
        msg('ch6-m5', 'u13', '到了,我在门口长椅这里。', '2026-07-10T09:12:00'),
      ],
    },
    {
      id: 'ch7', taskId: 't20', memberIds: ['u1', 'u19'],
      messages: [
        msg('ch7-m1', 'system', '📌 任务约定:7月9日 18:00 · 湖畔大学东门驿站 · 40pt · 两件快递当面交接', '2026-07-09T15:15:00', { system: true }),
        msg('ch7-m2', 'u19', '两件都取到了,键盘那箱有点大,我用车驮过去。', '2026-07-09T18:20:00'),
        msg('ch7-m3', 'u1', '辛苦!我这就下楼,在工科楼门口等你。', '2026-07-09T18:22:00'),
        msg('ch7-m4', 'u19', '已送达,交接照片传上去了,麻烦确认一下~', '2026-07-09T18:40:00'),
        msg('ch7-m5', 'u1', '收到,今晚我确认,积分就到你账上了。', '2026-07-09T18:45:00'),
      ],
    },
    {
      id: 'ch8', taskId: 't21', memberIds: ['u16', 'u10'],
      messages: [
        msg('ch8-m1', 'system', '📌 任务约定:7月9日 19:30 · 星洲公寓B座 · 50pt · 完成浇水并拍照确认', '2026-07-07T08:45:00', { system: true }),
        msg('ch8-m2', 'u10', '钥匙从物业王姐那里拿到了,登记过了。', '2026-07-09T19:25:00'),
        msg('ch8-m3', 'u10', '浇完啦,全景照传上去了。龟背竹状态很好,绿萝有两片黄叶我顺手摘了。', '2026-07-09T20:10:00'),
        msg('ch8-m4', 'u16', '太感谢了!回来给你带特产。钥匙记得还前台呀。', '2026-07-09T20:30:00'),
        msg('ch8-m5', 'u10', '已经还了,王姐签收的,放心出差~', '2026-07-09T20:45:00'),
      ],
    },
    {
      id: 'ch9', taskId: 't28', memberIds: ['u7', 'u1'],
      messages: [
        msg('ch9-m1', 'system', '📌 任务约定:7月7日 19:00 · 青藤公寓5栋 · 120pt · 书架组装完成、放置平稳、五层可承重', '2026-07-06T09:35:00', { system: true }),
        msg('ch9-m2', 'u1', '装好了,五层都上了承重条,你验收一下。完工照片我传到任务里了。', '2026-07-07T20:35:00'),
        msg('ch9-m3', 'u7', '我刚把书放上去,第三层有点晃。而且隔板颜色深浅不一,是不是有块装反了?', '2026-07-07T21:10:00'),
        msg('ch9-m4', 'u1', '深浅是实木木纹本身的差异,图纸编号我都核对过。晃动可能是地面不平,我明天可以过来免费调平。', '2026-07-07T21:18:00'),
        msg('ch9-m5', 'u7', '说明书写的是"完全稳固",我觉得没达标,先不确认了。', '2026-07-07T21:30:00'),
        msg('ch9-m6', 'u1', '那我申请平台介入吧,聊天记录和完工照片都在,听平台的。', '2026-07-07T21:35:00'),
        msg('ch9-m7', 'system', '发布者选择了「未完成」,任务进入争议流程,托管积分已冻结。', '2026-07-08T09:00:00', { system: true }),
      ],
    },
    {
      id: 'ch10', taskId: 't23', memberIds: ['u18', 'u1'],
      messages: [
        msg('ch10-m1', 'system', '📌 任务约定:7月3日 17:00 · 湖畔大学樱花道 · 120pt · 交付20张原图+5张精修', '2026-06-30T09:00:00', { system: true }),
        msg('ch10-m2', 'u18', '参考图发你了,想要日落时暖暖的那种,不要太摆拍。', '2026-06-30T10:00:00'),
        msg('ch10-m3', 'u1', '收到。17点樱花道是侧逆光,最出片,提前十分钟到就行。', '2026-06-30T10:15:00'),
        msg('ch10-m4', 'u18', '精修收到啦,好看到想哭,四年就这么结束了。谢谢你!!', '2026-07-03T22:30:00'),
      ],
    },
    {
      id: 'dm1', memberIds: ['u1', 'u5'],
      messages: [
        msg('dm1-m1', 'u5', '屿哥,上次教的脚本我改成自动生成周报了,老板还以为我天天加班。', '2026-07-06T12:30:00'),
        msg('dm1-m2', 'u1', '哈哈,学以致用最快。那顿食堂什么时候兑现?', '2026-07-06T12:45:00'),
        msg('dm1-m3', 'u5', '周日打完球一起!顺便咨询下,下一步学 pandas 还是先补 SQL?', '2026-07-06T13:00:00'),
        msg('dm1-m4', 'u1', '你天天跟报表打交道,先SQL,两周就够用。周日细聊。', '2026-07-06T13:10:00'),
      ],
    },
  ]

  // ---------- 争议 ----------
  const disputes: Dispute[] = [
    {
      id: 'd1', taskId: 't28', openedBy: 'u7',
      reason: '任务未按约定完成',
      claimA: '书架第三层放书后明显晃动,隔板颜色深浅不一,怀疑安装有误。验收标准写明"放置平稳、五层可承重",目前没有达到,不应释放积分。',
      claimB: '全部零件按图纸编号安装并核对过,承重条均已装上。晃动是房间地面不平导致,已提出免费上门调平但被拒绝;隔板色差是实木木纹本身差异,非安装错误。',
      evidence: [
        { by: 'u7', text: '第三层放书后晃动的视频截图,以及两块色差明显的隔板照片。', kind: 'photo' },
        { by: 'u1', text: '完工全景照+图纸编号核对照,以及聊天中提出免费调平被拒绝的记录。', kind: 'chat' },
      ],
      aiSummary: '双方对"书架晃动"事实无争议,分歧在于原因归属:发布者认为是安装质量问题,帮助者认为是地面不平且已提出补救方案。色差问题更可能为材质本身差异。建议:安排一次现场复检或第三方照片评估,若调平后稳固,可按完成结算并酌情补偿双方时间成本。',
      status: 'open',
      createdAt: '2026-07-08T09:00:00',
    },
  ]

  // ---------- 安全事件 ----------
  const incidents: SafetyIncident[] = [
    {
      id: 'si1', severity: 'S1', taskId: 't27', userId: 'u11',
      summary: '发布者反馈帮助者迟到25分钟且未提前告知,体验不佳(不影响任务完成)。',
      status: 'resolved',
      log: [
        { admin: 'admin@utopia', at: '2026-07-02T14:00:00', action: '与双方核实迟到原因(早高峰配送延误),向发布者致歉并发放5积分体验补偿(由安全池支出)。', basis: '体验问题处理规范 1.2', notified: true },
      ],
      createdAt: '2026-07-02T11:20:00',
    },
    {
      id: 'si2', severity: 'S2', taskId: 't32', userId: 'u21',
      summary: '用户发布礼品卡代购任务,要求帮助者垫付资金并引导站外交付,命中反诈规则,疑似诈骗引流。',
      status: 'handling',
      log: [
        { admin: 'admin@utopia', at: '2026-07-10T03:05:00', action: '任务自动拦截下架,发布者账号进入观察名单,推送反诈提醒给近3日浏览过该任务的用户。', basis: '平台安全红线 4.1:禁止要求垫付资金及站外交易', notified: true },
        { admin: 'admin@utopia', at: '2026-07-10T09:30:00', action: '人工复核确认拦截无误,待用户申诉期(48小时)结束后决定是否升级处置。', basis: '风控复核流程 2.3', notified: false },
      ],
      createdAt: '2026-07-10T02:31:00',
    },
    {
      id: 'si3', severity: 'S3', userId: 'u19',
      summary: '用户报告:一次线下代取任务见面后,对方连续多日发送不当私信,构成骚扰。',
      status: 'open',
      log: [
        { admin: 'admin@utopia', at: '2026-07-09T22:40:00', action: '收到举报后1小时内冻结被举报人接新单权限,屏蔽其向举报人发起会话的能力。', basis: '安全红线政策 5.2:骚扰零容忍', notified: true },
        { admin: 'admin@utopia', at: '2026-07-10T09:00:00', action: '完成举报人回访,固定聊天证据;48小时内完成对被举报人的问询。', basis: 'S3级事件处置时限要求', notified: true },
      ],
      createdAt: '2026-07-09T21:50:00',
    },
    {
      id: 'si4', severity: 'S4', userId: 'u4',
      summary: '用户在任务过程中误触"紧急求助"按钮。平台按现实紧急流程响应:30秒内电话回拨确认,确认为误触,无实际风险。',
      status: 'resolved',
      log: [
        { admin: 'admin@utopia', at: '2026-07-06T10:22:00', action: '触发后30秒电话回拨,用户确认误触;同步取消已通知的紧急联系人流程,并记录演示回访。', basis: '现实紧急响应流程 1.0', notified: true },
      ],
      createdAt: '2026-07-06T10:21:00',
    },
  ]

  // ---------- 举报 ----------
  const reports: Report[] = [
    {
      id: 'r1', fromId: 'u6', targetType: 'task', targetId: 't32',
      reason: '疑似诈骗',
      detail: '要求帮助者先垫付5000元买礼品卡,还让加微信细聊,和新闻里的骗局一模一样。',
      status: 'verified', createdAt: '2026-07-10T02:28:00',
    },
    {
      id: 'r2', fromId: 'u18', targetType: 'user', targetId: 'u19',
      reason: '线下骚扰',
      detail: '一次代取任务见面后,他连续几天发和任务无关的私信,语气让人不舒服,拉黑后又换话术。希望平台处理。',
      status: 'verified', createdAt: '2026-07-09T21:45:00',
    },
    {
      id: 'r3', fromId: 'u11', targetType: 'message', targetId: 'ch3-m4',
      reason: '引导站外交易',
      detail: '对方提出加微信直接发红包绕开平台,虽然我拒绝了,但按规则还是报备一下。',
      status: 'pending', createdAt: '2026-07-09T09:25:00',
    },
    {
      id: 'r4', fromId: 'u21', targetType: 'content', targetId: 'p14',
      reason: '疑似广告引流',
      detail: '这篇摄影技巧帖是不是在给自己的收费课打广告?',
      status: 'dismissed', createdAt: '2026-07-07T23:00:00',
    },
  ]

  // ---------- 社区内容(18) ----------
  const posts: ContentPost[] = [
    {
      id: 'p1', authorId: 'u6', kind: 'story',
      title: '第一次向陌生人求助,收获了一个网球搭档',
      body: '学了三个月网球一直不敢约人,鼓起勇气发了个任务。雅琪不仅陪我打满一小时,还顺手纠了我的正手引拍。原来"求助"不丢人,丢人的是我错过的这三个月。已经约好下周继续。',
      coverEmoji: '🎾', coverHue: 140, taskId: 't25', communityId: 'c5',
      likes: 128, saves: 31, thanks: 22,
      comments: [
        { id: 'p1-c1', userId: 'u12', text: '下周新手日见!这次练反手。', createdAt: '2026-07-06T09:10:00' },
        { id: 'p1-c2', userId: 'u16', text: '被你鼓励到了,我也发了一个找搭档的任务。', createdAt: '2026-07-08T21:10:00' },
      ],
      createdAt: '2026-07-05T22:30:00', tags: ['网球', '城南网球俱乐部', '第一次求助'],
    },
    {
      id: 'p2', authorId: 'u18', kind: 'story',
      title: '毕业前最后一周,把樱花道拍进了回忆里',
      body: '四年里走了上千遍的樱花道,毕业前想认真和它合个影。发任务两小时就匹配到了学长,他真的很懂那条路17点的光。照片好看到我妈已经设成手机壁纸了。',
      coverEmoji: '🎓', coverHue: 205, taskId: 't23', communityId: 'c1',
      likes: 214, saves: 45, thanks: 38,
      comments: [
        { id: 'p2-c1', userId: 'u1', text: '毕业快乐,前程似锦!', createdAt: '2026-07-04T12:00:00' },
        { id: 'p2-c2', userId: 'u15', text: '学姐的照片在校园墙也刷到了,太好看了。', createdAt: '2026-07-04T19:40:00' },
        { id: 'p2-c3', userId: 'u22', text: '欢迎常回学校看看。', createdAt: '2026-07-05T08:30:00' },
      ],
      createdAt: '2026-07-04T11:20:00', tags: ['摄影', '湖畔大学', '毕业季'],
    },
    {
      id: 'p3', authorId: 'u8', kind: 'story',
      title: '李阿姨学会视频通话后,第一个打给了远方的老姐妹',
      body: '这次的任务很特别:李阿姨已经会视频通话了,她要求的是"把我老姐妹也教会"。两位七旬老人在活动室里互相拨通电话的那一刻,笑得像放学的小学生。数字鸿沟不可怕,可怕的是没人伸手。',
      coverEmoji: '📱', coverHue: 330, taskId: 't26', communityId: 'c6',
      likes: 305, saves: 67, thanks: 91,
      comments: [
        { id: 'p3-c1', userId: 'u4', text: '何老师,我们现在每天早上都视频!', createdAt: '2026-07-06T18:00:00' },
        { id: 'p3-c2', userId: 'u13', text: '下次教教我们男同志,我也想学。', createdAt: '2026-07-06T20:15:00' },
      ],
      createdAt: '2026-07-06T16:40:00', tags: ['银发数字课堂', '互助故事'],
    },
    {
      id: 'p4', authorId: 'u5', kind: 'story',
      title: '30岁开始学Python,原来没那么可怕',
      body: '看了三个月视频课没坚持下来,两小时一对一直接用我自己的周报数据写脚本,下课就能用。最大的收获不是代码,是"原来我可以直接找人帮我"这个念头。',
      coverEmoji: '🐍', coverHue: 120, taskId: 't24', communityId: 'c4',
      likes: 96, saves: 52, thanks: 18,
      comments: [
        { id: 'p4-c1', userId: 'u6', text: '欢迎入坑,下次园区分享会来讲讲?', createdAt: '2026-06-29T10:00:00' },
      ],
      createdAt: '2026-06-28T21:00:00', tags: ['编程', '星洲科技园', '自我提升'],
    },
    {
      id: 'p5', authorId: 'u14', kind: 'story',
      title: '开店第100天,谢谢那个带小推车来的师傅',
      body: '十箱面粉堵在公寓门口,货车师傅说超出配送范围了。发了个任务,志强师傅半小时后带着小推车出现,搬完还帮我按生产日期码好。开店100天,靠邻居们撑过了无数个这样的瞬间。',
      coverEmoji: '🥖', coverHue: 20, taskId: 't27', communityId: 'c2',
      likes: 142, saves: 12, thanks: 44,
      comments: [
        { id: 'p5-c1', userId: 'u11', text: '可颂很好吃,下次进货还叫我。', createdAt: '2026-07-02T20:00:00' },
        { id: 'p5-c2', userId: 'u10', text: '你家肉桂卷是我的续命粮!', createdAt: '2026-07-03T09:20:00' },
      ],
      createdAt: '2026-07-02T19:30:00', tags: ['青藤公寓', '小店日常', '搬运'],
    },
    {
      id: 'p6', authorId: 'u1', kind: 'story',
      title: '用积分换了一节吉他课,C和弦终于按响了',
      body: '琴吃灰半年,教我的是个大一学弟,带着他的"F和弦土办法"来的。一小时后我真的弹出了《平凡之路》副歌。帮别人攒下的积分,变成了自己的新技能,这个循环很迷人。',
      coverEmoji: '🎸', coverHue: 250, taskId: 't22', communityId: 'c1',
      likes: 88, saves: 19, thanks: 15,
      comments: [
        { id: 'p6-c1', userId: 'u15', text: '学长练完琴记得剪指甲(狗头)', createdAt: '2026-07-05T10:00:00' },
        { id: 'p6-c2', userId: 'u9', text: '下次我们可以一起jam!', createdAt: '2026-07-05T13:30:00' },
      ],
      createdAt: '2026-07-04T21:50:00', tags: ['吉他', '湖畔大学', '积分循环'],
    },
    {
      id: 'p7', authorId: 'u9', kind: 'story',
      title: '来到这座城市三个月,我在街区找到了第一批朋友',
      body: '刚来的时候连快递柜都不会用,是平台上的邻居一步步教我的。现在我教别人葡语和英语,别人教我中文和"人情世故"。语言会有口音,但善意没有。',
      coverEmoji: '🌏', coverHue: 260, communityId: 'c2',
      likes: 176, saves: 23, thanks: 40,
      comments: [
        { id: 'p7-c1', userId: 'u18', text: '你的中文进步超快!', createdAt: '2026-06-20T22:00:00' },
      ],
      createdAt: '2026-06-20T19:00:00', tags: ['新移民', '语言练习', '青藤公寓'],
    },
    {
      id: 'p8', authorId: 'u10', kind: 'story',
      title: '出差一周,两只猫被邻居照顾得比我在家还好',
      body: '第一次把钥匙交给平台上认识的邻居时手心冒汗,现在年糕看到韩雪比看到我还亲。上门任务的双重认证和行程记录给了我安全感,但真正留住我的,是人。',
      coverEmoji: '🐱', coverHue: 350, communityId: 'c2',
      likes: 133, saves: 28, thanks: 26,
      comments: [
        { id: 'p8-c1', userId: 'u20', text: '年糕只是馋我口袋里的冻干(笑)', createdAt: '2026-06-12T21:30:00' },
        { id: 'p8-c2', userId: 'u14', text: '汤圆上次来店门口巡视,已被投喂。', createdAt: '2026-06-13T10:10:00' },
      ],
      createdAt: '2026-06-12T20:00:00', tags: ['宠物', '青藤公寓', '信任'],
    },
    {
      id: 'p9', authorId: 'u4', kind: 'thanks',
      title: '谢谢何老师,也谢谢这个不嫌我们慢的课堂',
      body: '我和老姐妹现在每天早上七点准时视频,聊完再去买菜。谢谢何老师教了我们三遍也不烦。',
      coverEmoji: '💐', coverHue: 40, taskId: 't26', communityId: 'c6',
      likes: 87, saves: 4, thanks: 52,
      comments: [
        { id: 'p9-c1', userId: 'u8', text: '阿姨们学得好,是你们自己的功劳!', createdAt: '2026-07-07T09:00:00' },
      ],
      createdAt: '2026-07-06T19:10:00', tags: ['感谢', '银发数字课堂'],
    },
    {
      id: 'p10', authorId: 'u3', kind: 'thanks',
      title: '谢谢自习室里帮我讲了半小时高数的陌生学长',
      body: '期末周在自习室卡在拉普拉斯变换,隔壁桌学长看不下去,直接给我讲了半小时。没走平台流程,但这份好意想记在这里。',
      coverEmoji: '📚', coverHue: 230, communityId: 'c1',
      likes: 64, saves: 3, thanks: 30,
      comments: [],
      createdAt: '2026-07-01T23:40:00', tags: ['感谢', '湖畔大学', '期末周'],
    },
    {
      id: 'p11', authorId: 'u16', kind: 'thanks',
      title: '感谢帮我浇水的邻居,绿萝都活着,龟背竹还长了新叶',
      body: '出差最怕阳台变"枯叶战场"。吴倩不仅浇了水,还顺手摘了黄叶、拍了全景照。特产已经在路上了。',
      coverEmoji: '🪴', coverHue: 300, communityId: 'c2',
      likes: 58, saves: 2, thanks: 21,
      comments: [
        { id: 'p11-c1', userId: 'u10', text: '等你回来一起吃!', createdAt: '2026-07-10T08:20:00' },
      ],
      createdAt: '2026-07-09T22:00:00', tags: ['感谢', '邻里互助'],
    },
    {
      id: 'p12', authorId: 'u2', kind: 'event',
      title: '本周六 · 梧桐公园清理日,本月第3场',
      body: '手套、夹子、垃圾袋社区都备好,上午9点东门集合,清完一起在凉亭喝绿豆汤。本月目标4场,还差2场,来的都是街坊。',
      coverEmoji: '🌳', coverHue: 100, communityId: 'c3',
      likes: 45, saves: 16, thanks: 5,
      comments: [
        { id: 'p12-c1', userId: 'u19', text: '上午跑单路过,捡半小时也算我一个。', createdAt: '2026-07-08T12:00:00' },
      ],
      createdAt: '2026-07-07T16:00:00', tags: ['社区公益', '梧桐街区'],
    },
    {
      id: 'p13', authorId: 'u8', kind: 'event',
      title: '7月21日防诈骗小课堂:骗子的台词,我们先替爸妈听一遍',
      body: '这期用真实案例拆解"礼品卡骗局"和"冒充客服"。欢迎带上家里长辈一起来,课堂备了大字版讲义和茶水。',
      coverEmoji: '🛡️', coverHue: 330, communityId: 'c6',
      likes: 92, saves: 41, thanks: 12,
      comments: [
        { id: 'p13-c1', userId: 'u13', text: '我把老伙计们都叫上。', createdAt: '2026-07-09T10:30:00' },
        { id: 'p13-c2', userId: 'u6', text: '正好本周就有人发礼品卡任务被拦截了,太应景。', createdAt: '2026-07-10T09:00:00' },
      ],
      createdAt: '2026-07-09T09:00:00', tags: ['防诈骗', '银发数字课堂', '社区活动'],
    },
    {
      id: 'p14', authorId: 'u2', kind: 'skill',
      title: '免费分享:手机人像摄影的5个小技巧',
      body: '不用买设备:1.顺光拍肤色逆光拍氛围;2.镜头与眼睛齐平;3.连拍里挑自然的;4.阴天是免费柔光箱;5.构图先看背景再看人。街区拍照互助时都用得上。',
      coverEmoji: '📷', coverHue: 205, communityId: 'c3',
      likes: 167, saves: 89, thanks: 14,
      comments: [
        { id: 'p14-c1', userId: 'u17', text: '第4条深有同感,阴天出片率翻倍。', createdAt: '2026-07-06T14:00:00' },
      ],
      createdAt: '2026-07-05T11:00:00', tags: ['摄影', '技能分享'],
    },
    {
      id: 'p15', authorId: 'u12', kind: 'skill',
      title: '网球新手最常见的三个握拍误区',
      body: '一是握太死,手腕僵住;二是东方式握拍打上旋,费力不讨好;三是双手反拍两手离太开。每个误区我都配了自查动作,新手日现场也可以来找我看。',
      coverEmoji: '🎾', coverHue: 140, communityId: 'c5',
      likes: 74, saves: 47, thanks: 9,
      comments: [
        { id: 'p15-c1', userId: 'u6', text: '第一条说的就是我,已预约下次陪练。', createdAt: '2026-07-08T09:40:00' },
      ],
      createdAt: '2026-07-07T20:00:00', tags: ['网球', '技能分享', '城南网球俱乐部'],
    },
    {
      id: 'p16', authorId: 'u22', kind: 'guide',
      title: '湖畔大学新生服务指南(2026夏季版)',
      body: '写给刚来的你:如何发布第一个求助任务、校园里哪些地点适合线下见面、代取快递和图书的规范流程、遇到问题找谁。所有校内互助建议优先选择公共场所,晚十点后尽量线上。',
      coverEmoji: '🧭', coverHue: 210, communityId: 'c1',
      likes: 201, saves: 156, thanks: 28,
      comments: [
        { id: 'p16-c1', userId: 'u15', text: '上个月就是靠这篇活下来的,新生速看。', createdAt: '2026-07-03T18:00:00' },
        { id: 'p16-c2', userId: 'u9', text: '有英文版吗?我可以帮忙翻译。', createdAt: '2026-07-04T10:20:00' },
      ],
      createdAt: '2026-07-01T09:00:00', tags: ['新生指南', '湖畔大学'],
    },
    {
      id: 'p17', authorId: 'u8', kind: 'guide',
      title: '银发数字课堂:如何发布你的第一个求助',
      body: '大字版图文教程:从"我要求助"按钮开始,一步一图。记住三件事:不着急、不付钱给陌生人、拿不准就打社区电话。志愿者每周二下午在活动室值班。',
      coverEmoji: '🧓', coverHue: 60, communityId: 'c6',
      likes: 118, saves: 95, thanks: 33,
      comments: [
        { id: 'p17-c1', userId: 'u4', text: '照着做发出了第一个任务,成功!', createdAt: '2026-07-08T15:00:00' },
      ],
      createdAt: '2026-07-02T10:00:00', tags: ['新手指南', '银发数字课堂'],
    },
    {
      id: 'p18', authorId: 'u2', kind: 'milestone',
      title: '梧桐街区本月互助时长突破300小时🎉',
      body: '截至今天,街区本月累计互助300小时:一半是跑腿和搬运,四分之一是陪伴老人。下一个目标:月底前完成剩下2场公园清理。谢谢每一个搭过手的你。',
      coverEmoji: '🏆', coverHue: 100, communityId: 'c3',
      likes: 156, saves: 8, thanks: 47,
      comments: [
        { id: 'p18-c1', userId: 'u11', text: '搬运组报到!', createdAt: '2026-07-09T12:30:00' },
        { id: 'p18-c2', userId: 'u13', text: '被陪伴的老人之一,谢谢大家。', createdAt: '2026-07-09T15:00:00' },
      ],
      createdAt: '2026-07-09T10:00:00', tags: ['里程碑', '梧桐街区'],
    },
  ]

  // ---------- 通知(u1) ----------
  const notifications: Notification[] = [
    {
      id: 'n1', userId: 'u1', icon: '✅',
      title: '申请已通过',
      body: '周明轩选择了你!「羽毛球陪练一小时」将于 7月12日 10:00 开始。',
      link: '/task/t15', read: false, createdAt: '2026-07-08T15:45:00',
    },
    {
      id: 'n2', userId: 'u1', icon: '📝',
      title: '收到新申请',
      body: '苏晚晴申请了你的任务「帮忙拍一组个人照片(求职用)」,共2位申请者待处理。',
      link: '/task/t9', read: false, createdAt: '2026-07-09T14:40:00',
    },
    {
      id: 'n3', userId: 'u1', icon: '⏰',
      title: '任务即将开始',
      body: '「代取图书馆预约的三本书」明天 12:30 开始,记得把预约码发给王浩然。',
      link: '/task/t14', read: false, createdAt: '2026-07-10T09:00:00',
    },
    {
      id: 'n4', userId: 'u1', icon: '💰',
      title: '积分到账',
      body: '「一对一Python入门辅导两小时」已确认完成,150 积分已释放到你的账户。',
      link: '/points', read: true, createdAt: '2026-06-27T22:05:00',
    },
    {
      id: 'n5', userId: 'u1', icon: '⭐',
      title: '双向评价已公开',
      body: '你与白雨薇在「帮拍一组毕业纪念照」中的互评已公开:清晰沟通 5.0 / 愿意再次合作。',
      link: '/task/t23', read: true, createdAt: '2026-07-04T10:05:00',
    },
    {
      id: 'n6', userId: 'u1', icon: '🎯',
      title: '社区目标进展',
      body: '湖畔大学「本月完成500小时互助」已完成 68%,你贡献了 6 小时。',
      link: '/circle/c1', read: true, createdAt: '2026-07-09T20:00:00',
    },
  ]

  // ---------- 管理操作日志 ----------
  const auditLogs: AuditLog[] = [
    {
      id: 'a1', admin: 'admin@utopia',
      action: '阻止任务发布并通知发布者', target: 'task:t31',
      basis: '平台规则 3.2:涉及未成年人接送属受监管服务,平台不予撮合;已向发布者推送正规托管机构信息',
      createdAt: '2026-07-08T13:22:00',
    },
    {
      id: 'a2', admin: 'admin@utopia',
      action: '拦截高风险任务并下架', target: 'task:t32',
      basis: '安全红线 4.1:要求垫付资金购买礼品卡并引导站外交易,命中反诈模型,置信度 0.97',
      createdAt: '2026-07-10T03:05:00',
    },
    {
      id: 'a3', admin: 'admin@utopia',
      action: '对用户施加发布限制(高价值任务,至 2026-07-20)', target: 'user:u21',
      basis: '信用规则 2.4:近30日临时取消3次,取消率8%超过阈值5%',
      createdAt: '2026-07-08T17:00:00',
    },
    {
      id: 'a4', admin: 'admin@utopia',
      action: '生成争议裁决提案(AI中立摘要+建议现场复检),转人工复核', target: 'dispute:d1',
      basis: '争议处理流程 3.1:双方陈述与证据齐全,冻结积分待裁决',
      createdAt: '2026-07-08T10:30:00',
    },
    {
      id: 'a5', admin: 'admin@utopia',
      action: '人工调整账本:补发100积分', target: 'user:u13',
      basis: '客服工单 #4821:六月长者数字融入补贴因认证时序问题漏发,核实后补发',
      createdAt: '2026-07-01T15:00:00',
    },
  ]

  // ---------- 汇总 ----------
  return {
    currentUserId: null,
    onboarded: false,
    users,
    communities,
    tasks,
    ledger,
    chats,
    disputes,
    incidents,
    reports,
    posts,
    notifications,
    auditLogs,
    following: ['u2', 'u5', 'c1'],
    feedFilter: undefined,
  }
}
