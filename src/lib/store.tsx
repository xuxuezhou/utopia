/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { produce } from 'immer'
import type {
  AppState, Task, TaskApplication, User, Review, LedgerEntry, LedgerType,
} from './types'
import { assessRisk, assessMessage, type RiskResult } from './risk'
import { buildSeedState } from '../data/seed'

const STORAGE_KEY = 'utopia-state-v1'
// 持久化结构版本:与 localStorage 中的状态不匹配时重建种子数据
const SCHEMA_VERSION = 3

let seq = 1000
export function genId(prefix: string): string {
  seq += 1
  return `${prefix}${Date.now().toString(36)}${seq}`
}
// 本地时间字符串(与种子数据口径一致,不带时区标记,按本地时间解析)
export function nowISO(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// ============ 积分账本派生计算(余额永远从账本推导,不存字段) ============

export function availablePoints(s: AppState, uid: string): number {
  let bal = 0
  for (const e of s.ledger) {
    if (e.status === 'reversed') continue
    if (e.to === uid && e.status === 'settled') bal += e.amount
    if (e.from === uid) bal -= e.amount // settled/locked/frozen 均从可用中扣除
  }
  return bal
}
export function lockedPoints(s: AppState, uid: string): number {
  return s.ledger.filter(e => e.from === uid && (e.status === 'locked' || e.status === 'frozen'))
    .reduce((a, e) => a + e.amount, 0)
}
export function pendingPoints(s: AppState, uid: string): number {
  return s.tasks.filter(t => t.status === 'pending_confirm' && t.helperId === uid)
    .reduce((a, t) => a + t.points, 0)
}
export function subsidyPoints(s: AppState, uid: string): number {
  return s.ledger.filter(e => e.to === uid && e.type === 'community_grant' && e.status === 'settled')
    .reduce((a, e) => a + e.amount, 0)
}
export function poolBalance(s: AppState, account: string): number {
  let bal = 0
  for (const e of s.ledger) {
    if (e.status === 'reversed') continue
    if (e.to === account && (e.status === 'settled')) bal += e.amount
    if (e.from === account && e.status !== 'locked' && e.status !== 'frozen') bal -= e.amount
  }
  return bal
}

function mkEntry(p: {
  taskId?: string; from: string; to: string; amount: number; type: LedgerType
  status?: LedgerEntry['status']; memo: string; operator?: LedgerEntry['operator']; riskFlag?: string
}): LedgerEntry {
  return {
    id: genId('L'), taskId: p.taskId, from: p.from, to: p.to, amount: p.amount,
    type: p.type, createdAt: nowISO(), effectiveAt: nowISO(),
    status: p.status ?? 'settled', operator: p.operator ?? 'system', memo: p.memo, riskFlag: p.riskFlag,
  }
}

function notify(d: AppState, userId: string, icon: string, title: string, body: string, link?: string) {
  d.notifications.unshift({ id: genId('N'), userId, icon, title, body, link, read: false, createdAt: nowISO() })
}

function findUser(d: AppState, id: string): User | undefined {
  return d.users.find(u => u.id === id)
}

function hoursUntilStart(t: Task): number {
  const start = new Date(`${t.date}T${t.startTime}:00`)
  return (start.getTime() - Date.now()) / 3600000
}

// 托管中的锁定/冻结账目
function escrowEntries(d: AppState, taskId: string) {
  return d.ledger.filter(e => e.taskId === taskId && (e.status === 'locked' || e.status === 'frozen'))
}

// 释放托管:帮助者获得积分,服务费三路拆分(销毁/社区池/安全池)
function releaseEscrow(d: AppState, t: Task, toHelperPoints: number, refundPublisher: number, memoPrefix: string) {
  for (const e of escrowEntries(d, t.id)) e.status = 'settled'
  if (toHelperPoints > 0 && t.helperId)
    d.ledger.push(mkEntry({ taskId: t.id, from: 'sys:escrow', to: t.helperId, amount: toHelperPoints, type: 'task_release', memo: `${memoPrefix}:任务积分释放` }))
  if (refundPublisher > 0)
    d.ledger.push(mkEntry({ taskId: t.id, from: 'sys:escrow', to: t.publisherId, amount: refundPublisher, type: 'task_refund', memo: `${memoPrefix}:剩余积分退回` }))
  // 服务积分拆分(仅在任务真实完成时)
  if (toHelperPoints > 0 && t.serviceFee > 0) {
    const burn = Math.max(1, Math.floor(t.serviceFee * 0.4))
    const community = Math.floor((t.serviceFee - burn) / 2)
    const safety = t.serviceFee - burn - community
    d.ledger.push(mkEntry({ taskId: t.id, from: 'sys:escrow', to: 'sys:burn', amount: burn, type: 'points_burn', memo: '系统服务积分销毁' }))
    if (community > 0) d.ledger.push(mkEntry({ taskId: t.id, from: 'sys:escrow', to: 'sys:community_pool', amount: community, type: 'community_grant', memo: '进入社区关怀池' }))
    if (safety > 0) d.ledger.push(mkEntry({ taskId: t.id, from: 'sys:escrow', to: 'sys:safety_pool', amount: safety, type: 'safety_compensation', memo: '进入安全补偿池' }))
  } else if (t.serviceFee > 0) {
    d.ledger.push(mkEntry({ taskId: t.id, from: 'sys:escrow', to: t.publisherId, amount: t.serviceFee, type: 'task_refund', memo: `${memoPrefix}:服务积分退回` }))
  }
}

// ============ Store ============

interface StoreCtx {
  state: AppState
  actions: ReturnType<typeof buildActions>
}

const Ctx = createContext<StoreCtx | null>(null)

function freshState(): AppState {
  return { ...buildSeedState(), schemaVersion: SCHEMA_VERSION }
}

function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as AppState
      if (parsed.schemaVersion === SCHEMA_VERSION && parsed.users?.length && parsed.tasks?.length) return parsed
    }
  } catch { /* 损坏则重建 */ }
  return freshState()
}

function buildActions(setState: (fn: (s: AppState) => AppState) => void, getState: () => AppState) {
  const mutate = (fn: (d: AppState) => void) => setState(s => produce(s, fn))

  return {
    // ---------- 账号 ----------
    login(userId: string) {
      mutate(d => { d.currentUserId = userId; d.onboarded = true })
    },
    logout() {
      mutate(d => { d.currentUserId = null })
    },
    register(profile: { name: string; avatar: string; city: string; bio: string; languages: string[] }): string {
      const id = genId('u')
      mutate(d => {
        d.users.push({
          id, name: profile.name, avatar: profile.avatar || '🙂', avatarHue: Math.floor(Math.random() * 360),
          bio: profile.bio, city: profile.city, languages: profile.languages,
          communityIds: [], skills: [], needs: [], level: 0,
          verifications: { phone: true, identity: false, community: false, skill: [] },
          joinedAt: nowISO(), lastActiveAt: nowISO(),
          stats: { helped: 0, received: 0, onTimeRate: 100, cancelRate: 0, repeatRate: 0, wouldRepeat: 100 },
          offerCards: [], allowOffline: true, maxDistanceKm: 5, blocked: [],
        })
        d.ledger.push(mkEntry({ from: 'sys:issuer', to: id, amount: 50, type: 'signup_bonus', memo: '手机/邮箱验证完成' }))
        d.currentUserId = id
        d.onboarded = false
        notify(d, id, '🎉', '欢迎加入 Utopia', '完成引导可解锁更多新用户积分。')
      })
      return id
    },
    finishOnboarding(p: { skills: string[]; needs: string[]; communityIds: string[]; emergencyContact?: string; allowOffline: boolean; maxDistanceKm: number }) {
      mutate(d => {
        const u = findUser(d, d.currentUserId!)
        if (!u) return
        u.skills = p.skills; u.needs = p.needs; u.communityIds = p.communityIds
        u.emergencyContact = p.emergencyContact; u.allowOffline = p.allowOffline; u.maxDistanceKm = p.maxDistanceKm
        d.ledger.push(mkEntry({ from: 'sys:issuer', to: u.id, amount: 50, type: 'signup_bonus', memo: '完善个人资料' }))
        d.onboarded = true
        notify(d, u.id, '✨', '获得 50 pt', '完善个人资料奖励已到账。完成身份认证还可再获得 100 pt。', '/points')
      })
    },
    verifyIdentity() {
      mutate(d => {
        const u = findUser(d, d.currentUserId!)
        if (!u || u.verifications.identity) return
        u.verifications.identity = true
        if (u.level < 1) u.level = 1
        d.ledger.push(mkEntry({ from: 'sys:issuer', to: u.id, amount: 100, type: 'signup_bonus', memo: '完成基础身份验证' }))
        notify(d, u.id, '🛡️', '身份验证通过', '你已升级为 Level 1,可以参加公共场所任务。获得 100 pt。', '/points')
      })
    },

    // ---------- 发布任务 ----------
    publishTask(draft: Omit<Task, 'id' | 'status' | 'applicants' | 'createdAt' | 'reviews' | 'riskTier' | 'riskFlags' | 'serviceFee' | 'distanceKm' | 'publisherId'>): { ok: boolean; risk: RiskResult; taskId?: string } {
      const risk = assessRisk(`${draft.title} ${draft.description}`, { online: draft.online, enterHome: draft.enterHome, points: draft.points })
      const s = getState()
      const uid = s.currentUserId!
      const fee = Math.ceil(draft.points * 0.05)
      const id = genId('t')

      if (risk.blocked) {
        // 记录被阻止的任务 + 安全审核事件,不进入信息流
        mutate(d => {
          d.tasks.push({
            ...draft, id, serviceFee: fee, distanceKm: 0,
            riskTier: risk.tier, riskFlags: risk.flags, status: 'blocked',
            blockReason: risk.blockReason, publisherId: uid,
            applicants: [], createdAt: nowISO(), reviews: [],
          })
          d.incidents.unshift({
            id: genId('SI'), severity: risk.tier === 'T4' ? 'S3' : 'S2', taskId: id, userId: uid,
            summary: `发布被拦截:${risk.flags.join('、')} —「${draft.title.slice(0, 24)}」`,
            status: 'open', log: [], createdAt: nowISO(),
          })
          d.auditLogs.unshift({ id: genId('A'), admin: 'system', action: '自动拦截高风险任务', target: id, basis: risk.flags.join('、'), createdAt: nowISO() })
        })
        return { ok: false, risk, taskId: id }
      }

      const balance = availablePoints(s, uid)
      if (balance < draft.points + fee) return { ok: false, risk: { ...risk, blocked: true, blockReason: `可用积分不足:发布需要 ${draft.points} pt + ${fee} pt 服务积分,当前可用 ${balance} pt。可以先通过帮助他人获得积分。` } }

      mutate(d => {
        d.tasks.unshift({
          ...draft, id, serviceFee: fee, distanceKm: 0,
          riskTier: risk.tier, riskFlags: risk.flags, status: 'open',
          publisherId: uid, applicants: [], createdAt: nowISO(), reviews: [],
        })
        if (risk.needsReview) {
          d.incidents.unshift({
            id: genId('SI'), severity: 'S1', taskId: id, userId: uid,
            summary: `任务进入人工复核:${risk.flags.join('、')}`, status: 'open', log: [], createdAt: nowISO(),
          })
        }
      })
      return { ok: true, risk, taskId: id }
    },

    // ---------- 申请与匹配 ----------
    applyToTask(taskId: string, app: Omit<TaskApplication, 'id' | 'createdAt' | 'status'>) {
      mutate(d => {
        const t = d.tasks.find(x => x.id === taskId)
        if (!t || (t.status !== 'open' && t.status !== 'applied')) return
        t.applicants.push({ ...app, id: genId('ap'), createdAt: nowISO(), status: 'pending' })
        if (t.status === 'open') t.status = 'applied'
        notify(d, t.publisherId, '🙋', '收到新的帮助申请', `「${t.title}」收到了新的申请,去看看吧。`, `/task/${t.id}`)
      })
    },
    selectHelper(taskId: string, helperId: string): { ok: boolean; reason?: string } {
      const s = getState()
      const task = s.tasks.find(x => x.id === taskId)
      if (!task || task.helperId || !['open', 'applied'].includes(task.status))
        return { ok: false, reason: '任务状态已变化,无法选择帮助者。' }
      const need = task.points + task.serviceFee
      const balance = availablePoints(s, task.publisherId)
      if (balance < need)
        return { ok: false, reason: `可用积分不足:托管需要 ${need} pt,当前可用 ${balance} pt。` }
      mutate(d => {
        const t = d.tasks.find(x => x.id === taskId)
        if (!t || t.helperId || !['open', 'applied'].includes(t.status)) return
        t.helperId = helperId
        t.status = hoursUntilStart(t) <= 24 ? 'starting_soon' : 'matched'
        for (const a of t.applicants) a.status = a.userId === helperId ? 'selected' : 'declined'
        // 积分托管锁定:任务积分 + 服务积分
        d.ledger.push(mkEntry({ taskId, from: t.publisherId, to: 'sys:escrow', amount: t.points, type: 'task_lock', status: 'locked', memo: `「${t.title}」任务积分托管锁定` }))
        d.ledger.push(mkEntry({ taskId, from: t.publisherId, to: 'sys:escrow', amount: t.serviceFee, type: 'task_lock', status: 'locked', memo: '系统服务积分锁定' }))
        // 任务聊天
        const chatId = genId('ch')
        t.chatId = chatId
        const online = t.online ? '线上' : t.locationText
        d.chats.push({
          id: chatId, taskId, memberIds: [t.publisherId, helperId],
          messages: [{
            id: genId('m'), fromId: 'system', system: true, createdAt: nowISO(),
            text: `📌 任务约定:${t.date} ${t.startTime} · ${online} · ${t.points} pt · ${t.doneCriteria}\n🛡️ 安全提示:建议在公共场所见面,精确地址仅在必要时告知。遇到问题可随时请求平台帮助。`,
          }],
        })
        notify(d, helperId, '🤝', '你的申请通过了', `你被选为「${t.title}」的帮助者,积分已托管锁定。`, `/task/${t.id}`)
        for (const a of t.applicants.filter(x => x.status === 'declined'))
          notify(d, a.userId, '💌', '这次没有匹配上', `「${t.title}」的发布者选择了其他帮助者。感谢你的善意,附近还有更多互助等你。`, '/nearby')
      })
      return { ok: true }
    },

    // ---------- 执行 ----------
    startTask(taskId: string) {
      mutate(d => {
        const t = d.tasks.find(x => x.id === taskId)
        if (!t) return
        t.status = 'in_progress'
        t.startedAt = nowISO()
        if (t.chatId) d.chats.find(c => c.id === t.chatId)?.messages.push({ id: genId('m'), fromId: 'system', system: true, text: '✅ 双方已确认开始任务。任务期间可随时使用安全确认与紧急联系功能。', createdAt: nowISO() })
      })
    },
    submitComplete(taskId: string) {
      mutate(d => {
        const t = d.tasks.find(x => x.id === taskId)
        if (!t) return
        t.status = 'pending_confirm'
        t.submittedAt = nowISO()
        notify(d, t.publisherId, '📩', '帮助者提交了完成', `「${t.title}」等待你确认。低风险任务超时未响应将自动释放积分。`, `/task/${t.id}`)
      })
    },
    confirmComplete(taskId: string, outcome: 'done' | 'partial') {
      mutate(d => {
        const t = d.tasks.find(x => x.id === taskId)
        if (!t || !t.helperId || t.status !== 'pending_confirm') return
        t.status = 'completed'
        t.completedAt = nowISO()
        if (outcome === 'done') {
          releaseEscrow(d, t, t.points, 0, '任务完成')
        } else {
          const half = Math.floor(t.points / 2)
          releaseEscrow(d, t, half, t.points - half, '部分完成')
        }
        const helper = findUser(d, t.helperId); const pub = findUser(d, t.publisherId)
        if (helper) { helper.stats.helped += 1; helper.lastActiveAt = nowISO() }
        if (pub) pub.stats.received += 1
        // 首次帮助奖励
        if (helper && helper.stats.helped === 1)
          d.ledger.push(mkEntry({ from: 'sys:issuer', to: helper.id, amount: 100, type: 'signup_bonus', memo: '首次完成帮助任务奖励' }))
        notify(d, t.helperId, '💛', `获得 ${outcome === 'done' ? t.points : Math.floor(t.points / 2)} pt`, `「${t.title}」已确认${outcome === 'done' ? '完成' : '部分完成'},积分已到账。别忘了互相评价。`, `/task/${t.id}`)
      })
    },

    // ---------- 取消 ----------
    cancelTask(taskId: string, byId: string, reason: string): string {
      let summary = ''
      mutate(d => {
        const t = d.tasks.find(x => x.id === taskId)
        if (!t) return
        const prevStatus = t.status
        // 防御:只要还有托管中(锁定/冻结)的账目,就必须走结算,不能只看状态
        const hasEscrow = escrowEntries(d, t.id).length > 0
        const matched = hasEscrow || (!!t.helperId && ['matched', 'starting_soon', 'in_progress', 'pending_confirm'].includes(prevStatus))
        t.status = 'cancelled'
        t.cancelledBy = byId
        t.cancelReason = reason
        if (!matched) {
          summary = '任务尚未匹配,已直接关闭,没有积分变动。'
        } else if (byId === t.publisherId) {
          const h = hoursUntilStart(t)
          // pending_confirm:对方已交付,一律按临近取消的补偿逻辑处理
          if (h >= 24 && prevStatus !== 'pending_confirm') {
            releaseEscrow(d, t, 0, t.points, '发布者提前取消')
            summary = `距开始超过 24 小时,${t.points} pt 任务积分与服务积分已全额退回。`
          } else if (!t.helperId) {
            releaseEscrow(d, t, 0, t.points, '发布者取消')
            summary = `${t.points} pt 任务积分与服务积分已全额退回。`
          } else {
            const comp = Math.ceil(t.points * 0.2)
            for (const e of escrowEntries(d, t.id)) e.status = 'settled'
            d.ledger.push(mkEntry({ taskId, from: 'sys:escrow', to: t.helperId, amount: comp, type: 'cancel_compensation', memo: prevStatus === 'pending_confirm' ? '帮助者已交付后取消,补偿帮助者' : '临近开始取消,补偿帮助者' }))
            d.ledger.push(mkEntry({ taskId, from: 'sys:escrow', to: t.publisherId, amount: t.points - comp + t.serviceFee, type: 'task_refund', memo: '取消退款(扣除补偿)' }))
            summary = `${prevStatus === 'pending_confirm' ? '帮助者已提交完成' : '距开始不足 24 小时'}:${comp} pt 补偿给帮助者,其余 ${t.points - comp + t.serviceFee} pt 退回。你的可靠度会受到影响。`
            const pub = findUser(d, t.publisherId)
            if (pub) pub.stats.cancelRate = Math.min(100, pub.stats.cancelRate + 3)
          }
          if (t.helperId) notify(d, t.helperId, '😔', '任务被取消', `「${t.title}」的发布者取消了任务。${summary}`, `/task/${t.id}`)
        } else {
          releaseEscrow(d, t, 0, t.points, '帮助者取消')
          const helper = findUser(d, byId)
          const h = hoursUntilStart(t)
          if (helper) helper.stats.cancelRate = Math.min(100, helper.stats.cancelRate + (h < 24 ? 5 : 2))
          summary = h < 24
            ? '临时取消:积分已全额退回发布者,你的可靠度将明显降低,多次临时取消会暂时冻结认领权限。'
            : '提前取消:积分已全额退回发布者,对可靠度有轻微影响。'
          notify(d, t.publisherId, '😔', '帮助者取消了任务', `「${t.title}」的帮助者取消了,积分已全额退回,任务可以重新发布。`, `/task/${t.id}`)
        }
      })
      return summary
    },

    // ---------- 争议 ----------
    openDispute(taskId: string, byId: string, reason: string, claim: string) {
      mutate(d => {
        const t = d.tasks.find(x => x.id === taskId)
        if (!t) return
        t.status = 'disputed'
        for (const e of escrowEntries(d, t.id)) e.status = 'frozen'
        d.ledger.push(mkEntry({ taskId, from: 'sys:escrow', to: 'sys:escrow', amount: 0, type: 'dispute_freeze', status: 'frozen', memo: `争议冻结:${reason}` }))
        const isPublisher = byId === t.publisherId
        d.disputes.unshift({
          id: genId('D'), taskId, openedBy: byId, reason,
          claimA: isPublisher ? claim : undefined, claimB: isPublisher ? undefined : claim,
          evidence: [], status: 'open', createdAt: nowISO(),
        })
        const other = isPublisher ? t.helperId : t.publisherId
        if (other) notify(d, other, '⚖️', '任务进入争议', `「${t.title}」被发起争议,积分已冻结。请提交你的陈述与证据。`, `/task/${t.id}`)
      })
    },
    addDisputeStatement(disputeId: string, byId: string, claim: string) {
      mutate(d => {
        const dis = d.disputes.find(x => x.id === disputeId)
        if (!dis) return
        const t = d.tasks.find(x => x.id === dis.taskId)
        if (byId === t?.publisherId) dis.claimA = claim
        else dis.claimB = claim
        // AI 中立摘要(降级:模板生成)
        if (dis.claimA && dis.claimB)
          dis.aiSummary = `双方对任务结果存在分歧。发布者认为:${dis.claimA.slice(0, 60)}。帮助者认为:${dis.claimB.slice(0, 60)}。争议积分已冻结,等待人工审核。`
      })
    },
    addEvidence(disputeId: string, byId: string, text: string, kind: 'chat' | 'photo' | 'other') {
      mutate(d => {
        const dis = d.disputes.find(x => x.id === disputeId)
        dis?.evidence.push({ by: byId, text, kind })
        if (dis && dis.status === 'open') dis.status = 'reviewing'
      })
    },
    resolveDispute(disputeId: string, ruling: { toHelper: number; toPublisher: number; note: string }, admin = 'admin@utopia') {
      mutate(d => {
        const dis = d.disputes.find(x => x.id === disputeId)
        if (!dis || (dis.status !== 'open' && dis.status !== 'reviewing')) return
        const t = d.tasks.find(x => x.id === dis.taskId)
        if (!t) return
        for (const e of escrowEntries(d, t.id)) e.status = 'settled'
        if (ruling.toHelper > 0 && t.helperId)
          d.ledger.push(mkEntry({ taskId: t.id, from: 'sys:escrow', to: t.helperId, amount: ruling.toHelper, type: 'dispute_ruling', operator: 'admin', memo: `争议裁决:${ruling.note}` }))
        if (ruling.toPublisher > 0)
          d.ledger.push(mkEntry({ taskId: t.id, from: 'sys:escrow', to: t.publisherId, amount: ruling.toPublisher, type: 'dispute_ruling', operator: 'admin', memo: `争议裁决:${ruling.note}` }))
        const rest = t.points + t.serviceFee - ruling.toHelper - ruling.toPublisher
        if (rest > 0)
          d.ledger.push(mkEntry({ taskId: t.id, from: 'sys:escrow', to: 'sys:safety_pool', amount: rest, type: 'safety_compensation', operator: 'admin', memo: '裁决剩余进入安全补偿池' }))
        dis.status = 'resolved'
        dis.ruling = { ...ruling, admin, at: nowISO() }
        t.status = 'completed'
        t.completedAt = nowISO()
        d.auditLogs.unshift({ id: genId('A'), admin, action: `裁决争议 ${disputeId}`, target: t.id, basis: ruling.note, createdAt: nowISO() })
        notify(d, t.publisherId, '⚖️', '争议已裁决', `「${t.title}」:${ruling.note} 如不认同,可在 7 天内申诉一次。`, `/task/${t.id}`)
        if (t.helperId) notify(d, t.helperId, '⚖️', '争议已裁决', `「${t.title}」:${ruling.note} 如不认同,可在 7 天内申诉一次。`, `/task/${t.id}`)
      })
    },
    appealDispute(disputeId: string, byId: string, text: string) {
      mutate(d => {
        const dis = d.disputes.find(x => x.id === disputeId)
        if (!dis || dis.appeal) return
        dis.status = 'appealed'
        dis.appeal = { by: byId, text }
      })
    },
    resolveAppeal(disputeId: string, result: string, admin = 'admin@utopia') {
      mutate(d => {
        const dis = d.disputes.find(x => x.id === disputeId)
        if (!dis?.appeal) return
        dis.appeal.result = result
        dis.status = 'closed'
        d.auditLogs.unshift({ id: genId('A'), admin, action: `申诉复核 ${disputeId}`, target: dis.taskId, basis: result, createdAt: nowISO() })
      })
    },

    // ---------- 聊天 ----------
    sendMessage(chatId: string, fromId: string, text: string): { warning?: string; blocked?: boolean } {
      const check = assessMessage(text)
      mutate(d => {
        const c = d.chats.find(x => x.id === chatId)
        if (!c) return
        if (check.blocked) {
          c.messages.push({ id: genId('m'), fromId: 'system', system: true, text: `🚫 ${check.warning}`, createdAt: nowISO(), blocked: true })
          d.incidents.unshift({ id: genId('SI'), severity: 'S2', userId: fromId, summary: `聊天消息被拦截:${text.slice(0, 30)}`, status: 'open', log: [], createdAt: nowISO() })
          return
        }
        c.messages.push({ id: genId('m'), fromId, text, createdAt: nowISO(), riskWarning: check.warning })
        const other = c.memberIds.find(m => m !== fromId)
        if (other) {
          const from = findUser(d, fromId)
          notify(d, other, '💬', `${from?.name ?? '有人'}给你发来消息`, text.slice(0, 40), `/messages/${chatId}`)
        }
      })
      return check
    },
    startDM(withUserId: string): string {
      const s = getState()
      const uid = s.currentUserId!
      const existing = s.chats.find(c => !c.taskId && c.memberIds.includes(uid) && c.memberIds.includes(withUserId))
      if (existing) return existing.id
      const id = genId('ch')
      mutate(d => { d.chats.push({ id, memberIds: [uid, withUserId], messages: [] }) })
      return id
    },

    // ---------- 评价(双向盲评) ----------
    submitReview(taskId: string, r: Omit<Review, 'id' | 'createdAt' | 'published' | 'taskId'>) {
      mutate(d => {
        const t = d.tasks.find(x => x.id === taskId)
        if (!t) return
        t.reviews.push({ ...r, id: genId('rv'), taskId, createdAt: nowISO(), published: false })
        // 双方都完成后同时公开
        if (t.reviews.length >= 2) {
          for (const rv of t.reviews) rv.published = true
          const both = [t.publisherId, t.helperId].filter(Boolean) as string[]
          for (const uid of both) notify(d, uid, '⭐', '互评已公开', `「${t.title}」的双向评价现已互相可见。`, `/task/${t.id}`)
          // 更新愿意再次合作率(简化滚动)
          for (const rv of t.reviews) {
            const target = findUser(d, rv.toId)
            if (target) target.stats.wouldRepeat = Math.round(target.stats.wouldRepeat * 0.9 + (rv.wouldRepeat ? 100 : 0) * 0.1)
          }
        }
      })
    },

    // ---------- 内容社区 ----------
    toggleReaction(postId: string, kind: 'like' | 'save' | 'thank') {
      mutate(d => {
        const p = d.posts.find(x => x.id === postId)
        if (!p) return
        const key = kind === 'like' ? 'likedByMe' : kind === 'save' ? 'savedByMe' : 'thankedByMe'
        const cnt = kind === 'like' ? 'likes' : kind === 'save' ? 'saves' : 'thanks'
        const on = !p[key]
        p[key] = on
        p[cnt] += on ? 1 : -1
      })
    },
    addComment(postId: string, text: string) {
      mutate(d => {
        const p = d.posts.find(x => x.id === postId)
        p?.comments.push({ id: genId('cm'), userId: d.currentUserId!, text, createdAt: nowISO() })
      })
    },
    // 任务问答评论(公开;敏感信息引导私聊)
    addTaskComment(taskId: string, text: string) {
      mutate(d => {
        const t = d.tasks.find(x => x.id === taskId)
        if (!t) return
        if (!t.comments) t.comments = []
        t.comments.push({ id: genId('tc'), userId: d.currentUserId!, text, createdAt: nowISO() })
        if (t.publisherId !== d.currentUserId)
          notify(d, t.publisherId, '💬', '任务收到新提问', `「${t.title}」:${text.slice(0, 40)}`, `/task/${t.id}`)
      })
    },
    toggleSaveTask(taskId: string): boolean {
      let saved = false
      mutate(d => {
        if (!d.savedTasks) d.savedTasks = []
        const i = d.savedTasks.indexOf(taskId)
        if (i >= 0) d.savedTasks.splice(i, 1)
        else { d.savedTasks.push(taskId); saved = true }
      })
      return saved
    },
    addOfferCard(text: string) {
      mutate(d => {
        const u = findUser(d, d.currentUserId!)
        if (u && text.trim()) u.offerCards.unshift(text.trim())
      })
    },
    addPost(p: { kind: 'story' | 'event' | 'skill' | 'thanks' | 'guide'; title: string; body: string; coverEmoji: string; communityId?: string; tags?: string[] }) {
      mutate(d => {
        d.posts.unshift({
          id: genId('p'), authorId: d.currentUserId!, kind: p.kind, title: p.title, body: p.body,
          coverEmoji: p.coverEmoji, coverHue: Math.floor(Math.random() * 360), communityId: p.communityId,
          likes: 0, saves: 0, thanks: 0, comments: [], createdAt: nowISO(), tags: p.tags ?? [],
        })
      })
    },
    publishStory(taskId: string, p: { title: string; body: string; hideName: boolean; coverEmoji: string }) {
      mutate(d => {
        const t = d.tasks.find(x => x.id === taskId)
        if (!t) return
        const id = genId('p')
        t.storyId = id
        d.posts.unshift({
          id, authorId: d.currentUserId!, kind: 'story', title: p.title,
          body: p.body + (p.hideName ? '\n(应双方约定,已隐藏对方姓名与精确位置)' : ''),
          coverEmoji: p.coverEmoji, coverHue: Math.floor(Math.random() * 360),
          taskId, likes: 0, saves: 0, thanks: 0, comments: [], createdAt: nowISO(),
          tags: ['互助故事'],
        })
      })
    },
    donateToPool(amount: number): boolean {
      const s = getState()
      if (availablePoints(s, s.currentUserId!) < amount) return false
      mutate(d => {
        d.ledger.push(mkEntry({ from: d.currentUserId!, to: 'sys:community_pool', amount, type: 'community_grant', operator: 'user', memo: '用户捐入社区关怀池(帮助链)' }))
        notify(d, d.currentUserId!, '🌱', '感谢你的善意', `你向社区关怀池捐出了 ${amount} pt,它会用于支持社区公益任务。`)
      })
      return true
    },

    // ---------- 关注 / 屏蔽 / 举报 ----------
    toggleFollow(id: string) {
      mutate(d => {
        const i = d.following.indexOf(id)
        if (i >= 0) d.following.splice(i, 1)
        else d.following.push(id)
      })
    },
    joinCommunity(cid: string) {
      mutate(d => {
        const u = findUser(d, d.currentUserId!)
        if (u && !u.communityIds.includes(cid)) {
          u.communityIds.push(cid)
          if (u.verifications.community === false) u.verifications.community = true
          const c = d.communities.find(x => x.id === cid)
          if (c) c.memberCount += 1
        }
      })
    },
    blockUser(userId: string) {
      mutate(d => {
        const u = findUser(d, d.currentUserId!)
        if (u && !u.blocked.includes(userId)) u.blocked.push(userId)
      })
    },
    unblockUser(userId: string) {
      mutate(d => {
        const u = findUser(d, d.currentUserId!)
        if (u) u.blocked = u.blocked.filter(x => x !== userId)
      })
    },
    report(targetType: 'user' | 'task' | 'content' | 'message', targetId: string, reason: string, detail: string) {
      mutate(d => {
        d.reports.unshift({ id: genId('R'), fromId: d.currentUserId!, targetType, targetId, reason, detail, status: 'pending', createdAt: nowISO() })
        notify(d, d.currentUserId!, '🛡️', '举报已提交', '安全团队会尽快审核。经核实的高质量安全举报会获得积分感谢。')
      })
    },
    markAllRead() {
      mutate(d => {
        for (const n of d.notifications) if (n.userId === d.currentUserId) n.read = true
      })
    },

    // ---------- 管理员 ----------
    adminAdjustLedger(userId: string, amount: number, basis: string, admin = 'admin@utopia') {
      mutate(d => {
        d.ledger.push(mkEntry({
          from: amount >= 0 ? 'sys:issuer' : userId, to: amount >= 0 ? userId : 'sys:burn',
          amount: Math.abs(amount), type: 'manual_adjust', operator: 'admin', memo: basis,
        }))
        d.auditLogs.unshift({ id: genId('A'), admin, action: `账本调整 ${amount > 0 ? '+' : '-'}${Math.abs(amount)}pt → ${userId}`, target: userId, basis, createdAt: nowISO() })
      })
    },
    adminHandleIncident(id: string, action: string, basis: string, resolve: boolean, admin = 'admin@utopia') {
      mutate(d => {
        const inc = d.incidents.find(x => x.id === id)
        if (!inc) return
        inc.log.push({ admin, at: nowISO(), action, basis, notified: true })
        inc.status = resolve ? 'resolved' : 'handling'
        d.auditLogs.unshift({ id: genId('A'), admin, action: `处理安全事件 ${id}:${action}`, target: id, basis, createdAt: nowISO() })
      })
    },
    adminBlockTask(taskId: string, reason: string, admin = 'admin@utopia') {
      mutate(d => {
        const t = d.tasks.find(x => x.id === taskId)
        if (!t) return
        // 争议中的任务托管已冻结待裁决,直接下架会造成同一托管双重支付;须先裁决关闭争议
        if (t.status === 'disputed') return
        // 如已有托管,全额退回
        if (escrowEntries(d, t.id).length) releaseEscrow(d, t, 0, t.points, '管理员下架')
        t.status = 'blocked'
        t.blockReason = reason
        d.auditLogs.unshift({ id: genId('A'), admin, action: '人工下架任务', target: taskId, basis: reason, createdAt: nowISO() })
        notify(d, t.publisherId, '🚫', '任务已被下架', `「${t.title}」:${reason}。如有异议可以申诉。`)
      })
    },
    adminReviewReport(id: string, verdict: 'verified' | 'dismissed', admin = 'admin@utopia') {
      mutate(d => {
        const r = d.reports.find(x => x.id === id)
        if (!r) return
        r.status = verdict
        if (verdict === 'verified') {
          d.ledger.push(mkEntry({ from: 'sys:safety_pool', to: r.fromId, amount: 20, type: 'safety_compensation', operator: 'admin', memo: '经核实的高质量安全举报感谢' }))
          notify(d, r.fromId, '🛡️', '举报已核实', '感谢你守护社区安全,20 pt 已从安全补偿池发放。')
        }
        d.auditLogs.unshift({ id: genId('A'), admin, action: `审核举报 ${id}:${verdict === 'verified' ? '核实' : '驳回'}`, target: r.targetId, basis: r.reason, createdAt: nowISO() })
      })
    },
    adminRestrictUser(userId: string, note: string, admin = 'admin@utopia') {
      mutate(d => {
        const u = findUser(d, userId)
        if (u) u.restricted = note || undefined
        d.auditLogs.unshift({ id: genId('A'), admin, action: note ? '限制用户' : '解除限制', target: userId, basis: note || '申诉通过', createdAt: nowISO() })
      })
    },

    resetDemo() {
      localStorage.removeItem(STORAGE_KEY)
      setState(() => freshState())
    },
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState)
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* 空间不足时忽略 */ }
  }, [state])
  const stateRef = useMemo(() => ({ current: state }), [])
  stateRef.current = state
  const actions = useMemo(() => buildActions(setState, () => stateRef.current), [stateRef])
  const value = useMemo(() => ({ state, actions }), [state, actions])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): StoreCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export function useCurrentUser(): User | null {
  const { state } = useStore()
  return state.users.find(u => u.id === state.currentUserId) ?? null
}
