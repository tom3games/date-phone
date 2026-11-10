import './mute-auto.mjs'
// bot の分布と単調さ。node sim.mjs [回数=12]
// 単調さ = 何も起きない（彼女が目をそらす・質問・料理・お手洗い・見て見て・プロポーズ・コースの切り替え・手が勝手に、のどれも無い）まま続いた最長秒数
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
const PORT = 5439
const server = spawn(process.execPath, [import.meta.dirname + '/server.mjs'], { cwd: import.meta.dirname, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const N = +(process.argv[2] || 12)
const b = await chromium.launch(), p = await b.newPage()
await p.goto(`http://localhost:${PORT}/?notut`); await p.waitForFunction(() => window.__dpReady)
const out = await p.evaluate(N => {
  const mono = r => { const ts = [0]; for (const [t, e] of r.events) if (/^new:|^seg:(away|waiter|q|restroom|gone|back|show|proposal|seal)/.test(e)) ts.push(t); ts.push(r.sec); ts.sort((a, b) => a - b); let g = 0; for (let i = 1; i < ts.length; i++) g = Math.max(g, ts[i] - ts[i - 1]); return g }
  const res = {}
  const bots = ['good', 'human', 'slow', 'never', 'addict', 'random', 'idle']
  for (const bot of bots) {
    const rs = []; for (let s = 1; s <= N; s++) rs.push(dp.sim(bot, s * 101, { events: true }))
    const avg = f => Math.round(rs.reduce((a, r) => a + f(r), 0) / N * 10) / 10
    const pts = rs.map(r => r.points)
    const v = {}; for (const r of rs) v[r.verdict] = (v[r.verdict] || 0) + 1
    res[bot] = { pts: avg(r => r.points), min: Math.min(...pts), max: Math.max(...pts), likes: avg(r => r.likes), temp: avg(r => r.temp), verdict: v, caught: avg(r => r.caught), grabs: avg(r => r.grabs), right: avg(r => r.right) + '/' + avg(r => r.asked), phone: avg(r => r.phoneSec), sec: avg(r => r.sec), mono: avg(mono), monoMax: Math.max(...rs.map(mono)) }
  }
  // 初めての1回（最初の30秒）で人の bot が見つからずにスマホを見られたか
  const first = []; for (let s = 1; s <= N; s++) { const r = dp.sim('human', s * 7 + 1, { events: true, learn: true }); const ev = r.events.filter(([t]) => t < 32); first.push({ ups: ev.filter(e => e[1] === 'up').length, clear: ev.filter(e => e[1] === 'clear').length, caught: ev.filter(e => e[1] === 'caught').length, firstQ: (r.qRes[0] || {}).res, verdict: r.verdict }) }
  res.firstScene = { upsAvg: first.reduce((a, f) => a + f.ups, 0) / N, clearAvg: first.reduce((a, f) => a + f.clear, 0) / N, caughtAvg: first.reduce((a, f) => a + f.caught, 0) / N, firstQRight: first.filter(f => f.firstQ === 'right').length + '/' + N, verdicts: first.map(f => f.verdict).join(',') }
  return res
}, N)
for (const k in out) console.log(k.padEnd(10), JSON.stringify(out[k]))
await b.close(); server.kill()
