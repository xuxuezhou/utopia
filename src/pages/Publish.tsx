import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore, useCurrentUser, availablePoints } from '../lib/store'
import { parseNaturalTask, assessRisk, suggestPoints, localDateStr, type ParsedDraft, type RiskResult } from '../lib/risk'
import { CATEGORY_META, type TaskCategory } from '../lib/types'
import { TierBadge, toast } from '../components/ui'

const EXAMPLES = [
  '我想找一个人周日下午陪我打一个小时网球,最好是中等水平,在学校附近。',
  '想找人明天顺路帮我取一个快递,就在青藤公寓菜鸟驿站。',
  '找人在线陪我聊30分钟,最近换了城市有点孤单。',
  '周六想找人帮我拍一组毕业照,在校园里,大概两小时。',
]

export default function Publish() {
  const { state, actions } = useStore()
  const me = useCurrentUser()!
  const [phase, setPhase] = useState<'ask' | 'confirm' | 'blocked' | 'done'>('ask')
  const [input, setInput] = useState('')
  const [draft, setDraft] = useState<ParsedDraft | null>(null)
  const [risk, setRisk] = useState<RiskResult | null>(null)
  const [taskId, setTaskId] = useState('')

  // 确认表单字段
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [category, setCategory] = useState<TaskCategory>('other')
  const [online, setOnline] = useState(false)
  const [publicPlace, setPublicPlace] = useState(true)
  const [enterHome, setEnterHome] = useState(false)
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('14:00')
  const [duration, setDuration] = useState(60)
  const [location, setLocation] = useState('')
  const [points, setPoints] = useState(80)
  const [visibility, setVisibility] = useState<'all' | 'nearby' | 'community' | 'followers' | 'invited'>('nearby')
  const [criteria, setCriteria] = useState('双方确认完成')
  const [suggest, setSuggest] = useState({ min: 60, max: 120 })

  const balance = availablePoints(state, me.id)
  const fee = Math.ceil(points * 0.05)

  const analyze = (text: string) => {
    // 先做安全审核(路径六/七:高风险在解析阶段即被拦截)
    const r = assessRisk(text)
    if (r.blocked) {
      setRisk(r)
      // 记录安全审核事件
      const res = actions.publishTask({
        title: text.slice(0, 24), description: text, category: 'other', online: false, publicPlace: true,
        enterHome: false, date: localDateStr(new Date()), startTime: '12:00', durationMin: 60,
        locationText: '—', skillsRequired: [], headcount: 1, doneCriteria: '—', points: 50,
        visibility: 'nearby', deadline: '', cancelPolicy: '—', images: ['⚠️'],
      })
      setTaskId(res.taskId ?? '')
      setPhase('blocked')
      return
    }
    const d = parseNaturalTask(text)
    setDraft(d)
    setTitle(d.title); setCategory(d.category); setOnline(d.online)
    setDate(d.date); setStartTime(d.startTime); setDuration(d.durationMin)
    setLocation(d.locationText); setDesc(text)
    setSuggest({ min: d.suggestMin, max: d.suggestMax })
    setPoints(Math.round((d.suggestMin + d.suggestMax) / 2 / 10) * 10)
    setPhase('confirm')
  }

  const recalcSuggest = (dur: number, onl: boolean, cat: TaskCategory) => {
    const s = suggestPoints({ durationMin: dur, online: onl, category: cat, skills: [] })
    setSuggest(s)
  }

  const submit = () => {
    const res = actions.publishTask({
      title, description: desc, category, online,
      publicPlace: online ? true : publicPlace, enterHome: online ? false : enterHome,
      date, startTime, durationMin: duration,
      locationText: online ? '线上' : location || '待商定的公共场所',
      skillsRequired: draft?.skills ?? [], headcount: 1, doneCriteria: criteria,
      points, visibility, deadline: `${date} ${startTime}`,
      cancelPolicy: '开始前 24 小时以上取消可全额退回;临近开始取消将部分补偿帮助者',
      images: [CATEGORY_META[category].emoji],
    })
    setRisk(res.risk)
    setTaskId(res.taskId ?? '')
    if (!res.ok) { setPhase('blocked'); return }
    setPhase('done')
  }

  if (phase === 'blocked' && risk) {
    return (
      <div className="max-w-xl mx-auto fade-up">
        <div className="card p-8 border-l-4 border-coral-600">
          <div className="text-3xl mb-3">🛑</div>
          <h1 className="text-lg font-semibold mb-2">这个任务无法发布</h1>
          <p className="text-sm text-ink-700 leading-relaxed mb-3">{risk.blockReason}</p>
          {risk.flags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              <TierBadge tier={risk.tier} />
              {risk.flags.map(f => <span key={f} className="chip bg-coral-100 text-coral-700">⚠ {f}</span>)}
            </div>
          )}
          {risk.education && (
            <div className="bg-amber-50 rounded-xl p-4 text-sm text-ink-500 leading-relaxed mb-4">
              💡 <b>安全提示:</b>{risk.education}
            </div>
          )}
          <p className="text-xs text-ink-300 mb-5">该事件已记录并发送到安全审核后台。调整积分或改写措辞不会绕过审核;如你认为这是误判,可以在安全中心申诉。</p>
          <div className="flex gap-2">
            <button className="btn-outline flex-1" onClick={() => { setPhase('ask'); setInput('') }}>换一个请求</button>
            <Link to="/safety" className="btn-ghost flex-1">前往安全中心</Link>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'done') {
    return (
      <div className="max-w-xl mx-auto fade-up">
        <div className="card p-8 text-center">
          <div className="text-4xl mb-3">🎉</div>
          <h1 className="text-lg font-semibold mb-2">你的请求已发布</h1>
          <p className="text-sm text-ink-400 mb-1">「{title}」已出现在附近互助信息流中。</p>
          <p className="text-xs text-ink-300 mb-6">收到申请时会通知你;选择帮助者后,{points} pt + {fee} pt 服务积分才会托管锁定。</p>
          <div className="flex gap-2 justify-center">
            <Link to={`/task/${taskId}`} className="btn-primary">查看任务</Link>
            <Link to="/nearby" className="btn-outline">去附近互助看看</Link>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'confirm' && draft) {
    return (
      <div className="max-w-xl mx-auto fade-up">
        <h1 className="text-xl font-semibold mb-1">确认你的请求</h1>
        <p className="text-sm text-ink-400 mb-5">系统已根据你的描述自动整理,请检查并调整。</p>
        <div className="card p-6 space-y-4">
          <div>
            <label className="label">任务标题</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="label">详细说明</label>
            <textarea className="input" rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">类别</label>
              <select className="input" value={category} onChange={e => { setCategory(e.target.value as TaskCategory); recalcSuggest(duration, online, e.target.value as TaskCategory) }}>
                {(Object.keys(CATEGORY_META) as TaskCategory[]).map(c => <option key={c} value={c}>{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</option>)}
              </select>
            </div>
            <div>
              <label className="label">形式</label>
              <select className="input" value={online ? 'online' : 'offline'} onChange={e => { const o = e.target.value === 'online'; setOnline(o); recalcSuggest(duration, o, category) }}>
                <option value="offline">线下</option>
                <option value="online">线上</option>
              </select>
            </div>
            <div>
              <label className="label">日期</label>
              <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">开始时间</label>
              <input type="time" className="input" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div>
              <label className="label">预计时长(分钟)</label>
              <input type="number" className="input" value={duration} min={10} step={10} onChange={e => {
                const v = Math.trunc(+e.target.value)
                const dur = Number.isFinite(v) && v > 0 ? v : 10
                setDuration(dur); recalcSuggest(dur, online, category)
              }} />
            </div>
            {!online && (
              <div>
                <label className="label">大致地点(不要写精确住址)</label>
                <input className="input" value={location} onChange={e => setLocation(e.target.value)} />
              </div>
            )}
          </div>
          {!online && (
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={publicPlace} onChange={() => { setPublicPlace(true); setEnterHome(false) }} className="accent-coral-500" /> 公共场所(推荐)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" checked={!publicPlace} onChange={() => { setPublicPlace(false); setEnterHome(true) }} className="accent-coral-500" /> 需要上门
              </label>
            </div>
          )}
          <div>
            <label className="label">完成标准</label>
            <input className="input" value={criteria} onChange={e => setCriteria(e.target.value)} placeholder="如:完成 1 小时对打并互相确认" />
          </div>
          <div>
            <label className="label">可见范围</label>
            <div className="flex flex-wrap gap-1.5">
              {([['all', '所有人'], ['nearby', '仅附近用户'], ['community', '仅所在社区'], ['followers', '仅关注者'], ['invited', '仅邀请的人']] as const).map(([k, l]) => (
                <button key={k} onClick={() => setVisibility(k)} className={`chip cursor-pointer !py-1.5 ${visibility === k ? 'bg-ink-900 text-white' : 'bg-cream-200 text-ink-500'}`}>{l}</button>
              ))}
            </div>
          </div>
          {/* 积分 */}
          <div className="bg-amber-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">任务积分</label>
              <span className="text-xl font-semibold text-amber-600">{points} pt</span>
            </div>
            <input type="range" min={Math.max(20, suggest.min - 40)} max={suggest.max + 80} step={10} value={points}
              onChange={e => setPoints(+e.target.value)} className="w-full accent-amber-500" />
            <p className="text-xs text-ink-400 mt-1.5">
              💡 根据任务时长和附近类似任务,建议设置为 <b>{suggest.min}–{suggest.max} pt</b>。另需 {fee} pt 系统服务积分(完成后销毁并进入社区关怀池/安全补偿池)。
            </p>
            {(points < suggest.min || points > suggest.max) && (
              <p className="text-xs text-amber-600 mt-1">当前积分在建议区间之外:过低可能无人申请,过高会触发人工复核。</p>
            )}
            <p className="text-xs text-ink-300 mt-1">当前可用:{balance} pt · 匹配帮助者时将托管锁定 {points + fee} pt</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button className="btn-outline flex-1" onClick={() => setPhase('ask')}>返回修改描述</button>
            <button className="btn-primary flex-1 !py-3" disabled={!title.trim() || !date} onClick={submit}>确认发布</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto fade-up">
      <h1 className="text-[22px] font-semibold mb-1.5 mt-4">你需要什么帮助?</h1>
      <p className="text-sm text-ink-400 mb-5">像发朋友圈一样说出来就行,系统会帮你整理。求助不是麻烦别人,而是给别人一个帮助你的机会。</p>
      <textarea
        className="w-full bg-cream-100 rounded-2xl px-4 py-3.5 text-[15px] leading-relaxed outline-none placeholder:text-ink-300 focus:bg-cream-50 transition min-h-36"
        autoFocus
        placeholder="比如:我想找一个人周日下午陪我打一个小时网球,最好是中等水平,在学校附近。"
        value={input} onChange={e => setInput(e.target.value)} />
      <div className="flex flex-wrap gap-2 mt-3">
        {[
          { label: '📷 添加图片', act: () => toast('演示版会自动生成封面') },
          { label: '📍 添加地点', act: () => setInput(v => v.trim() ? v.replace(/。?$/, ',在') : '在') },
          { label: '🕐 添加时间', act: () => setInput(v => (v.trim() ? v.replace(/。?$/, ',') : '') + '周六下午') },
          { label: '👥 选择社区', act: () => toast('可在下一步选择可见范围') },
        ].map(c => (
          <button key={c.label} className="chip bg-cream-100 text-ink-500 !py-2 !px-3.5 cursor-pointer hover:bg-cream-200" onClick={c.act}>{c.label}</button>
        ))}
      </div>
      <button className="btn-primary w-full !py-3 mt-4" disabled={input.trim().length < 6} onClick={() => analyze(input.trim())}>
        下一步
      </button>
      <div className="mt-6">
        <div className="text-xs text-ink-400 mb-2.5">大家都在找:</div>
        <div className="space-y-1.5">
          {EXAMPLES.map(e => (
            <button key={e} className="block w-full text-left text-sm text-ink-500 rounded-xl px-3.5 py-2.5 hover:bg-cream-50 transition cursor-pointer border border-cream-200"
              onClick={() => setInput(e)}>{e}</button>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-ink-300 mt-6 leading-relaxed">
        发布前系统会自动进行安全审核:涉及未成年人、医疗、驾驶载客、垫付现金、礼品卡等受监管或高风险内容的任务将无法发布。
      </p>
    </div>
  )
}
