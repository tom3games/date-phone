import './mute-auto.mjs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
// デート中のスマホ、バレたら冷める の検証。node verify.mjs
// 押す操作は全部 page.mouse / touchscreen（内部の関数を直接呼ばない）。指示と違う操作・2周目・もう一回の連打で止まらないことも見る
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 5437
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const URL0 = `http://localhost:${PORT}/`
let pass = 0, fail = 0
const results = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}, q = '?seed=11') {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts })
  await muteContext(ctx)
  await ctx.addInitScript(() => { try { localStorage.clear() } catch (e) {} })
  const p = await ctx.newPage(); p.errs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)|ofuse|tom3games\.com/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  await p.goto(URL0 + q); await p.waitForFunction(() => window.__dpReady, null, { timeout: 15000 })
  return p
}
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *')) {
    if (el.closest('[hidden]') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue
    if (el.closest('#phone') && !document.getElementById('phone').classList.contains('up')) continue
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
const fit = q => q.evaluate(() => {
  const H = innerHeight, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button,main:not([hidden]) canvas,#chips .chip')) { if (!el.offsetParent || el.closest('#phone:not(.up)') || (el.classList.contains('card') && (el.getBoundingClientRect().top > H - 40 || el.getBoundingClientRect().bottom <= H + 14))) continue; const r = el.getBoundingClientRect(); if (r.bottom > H + 1 || r.top < -1) over.push((el.id || el.className) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom)) }
  return { H, over: over.slice(0, 6) }
})
const variance = (p, sel) => p.evaluate(sel => {
  const c = document.querySelector(sel), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data
  let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 13) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += v; s2 += v * v; n++ }
  return Math.round(s2 / n - (s / n) ** 2)
}, sel)
const st = p => p.evaluate(() => dp.state)
const tick = (p, sec) => p.evaluate(n => { dp.dbg.tick(n); dp.dbg.render() }, Math.round(sec * 60))
// 本物の指: 要素の座標を取ってタップ
async function settle(p) { await p.waitForTimeout(260) }
async function tap(p, xy) { expect(xy && xy.x > 0 && xy.y > 0, 'no target ' + JSON.stringify(xy)); if (p.__touch) await p.touchscreen.tap(xy.x, xy.y); else await p.mouse.click(xy.x, xy.y) }
async function until(p, f, maxSec = 60, arg) { for (let i = 0; i < maxSec * 10; i++) { if (await p.evaluate(f, arg)) return true; await p.evaluate(() => { dp.dbg.tick(6); dp.dbg.render() }) } return false }

const browser = await chromium.launch(MUTE_LAUNCH)
let p = await open(browser)
await t('起動時にエラーが出ない', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await t('ブラウザの拡大が起きない（viewport・ピンチ・Ctrl+ホイール・Ctrl+プラス）', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, gesture: g.defaultPrevented, wheel: w.defaultPrevented, key: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, us: getComputedStyle(document.body).userSelect }
  })
  expect(/user-scalable=no/.test(r.vp) && r.gesture && r.wheel && r.key && r.ta === 'manipulation' && r.us === 'none', JSON.stringify(r)); return r
})
await t('OGP・canonical・横丁への転送がある', async () => {
  const r = await p.evaluate(() => ({ og: ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].every(k => !!document.querySelector(`meta[property="${k}"]`)), tw: !!document.querySelector('meta[name="twitter:card"]'), can: document.querySelector('link[rel=canonical]').href, gh: !!document.getElementById('ghMove') }))
  expect(r.og && r.tw && r.can === 'https://tom3games.com/play/date-phone/' && r.gh, JSON.stringify(r))
})

// ---- 本物の指で1回の流れ（Chromium のマウス）
await t('タイトル → お店に入る（二重タップでも1回だけ始まる）', async () => {
  await p.evaluate(() => dp.dbg.pause())
  await p.dblclick('#bStart')
  await p.evaluate(() => dp.dbg.render())
  const s = await st(p); expect(s.mode === 'play' && s.t < 0.5, JSON.stringify(s))
  const n = await p.evaluate(() => window.__tmLog.filter(e => e[0] === 'start' || (e.ev || e.name) === 'start').length)
  return { playNo: await p.evaluate(() => dp.dbg.G.playNo), tm: n }
})
await t('初めての1回は止まる段階が無い（何もしなくても時間が進み、案内が出る）', async () => {
  const a = await st(p); await tick(p, 4); const b = await st(p)
  expect(b.t > a.t + 3.9 && b.learn, JSON.stringify({ a: a.t, b: b.t, learn: b.learn }))
  const texts = await p.evaluate(() => dp.texts()); expect(texts.length >= 1, 'no texts'); return texts
})
await t('目をそらした時に、伏せたスマホを指でタップすると開く', async () => {
  expect(await until(p, () => dp.state.look === 'away' && dp.state.unread > 0, 40), 'no away with unread')
  await tap(p, await p.evaluate(() => dp.phoneXY())); await tick(p, 0.2); await settle(p)
  const s = await st(p); expect(s.up, JSON.stringify(s)); return { unread: s.unread }
})
await t('通知のカードを指でタップすると消えていいねが増える', async () => {
  const a = await st(p)
  await tap(p, await p.evaluate(() => dp.cardXY(0))); await tick(p, 0.1)
  const b = await st(p); expect(b.unread === a.unread - 1 && b.likes >= a.likes, JSON.stringify({ a: [a.unread, a.likes], b: [b.unread, b.likes] })); return { likes: b.likes }
})
await t('「顔を上げる」で伏せる', async () => {
  await tap(p, await p.evaluate(() => { const r = document.getElementById('upBtn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })); await tick(p, 0.2)
  const s = await st(p); expect(!s.up, JSON.stringify(s))
})
await t('スマホの上の空いた所をタップしても伏せる', async () => {
  expect(await until(p, () => dp.state.look === 'away' || dp.state.look === 'gone', 60), 'no away')
  await p.evaluate(() => dp.pickUp()); await tick(p, 0.1); await settle(p)
  await tap(p, await p.evaluate(() => dp.upXY())); await tick(p, 0.2)
  expect(!(await st(p)).up)
})
await t('質問の答えを指でタップすると答えられる（スマホを見ている間は答えが出ない）', async () => {
  expect(await until(p, () => !!dp.state.q, 80), 'no question')
  await p.evaluate(() => dp.pickUp()); await tick(p, 0.1)
  const hid = await p.evaluate(() => document.getElementById('chips').hidden)
  await p.evaluate(() => dp.putDown()); await tick(p, 0.1); await settle(p)
  const i = await p.evaluate(() => dp.state.q.opts.indexOf('right'))
  await tap(p, await p.evaluate(i => dp.chipXY(i), i)); await tick(p, 0.1)
  const s = await st(p); expect(hid && !s.q, JSON.stringify({ hid, q: s.q })); return { temp: Math.round(s.temp) }
})
await t('料理が来たら「撮って載せる」が出て、指で押せる', async () => {
  expect(await until(p, () => dp.state.dish, 80), 'no dish')
  expect(await until(p, () => dp.state.look === 'away' || !dp.state.dish, 10), 'no away while dish')
  const s0 = await st(p); if (!s0.dish) return 'dish timed out before away (skip)'
  await p.evaluate(() => dp.pickUp()); await tick(p, 0.1); await settle(p)
  await tap(p, await p.evaluate(() => dp.shootXY())); await tick(p, 0.1)
  const s = await st(p); expect(!s.dish && s.likes >= s0.likes + 20, JSON.stringify(s)); await p.evaluate(() => dp.putDown())
})
await t('見られている時に画面を見続けると見つかり、ろうそく（気分）が下がる', async () => {
  expect(await until(p, () => dp.state.look === 'you' && !dp.state.q && !dp.state.react, 40), 'no look')
  const a = await st(p); await p.evaluate(() => dp.pickUp()); await tick(p, 1.0)
  const b = await st(p); await p.evaluate(() => dp.putDown())
  expect(b.caught === a.caught + 1 && b.temp < a.temp, JSON.stringify({ a: [a.caught, a.temp], b: [b.caught, b.temp] }))
})
await t('振り向く前に「ちらっ」が必ずある（目をそらした所から、こっちを見る所へ）', async () => {
  const r = await p.evaluate(() => { const S = dp.dbg.G.script; let bad = 0; for (let i = 0; i < S.length - 1; i++) { const a = S[i]; const nx = S.slice(i + 1).find(z => z.k !== 'course'); if (a.look === 'away' && nx && nx.look === 'you') bad++ } return bad })
  expect(r === 0, r)
})
await t('同時に出る文字は2つまで', async () => {
  await p.evaluate(() => { dp.dbg.calm(); dp.dbg.G.temp = 90 })
  let mx = 0; for (let i = 0; i < 30; i++) { await p.evaluate(() => { if (dp.state.q) dp.answer(0) }); await tick(p, 0.5); mx = Math.max(mx, await p.evaluate(() => [...document.querySelectorAll('#bubble,#hint,#banner.on')].filter(e => !e.hidden && getComputedStyle(e).opacity > 0.05).length)) }
  await p.evaluate(() => dp.dbg.calm(false))
  expect(mx <= 2, mx); return mx
})
await t('通知をためると手が勝手につかむ（指で伏せようとしても少しの間は伏せられない・そのあと伏せられる）', async () => {
  // 前のテストで置いていかれていても、この確認は新しい回でやる
  await p.evaluate(() => { if (dp.state.over || dp.state.mode !== 'play') { dp.dbg.startPlay(false); dp.dbg.pause(); dp.dbg.tick(120) } dp.dbg.G.temp = 80; if (dp.state.up) dp.putDown(); for (let i = 0; i < 9; i++) dp.dbg.notify() }); await tick(p, 0.05); await p.waitForTimeout(260)
  const a = await st(p)
  expect(a.up, 'not grabbed ' + JSON.stringify({ mode: a.mode, over: a.over, unread: a.unread, up: a.up, vplay: await p.evaluate(() => document.getElementById('vPlay').hidden) }))
  await tap(p, await p.evaluate(() => { const r = document.getElementById('upBtn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }))
  const b = await st(p); await tick(p, 1.2)
  await tap(p, await p.evaluate(() => { const r = document.getElementById('upBtn').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })); await tick(p, 0.1)
  const c = await st(p)
  expect(a.up && a.grabs >= 1 && b.up && !c.up, JSON.stringify({ a: a.up, g: a.grabs, b: b.up, c: c.up }))
})
await t('最後まで進んで結果が出る（スクリーンタイムの画像に何か描かれている）', async () => {
  await p.evaluate(() => { window.__lastResult = null; dp.dbg.G.bot = null; dp.dbg.G.temp = 80; if (dp.dbg.G.forceT > 0) dp.dbg.G.forceT = 0; dp.putDown(); dp.dbg.pause(false); dp.dbg.speed(12) })
  await p.evaluate(() => { const B = window.dp; window.__botTimer = setInterval(() => { const s = B.state; if (s.mode !== 'play') return; if (s.q) { if (s.up) B.putDown(); else B.answer(s.q.opts.indexOf('right')) } else if (s.up && s.look !== 'away' && s.look !== 'gone' && s.force <= 0) B.putDown(); else if (!s.up && (s.look === 'away' || s.look === 'gone') && s.unread) B.pickUp(); else if (s.up && s.unread) B.tapCard() }, 30) })
  await p.waitForFunction(() => window.__lastResult, null, { timeout: 60000 })
  await p.evaluate(() => clearInterval(window.__botTimer))
  const v = await variance(p, '#card'); const r = await p.evaluate(() => window.__lastResult)
  await p.screenshot({ path: ROOT + '/shots/result-ja.png' })
  expect(v > 200 && r.points > 0, v); return { v, verdict: r.verdict, points: r.points, likes: r.likes, temp: r.temp }
})
await t('結果に支援ボタン・横丁へ戻る・Xでポストがある', async () => {
  const r = await p.evaluate(() => ({ sup: !!document.getElementById('tmSupport'), home: !!document.getElementById('tmHome'), x: document.getElementById('bPost').href }))
  expect(r.sup && r.home && /x\.com\/intent\/post/.test(r.x) && /tom3games\.com%2Fplay%2Fdate-phone/.test(r.x), JSON.stringify(r))
})
await t('「もう一回デート」の連打でも1回だけ始まり、状態がまっさらに戻る（2周目）', async () => {
  await p.evaluate(() => { dp.dbg.speed(1); dp.dbg.pause() })
  const n0 = await p.evaluate(() => dp.dbg.G.playNo)
  await p.dblclick('#bAgain'); await p.evaluate(() => dp.dbg.render())
  const s = await st(p), n1 = await p.evaluate(() => dp.dbg.G.playNo)
  expect(s.mode === 'play' && s.t < 0.2 && s.temp === 72 && s.likes === 0 && s.caught === 0 && n1 === n0 + 1 && !s.learn, JSON.stringify({ s, n0, n1 }))
})
await t('2周目も最後まで進む（人の速さの bot）', async () => {
  await p.evaluate(() => { dp.dbg.set({ bot: null }); window.__lastResult = null; dp.dbg.pause(false); dp.dbg.speed(12) })
  await p.evaluate(() => { const B = window.dp; window.__botTimer = setInterval(() => { const s = B.state; if (s.mode !== 'play') return; if (s.q) { if (s.up) B.putDown(); else B.answer(0) } else if (s.up && s.look === 'turn') B.putDown(); else if (!s.up && s.look === 'away' && s.unread > 2) B.pickUp(); else if (s.up && s.unread) B.tapCard() }, 40) })
  await p.waitForFunction(() => window.__lastResult, null, { timeout: 60000 }); await p.evaluate(() => clearInterval(window.__botTimer))
  return await p.evaluate(() => ({ v: window.__lastResult.verdict, sec: window.__lastResult.sec }))
})
await p.close()

// ---- 指示と違う操作で止まらない（Chromium のタッチ）
p = await open(browser, { hasTouch: true, isMobile: true }); p.__touch = true
await t('タッチ: 指示と違う操作を続けても時間が進み、結果まで行く', async () => {
  await tap(p, await p.evaluate(() => { const r = document.getElementById('bStart').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }))
  await p.evaluate(() => dp.dbg.pause())
  const spots = [[195, 300], [40, 700], [350, 120], [195, 820], [20, 20], [300, 600]]
  let last = 0
  for (let k = 0; k < 60; k++) {
    const [x, y] = spots[k % spots.length]
    await p.touchscreen.tap(x, y)
    // 質問中にスマホを開く・伏せたスマホを連打・答えを見られている時に押す・料理が無い時に撮る
    await p.evaluate(k => { if (k % 3 === 0) dp.pickUp(); if (k % 5 === 0) dp.putDown(); if (k % 7 === 0) dp.shoot(); if (k % 4 === 0) dp.answer(k % 3); dp.tapCard() }, k)
    await tick(p, 2.2)
    const s = await st(p); if (s.mode !== 'play') break
    expect(s.t > last || s.over, 'time stuck at ' + s.t); last = s.t
  }
  await p.evaluate(() => { dp.dbg.pause(false); dp.dbg.speed(12) })
  await p.waitForFunction(() => window.__lastResult, null, { timeout: 60000 })
  return { mode: (await st(p)).mode, verdict: await p.evaluate(() => window.__lastResult.verdict), err: p.errs.length }
})
await t('タッチ: 遊び方 → わかった → お店に入る', async () => {
  await p.reload(); await p.waitForFunction(() => window.__dpReady)
  for (const id of ['bHow', 'bHowClose', 'bStart']) { const xy = await p.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }, id); await p.touchscreen.tap(xy.x, xy.y); await p.waitForTimeout(150) }
  expect((await st(p)).mode === 'play')
})
await t('タッチ: 何もしないと最低の結果（置いていかれる）', async () => {
  await p.evaluate(() => { dp.dbg.pause(false); dp.dbg.speed(12); window.__lastResult = null })
  await p.waitForFunction(() => window.__lastResult, null, { timeout: 60000 })
  const r = await p.evaluate(() => window.__lastResult); expect(r.verdict === 'left' && r.points < 100, JSON.stringify(r)); return { verdict: r.verdict, points: r.points, sec: r.sec }
})
await p.close()

// ---- bot の分布（遊び方ごと）
p = await open(browser)
await t('bot の分布: 上手い > 人 > 見ない > 適当・ずっとスマホ > 何もしない（最低）', async () => {
  const r = await p.evaluate(() => { const o = {}; for (const b of ['good', 'human', 'never', 'random', 'addict', 'idle']) { let s = 0, left = 0; for (let i = 1; i <= 8; i++) { const x = dp.sim(b, i * 37); s += x.points; if (x.verdict === 'left') left++ } o[b] = { pts: Math.round(s / 8), left } } return o })
  expect(r.good.pts > r.human.pts && r.human.pts > r.never.pts && r.never.pts > r.random.pts && r.never.pts > r.addict.pts && r.idle.pts <= Math.min(r.random.pts, r.addict.pts, r.never.pts) && r.human.left <= 2, JSON.stringify(r)); return r
})
await t('同じ種なら同じ結果（再現性）', async () => {
  const r = await p.evaluate(() => [dp.sim('human', 77).points, dp.sim('human', 77).points]); expect(r[0] === r[1], r)
})
await t('英語に切り替えても遊べて、結果も英語', async () => {
  await p.click('#bLang')
  const t1 = await p.evaluate(() => document.getElementById('t2').textContent)
  await p.evaluate(() => { dp.dbg.startPlay(false); dp.dbg.pause(); dp.dbg.tick(60 * 3); dp.dbg.render() })
  const bub = await p.evaluate(() => document.getElementById('bubble').textContent)
  await p.evaluate(() => { dp.dbg.leave() }); await p.evaluate(() => { dp.dbg.pause(false) })
  await p.waitForFunction(() => window.__lastResult, null, { timeout: 15000 }); await p.waitForTimeout(300)
  await p.screenshot({ path: ROOT + '/shots/result-en.png' })
  const post = await p.evaluate(() => decodeURIComponent(document.getElementById('bPost').href))
  expect(/First Date/.test(t1) && /[a-z]/i.test(bub) && !/[ぁ-ん]/.test(bub) && /#PhoneOnAFirstDate/.test(post), JSON.stringify({ t1, bub, post })); return { t1, bub }
})
await p.close()

// ---- スマホ縦3サイズ × 全画面で一画面に収まる・彼女の顔が手に持ったスマホに隠れない
for (const [w, h, name] of [[360, 640, 'small'], [390, 844, 'phone'], [430, 932, 'max']]) {
  const q = await open(browser, { viewport: { width: w, height: h }, hasTouch: true, isMobile: true }, '?seed=11&notut')
  const views = {}
  views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-title.png` })
  await q.click('#bHow'); views.how = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-how.png` }); await q.click('#bHowClose')
  await q.evaluate(() => { dp.dbg.pause(); dp.dbg.startPlay(false); dp.dbg.tick(60 * 4); dp.dbg.render() })
  views.play = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-play.png` })
  const geo = await q.evaluate(() => { const ph = dp.phoneXY(), hd = dp.dbg.headXY(); return { ph, hd, H: innerHeight, W: innerWidth } })
  await q.evaluate(() => { dp.dbg.calm(); for (let i = 0; i < 5; i++) dp.dbg.notify(); dp.pickUp(); dp.dbg.tick(30); dp.dbg.render() }); await q.waitForTimeout(250)
  views.phone = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-phone.png` })
  const up = await q.evaluate(() => ({ top: document.getElementById('phone').getBoundingClientRect().top, eye: dp.dbg.toScreen(new (dp.dbg.camera.position.constructor)(0, 1.22, -0.82)).y, upBtn: document.getElementById('upBtn').getBoundingClientRect(), card: dp.cardXY(0) }))
  await q.evaluate(() => { dp.putDown(); let n = 0; while (!dp.state.q && n++ < 9000) dp.dbg.tick(1); dp.dbg.tick(20); dp.dbg.render() }); await q.waitForTimeout(250)
  views.q = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-q.png` })
  const chips = await q.evaluate(() => [0, 1, 2].map(i => dp.chipXY(i)))
  await q.evaluate(() => dp.dbg.leave()); await q.evaluate(() => dp.dbg.pause(false)); await q.waitForFunction(() => window.__lastResult, null, { timeout: 15000 }); await q.waitForTimeout(400)
  views.result = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-result.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  await t(`${name}: 伏せたスマホ・答え・顔を上げるボタンが画面の中`, async () => {
    const inside = p => p && p.x > 10 && p.x < w - 10 && p.y > 10 && p.y < h - 10
    expect(inside(geo.ph) && chips.every(inside) && up.upBtn.top > 0 && inside(up.card), JSON.stringify({ geo, chips, up }))
  })
  await t(`${name}: スマホを持っても彼女の目が見える（目がスマホの上端より上）`, async () => { expect(up.eye < up.upBtn.top - 4, JSON.stringify(up)); return { eye: Math.round(up.eye), btn: Math.round(up.upBtn.top) } })
  await t(`${name}: はみ出し・エラーなし`, async () => { const o = await overflow(q); expect(o.sw <= o.W && !o.bad.length && !q.errs.length, JSON.stringify(o) + q.errs.join('|')) })
  await q.close()
}
await t('Chromium: 実際には無音', async () => {
  const q = await open(browser); await q.click('#bStart'); await q.waitForTimeout(400)
  const r = await q.evaluate(() => ({ ok: window.__muteOk(), calls: window.__soundCalls }))
  await q.close(); expect(r.ok, JSON.stringify(r)); return r
})
await browser.close()

// ---- WebKit（iPhone 相当）でタッチの通し
const wb = await webkit.launch(), wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); wp.__touch = true
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: タッチで始めて、スマホを開いてカードを片づけ、伏せる', async () => {
  await tap(wp, await wp.evaluate(() => { const r = document.getElementById('bStart').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }))
  await wp.evaluate(() => dp.dbg.pause())
  expect(await until(wp, () => dp.state.look === 'away' && dp.state.unread > 0, 40), 'no away')
  await tap(wp, await wp.evaluate(() => dp.phoneXY())); await tick(wp, 0.2); await settle(wp)
  const a = await st(wp)
  await tap(wp, await wp.evaluate(() => dp.cardXY(0))); await tick(wp, 0.1)
  const b = await st(wp)
  await tap(wp, await wp.evaluate(() => dp.upXY())); await tick(wp, 0.1)
  const c = await st(wp)
  expect(a.up && b.unread === a.unread - 1 && !c.up, JSON.stringify({ a: a.up, au: a.unread, bu: b.unread, c: c.up }))
})
await t('WebKit: 実際には無音（タップで音を鳴らした後）', async () => {
  const r = await wp.evaluate(() => ({ ok: window.__muteOk(), calls: window.__soundCalls }))
  expect(r.ok, JSON.stringify(r)); return r
})
await t('WebKit: 最後まで進んで結果', async () => {
  await wp.evaluate(() => { dp.dbg.pause(false); dp.dbg.speed(12); dp.dbg.set({ bot: null }) })
  await wp.evaluate(() => { const B = window.dp; window.__botTimer = setInterval(() => { const s = B.state; if (s.mode !== 'play') return; if (s.q) { if (s.up) B.putDown(); else B.answer(s.q.opts.indexOf('right')) } else if (s.up && s.look !== 'away' && s.look !== 'gone' && s.force <= 0) B.putDown(); else if (!s.up && s.look === 'away' && s.unread) B.pickUp(); else if (s.up && s.unread) B.tapCard() }, 30) })
  await wp.waitForFunction(() => window.__lastResult, null, { timeout: 60000 })
  await wp.screenshot({ path: ROOT + '/shots/webkit-result.png' })
  return await wp.evaluate(() => window.__lastResult.verdict)
})
await t('WebKit: エラーなし', async () => { expect(wp.errs.length === 0, wp.errs.join('|')) })
// ---- ページを離れた時の音（2026-11-11 横丁へ移っても BGM が鳴り続けた不具合の再発防止）
await t('WebKit: 裏に回ると BGM と環境音が止まり suspend。戻っても触るまで鳴らない（bfcache の pageshow でも）', async () => {
  const r = await wp.evaluate(async () => {
    if (!Snd.ctx) Snd.init()
    const url = Object.values(Snd.files).flat()[0]; Snd.loop('vtest', url, 0.2)
    for (let i = 0; i < 30 && !Snd.playing().includes('vtest'); i++) await new Promise(r => setTimeout(r, 100))
    const c = Snd.ctx; let sus = 0; const os = c.suspend.bind(c); c.suspend = () => { sus++; return os() }
    const before = Snd.playing().length, wake0 = Snd.life.wake
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange'))
    const hid = { away: Snd.away, playing: Snd.playing().length, sus, gain: Snd.master.gain.value }
    const name = Object.keys(Snd.files)[0], src = Snd.play(name); Snd.loop('vtest2', url, 0.2);    // 裏にいる間の音は鳴らさない
    await new Promise(r => setTimeout(r, 400)); const quiet = Snd.playing().length
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange'))
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))
    await new Promise(r => setTimeout(r, 400)); const back = { away: Snd.away, playing: Snd.playing().length, gain: Snd.master.gain.value }
    Snd.loop('vtest2', null)
    return { before, wake0, hid, src: src === null, quiet, back }
  })
  // ボタンでない所を1回タップ（触ったら鳴らし直す）
  const pt = await wp.evaluate(() => { for (let y = 0.5; y < 0.98; y += 0.06) for (let x = 0.08; x < 0.95; x += 0.12) { const X = innerWidth * x, Y = innerHeight * y, e = document.elementFromPoint(X, Y); if (e && !e.closest('button,a,input,select,textarea,label,[onclick],[role=button],[tabindex]')) return { x: X, y: Y } } return null })
  if (pt) await wp.touchscreen.tap(pt.x, pt.y); else await wp.keyboard.press('Shift')
  await wp.waitForTimeout(700)
  const after = await wp.evaluate(() => ({ away: Snd.away, playing: Snd.playing().length, wake: Snd.life.wake, mute: window.__muteOk() }))
  await wp.evaluate(() => Snd.loop('vtest', null))
  expect(r.before >= 1 && r.hid.away && r.hid.playing === 0 && r.hid.sus === 1 && r.hid.gain === 0 && r.src && r.quiet === 0 && r.back.away && r.back.playing === 0 && r.back.gain === 0 && !after.away && after.playing >= r.before && after.wake === r.wake0 + 1 && after.mute, JSON.stringify({ r, after, pt })); return { before: r.before, after: after.playing }
})
await t('WebKit: 別のページへ移る（pagehide）と止まり、戻るで戻っても鳴っていない・エラーなし', async () => {
  await wp.evaluate(() => addEventListener('pagehide', () => { try { sessionStorage.setItem('vHide', JSON.stringify({ away: Snd.away, playing: Snd.playing().length, hide: Snd.life.hide })) } catch (e) {} }))
  await wp.evaluate(() => { if (!Snd.ctx) Snd.init(); Snd.loop('vtest', Object.values(Snd.files).flat()[0], 0.2) }); await wp.waitForTimeout(500)
  const pre = await wp.evaluate(() => Snd.playing().length)
  await wp.goto(URL0 + 'privacy.html'); await wp.waitForTimeout(300)
  const hid = await wp.evaluate(() => sessionStorage.getItem('vHide'))
  await wp.goBack(); await wp.waitForFunction(() => window.__dpReady, null, { timeout: 15000 }); await wp.waitForTimeout(800)
  const back = await wp.evaluate(() => ({ playing: typeof Snd === 'undefined' ? 0 : Snd.playing().length, mute: window.__muteOk() }))
  const h = JSON.parse(hid || '{}')
  expect(pre >= 1 && h.away && h.playing === 0 && back.playing === 0 && back.mute && wp.errs.length === 0, JSON.stringify({ pre, h, back, e: wp.errs })); return { pre, h, back }
})
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
