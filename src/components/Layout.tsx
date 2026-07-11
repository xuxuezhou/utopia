import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useStore, useCurrentUser, availablePoints } from '../lib/store'
import { Avatar, Logo, fmtTime } from './ui'

const navCls = ({ isActive }: { isActive: boolean }) =>
  `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'text-coral-600 bg-coral-50' : 'text-ink-500 hover:text-ink-700 hover:bg-cream-200'}`

export default function Layout() {
  const { state, actions } = useStore()
  const me = useCurrentUser()
  const nav = useNavigate()
  const [showNotif, setShowNotif] = useState(false)
  const [showMe, setShowMe] = useState(false)
  const myNotifs = state.notifications.filter(n => n.userId === state.currentUserId)
  const unread = myNotifs.filter(n => !n.read).length
  const balance = me ? availablePoints(state, me.id) : 0

  return (
    <div className="min-h-screen pb-20 md:pb-10">
      {/* 顶部导航(桌面) */}
      <header className="sticky top-0 z-40 bg-cream-50/90 backdrop-blur shadow-nav">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-2">
          <Link to="/" className="shrink-0"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-1 ml-4">
            <NavLink to="/" end className={navCls}>发现</NavLink>
            <NavLink to="/nearby" className={navCls}>附近互助</NavLink>
            <NavLink to="/circles" className={navCls}>圈子</NavLink>
            <NavLink to="/messages" className={navCls}>消息</NavLink>
            <NavLink to="/mytasks" className={navCls}>我的任务</NavLink>
          </nav>
          <div className="flex-1" />
          <Link to="/publish" className="btn-primary !rounded-full max-sm:!hidden">＋ 发布帮助</Link>
          <Link to="/points" className="chip bg-amber-100 text-amber-600 !py-1.5 hover:bg-amber-100/70 whitespace-nowrap" title="积分中心">✦ {balance} pt</Link>
          {/* 通知 */}
          <div className="relative">
            <button onClick={() => { setShowNotif(v => !v); setShowMe(false) }} className="w-9 h-9 rounded-full hover:bg-cream-200 relative cursor-pointer">
              🔔
              {unread > 0 && <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-0.5 rounded-full bg-coral-500 text-white text-[10px] flex items-center justify-center">{unread}</span>}
            </button>
            {showNotif && (
              <div className="absolute right-0 top-11 w-80 card p-2 z-50 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-semibold">通知</span>
                  <button className="text-xs text-coral-500 cursor-pointer" onClick={() => actions.markAllRead()}>全部已读</button>
                </div>
                {myNotifs.length === 0 && <div className="p-4 text-xs text-ink-300 text-center">暂无通知</div>}
                {myNotifs.slice(0, 12).map(n => (
                  <div key={n.id} className={`px-3 py-2.5 rounded-xl cursor-pointer hover:bg-cream-100 ${n.read ? 'opacity-60' : ''}`}
                    onClick={() => { setShowNotif(false); if (n.link) nav(n.link) }}>
                    <div className="text-sm">{n.icon} <span className="font-medium">{n.title}</span></div>
                    <div className="text-xs text-ink-400 mt-0.5 line-clamp-2">{n.body}</div>
                    <div className="text-[10px] text-ink-300 mt-0.5">{fmtTime(n.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* 头像菜单 */}
          <div className="relative">
            <button onClick={() => { setShowMe(v => !v); setShowNotif(false) }} className="cursor-pointer"><Avatar user={me} size={34} link={false} /></button>
            {showMe && me && (
              <div className="absolute right-0 top-11 w-56 card p-2 z-50" onClick={() => setShowMe(false)}>
                <Link to={`/user/${me.id}`} className="block px-3 py-2 rounded-lg hover:bg-cream-100 text-sm">👤 个人主页</Link>
                <Link to="/trust" className="block px-3 py-2 rounded-lg hover:bg-cream-100 text-sm">🛂 信任与认证</Link>
                <Link to="/safety" className="block px-3 py-2 rounded-lg hover:bg-cream-100 text-sm">🛡️ 安全中心</Link>
                <Link to="/points" className="block px-3 py-2 rounded-lg hover:bg-cream-100 text-sm">✦ 积分中心</Link>
                <Link to="/admin" className="block px-3 py-2 rounded-lg hover:bg-cream-100 text-sm">⚙️ 管理员后台</Link>
                <div className="border-t border-cream-200 my-1" />
                <button className="block w-full text-left px-3 py-2 rounded-lg hover:bg-cream-100 text-sm text-ink-400 cursor-pointer" onClick={() => { actions.logout(); nav('/welcome') }}>退出登录</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* 底部导航(移动) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-cream-200 md:hidden">
        <div className="grid grid-cols-5 h-16">
          {[
            { to: '/', label: '首页', icon: '🏠' },
            { to: '/nearby', label: '附近', icon: '📍' },
            { to: '/publish', label: '发布', icon: '＋', special: true },
            { to: '/messages', label: '消息', icon: '💬' },
            { to: '/mytasks', label: '我的', icon: '👤' },
          ].map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[10px] ${isActive ? 'text-coral-600' : 'text-ink-400'}`}>
              {item.special
                ? <span className="w-10 h-10 -mt-4 rounded-full bg-coral-500 text-white text-xl flex items-center justify-center shadow-card">＋</span>
                : <span className="text-lg">{item.icon}</span>}
              {item.label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
