import '../mute-auto.mjs'   // ブラウザでは絶対に音を出さない。音は記録して ffmpeg で後から重ねる
// X 投稿用の縦長プレイ動画（1080x1920・30fps・H.264＋AAC）。node promo/film.mjs   （PROBE=1 で下見: 出来事の時刻だけ出す）
// 上手い bot で目をそらした隙にスマホ → 料理を撮って載せる → デザートでスマホに夢中（addict）になり見つかって置いていかれる → スクリーンタイム＋題名
// 撮影用の写し: js/game.js の最後で BOTS を窓口に出すだけ（ゲームのファイルは変えない）
import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir, tmpdir } from 'node:os'
import { join } from 'node:path'
import { serve, open, Recorder, mix, encode, inspect, stills } from '../../_shared/promo-film.mjs'

const ROOT = new URL('..', import.meta.url).pathname
const SLUG = 'date-phone', SEED = +(process.env.SEED || 21), PROBE = !!process.env.PROBE
const TMP = process.env.FRAMES || join(tmpdir(), `${SLUG}-frames-${Date.now()}`)
const OUT_DIR = join(homedir(), 'Desktop/バカゲー動画'); mkdirSync(OUT_DIR, { recursive: true })
// 撮る区間 [ゲーム内の秒 から, まで, bot]。'cry' は bot を切り替えて終わるまで→結果の 2.5 秒後まで
const CUTS = JSON.parse(process.env.CUTS || '[[3,11,"good"],[35,41.5,"good"],[74,"cry","addict"]]')
const IDLE_AT = +(process.env.IDLE_AT || 0)

const srv = await serve(ROOT, { 'js/game.js': [['window.dp = api', 'window.dp = api; window.__bots = () => BOTS']] })
const { b, p, errs } = await open({ chromium, port: srv.port, path: `/?seed=${SEED}&notut`, ready: '__dpReady' })
await p.evaluate(() => {
  const F = window.__film
  F.hookSnd(); F.on()
  dp.dbg.G.playNo = 0
  F.evN = 0
})
// タイトルの「はじめる」を本物の指で押す（Snd.init と環境音の開始まで本物の流れで）
await p.evaluate(() => {
  const btn = document.getElementById('bStart'); btn.click(); return btn.textContent
}).then(t => console.log('start button:', t))

const tick = (F, a) => {
  const G = dp.dbg.G
  for (const e of (G.events || []).slice(F.evN)) F.mark(Array.isArray(e) ? e.join(':') : JSON.stringify(e))
  F.evN = (G.events || []).length
  if (a.bot === 'addict' && !F.low) { F.low = true; G.temp = Math.min(G.temp, 26) }   // 早送りで溜めた不満の代わり（短く収める）
  if (a.bot !== F.botName) { F.botName = a.bot; dp.dbg.set({ bot: a.bot === 'idle' ? null : window.__bots()[a.bot], botSt: null }) }
  if (G.mode === 'result' && F.resF == null) { F.resF = F.all || 0 }
  F.all = (F.all || 0) + 1
  if (a.mode === 'until') return G.t >= a.t || !!G.over
  if (a.mode === 'result') return F.resF != null && F.all - F.resF >= a.n
  return false
}
const rec = new Recorder(p, TMP)
if (PROBE) {
  await rec.run(tick, { ff: true, max: 30 * 140, arg: { mode: 'until', t: IDLE_AT || 999, bot: 'good' } })
  await rec.run(tick, { ff: true, max: 30 * 60, arg: { mode: 'result', n: 1, bot: 'idle' } })
  console.log(JSON.stringify(await p.evaluate(() => ({ notes: window.__film.notes.map(n => n[0] + '@' + n[1]).join(' '), t: dp.dbg.G.t, over: dp.dbg.G.over }))))
  console.log('errors', errs)
  await b.close(); srv.close(); process.exit(0)
}
const segs = []
for (const [t0, t1, bot] of CUTS) {
  await rec.run(tick, { ff: true, max: 30 * 200, arg: { mode: 'until', t: t0, bot: 'good' } })   // 早送りの間は上手く守る
  const v0 = rec.sec
  if (t1 === 'cry') await rec.run(tick, { max: 30 * 40, arg: { mode: 'result', n: 75, bot } })
  else await rec.run(tick, { max: 30 * 30, arg: { mode: 'until', t: t1, bot } })
  segs.push([t0, t1, v0, rec.sec])
}
await p.evaluate(() => {
  const c = document.createElement('div'); c.innerHTML = 'デート中のスマホ、<br>バレたら冷める'
  c.style.cssText = 'position:fixed;left:0;right:0;top:0;padding:28px 0 24px;background:rgba(20,12,10,.9);z-index:99998;text-align:center;font:700 40px "Zen Old Mincho",serif;line-height:1.3;color:#fff;-webkit-text-stroke:3px #1a1a1a;paint-order:stroke;text-shadow:0 5px 0 #1a1a1a;pointer-events:none'
  document.body.appendChild(c)
})
await rec.run(tick, { max: 45, arg: { mode: 'x', bot: 'idle' } })
const log = await p.evaluate(() => ({ rec: window.__film.rec, gains: window.__film.gains, notes: window.__film.notes }))
await b.close(); srv.close()

const dur = rec.sec
const wav = join(TMP, 'mix.wav'), out = join(OUT_DIR, `${SLUG}-x-1080x1920.mp4`)
mix({ rec: log.rec, gains: log.gains, dur, root: ROOT, out: wav })
encode({ frames: TMP, wav, out })
const info = inspect(out)
const st = stills(out, [0.5, ...segs.map(s => (s[2] + s[3]) / 2), dur - 0.6], join(TMP, 'still'))
writeFileSync(join(ROOT, 'promo/film-log.json'), JSON.stringify({ seed: SEED, cuts: CUTS, segs, info, notes: log.notes, errs, frames: TMP }, null, 1))
console.log(JSON.stringify({ out, info, segs, errs }, null, 1))
