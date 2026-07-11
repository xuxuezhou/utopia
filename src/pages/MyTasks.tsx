import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, useCurrentUser, availablePoints, lockedPoints, pendingPoints } from '../lib/store'
import { TaskCard } from '../components/cards'
import { Avatar, Empty, Stat } from '../components/ui'

export default function MyTasks() {
  const { state } = useStore()
  const me = useCurrentUser()!
  const [tab, setTab] = useState<'active' | 'published' | 'helping' | 'history'>('active')

  const mine = useMemo(() => state.tasks.filter(t => t.publisherId === me.id || t.helperId === me.id || t.applicants.some(a => a.userId === me.id)), [state.tasks, me.id])
  const activeStatuses = ['matched', 'starting_soon', 'in_progress', 'pending_confirm', 'disputed']
  const lists = {
    active: mine.filter(t => activeStatuses.includes(t.status)),
    published: mine.filter(t => t.publisherId === me.id && !['completed', 'cancelled'].includes(t.status)),
    helping: mine.filter(t => t.publisherId !== me.id && (t.helperId === me.id || t.applicants.some(a => a.userId === me.id && a.status === 'pending')) && !['completed', 'cancelled'].includes(t.status)),
    history: mine.filter(t => ['completed', 'cancelled'].includes(t.status)),
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <Avatar user={me} size={48} link={false} />
        <div>
          <h1 className="text-xl font-semibold">{me.name} 的任务</h1>
          <p className="text-xs text-ink-400">进行中的互助、发布的请求和帮助记录都在这里</p>
        </div>
        <div className="flex-1" />
        <Link to="/publish" className="btn-primary hidden sm:inline-flex">＋ 发布帮助</Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="可用积分" value={`${availablePoints(state, me.id)} pt`} tone="amber" />
        <Stat label="锁定积分" value={`${lockedPoints(state, me.id)} pt`} sub="托管中的任务" />
        <Stat label="待结算" value={`${pendingPoints(state, me.id)} pt`} sub="等待对方确认" tone="leaf" />
        <Stat label="累计互助" value={`${me.stats.helped + me.stats.received} 次`} tone="violet" />
      </div>

      <div className="flex gap-1.5 mb-4 overflow-x-auto">
        {([['active', `进行中 ${lists.active.length}`], ['published', `我发布的 ${lists.published.length}`], ['helping', `我帮助的 ${lists.helping.length}`], ['history', `历史 ${lists.history.length}`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`chip cursor-pointer !py-1.5 !px-3.5 shrink-0 ${tab === k ? 'bg-ink-900 text-white' : 'bg-white text-ink-500'}`}>{l}</button>
        ))}
      </div>

      {lists[tab].length === 0
        ? <Empty text={tab === 'helping' ? '你还没有认领任务。去附近互助看看,总有你顺手能帮到的事。' : '这里还是空的。'}
          action={<Link to={tab === 'helping' ? '/nearby' : '/publish'} className="btn-primary">{tab === 'helping' ? '去看看附近任务' : '发布一个请求'}</Link>} />
        : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{lists[tab].map(t => <TaskCard key={t.id} task={t} />)}</div>}
    </div>
  )
}
