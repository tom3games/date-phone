import './mute-auto.mjs'
// SNS 用の画像（1200x630）。スマホを見ていたら彼女にじーっと見られている瞬間＋題名。node og.mjs
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const ROOT = import.meta.dirname
const PORT = 5443
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch({ channel: 'chromium', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] })
const ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
const p = await ctx.newPage()
await p.goto(`http://localhost:${PORT}/?notut&seed=21`); await p.waitForFunction(() => window.__dpReady); await p.waitForTimeout(800)
await p.evaluate(async () => {
  const d = dp.dbg; d.pause(true); d.startPlay(false); d.calm()
  d.skipTo('away'); for (let i = 0; i < 6; i++) d.notify({ viral: 1 }); d.tick(30)
  dp.pickUp(); d.tick(20); for (let i = 0; i < 2; i++) dp.tapCard()
  // こっちを見た瞬間、じーっ
  d.set({ look: 'you' }); d.tick(40)
  d.G.react = { img: 'h_jito', until: 1e9, caught: true }; d.sayHer('……スマホ、楽しい？', 'cold', 99); d.G.temp = 30
  d.CAM.p.set(0.12, 1.22, 1.05); d.CAM.t.set(0.12, 1.0, -0.6); d.camera.fov = 40; d.camera.updateProjectionMatrix(); d.set({ food: { me: null, her: 'd_soup' } }); d.step(1)
  document.getElementById('cutin').classList.remove('on')
  const st = document.createElement('style'); st.textContent = `
    #course,#bMute,#hint,#upBtn,#cutin{display:none!important}
    .bubble{font-size:30px!important;transform:translateX(-150px)}
    #phone{left:auto!important;right:auto!important;margin-left:0!important;transform:none!important;width:330px!important;height:360px!important;left:60px!important;bottom:-30px!important;transform:rotate(-6deg)!important}
    #ogT{position:fixed;right:40px;top:44px;z-index:20;width:430px;padding:26px 28px 24px;background:#f7efe0;text-align:center;font-family:"Zen Old Mincho",serif;box-shadow:0 14px 30px rgba(0,0,0,.5);outline:2px solid rgba(122,20,36,.55);outline-offset:-11px;transform:rotate(2deg)}
    #ogT small{display:block;font-size:18px;letter-spacing:.1em;color:#7a1424}
    #ogT span{display:block;margin-top:10px;font-size:32px;color:#2a1b12}
    #ogT b{display:block;font-size:52px;color:#7a1424;line-height:1.15;margin-top:4px}
    #ogT p{margin-top:16px;font:600 22px "Klee One";color:#5b3a2c;line-height:1.5}`
  document.head.appendChild(st)
  const t = document.createElement('div'); t.id = 'ogT'; t.innerHTML = '<small>本日のふたり席</small><span>デート中の</span><b>スマホ、<br>バレたら冷める</b><p>通知は鳴る。彼女は話す。<br>どっちも見たい。</p>'
  document.body.appendChild(t)
  await document.fonts.ready
})
await p.waitForTimeout(700)
await p.evaluate(() => dp.dbg.render())
await p.screenshot({ path: ROOT + '/og.png' })
await b.close(); server.kill()
