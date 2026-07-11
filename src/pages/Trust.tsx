import { useStore, useCurrentUser } from '../lib/store'
import { TrustPassport } from '../components/cards'
import { LEVEL_META } from '../components/ui'
import type { VerificationLevel } from '../lib/types'

const LEVELS: { level: VerificationLevel; desc: string; how: string }[] = [
  { level: 0, desc: '可以浏览内容、参加线上低风险互助(T0)。', how: '注册即达成' },
  { level: 1, desc: '可以参加公共场所任务(T1),头像旁显示实名标识。', how: '完成基础身份验证' },
  { level: 2, desc: '可信社区成员:可以申请宠物照看、上门类等较高信任任务(T2)。', how: '社区验证 + 一定数量成功任务 + 良好安全记录 + 可信成员担保' },
  { level: 3, desc: '专项认证:教练、教师、宠物照护、维修等需要技能验证的服务。', how: '提交资质材料,由平台与合作机构审核' },
]

export default function Trust() {
  const { state, actions } = useStore()
  const me = useCurrentUser()!

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">信任与认证中心</h1>
      <TrustPassport user={me} />

      <div className="card p-5">
        <h3 className="font-semibold mb-4">认证等级</h3>
        <div className="space-y-3">
          {LEVELS.map(l => {
            const reached = me.level >= l.level
            const next = me.level + 1 === l.level
            return (
              <div key={l.level} className={`rounded-xl border p-4 ${reached ? 'border-leaf-400 bg-leaf-50/50' : 'border-cream-300'}`}>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className={`chip ${LEVEL_META[l.level].cls}`}>{LEVEL_META[l.level].label}</span>
                    {reached && <span className="text-leaf-600 text-sm">✓ 已达成</span>}
                  </div>
                  {next && l.level === 1 && !me.verifications.identity && (
                    <button className="btn-primary !py-1.5" onClick={() => actions.verifyIdentity()}>模拟完成身份验证(+100 pt)</button>
                  )}
                </div>
                <p className="text-sm text-ink-500 mt-2">{l.desc}</p>
                <p className="text-xs text-ink-300 mt-1">达成方式:{l.how}</p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card p-5">
        <h3 className="font-semibold mb-3">我的社区验证</h3>
        {me.communityIds.length === 0 && <p className="text-sm text-ink-400">还没有加入社区。加入并验证社区身份是建立信任的第一步。</p>}
        <div className="space-y-2">
          {me.communityIds.map(cid => {
            const c = state.communities.find(x => x.id === cid)
            return c && (
              <div key={cid} className="flex items-center justify-between bg-cream-100 rounded-xl px-4 py-3">
                <span className="text-sm">{c.emoji} {c.name}</span>
                <span className="chip bg-leaf-50 text-leaf-600">✓ 已验证</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="card p-5 text-xs text-ink-400 leading-relaxed">
        <b className="text-ink-500">我们如何保护你的信息:</b>身份证件仅用于验证,不会展示给其他用户;信任护照只公开互助表现数据,不公开积分余额、内部风险分、精确地址或位置历史。评价禁止涉及外貌、种族、性别、宗教、口音、残障等与任务无关的特征。
      </div>
    </div>
  )
}
