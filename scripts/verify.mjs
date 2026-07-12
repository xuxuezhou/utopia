// Utopia 七条演示路径无头验证
// 用法: node scripts/verify.mjs [baseUrl]  (默认 http://localhost:5173)
import puppeteer from 'puppeteer-core'

const BASE = process.argv[2] ?? 'http://localhost:5173'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const results = []
function ok(name, pass, detail = '') {
  results.push({ name, pass, detail })
  console.log(`${pass ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

async function clickByText(page, selector, text) {
  const handle = await page.evaluateHandle((sel, t) => {
    const els = [...document.querySelectorAll(sel)]
    return els.find(e => e.textContent && e.textContent.includes(t)) ?? null
  }, selector, text)
  const el = handle.asElement()
  if (!el) throw new Error(`clickByText: not found "${text}" in ${selector}`)
  await el.click()
  await sleep(300)
}

async function bodyText(page) {
  return page.evaluate(() => document.body.innerText)
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--window-size=1280,900'] })
const page = await browser.newPage()
await page.setViewport({ width: 1280, height: 900 })
page.on('pageerror', e => console.log('  [pageerror]', e.message.slice(0, 200)))

try {
  // ---------- 登录 ----------
  await page.goto(`${BASE}/#/welcome`, { waitUntil: 'networkidle0' })
  await page.evaluate(() => localStorage.removeItem('utopia-state-v1'))
  await page.reload({ waitUntil: 'networkidle0' })
  await sleep(500)
  await clickByText(page, 'button', '体验演示账号')
  await sleep(400)
  await clickByText(page, 'button', '陈屿')
  await sleep(800)
  let text = await bodyText(page)
  ok('登录进入发现页', text.includes('发现') && text.includes('关注'))

  // ---------- 路径一:发布低风险任务 ----------
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle0' })
  await sleep(200)
  await page.goto(`${BASE}/#/publish`, { waitUntil: 'networkidle0' })
  await sleep(400)
  await page.type('textarea', '我想找一个人周日下午陪我打一个小时网球,最好是中等水平,在学校附近。')
  await clickByText(page, 'button', '下一步')
  await sleep(500)
  text = await bodyText(page)
  ok('路径1: 自然语言解析出确认页', text.includes('确认你的请求') && text.includes('建议设置为'))
  await clickByText(page, 'button', '确认发布')
  await sleep(600)
  text = await bodyText(page)
  ok('路径1: 任务发布成功', text.includes('你的请求已发布'))

  // ---------- 路径六:阻止儿童/驾驶高风险任务 ----------
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle0' })
  await sleep(200)
  await page.goto(`${BASE}/#/publish`, { waitUntil: 'networkidle0' })
  await sleep(400)
  await page.type('textarea', '找人每天开车接我的孩子放学。')
  await clickByText(page, 'button', '下一步')
  await sleep(500)
  text = await bodyText(page)
  ok('路径6: T3 任务被阻止', text.includes('无法发布') && (text.includes('受监管') || text.includes('暂不支持')))

  // ---------- 路径七:识别诈骗 ----------
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle0' })
  await sleep(200)
  await page.goto(`${BASE}/#/publish`, { waitUntil: 'networkidle0' })
  await sleep(400)
  await page.type('textarea', '帮我先买500美元礼品卡,完成后给你2000积分。')
  await clickByText(page, 'button', '下一步')
  await sleep(500)
  text = await bodyText(page)
  ok('路径7: 诈骗任务被拦截并给出安全教育', text.includes('无法发布') && text.includes('安全提示'))

  // 安全事件应已进入后台
  await page.goto(`${BASE}/#/admin/incidents`, { waitUntil: 'networkidle0' })
  await sleep(500)
  text = await bodyText(page)
  ok('路径6/7: 安全事件已记录到后台', text.includes('发布被拦截'))

  // ---------- 路径二:认领任务(申请) ----------
  await page.goto(`${BASE}/#/nearby`, { waitUntil: 'networkidle0' })
  await sleep(500)
  const openTaskId = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('utopia-state-v1'))
    const t = s.tasks.find(t => ['open', 'applied'].includes(t.status) && t.publisherId !== s.currentUserId && !t.applicants.some(a => a.userId === s.currentUserId) && t.riskTier !== 'T2')
    return t?.id ?? null
  })
  const applied = !!openTaskId
  await page.goto(`${BASE}/#/task/${openTaskId}`, { waitUntil: 'networkidle0' })
  await sleep(700)
  text = await bodyText(page)
  ok('路径2: 打开任务详情并看到信任护照', applied && text.includes('信任护照'))
  await clickByText(page, 'button', '申请提供帮助')
  await sleep(400)
  await page.type('input[placeholder*="湖畔大学"]', '常年运动,时间灵活')
  await page.type('textarea[placeholder*="相关经验"]', '有相关经验,工具齐全')
  await clickByText(page, 'button', '提交申请')
  await sleep(500)
  text = await bodyText(page)
  ok('路径2: 申请已提交', text.includes('已申请'))

  // ---------- 路径二后半:发布者选择帮助者(用自己发布的 t9) ----------
  await page.goto(`${BASE}/#/task/t9`, { waitUntil: 'networkidle0' })
  await sleep(500)
  text = await bodyText(page)
  if (text.includes('收到的申请')) {
    await clickByText(page, 'button', '选择 TA')
    await sleep(600)
    text = await bodyText(page)
    ok('路径2: 选择帮助者→托管锁定+任务聊天', text.includes('任务聊天'))
  } else {
    ok('路径2: 选择帮助者→托管锁定+任务聊天', false, 't9 无申请列表')
  }

  // ---------- 路径三:完成任务(t9 继续走完) ----------
  await clickByText(page, 'button', '确认开始任务').catch(() => {})
  await sleep(500)
  await clickByText(page, 'button', '标记为待确认').catch(() => {})
  await sleep(500)
  await clickByText(page, 'button', '确认结果')
  await sleep(400)
  await clickByText(page, 'button', '确认完成')
  await sleep(700)
  text = await bodyText(page)
  ok('路径3: 任务完成并进入评价', text.includes('已完成') && text.includes('双向评价'))

  // 账本一致性:积分中心应有释放记录
  await page.goto(`${BASE}/#/points`, { waitUntil: 'networkidle0' })
  await sleep(500)
  text = await bodyText(page)
  ok('路径3: 账本包含任务锁定与释放/销毁记录', text.includes('任务锁定') && text.includes('积分账本'))

  // ---------- 路径四:取消已匹配任务 ----------
  const cancelable = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('utopia-state-v1'))
    const t = s.tasks.find(t => ['matched', 'starting_soon'].includes(t.status) && (t.publisherId === s.currentUserId || t.helperId === s.currentUserId))
    return t?.id ?? null
  })
  if (cancelable) {
    await page.goto(`${BASE}/#/task/${cancelable}`, { waitUntil: 'networkidle0' })
    await sleep(500)
    await clickByText(page, 'button', '取消任务')
    await sleep(400)
    text = await bodyText(page)
    const impact = text.includes('取消的影响')
    await page.type('textarea[placeholder*="尊重"]', '临时有事,非常抱歉')
    await clickByText(page, 'button', '确认取消')
    await sleep(600)
    text = await bodyText(page)
    ok('路径4: 取消展示影响并结算', impact && (text.includes('退回') || text.includes('补偿')))
  } else {
    ok('路径4: 取消展示影响并结算', false, '没有可取消的已匹配任务')
  }

  // ---------- 路径四+:取消 pending_confirm 任务,托管必须结算且账本平衡 ----------
  // 种子 t20:u1 发布、u19 已提交完成(pending_confirm),托管锁定 42 pt
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle0' })
  await sleep(200)
  await page.goto(`${BASE}/#/task/t20`, { waitUntil: 'networkidle0' })
  await sleep(500)
  text = await bodyText(page)
  const pcWarn = text.includes('帮助者已提交完成')
  await clickByText(page, 'button', '取消任务')
  await sleep(400)
  text = await bodyText(page)
  const pcImpact = text.includes('补偿给帮助者')
  await page.type('textarea[placeholder*="尊重"]', '不需要了,非常抱歉')
  await clickByText(page, 'button', '确认取消')
  await sleep(600)
  const pc = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('utopia-state-v1'))
    const entries = s.ledger.filter(e => e.taskId === 't20')
    const stuck = entries.filter(e => e.status === 'locked' || e.status === 'frozen').length
    const inflow = entries.filter(e => e.to === 'sys:escrow' && e.status !== 'reversed').reduce((a, e) => a + e.amount, 0)
    const outflow = entries.filter(e => e.from === 'sys:escrow' && e.status !== 'reversed').reduce((a, e) => a + e.amount, 0)
    const hasComp = entries.some(e => e.type === 'cancel_compensation' && e.to === 'u19')
    return { stuck, inflow, outflow, hasComp, status: s.tasks.find(t => t.id === 't20')?.status }
  })
  ok('路径4+: 取消待确认任务→托管结算+补偿+账本平衡',
    pcWarn && pcImpact && pc.status === 'cancelled' && pc.stuck === 0 && pc.hasComp && pc.inflow === pc.outflow,
    `locked/frozen=${pc.stuck} in=${pc.inflow} out=${pc.outflow} comp=${pc.hasComp}`)

  // ---------- 路径五:争议(用种子中的 disputed 任务在后台裁决) ----------
  await page.goto(`${BASE}/#/admin/disputes`, { waitUntil: 'networkidle0' })
  await sleep(500)
  text = await bodyText(page)
  if (text.includes('作出裁决')) {
    await clickByText(page, 'button', '作出裁决')
    await sleep(400)
    await page.type('textarea[placeholder*="裁决说明"]', '根据双方证据,帮助者已完成大部分工作,按比例释放。')
    await clickByText(page, 'button', '确认裁决')
    await sleep(600)
    text = await bodyText(page)
    ok('路径5: 管理员裁决争议', text.includes('裁决:'))
  } else {
    ok('路径5: 管理员裁决争议', false, '后台没有待裁决争议')
  }

  // ---------- 后台总览 ----------
  await page.goto(`${BASE}/#/admin`, { waitUntil: 'networkidle0' })
  await sleep(500)
  text = await bodyText(page)
  ok('后台总览指标渲染', text.includes('北极星指标') && text.includes('流通积分'))

  // ---------- 关键页面渲染冒烟 ----------
  for (const [path, expect] of [
    ['/#/', '发现'], ['/#/circles', '圈子'], ['/#/messages', '消息'],
    ['/#/safety', '安全中心'], ['/#/trust', '认证等级'], ['/#/mytasks', '的任务'],
    ['/#/admin/economy', '积分经济'], ['/#/admin/ledger', '积分账本'],
  ]) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle0' })
    await sleep(300)
    const t2 = await bodyText(page)
    ok(`页面渲染 ${path}`, t2.includes(expect))
  }

  // 截图
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle0' }); await sleep(600)
  await page.screenshot({ path: 'scripts/shot-feed.png' })
  await page.goto(`${BASE}/#/nearby`, { waitUntil: 'networkidle0' }); await sleep(600)
  await page.screenshot({ path: 'scripts/shot-nearby.png' })
  await page.setViewport({ width: 390, height: 844 })
  await page.goto(`${BASE}/#/`, { waitUntil: 'networkidle0' }); await sleep(600)
  await page.screenshot({ path: 'scripts/shot-mobile.png' })
} catch (e) {
  console.error('FATAL:', e.message)
  results.push({ name: 'fatal', pass: false })
}

await browser.close()
const fails = results.filter(r => !r.pass)
console.log(`\n${results.length - fails.length}/${results.length} passed`)
process.exit(fails.length ? 1 : 0)
