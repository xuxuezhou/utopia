import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../lib/store'
import { Avatar, Logo } from '../components/ui'

const SKILL_OPTIONS = ['陪聊', '网球', '羽毛球', '摄影', '语言练习', '学习辅导', '编程', '搬运', '宠物', '跑腿', '社区引导', '数码设备', '简单安装', '活动陪同', '跑步', '烘焙', '吉他']
const NEED_OPTIONS = ['运动搭档', '语言伙伴', '学习帮助', '取快递', '拍照', '熟悉社区', '数码帮助', '宠物照看', '陪同活动', '找人聊聊']
const AVATARS = ['🙂', '😊', '🧑‍💻', '👩‍🎨', '🏃‍♂️', '📷', '🎾', '🧑‍🍳', '🌻', '🐱']

export default function Welcome() {
  const { state, actions } = useStore()
  const nav = useNavigate()
  const [mode, setMode] = useState<'landing' | 'login' | 'register' | 'onboarding'>(
    state.currentUserId && !state.onboarded ? 'onboarding' : 'landing')

  // 注册表单
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState('🙂')
  const [city, setCity] = useState('杭州')
  const [bio, setBio] = useState('')
  const [ageOk, setAgeOk] = useState(false)

  // 引导
  const [step, setStep] = useState(0)
  const [skills, setSkills] = useState<string[]>([])
  const [needs, setNeeds] = useState<string[]>([])
  const [communityIds, setCommunityIds] = useState<string[]>([])
  const [emergency, setEmergency] = useState('')
  const [allowOffline, setAllowOffline] = useState(true)
  const [maxDist, setMaxDist] = useState(5)

  const demoUsers = useMemo(() => state.users.slice(0, 6), [state.users])

  const toggle = (arr: string[], set: (v: string[]) => void, v: string) =>
    set(arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v])

  if (mode === 'onboarding') {
    const steps = ['选择社区', '我可以帮助什么', '我可能需要什么', '安全设置']
    return (
      <div className="min-h-screen bg-cream-100 flex items-center justify-center p-4">
        <div className="card w-full max-w-lg p-8 fade-up">
          <Logo size={32} />
          <div className="flex gap-1.5 my-6">
            {steps.map((s, i) => (
              <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-coral-500' : 'bg-cream-200'}`} />
            ))}
          </div>
          <h2 className="text-lg font-semibold mb-1">{steps[step]}</h2>

          {step === 0 && (
            <div>
              <p className="text-sm text-ink-400 mb-4">加入社区后,你会优先看到身边的互助。机构邮箱、邀请码或管理员审核可完成社区验证。</p>
              <div className="space-y-2 mb-6">
                {state.communities.map(c => (
                  <button key={c.id} onClick={() => toggle(communityIds, setCommunityIds, c.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition cursor-pointer ${communityIds.includes(c.id) ? 'border-coral-400 bg-coral-50' : 'border-cream-300 hover:border-coral-200'}`}>
                    <div className="font-medium text-sm">{c.emoji} {c.name}</div>
                    <div className="text-xs text-ink-400 mt-0.5">{c.memberCount} 位成员 · {c.intro.slice(0, 30)}…</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 1 && (
            <div>
              <p className="text-sm text-ink-400 mb-4">每个人都有能帮到别人的地方。选好后,当附近出现匹配的求助时我们会告诉你。</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {SKILL_OPTIONS.map(s => (
                  <button key={s} onClick={() => toggle(skills, setSkills, s)}
                    className={`chip cursor-pointer !py-1.5 !px-3 ${skills.includes(s) ? 'bg-coral-500 text-white' : 'bg-cream-200 text-ink-500 hover:bg-cream-300'}`}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {step === 2 && (
            <div>
              <p className="text-sm text-ink-400 mb-4">在 Utopia,求助不是麻烦别人,而是给别人一个帮助你的机会。</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {NEED_OPTIONS.map(s => (
                  <button key={s} onClick={() => toggle(needs, setNeeds, s)}
                    className={`chip cursor-pointer !py-1.5 !px-3 ${needs.includes(s) ? 'bg-violet-500 text-white' : 'bg-cream-200 text-ink-500 hover:bg-cream-300'}`}>{s}</button>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4 mb-6">
              <div>
                <label className="label">紧急联系人(仅平台可见,线下任务时可一键分享)</label>
                <input className="input" placeholder="如:138****2211(姐姐)" value={emergency} onChange={e => setEmergency(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={allowOffline} onChange={e => setAllowOffline(e.target.checked)} className="accent-coral-500" />
                允许参加线下任务(建议优先选择公共场所)
              </label>
              <div>
                <label className="label">最大活动距离:{maxDist} km</label>
                <input type="range" min={1} max={20} value={maxDist} onChange={e => setMaxDist(+e.target.value)} className="w-full accent-coral-500" />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            {step > 0 && <button className="btn-outline flex-1" onClick={() => setStep(step - 1)}>上一步</button>}
            <button className="btn-primary flex-1" onClick={() => {
              if (step < 3) setStep(step + 1)
              else {
                actions.finishOnboarding({ skills, needs, communityIds, emergencyContact: emergency || undefined, allowOffline, maxDistanceKm: maxDist })
                nav('/')
              }
            }}>
              {step < 3 ? '继续' : '完成,进入 Utopia(+50 pt)'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream-100">
      <header className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Logo size={30} />
        <button className="btn-outline" onClick={() => setMode('login')}>登录</button>
      </header>

      {mode === 'landing' && (
        <div className="max-w-5xl mx-auto px-6 pt-14 pb-20 fade-up">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl font-bold leading-tight tracking-tight">
              让顺手的善意,<br /><span className="text-coral-500">抵达身边的人。</span>
            </h1>
            <p className="mt-5 text-ink-500 leading-relaxed">
              在 Utopia,你可以提出一个合理的小请求,也可以用自己的时间和能力帮助附近的人。
              每一次帮助都会转化为积分和信任,让社区中的善意持续流动。
            </p>
            <div className="mt-8 flex gap-3">
              <button className="btn-primary !px-6 !py-3 !text-base" onClick={() => setMode('register')}>加入 Utopia</button>
              <button className="btn-outline !px-6 !py-3 !text-base" onClick={() => setMode('login')}>体验演示账号</button>
            </div>
            <p className="mt-3 text-xs text-ink-300">Turn nearby strangers into helpful neighbors.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mt-16">
            {[
              { icon: '🙋', title: '发布一个小请求', desc: '找网球搭档、取快递、练口语……设置时间地点与积分,附近的人会看到。' },
              { icon: '🤝', title: '帮助身边的人', desc: '认领你顺路、擅长的事。积分托管保障双方,完成后自动到账。' },
              { icon: '🌱', title: '积累信任与积分', desc: '每次互助沉淀为信任护照。积分只能通过帮助他人获得,不能买卖提现。' },
            ].map(f => (
              <div key={f.title} className="card p-6">
                <div className="text-3xl mb-3">{f.icon}</div>
                <div className="font-semibold mb-1.5">{f.title}</div>
                <div className="text-sm text-ink-400 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>
          <p className="mt-10 text-[11px] text-ink-300 max-w-2xl leading-relaxed">
            Utopia 是信息撮合与互助平台。积分(Utopia Points)不是法定货币,不能提现、购买或自由转账;使用积分不免除当地法律规定的许可、劳动、税务与保险义务。平台会阻止受监管的高风险任务。
          </p>
        </div>
      )}

      {mode === 'login' && (
        <div className="max-w-md mx-auto px-6 pt-10 fade-up">
          <div className="card p-8">
            <h2 className="text-xl font-semibold mb-1">选择一个演示身份</h2>
            <p className="text-sm text-ink-400 mb-5">网页演示版:选择任意社区成员的身份进入,体验完整互助流程。推荐使用「陈屿」查看最丰富的数据。</p>
            <div className="space-y-2">
              {demoUsers.map(u => (
                <button key={u.id} className="w-full flex items-center gap-3 p-3 rounded-xl border border-cream-300 hover:border-coral-300 hover:bg-coral-50 transition cursor-pointer text-left"
                  onClick={() => { actions.login(u.id); nav('/') }}>
                  <Avatar user={u} size={40} link={false} />
                  <div>
                    <div className="font-medium text-sm">{u.name} {u.id === 'u1' && <span className="chip bg-coral-100 text-coral-600 ml-1">推荐</span>}</div>
                    <div className="text-xs text-ink-400 line-clamp-1">{u.bio}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-4 text-center">
              <button className="text-sm text-coral-500 cursor-pointer" onClick={() => setMode('register')}>没有账号?注册新身份 →</button>
            </div>
          </div>
        </div>
      )}

      {mode === 'register' && (
        <div className="max-w-md mx-auto px-6 pt-10 fade-up">
          <div className="card p-8">
            <h2 className="text-xl font-semibold mb-5">建立你的身份</h2>
            <div className="flex gap-2 mb-4">
              {['📱 手机号', '✉️ 邮箱', 'G Google', ' Apple'].map(m => (
                <span key={m} className="chip bg-cream-200 text-ink-500">{m}</span>
              ))}
            </div>
            <div className="space-y-4">
              <div>
                <label className="label">昵称</label>
                <input className="input" placeholder="其他成员会看到这个名字" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div>
                <label className="label">选择头像</label>
                <div className="flex flex-wrap gap-2">
                  {AVATARS.map(a => (
                    <button key={a} onClick={() => setAvatar(a)}
                      className={`w-10 h-10 rounded-full text-xl flex items-center justify-center cursor-pointer transition ${avatar === a ? 'bg-coral-100 ring-2 ring-coral-400' : 'bg-cream-200 hover:bg-cream-300'}`}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">所在城市</label>
                <input className="input" value={city} onChange={e => setCity(e.target.value)} />
              </div>
              <div>
                <label className="label">简短介绍</label>
                <textarea className="input" rows={2} placeholder="一句话介绍自己,比如你的爱好或擅长的事" value={bio} onChange={e => setBio(e.target.value)} />
              </div>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={ageOk} onChange={e => setAgeOk(e.target.checked)} className="accent-coral-500 mt-0.5" />
                <span>我确认已年满 18 岁,并同意 <span className="text-coral-500">用户协议</span> 与 <span className="text-coral-500">社区安全准则</span></span>
              </label>
              <button className="btn-primary w-full !py-3" disabled={!name.trim() || !ageOk}
                onClick={() => { actions.register({ name: name.trim(), avatar, city, bio, languages: ['中文'] }); setStep(0); setMode('onboarding') }}>
                验证并创建账号(+50 pt)
              </button>
              <p className="text-[11px] text-ink-300 text-center">演示环境:手机/邮箱验证已模拟完成</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
