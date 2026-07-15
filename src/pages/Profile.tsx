import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Settings, ChevronRight, Camera, ImagePlus } from 'lucide-react'
import { useStore, useCurrentUser } from '../lib/store'
import { hasPlusBenefits } from '../lib/monetize'
import { PostCard, TaskCard, TrustPassport } from '../components/cards'
import { Avatar, Empty, Modal, PlusBadge, VerifyDot, pickImage, toast } from '../components/ui'
import { ReportModal } from './TaskDetail'

function hashNum(id: string, mod: number, min: number) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) % 99991
  return (h % mod) + min
}

export default function Profile() {
  const { id: rawId } = useParams()
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const nav = useNavigate()
  const [report, setReport] = useState(false)
  const [trust, setTrust] = useState(false)
  const [menu, setMenu] = useState(false)
  const [theme, setTheme] = useState(false)
  const [tab, setTab] = useState<'share' | 'active' | 'done' | 'saved'>('share')
  const id = rawId === 'me' ? me.id : rawId   // 支持 /user/me
  const user = state.users.find(u => u.id === id)

  const isMe = id === me.id
  const posts = useMemo(() => state.posts.filter(p => p.authorId === id), [state.posts, id])
  const activeTasks = useMemo(() => state.tasks.filter(t => (t.publisherId === id || t.helperId === id) && ['open', 'applied', 'matched', 'starting_soon', 'in_progress', 'pending_confirm', 'disputed'].includes(t.status)), [state.tasks, id])
  const doneTasks = useMemo(() => state.tasks.filter(t => (t.publisherId === id || t.helperId === id) && t.status === 'completed'), [state.tasks, id])
  const savedTasks = useMemo(() => state.tasks.filter(t => (state.savedTasks ?? []).includes(t.id)), [state.tasks, state.savedTasks])

  if (!user) return <Empty text="用户不存在" />
  const blocked = me.blocked.includes(user.id)
  const following = state.following.includes(user.id)
  const thanksCount = posts.reduce((a, p) => a + p.likes + p.thanks, 0)
  const followCount = isMe ? state.following.filter(f => f.startsWith('u')).length + 5 : hashNum(user.id, 160, 12)
  const fansCount = hashNum(user.id + 'f', 220, 8) + user.stats.helped

  // 主圈子 = 用户圈子列表的第一个(可在圈子页「我的圈子管理」中调整)
  const community = state.communities.find(c => c.id === user.communityIds[0])
    ?? state.communities.find(c => user.communityIds.includes(c.id))

  const changeAvatar = async () => {
    const url = await pickImage(320)
    if (url) { actions.setAvatarImage(url); toast('头像已更新') }
  }
  const changeBg = async () => {
    const url = await pickImage(1200)
    if (url) { actions.setProfileBg(url); toast('主页背景已更新') }
  }

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* 主页背景(Plus 主页装扮:签名色渐变) */}
      {(user.bgUrl || isMe || user.profileTheme) && (
        <div className="relative -mx-3 md:mx-0 -mt-2 md:mt-0 md:rounded-2xl overflow-hidden">
          {user.bgUrl
            ? <img src={user.bgUrl} alt="" className="w-full h-36 md:h-48 object-cover" />
            : user.profileTheme
              ? <div className="w-full h-24 md:h-32" style={{ background: `linear-gradient(135deg, oklch(0.93 0.06 ${user.profileTheme.hue}), oklch(0.97 0.02 ${(user.profileTheme.hue + 40) % 360}), oklch(0.9 0.08 ${(user.profileTheme.hue + 320) % 360}))` }} />
              : <div className="w-full h-24 md:h-32 bg-gradient-to-br from-coral-50 via-cream-100 to-violet-50" />}
          {isMe && (
            <div className="absolute right-3 bottom-3 flex gap-2 z-20">
              <button className="chip bg-black/40 text-white backdrop-blur !py-1.5 !px-3 cursor-pointer"
                onClick={() => hasPlusBenefits(me) ? setTheme(true) : toast('主页装扮是 Plus / Pro 会员功能')}>
                🎨 装扮{!hasPlusBenefits(me) && ' 🔒'}
              </button>
              <button className="chip bg-black/40 text-white backdrop-blur !py-1.5 !px-3 cursor-pointer" onClick={changeBg}>
                <ImagePlus size={13} strokeWidth={2} /> {user.bgUrl ? '更换背景' : '设置背景'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 顶部 */}
      <div className={`flex items-start gap-4 ${user.bgUrl || isMe || user.profileTheme ? '-mt-8 relative z-10 pointer-events-none [&>*]:pointer-events-auto' : 'pt-3'}`}>
        <span className="relative shrink-0">
          <span className="block rounded-full ring-[3px] ring-white">
            <Avatar user={user} size={76} link={false} />
          </span>
          {isMe && (
            <button className="absolute -right-0.5 -bottom-0.5 w-6 h-6 rounded-full bg-ink-900/80 text-white flex items-center justify-center cursor-pointer ring-2 ring-white"
              onClick={changeAvatar} aria-label="上传头像">
              <Camera size={13} strokeWidth={2} />
            </button>
          )}
        </span>
        <div className={`flex-1 min-w-0 ${user.bgUrl || isMe || user.profileTheme ? 'pt-9' : ''}`}>
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-lg font-semibold text-ink-900">{user.name}</h1>
            <VerifyDot level={user.level} />
            <PlusBadge user={user} />
            {user.restricted && <span className="chip bg-coral-50 text-coral-600">⚠ 受限</span>}
          </div>
          <div className="text-xs text-ink-300 mt-0.5">Utopia号:{user.id} · {user.city}</div>
          <p className="text-sm text-ink-700 mt-2 leading-relaxed">{user.bio}</p>
          <div className="text-xs text-ink-400 mt-1.5 flex flex-wrap gap-x-2">
            {community && <Link to={`/circle/${community.id}`} className="text-violet-500">{community.emoji} {community.name}</Link>}
            <span>🗣 {user.languages.join(' / ')}</span>
          </div>
        </div>
        {isMe && (
          <button className={`p-2 text-ink-500 cursor-pointer self-start ${user.bgUrl || isMe || user.profileTheme ? 'mt-9' : ''}`} onClick={() => setMenu(true)} aria-label="设置"><Settings size={20} strokeWidth={1.8} /></button>
        )}
      </div>

      {/* 一行信任信息 */}
      <button className="flex items-center gap-1 mt-3 text-xs text-ink-400 cursor-pointer hover:text-ink-600" onClick={() => setTrust(true)}>
        {user.verifications.identity && '身份已验证 · '}{user.verifications.community && '社区已验证 · '}完成{user.stats.helped + user.stats.received}次互助
        <ChevronRight size={13} />
      </button>

      {/* 数据行 + 操作 */}
      <div className="flex items-center mt-4">
        <div className="flex gap-6 text-sm">
          <span><b className="text-ink-900">{followCount}</b> <span className="text-ink-400 text-xs">关注</span></span>
          <span><b className="text-ink-900">{fansCount}</b> <span className="text-ink-400 text-xs">粉丝</span></span>
          <span><b className="text-ink-900">{thanksCount}</b> <span className="text-ink-400 text-xs">获赞与感谢</span></span>
        </div>
        <div className="flex-1" />
        {isMe ? (
          <Link to="/trust" className="btn-outline !py-1.5 !px-4 !text-[13px]">编辑资料</Link>
        ) : (
          <div className="flex gap-2">
            <button className={`btn !py-1.5 !px-5 !text-[13px] ${following ? 'bg-cream-100 text-ink-400' : 'btn-primary'}`}
              onClick={() => { actions.toggleFollow(user.id); toast(following ? '已取消关注' : '已关注') }}>
              {following ? '已关注' : '关注'}
            </button>
            <button className="btn-outline !py-1.5 !px-4 !text-[13px]" onClick={() => nav(`/messages/${actions.startDM(user.id)}`)}>私信</button>
          </div>
        )}
      </div>

      {/* Utopia Pro 专业主页(专业工具展示,不代表平台背书或更高信任) */}
      {user.pro?.active && (
        <div className="mt-4 card p-4 bg-gradient-to-br from-violet-50/60 to-white">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="chip bg-violet-100 text-violet-600">💼 Pro</span>
            <span className="text-sm font-medium">{user.pro.headline}</span>
          </div>
          {user.pro.weeklySlots.length > 0 && <div className="text-xs text-ink-500 mt-1">🗓 可约时间:{user.pro.weeklySlots.join(' / ')}</div>}
          {user.pro.portfolio.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto no-scrollbar">
              {user.pro.portfolio.map(p => <span key={p} className="chip bg-white text-ink-500 border border-cream-200 shrink-0">{p}</span>)}
            </div>
          )}
          <p className="text-[10px] text-ink-300 mt-2">Pro 是专业展示工具,不代表平台认证或更高信任,信任信息以信任护照为准。</p>
        </div>
      )}

      {/* 我可以帮助(长期卡片) */}
      {user.offerCards.length > 0 && (
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar">
          {user.offerCards.map(c => (
            <button key={c} className="chip bg-leaf-50 text-leaf-700 !py-2 !px-3.5 shrink-0 cursor-pointer"
              onClick={() => !isMe && nav(`/messages/${actions.startDM(user.id)}`)}>
              🤲 {c}
            </button>
          ))}
        </div>
      )}

      {/* 内容 Tab */}
      <div className="flex justify-center gap-10 border-b border-cream-200 mt-5 mb-4 sticky top-[var(--safe-top)] md:top-14 bg-white z-20">
        {([['share', '分享'], ['active', '正在互助'], ['done', '已完成'], ...(isMe ? [['saved', '收藏'] as const] : [])] as const).map(([k, label]) => (
          <button key={k} onClick={() => setTab(k as typeof tab)}
            className={`relative py-2.5 text-sm cursor-pointer ${tab === k ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}>
            {label}
            {tab === k && <span className="absolute left-1/2 -translate-x-1/2 bottom-0 w-4 h-[3px] rounded-full bg-coral-500" />}
          </button>
        ))}
      </div>

      {(() => {
        const cards =
          tab === 'share' ? posts.map(p => <PostCard key={p.id} post={p} />)
            : tab === 'active' ? activeTasks.map(t => <TaskCard key={t.id} task={t} />)
              : tab === 'done' ? [...doneTasks.map(t => <TaskCard key={t.id} task={t} />), ...posts.filter(p => p.taskId).map(p => <PostCard key={p.id} post={p} />)]
                : savedTasks.map(t => <TaskCard key={t.id} task={t} />)
        return cards.length === 0
          ? <Empty icon="🍃" text={tab === 'share' ? '还没有分享内容' : tab === 'active' ? '没有进行中的互助' : tab === 'saved' ? '还没有收藏任务' : '还没有完成记录'}
            action={isMe && tab === 'active' ? <Link to="/nearby" className="btn-primary">去附近看看</Link> : undefined} />
          : <div className="masonry columns-2 md:columns-3">{cards}</div>
      })()}

      {/* 信任护照弹窗 */}
      <Modal open={trust} onClose={() => setTrust(false)} title={`${user.name} 的信任护照`}>
        <TrustPassport user={user} compact />
        <p className="text-[11px] text-ink-300 mt-4">为保护隐私,身份证件、精确地址、积分余额与位置历史不会向其他用户公开。</p>
      </Modal>

      {/* 设置菜单(本人) / 更多(他人) */}
      <Modal open={menu} onClose={() => setMenu(false)} title={isMe ? '设置' : '更多'}>
        <div className="space-y-1">
          {isMe ? (
            <>
              <button className="w-full text-left px-3 py-3 rounded-xl hover:bg-cream-50 text-sm cursor-pointer flex items-center justify-between"
                onClick={async () => { setMenu(false); await changeAvatar() }}>
                上传头像 <Camera size={15} className="text-ink-300" />
              </button>
              <button className="w-full text-left px-3 py-3 rounded-xl hover:bg-cream-50 text-sm cursor-pointer flex items-center justify-between"
                onClick={async () => { setMenu(false); await changeBg() }}>
                更换主页背景 <ImagePlus size={15} className="text-ink-300" />
              </button>
              {(user.avatarUrl || user.bgUrl) && (
                <button className="w-full text-left px-3 py-3 rounded-xl hover:bg-cream-50 text-sm text-ink-400 cursor-pointer"
                  onClick={() => { actions.setAvatarImage(undefined); actions.setProfileBg(undefined); toast('已恢复默认头像与背景'); setMenu(false) }}>
                  恢复默认头像与背景
                </button>
              )}
              {[['我的任务', '/mytasks'], ['积分中心', '/points'], ['我的圈子', '/circles'], ['信任与认证', '/trust'], ['安全中心', '/safety'], ['管理员后台', '/admin']].map(([label, to]) => (
                <Link key={to} to={to} className="flex items-center justify-between px-3 py-3 rounded-xl hover:bg-cream-50 text-sm" onClick={() => setMenu(false)}>
                  {label} <ChevronRight size={15} className="text-ink-300" />
                </Link>
              ))}
              <button className="w-full text-left px-3 py-3 rounded-xl hover:bg-cream-50 text-sm text-ink-400 cursor-pointer"
                onClick={() => { actions.logout(); nav('/welcome') }}>退出登录</button>
            </>
          ) : (
            <>
              <button className="w-full text-left px-3 py-3 rounded-xl hover:bg-cream-50 text-sm cursor-pointer"
                onClick={() => { blocked ? actions.unblockUser(user.id) : actions.blockUser(user.id); toast(blocked ? '已取消屏蔽' : '已屏蔽'); setMenu(false) }}>
                {blocked ? '取消屏蔽' : '屏蔽该用户'}
              </button>
              <button className="w-full text-left px-3 py-3 rounded-xl hover:bg-cream-50 text-sm text-coral-600 cursor-pointer"
                onClick={() => { setMenu(false); setReport(true) }}>举报</button>
            </>
          )}
        </div>
      </Modal>

      {!isMe && (
        <button className="fixed right-4 bottom-[calc(5rem+var(--safe-bottom))] md:bottom-8 w-9 h-9 rounded-full bg-white border border-cream-300 text-ink-400 cursor-pointer z-30" onClick={() => setMenu(true)}>⋯</button>
      )}
      <ReportModal open={report} onClose={() => setReport(false)} targetType="user" targetId={user.id} />

      {/* Plus 主页装扮:签名色 */}
      <Modal open={theme} onClose={() => setTheme(false)} title="主页装扮 · 签名色">
        <p className="text-xs text-ink-400 mb-4">选择一个签名色作为主页背景(上传了背景图时以图片优先)。</p>
        <div className="grid grid-cols-5 gap-3 mb-4">
          {[16, 40, 90, 140, 205, 260, 300, 340, 60].map(h => (
            <button key={h} aria-label={`色相 ${h}`}
              className={`h-12 rounded-xl cursor-pointer transition ring-offset-2 ${me.profileTheme?.hue === h ? 'ring-2 ring-ink-900' : 'hover:scale-105'}`}
              style={{ background: `linear-gradient(135deg, oklch(0.93 0.06 ${h}), oklch(0.9 0.08 ${(h + 320) % 360}))` }}
              onClick={() => { actions.setProfileTheme(h); toast('签名色已更新') }} />
          ))}
          <button className={`h-12 rounded-xl cursor-pointer bg-gradient-to-br from-coral-50 via-cream-100 to-violet-50 border border-cream-300 text-[10px] text-ink-400 ${!me.profileTheme ? 'ring-2 ring-ink-900 ring-offset-2' : ''}`}
            onClick={() => { actions.setProfileTheme(undefined); toast('已恢复默认') }}>默认</button>
        </div>
        <button className="btn-primary w-full" onClick={() => setTheme(false)}>完成</button>
      </Modal>
    </div>
  )
}
