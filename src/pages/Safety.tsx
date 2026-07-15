import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, useCurrentUser } from '../lib/store'
import { Avatar, Modal, StatusBadge } from '../components/ui'

export default function Safety() {
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const [share, setShare] = useState(false)
  const [sos, setSos] = useState(false)

  const activeTasks = useMemo(() =>
    state.tasks.filter(t => (t.publisherId === me.id || t.helperId === me.id) && ['matched', 'starting_soon', 'in_progress', 'pending_confirm'].includes(t.status)),
  [state.tasks, me.id])
  const myReports = state.reports.filter(r => r.fromId === me.id)
  const myDisputes = state.disputes.filter(d => {
    const t = state.tasks.find(x => x.id === d.taskId)
    return t && (t.publisherId === me.id || t.helperId === me.id)
  })

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">安全中心</h1>

      {/* 紧急分层 */}
      <div className="grid sm:grid-cols-3 gap-3">
        <button className="card p-4 text-left hover:shadow-card-hover transition cursor-pointer" onClick={() => setSos(true)}>
          <div className="text-2xl mb-2">🆘</div>
          <div className="font-semibold text-sm">紧急情况</div>
          <div className="text-xs text-ink-400 mt-1">联系警察、急救等当地紧急服务</div>
        </button>
        <button className="card p-4 text-left hover:shadow-card-hover transition cursor-pointer" onClick={() => setShare(true)}>
          <div className="text-2xl mb-2">📡</div>
          <div className="font-semibold text-sm">分享任务给可信联系人</div>
          <div className="text-xs text-ink-400 mt-1">{me.emergencyContact ? `已设置:${me.emergencyContact}` : '还未设置紧急联系人'}</div>
        </button>
        <Link to="/messages" className="card p-4 hover:shadow-card-hover transition">
          <div className="text-2xl mb-2">🎧</div>
          <div className="font-semibold text-sm">联系 Utopia 客服</div>
          <div className="text-xs text-ink-400 mt-1">平台问题与安全咨询(非紧急救援机构)</div>
        </Link>
      </div>

      {/* 进行中的任务 */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3">当前进行中的任务</h3>
        {activeTasks.length === 0 && <p className="text-sm text-ink-400">没有进行中的任务。</p>}
        <div className="space-y-2">
          {activeTasks.map(t => (
            <Link key={t.id} to={`/task/${t.id}`} className="flex items-center justify-between bg-cream-100 rounded-xl px-4 py-3 hover:bg-cream-200 transition">
              <div className="text-sm">{t.images[0]} {t.title}</div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
        </div>
        {activeTasks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 text-xs">
            <span className="chip bg-leaf-50 text-leaf-600">✓ 开始/结束签到</span>
            <span className="chip bg-leaf-50 text-leaf-600">✓ 一次性验证码</span>
            <span className="chip bg-leaf-50 text-leaf-600">✓ 定时安全确认</span>
            <span className="chip bg-leaf-50 text-leaf-600">✓ 一键提前退出</span>
          </div>
        )}
      </div>

      {/* 线下安全须知 */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3">线下互助安全须知</h3>
        <ul className="text-sm text-ink-500 space-y-2 leading-relaxed">
          <li>🏞 首次合作优先选择公共场所,精确住址仅在任务确实需要时告知。</li>
          <li>💰 任何要求垫付现金、代购礼品卡、索要验证码的行为都是诈骗,请立即举报。</li>
          <li>📵 保持站内沟通,积分托管与聊天记录是发生争议时的重要保障。</li>
          <li>🕐 任务结束后,实时位置共享会自动停止,对方无法再查看你的位置。</li>
        </ul>
      </div>

      {/* 屏蔽名单 */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3">屏蔽名单</h3>
        {me.blocked.length === 0 && <p className="text-sm text-ink-400">没有屏蔽任何人。</p>}
        <div className="space-y-2">
          {me.blocked.map(uid => {
            const u = state.users.find(x => x.id === uid)
            return u && (
              <div key={uid} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><Avatar user={u} size={30} /><span className="text-sm">{u.name}</span></div>
                <button className="btn-ghost !py-1 !text-xs" onClick={() => actions.unblockUser(uid)}>取消屏蔽</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* 举报与争议记录 */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold mb-3">我的举报记录</h3>
          {myReports.length === 0 && <p className="text-sm text-ink-400">没有举报记录。</p>}
          <div className="space-y-2">
            {myReports.map(r => (
              <div key={r.id} className="bg-cream-100 rounded-xl px-3 py-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="font-medium">{r.reason}</span>
                  <span className={`chip ${r.status === 'verified' ? 'bg-leaf-50 text-leaf-600' : r.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-cream-200 text-ink-400'}`}>
                    {{ pending: '审核中', verified: '已核实', dismissed: '已驳回' }[r.status]}
                  </span>
                </div>
                <div className="text-ink-400 mt-1">{r.detail || '—'}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5">
          <h3 className="font-semibold mb-3">我的争议记录</h3>
          {myDisputes.length === 0 && <p className="text-sm text-ink-400">没有争议记录。</p>}
          <div className="space-y-2">
            {myDisputes.map(d => {
              const t = state.tasks.find(x => x.id === d.taskId)
              return (
                <Link key={d.id} to={`/task/${d.taskId}`} className="block bg-cream-100 rounded-xl px-3 py-2.5 text-xs hover:bg-cream-200 transition">
                  <div className="font-medium">{t?.title}</div>
                  <div className="text-ink-400 mt-1">{d.reason} · {{ open: '等待陈述', reviewing: '审核中', resolved: '已裁决', appealed: '申诉中', closed: '已结案' }[d.status]}</div>
                </Link>
              )
            })}
          </div>
        </div>
      </div>

      {/* 广告与推广偏好 */}
      <div className="card p-5">
        <h3 className="font-semibold mb-1">广告与推广偏好</h3>
        <p className="text-xs text-ink-400 mb-4 leading-relaxed">
          Utopia 只投放明确标注的本地情境广告,绝不使用你的私聊内容、精确住址、实时位置、医疗心理状态或任务困难做广告定向;聊天、任务执行和安全中心永远没有广告。
        </p>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-ink-700">减少信息流中的推广内容</span>
            <input type="checkbox" className="accent-coral-500 w-4 h-4" checked={me.adPrefs?.reducePromos ?? false}
              onChange={e => actions.updateAdPrefs({ reducePromos: e.target.checked })} />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-ink-700">允许基于兴趣标签的本地广告</span>
            <input type="checkbox" className="accent-coral-500 w-4 h-4" checked={me.adPrefs?.personalized ?? true}
              onChange={e => actions.updateAdPrefs({ personalized: e.target.checked })} />
          </label>
          {(me.adPrefs?.hiddenAdCategories?.length ?? 0) > 0 && (
            <div className="text-xs text-ink-400">
              已隐藏的广告类目:{me.adPrefs!.hiddenAdCategories.join('、')}
              <button className="text-violet-600 ml-2 cursor-pointer" onClick={() => actions.updateAdPrefs({ hiddenAdCategories: [] })}>恢复</button>
            </div>
          )}
          <p className="text-[11px] text-ink-300">
            <Link to="/plus" className="text-violet-600">Plus 会员</Link>几乎不看到广告 —— 但我们不会为了卖会员而故意增加免费版的广告。
          </p>
        </div>
      </div>

      {/* 隐私与设备 */}
      <div className="card p-5">
        <h3 className="font-semibold mb-3">隐私与账号</h3>
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {['下载我的数据', '管理兴趣标签', '关闭个性化推荐', '谁可以私信我:所有人', '位置权限:使用期间', '查看登录设备(本机 · macOS Safari)'].map(item => (
            <div key={item} className="bg-cream-100 rounded-xl px-4 py-3 text-ink-500 flex justify-between items-center">
              {item} <span className="text-ink-300">›</span>
            </div>
          ))}
        </div>
        <button className="text-xs text-coral-500 mt-4 cursor-pointer" onClick={() => { if (confirm('确定要重置演示数据吗?所有本地状态将恢复为初始种子数据。')) actions.resetDemo() }}>
          ↺ 重置演示数据
        </button>
      </div>

      {/* 分享弹窗 */}
      <Modal open={share} onClose={() => setShare(false)} title="分享任务给可信联系人">
        <p className="text-sm text-ink-500 mb-4">你的可信联系人会收到任务时间、大致地点和你的安全状态。任务结束后共享自动停止。</p>
        <div className="bg-cream-100 rounded-xl p-4 text-sm mb-4">
          👥 紧急联系人:{me.emergencyContact ?? '未设置(可在新用户引导或此处设置)'}
        </div>
        <button className="btn-green w-full" onClick={() => setShare(false)}>✓ 已开启任务共享(演示)</button>
      </Modal>

      {/* SOS 弹窗 */}
      <Modal open={sos} onClose={() => setSos(false)} title="紧急情况">
        <div className="space-y-3">
          <a className="block bg-coral-500 text-white rounded-xl p-4 text-center font-semibold cursor-pointer">📞 拨打 110(警察)</a>
          <a className="block bg-coral-400 text-white rounded-xl p-4 text-center font-semibold cursor-pointer">🚑 拨打 120(急救)</a>
          <button className="btn-outline w-full" onClick={() => setSos(false)}>通知我的紧急联系人</button>
          <p className="text-[11px] text-ink-300 text-center">Utopia 客服可以协助保存证据与处理平台事务,但不是紧急救援机构。人身安全风险请务必优先联系当地紧急服务。</p>
        </div>
      </Modal>
    </div>
  )
}
