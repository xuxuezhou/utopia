import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Compass, MapPin, MessageCircle, Plus, User as UserIcon, UsersRound, Search, MoreHorizontal, House } from 'lucide-react'
import { useStore, useCurrentUser } from '../lib/store'
import { Avatar, Logo, ToastHost, toast } from './ui'

const sideCls = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-[15px] transition-colors ${isActive ? 'bg-cream-100 text-ink-900 font-semibold' : 'text-ink-500 hover:bg-cream-50 hover:text-ink-700'}`

export default function Layout() {
  const { state, actions } = useStore()
  const me = useCurrentUser()
  const nav = useNavigate()
  const loc = useLocation()
  const [sheet, setSheet] = useState(false)
  const [more, setMore] = useState(false)
  const unread = state.notifications.filter(n => n.userId === state.currentUserId && !n.read).length

  // 详情页有自己的底部操作栏,隐藏全局底部导航
  const hideBottomNav = /^\/task\//.test(loc.pathname) || /^\/messages\/./.test(loc.pathname)

  return (
    <div className="min-h-screen bg-white">
      {/* iOS 状态栏背板:遮住滚动到刘海区域下方的内容 */}
      <div className="fixed top-0 inset-x-0 h-[var(--safe-top)] bg-white/95 backdrop-blur z-40 md:hidden" />
      {/* 桌面左侧导航 */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-56 flex-col px-3 py-5 border-r border-cream-200 bg-white z-40">
        <Link to="/" className="px-4 mb-6"><Logo size={30} /></Link>
        <nav className="space-y-1 flex-1">
          <NavLink to="/" end className={sideCls}><Compass size={20} strokeWidth={1.8} /> 发现</NavLink>
          <NavLink to="/nearby" className={sideCls}><MapPin size={20} strokeWidth={1.8} /> 附近</NavLink>
          <NavLink to="/circles" className={sideCls}><UsersRound size={20} strokeWidth={1.8} /> 圈子</NavLink>
          <NavLink to="/messages" className={sideCls}>
            <span className="relative"><MessageCircle size={20} strokeWidth={1.8} />
              {unread > 0 && <span className="absolute -top-1 -right-1.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-coral-500 text-white text-[9px] flex items-center justify-center">{unread}</span>}
            </span> 消息
          </NavLink>
          <NavLink to={me ? `/user/${me.id}` : '/welcome'} className={sideCls}><UserIcon size={20} strokeWidth={1.8} /> 我的</NavLink>
          <button className="w-full mt-4 btn-primary !py-2.5 !text-[15px]" onClick={() => setSheet(true)}>
            <Plus size={18} strokeWidth={2.2} /> 发布
          </button>
        </nav>
        <div className="relative">
          <button className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-ink-500 hover:bg-cream-50 w-full cursor-pointer" onClick={() => setMore(v => !v)}>
            <MoreHorizontal size={20} strokeWidth={1.8} /> 更多
          </button>
          {more && (
            <div className="absolute bottom-12 left-2 w-52 pop border border-cream-200 p-1.5 z-50" onClick={() => setMore(false)}>
              <Link to="/mytasks" className="block px-3 py-2 rounded-lg hover:bg-cream-50 text-sm">我的任务</Link>
              <Link to="/points" className="block px-3 py-2 rounded-lg hover:bg-cream-50 text-sm">积分中心</Link>
              <Link to="/trust" className="block px-3 py-2 rounded-lg hover:bg-cream-50 text-sm">信任与认证</Link>
              <Link to="/safety" className="block px-3 py-2 rounded-lg hover:bg-cream-50 text-sm">安全中心</Link>
              <div className="border-t border-cream-200 my-1" />
              <Link to="/plus" className="block px-3 py-2 rounded-lg hover:bg-cream-50 text-sm">✦ Utopia Plus</Link>
              <Link to="/pro" className="block px-3 py-2 rounded-lg hover:bg-cream-50 text-sm">Utopia Pro</Link>
              <Link to="/promo" className="block px-3 py-2 rounded-lg hover:bg-cream-50 text-sm">推广效果</Link>
              <Link to="/org" className="block px-3 py-2 rounded-lg hover:bg-cream-50 text-sm">机构版</Link>
              <Link to="/admin" className="block px-3 py-2 rounded-lg hover:bg-cream-50 text-sm">管理员后台</Link>
              <div className="border-t border-cream-200 my-1" />
              <button className="block w-full text-left px-3 py-2 rounded-lg hover:bg-cream-50 text-sm text-ink-400 cursor-pointer"
                onClick={() => { actions.logout(); nav('/welcome') }}>退出登录</button>
            </div>
          )}
        </div>
        {me && (
          <Link to={`/user/${me.id}`} className="flex items-center gap-2.5 px-4 py-2 mt-1">
            <Avatar user={me} size={30} link={false} />
            <span className="text-sm text-ink-700 truncate">{me.name}</span>
          </Link>
        )}
      </aside>

      {/* 桌面顶部搜索(仅内容页) */}
      <div className="hidden md:block fixed top-0 left-56 right-0 h-14 bg-white/95 backdrop-blur z-30 border-b border-cream-100">
        <div className="max-w-[1200px] mx-auto h-full flex items-center px-6">
          <button className="flex items-center gap-2 w-80 bg-cream-100 rounded-full px-4 py-2 text-sm text-ink-300 cursor-pointer hover:bg-cream-200 transition"
            onClick={() => nav('/search')}>
            <Search size={16} strokeWidth={1.8} /> 搜索任务、用户或社区
          </button>
        </div>
      </div>

      <main className={`md:pl-56 pt-[var(--safe-top)] ${hideBottomNav ? 'pb-[calc(6rem+var(--safe-bottom))]' : 'pb-[calc(5rem+var(--safe-bottom))]'} md:pb-10 md:pt-14`}>
        <div className="max-w-[1200px] mx-auto px-3 md:px-6 pt-2 md:pt-5">
          <Outlet />
        </div>
      </main>

      {/* 移动底部导航 */}
      {!hideBottomNav && (
        <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-cream-200 md:hidden pb-[var(--safe-bottom)]">
          <div className="grid grid-cols-5 h-14 items-center">
            <NavLink to="/" end className={({ isActive }) => `flex flex-col items-center gap-0.5 text-[10px] ${isActive ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}>
              <House size={21} strokeWidth={1.8} /> 首页
            </NavLink>
            <NavLink to="/nearby" className={({ isActive }) => `flex flex-col items-center gap-0.5 text-[10px] ${isActive ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}>
              <MapPin size={21} strokeWidth={1.8} /> 附近
            </NavLink>
            <button className="flex items-center justify-center cursor-pointer" onClick={() => setSheet(true)} aria-label="发布">
              <span className="w-11 h-8 rounded-[10px] bg-coral-500 text-white flex items-center justify-center shadow-card">
                <Plus size={20} strokeWidth={2.4} />
              </span>
            </button>
            <NavLink to="/messages" className={({ isActive }) => `relative flex flex-col items-center gap-0.5 text-[10px] ${isActive ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}>
              <span className="relative"><MessageCircle size={21} strokeWidth={1.8} />
                {unread > 0 && <span className="absolute -top-1 -right-1.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-coral-500 text-white text-[9px] flex items-center justify-center">{unread}</span>}
              </span> 消息
            </NavLink>
            <NavLink to={me ? `/user/${me.id}` : '/welcome'} className={({ isActive }) => `flex flex-col items-center gap-0.5 text-[10px] ${isActive ? 'text-ink-900 font-semibold' : 'text-ink-400'}`}>
              <UserIcon size={21} strokeWidth={1.8} /> 我
            </NavLink>
          </div>
        </nav>
      )}

      <PublishSheet open={sheet} onClose={() => setSheet(false)} />
      <ToastHost />
    </div>
  )
}

// ============ 发布底部面板 ============
function PublishSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const nav = useNavigate()
  const { state, actions } = useStore()
  const [mode, setMode] = useState<'' | 'offer' | 'story' | 'event'>('')
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [communityId, setCommunityId] = useState('')

  if (!open) return null
  const close = () => { setMode(''); setText(''); setTitle(''); onClose() }

  const OPTIONS = [
    { icon: '🙋', title: '发布求助', desc: '把需要的帮助告诉附近的人', act: () => { close(); nav('/publish') } },
    { icon: '🤲', title: '发布我能帮什么', desc: '长期开放的技能与时间', act: () => setMode('offer') },
    { icon: '✍️', title: '分享互助故事', desc: '记录一次温暖的经历', act: () => setMode('story') },
    { icon: '📅', title: '发起社区活动', desc: '召集圈子里的邻居', act: () => setMode('event') },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={close}>
      <div className="bg-white rounded-t-2xl w-full sm:max-w-md pb-[calc(2rem+var(--safe-bottom))] sheet-up" onClick={e => e.stopPropagation()}>
        <div className="w-9 h-1 rounded-full bg-cream-300 mx-auto mt-3 mb-4" />
        {mode === '' && (
          <div className="px-5 space-y-1">
            {OPTIONS.map(o => (
              <button key={o.title} className="w-full flex items-center gap-3.5 px-3 py-3.5 rounded-xl hover:bg-cream-50 cursor-pointer text-left" onClick={o.act}>
                <span className="text-2xl">{o.icon}</span>
                <span>
                  <span className="block text-[15px] font-medium text-ink-900">{o.title}</span>
                  <span className="block text-xs text-ink-400 mt-0.5">{o.desc}</span>
                </span>
              </button>
            ))}
          </div>
        )}
        {mode === 'offer' && (
          <div className="px-5 space-y-3">
            <h3 className="font-semibold">我可以帮什么</h3>
            <textarea className="input" rows={3} placeholder="比如:每周三晚可以陪练网球 / 周末可以帮忙拍照" value={text} onChange={e => setText(e.target.value)} autoFocus />
            <button className="btn-primary w-full" disabled={!text.trim()} onClick={() => {
              actions.addOfferCard(text)
              toast('已添加到你的主页'); close()
            }}>发布</button>
            <p className="text-[11px] text-ink-300 text-center">会显示在你的主页,有匹配的求助时通知你</p>
          </div>
        )}
        {(mode === 'story' || mode === 'event') && (
          <div className="px-5 space-y-3">
            <h3 className="font-semibold">{mode === 'story' ? '分享互助故事' : '发起社区活动'}</h3>
            <input className="input" placeholder={mode === 'story' ? '起个自然的标题,比如:第一次向陌生人求助' : '活动主题,比如:周六梧桐公园清理'} value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            <textarea className="input" rows={3} placeholder={mode === 'story' ? '发生了什么?写下来让善意被看见。' : '时间、地点和安排…'} value={text} onChange={e => setText(e.target.value)} />
            {mode === 'event' && (
              <select className="input" value={communityId} onChange={e => setCommunityId(e.target.value)}>
                <option value="">选择圈子</option>
                {state.communities.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
              </select>
            )}
            <button className="btn-primary w-full" disabled={!title.trim() || !text.trim() || (mode === 'event' && !communityId)} onClick={() => {
              actions.addPost({
                kind: mode === 'story' ? 'story' : 'event', title: title.trim(), body: text.trim(),
                coverEmoji: mode === 'story' ? '🤝' : '📅', communityId: communityId || undefined,
                tags: mode === 'story' ? ['互助故事'] : ['社区活动'],
              })
              toast('已发布'); close(); nav('/')
            }}>发布</button>
          </div>
        )}
      </div>
    </div>
  )
}
