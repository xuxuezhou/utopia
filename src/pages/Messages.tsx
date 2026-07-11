import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useStore, useCurrentUser } from '../lib/store'
import { Avatar, Empty, fmtTime } from '../components/ui'

export default function Messages() {
  const { id } = useParams()
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const nav = useNavigate()
  const [text, setText] = useState('')
  const [warning, setWarning] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const threads = state.chats
    .filter(c => c.memberIds.includes(me.id))
    .sort((a, b) => (b.messages.at(-1)?.createdAt ?? '').localeCompare(a.messages.at(-1)?.createdAt ?? ''))
  const current = threads.find(c => c.id === id) ?? null
  const task = current?.taskId ? state.tasks.find(t => t.id === current.taskId) : null

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [current?.messages.length, id])
  useEffect(() => { setWarning('') }, [id])

  const send = () => {
    if (!text.trim() || !current) return
    const res = actions.sendMessage(current.id, me.id, text.trim())
    setWarning(res.warning ?? '')
    if (!res.blocked) setText('')
  }

  return (
    <div className="grid md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-9rem)]">
      {/* 会话列表 */}
      <div className={`card overflow-y-auto ${id ? 'hidden md:block' : ''}`}>
        <div className="p-4 font-semibold border-b border-cream-200">消息</div>
        {threads.length === 0 && <div className="p-6 text-sm text-ink-300 text-center">还没有会话</div>}
        {threads.map(c => {
          const other = state.users.find(u => u.id === c.memberIds.find(m => m !== me.id))
          const t = c.taskId ? state.tasks.find(x => x.id === c.taskId) : null
          const last = c.messages.at(-1)
          return (
            <button key={c.id} onClick={() => nav(`/messages/${c.id}`)}
              className={`w-full text-left flex gap-3 p-3.5 hover:bg-cream-100 transition cursor-pointer ${c.id === id ? 'bg-coral-50' : ''}`}>
              <Avatar user={other} size={40} link={false} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{other?.name}</span>
                  {last && <span className="text-[10px] text-ink-300 shrink-0">{fmtTime(last.createdAt)}</span>}
                </div>
                {t && <div className="text-[11px] text-violet-600 truncate">📋 {t.title}</div>}
                <div className="text-xs text-ink-400 truncate">{last?.system ? '📌 系统消息' : last?.text ?? '开始聊天吧'}</div>
              </div>
            </button>
          )
        })}
      </div>

      {/* 聊天窗口 */}
      <div className={`card flex flex-col overflow-hidden ${!id ? 'hidden md:flex' : ''}`}>
        {!current ? (
          <div className="flex-1 flex items-center justify-center"><Empty icon="💬" text="选择一个会话开始聊天" /></div>
        ) : (
          <>
            <div className="p-4 border-b border-cream-200 flex items-center gap-3">
              <button className="md:hidden text-ink-400 cursor-pointer" onClick={() => nav('/messages')}>←</button>
              <Avatar user={state.users.find(u => u.id === current.memberIds.find(m => m !== me.id))} size={36} />
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{state.users.find(u => u.id === current.memberIds.find(m => m !== me.id))?.name}</div>
                {task && <Link to={`/task/${task.id}`} className="text-[11px] text-violet-600 truncate block">📋 {task.title} · {task.points} pt · 查看任务 →</Link>}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-cream-50">
              {current.messages.map(m => {
                if (m.system) return (
                  <div key={m.id} className={`text-xs rounded-xl p-3 max-w-md mx-auto text-center whitespace-pre-line ${m.blocked ? 'bg-coral-100 text-coral-700' : 'bg-cream-200 text-ink-500'}`}>{m.text}</div>
                )
                const mine = m.fromId === me.id
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[75%]">
                      <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${mine ? 'bg-coral-500 text-white rounded-br-md' : 'bg-white shadow-card rounded-bl-md'}`}>{m.text}</div>
                      {m.riskWarning && <div className="text-[11px] text-amber-600 mt-1 bg-amber-50 rounded-lg px-2 py-1">⚠️ {m.riskWarning}</div>}
                      <div className={`text-[10px] text-ink-300 mt-0.5 ${mine ? 'text-right' : ''}`}>{fmtTime(m.createdAt)}</div>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            {warning && <div className="px-4 py-2 bg-coral-50 text-coral-700 text-xs">🚫 {warning}</div>}
            <div className="p-3 border-t border-cream-200 flex gap-2">
              <input className="input" placeholder="输入消息…(平台会自动识别诈骗与骚扰风险)" value={text}
                onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} />
              <button className="btn-primary shrink-0" onClick={send} disabled={!text.trim()}>发送</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
