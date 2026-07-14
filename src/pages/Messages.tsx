import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Heart, UserPlus, AtSign, Bell } from 'lucide-react'
import { useStore, useCurrentUser } from '../lib/store'
import { Avatar, Empty, Modal, fmtTime } from '../components/ui'

export default function Messages() {
  const { id } = useParams()
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const nav = useNavigate()
  const [text, setText] = useState('')
  const [warning, setWarning] = useState('')
  const [panel, setPanel] = useState<'' | 'likes' | 'follows' | 'mentions' | 'notice'>('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const threads = state.chats
    .filter(c => c.memberIds.includes(me.id))
    .sort((a, b) => (b.messages.at(-1)?.createdAt ?? '').localeCompare(a.messages.at(-1)?.createdAt ?? ''))
  const current = threads.find(c => c.id === id) ?? null
  const task = current?.taskId ? state.tasks.find(t => t.id === current.taskId) : null
  const other = current ? state.users.find(u => u.id === current.memberIds.find(m => m !== me.id)) : null
  const myNotifs = state.notifications.filter(n => n.userId === me.id)
  const unread = myNotifs.filter(n => !n.read).length

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [current?.messages.length, id])
  useEffect(() => { setWarning('') }, [id])

  const send = () => {
    if (!text.trim() || !current) return
    const res = actions.sendMessage(current.id, me.id, text.trim())
    setWarning(res.warning ?? '')
    if (!res.blocked) setText('')
  }

  // ============ 会话页 ============
  if (current) {
    return (
      <div className="max-w-xl mx-auto flex flex-col h-[calc(100dvh-1rem-var(--safe-top)-var(--safe-bottom))] md:h-[calc(100dvh-6rem)]">
        <div className="flex items-center gap-2.5 py-2.5 border-b border-cream-200 bg-white sticky top-[var(--safe-top)] z-20">
          <button className="p-1.5 text-ink-700 cursor-pointer" onClick={() => nav('/messages')}><ArrowLeft size={20} strokeWidth={1.8} /></button>
          <Avatar user={other} size={34} />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm">{other?.name}</div>
            {!task && <div className="text-[11px] text-ink-300">私信</div>}
          </div>
        </div>

        {/* 任务摘要卡(轻量置顶) */}
        {task && (
          <Link to={`/task/${task.id}`} className="flex items-center gap-3 my-2 bg-cream-100 rounded-xl px-3.5 py-2.5">
            <span className="text-xl">{task.images[0] ?? '🤝'}</span>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-medium truncate">{task.title}</span>
              <span className="block text-xs text-ink-400"><span className="text-coral-500 font-medium">{task.points} pt</span> · {task.date.slice(5).replace('-', '/')} {task.startTime}</span>
            </span>
            <span className="text-xs text-violet-500 shrink-0">查看任务</span>
          </Link>
        )}

        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {current.messages.map(m => {
            if (m.system) return (
              <div key={m.id} className={`text-xs rounded-xl p-3 max-w-md mx-auto text-center whitespace-pre-line ${m.blocked ? 'bg-coral-50 text-coral-700' : 'bg-cream-100 text-ink-400'}`}>{m.text}</div>
            )
            const mine = m.fromId === me.id
            return (
              <div key={m.id} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                {!mine && <Avatar user={other} size={28} link={false} />}
                <div className="max-w-[75%]">
                  <div className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${mine ? 'bg-coral-500 text-white rounded-br-md' : 'bg-cream-100 rounded-bl-md'}`}>{m.text}</div>
                  {m.riskWarning && <div className="text-[11px] text-amber-600 mt-1 bg-amber-50 rounded-lg px-2 py-1">⚠️ {m.riskWarning}</div>}
                  <div className={`text-[10px] text-ink-300 mt-0.5 ${mine ? 'text-right' : ''}`}>{fmtTime(m.createdAt)}</div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>

        {warning && <div className="px-4 py-2 bg-coral-50 text-coral-700 text-xs rounded-xl mb-1">🚫 {warning}</div>}
        <div className="py-2.5 flex gap-2 bg-white border-t border-cream-200">
          <input className="input !rounded-full" placeholder="发消息…" value={text}
            onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
          <button className="btn-primary shrink-0" onClick={send} disabled={!text.trim()}>发送</button>
        </div>
      </div>
    )
  }

  // ============ 消息首页 ============
  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-lg font-semibold py-2 md:hidden">消息</h1>

      {/* 快捷入口 */}
      <div className="grid grid-cols-4 gap-2 py-3">
        {[
          { key: 'likes', icon: <Heart size={22} strokeWidth={1.8} />, label: '赞和收藏', bg: 'bg-coral-50 text-coral-500' },
          { key: 'follows', icon: <UserPlus size={22} strokeWidth={1.8} />, label: '新增关注', bg: 'bg-violet-50 text-violet-500' },
          { key: 'mentions', icon: <AtSign size={22} strokeWidth={1.8} />, label: '评论和@', bg: 'bg-leaf-50 text-leaf-600' },
          { key: 'notice', icon: <Bell size={22} strokeWidth={1.8} />, label: '任务通知', bg: 'bg-amber-50 text-amber-600', badge: unread },
        ].map(e => (
          <button key={e.key} className="flex flex-col items-center gap-1.5 cursor-pointer" onClick={() => setPanel(e.key as typeof panel)}>
            <span className={`relative w-12 h-12 rounded-2xl flex items-center justify-center ${e.bg}`}>
              {e.icon}
              {!!e.badge && <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-coral-500 text-white text-[10px] flex items-center justify-center">{e.badge}</span>}
            </span>
            <span className="text-xs text-ink-500">{e.label}</span>
          </button>
        ))}
      </div>

      {/* 会话列表 */}
      <div className="mt-1">
        {threads.length === 0 && <Empty icon="💬" text="还没有会话。申请或发布互助后,这里会出现任务聊天。" />}
        {threads.map(c => {
          const u = state.users.find(x => x.id === c.memberIds.find(m => m !== me.id))
          const t = c.taskId ? state.tasks.find(x => x.id === c.taskId) : null
          const last = c.messages.at(-1)
          return (
            <button key={c.id} onClick={() => nav(`/messages/${c.id}`)}
              className="w-full text-left flex gap-3 py-3 cursor-pointer border-b border-cream-100 last:border-0">
              <Avatar user={u} size={44} link={false} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-sm truncate">{u?.name}</span>
                  {t && <span className="chip bg-cream-100 text-ink-400 !text-[10px] !px-1.5">任务</span>}
                  <span className="flex-1" />
                  {last && <span className="text-[10px] text-ink-300 shrink-0">{fmtTime(last.createdAt)}</span>}
                </div>
                <div className="text-xs text-ink-400 truncate mt-0.5">{last?.system ? `📌 ${t?.title ?? '系统消息'}` : last?.text ?? '开始聊天吧'}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 快捷入口面板 */}
      <Modal open={panel === 'notice'} onClose={() => setPanel('')} title="任务通知">
        <div className="flex justify-end mb-2">
          <button className="text-xs text-coral-500 cursor-pointer" onClick={() => actions.markAllRead()}>全部已读</button>
        </div>
        {myNotifs.length === 0 && <p className="text-sm text-ink-300 text-center py-6">暂无通知</p>}
        <div className="space-y-1">
          {myNotifs.slice(0, 20).map(n => (
            <button key={n.id} className={`w-full text-left px-3 py-2.5 rounded-xl hover:bg-cream-50 cursor-pointer ${n.read ? 'opacity-55' : ''}`}
              onClick={() => { setPanel(''); if (n.link) nav(n.link) }}>
              <div className="text-sm">{n.icon} <span className="font-medium">{n.title}</span></div>
              <div className="text-xs text-ink-400 mt-0.5 line-clamp-2">{n.body}</div>
              <div className="text-[10px] text-ink-300 mt-0.5">{fmtTime(n.createdAt)}</div>
            </button>
          ))}
        </div>
      </Modal>
      <Modal open={panel === 'likes'} onClose={() => setPanel('')} title="赞和收藏">
        <p className="text-sm text-ink-400 py-4 text-center">当有人赞或收藏你的内容时,会出现在这里。</p>
      </Modal>
      <Modal open={panel === 'follows'} onClose={() => setPanel('')} title="新增关注">
        <p className="text-sm text-ink-400 py-4 text-center">新的关注者会出现在这里。</p>
      </Modal>
      <Modal open={panel === 'mentions'} onClose={() => setPanel('')} title="评论和@">
        <p className="text-sm text-ink-400 py-4 text-center">评论和提到你的内容会出现在这里。</p>
      </Modal>
    </div>
  )
}
