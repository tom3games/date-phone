import '../mute-auto.mjs'
// 確認用の撮影。node tools/shot.mjs [幅x高さ] [webkit]  → scratchpad の sns/shots に保存
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const ROOT = import.meta.dirname + '/..'
const OUT = process.env.OUT || (await import('node:os')).tmpdir() + '/date-phone-shots'
mkdirSync(OUT, { recursive: true })
const PORT = 5438
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const [w, h] = (process.argv[2] || '390x844').split('x').map(Number)
const B = process.argv.includes('webkit') ? webkit : chromium
const b = await B.launch(B === chromium ? { channel: 'chromium', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] } : {})
const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: process.argv.includes('en') ? 'en-US' : 'ja-JP', hasTouch: true, isMobile: B === chromium })
const p = await ctx.newPage(); const errs = []
p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()) })
await p.goto(`http://localhost:${PORT}/?notut&seed=5`); await p.waitForFunction(() => window.__dpReady, null, { timeout: 15000 })
await p.waitForTimeout(600)
const tag = `${w}x${h}${B === webkit ? '-wk' : ''}`
await p.screenshot({ path: `${OUT}/${tag}-0title.png` })
await p.evaluate(() => { dp.dbg.pause(); dp.dbg.startPlay(false); dp.dbg.step(60 * 4) })
await p.waitForTimeout(300); await p.evaluate(() => dp.dbg.render())
await p.screenshot({ path: `${OUT}/${tag}-1talk.png` })
await p.evaluate(() => { dp.dbg.calm(); dp.dbg.skipTo('away'); for (let i = 0; i < 5; i++) dp.dbg.notify(); dp.dbg.step(30) })
await p.waitForTimeout(300); await p.evaluate(() => dp.dbg.render())
await p.screenshot({ path: `${OUT}/${tag}-2away-pile.png` })
await p.evaluate(() => { dp.pickUp(); dp.dbg.step(20) })
await p.waitForTimeout(400); await p.evaluate(() => dp.dbg.render())
await p.screenshot({ path: `${OUT}/${tag}-3phone.png` })
await p.evaluate(() => { dp.putDown(); dp.dbg.calm(); dp.dbg.skipTo('q'); dp.dbg.step(10) })
await p.waitForTimeout(400); await p.evaluate(() => dp.dbg.render())
await p.screenshot({ path: `${OUT}/${tag}-4q.png` })
await p.evaluate(() => { dp.pickUp(); dp.dbg.step(60 * 1.2) })
await p.waitForTimeout(400); await p.evaluate(() => dp.dbg.render())
await p.screenshot({ path: `${OUT}/${tag}-5caught.png` })
// 台本の中の区間まで進める（質問は正しく答える・通知は止める）
const go = (k, extra = 0) => p.evaluate(([k, extra]) => { dp.putDown(); dp.dbg.calm(); dp.dbg.G.temp = 80; let n = 0; while (dp.dbg.G.seg && dp.dbg.G.seg.k !== k && n++ < 4000) { if (dp.state.q) dp.answer(dp.state.q.opts.indexOf('right')); dp.dbg.tick(6) } dp.dbg.step(extra) }, [k, extra])
const snap = async name => { await p.waitForTimeout(250); await p.evaluate(() => dp.dbg.render()); await p.screenshot({ path: `${OUT}/${tag}-${name}.png` }) }
await go('gone', 40); await snap('6gone')
await go('show', 30); await snap('7show')
await go('proposal', 60); await snap('7proposal')
await go('seal', 60); await p.evaluate(() => { for (let i = 0; i < 6; i++) dp.dbg.notify() }); await snap('7seal')
await p.evaluate(() => { dp.dbg.G.temp = 3; dp.pickUp(); dp.dbg.step(60 * 3) })
await p.waitForTimeout(500); await p.evaluate(() => dp.dbg.render())
await p.screenshot({ path: `${OUT}/${tag}-8leave.png` })
await p.evaluate(() => { dp.dbg.pause(false) })
await p.waitForFunction(() => window.__lastResult, null, { timeout: 15000 }); await p.waitForTimeout(500)
await p.screenshot({ path: `${OUT}/${tag}-9result.png` })
console.log(tag, errs.length ? errs : 'no errors')
await b.close(); server.kill()
