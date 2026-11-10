// デート中のスマホ、バレたら冷める。本体
// 遊び: 19:00〜21:00 のディナー（約2分）。彼女が目をそらした隙にスマホを開き、通知をタップで片づけていいねを集める。
// 見られている時に画面を見ているとろうそく（彼女の気分）が消えていく。スマホを見ていた間の話は聞こえず、あとで聞かれる。
// 通知をためすぎると手が勝手にスマホをつかむ。仕様の正本は ~/Desktop/claudecode/ideas/date-phone.md。文言は data.js
import * as THREE from 'three'
import { setupLook, surfaceTex, look, createFx } from './look.js?v=1'
window.__jsUp = true
const DP = window.DP
const $ = id => document.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, k) => a + (b - a) * k
const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} } }
const params = new URLSearchParams(location.search)
let lang = params.get('lang') || store.get('dp_lang') || ((navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en')
const L = p => p ? p[lang === 'en' ? 1 : 0] : ''
const T = k => L(DP.T[k])
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
let SIM = false

// ============================================================ 音（全部録音素材。CREDITS.md）
const S_ = n => 'snd/' + n + '.mp3'
Snd.def({
  notif: [S_('notif1'), S_('notif2'), S_('notif3')], buzz: [S_('buzz1'), S_('buzz2'), S_('buzz3')], shutter: S_('shutter'),
  cut: [S_('cut1'), S_('cut2'), S_('cut3')], dish: [S_('dish1'), S_('dish2')], clink: [S_('clink1'), S_('clink2')],
  step: [S_('step1'), S_('step2')], applause: S_('applause'), giggle: S_('giggle'), cloth: S_('cloth'), paper: S_('paper'), click: S_('click'),
  j_good: S_('j_good'), j_mid: S_('j_mid'), j_bad: S_('j_bad'), j_buzz: S_('j_buzz'),
})
// 確認用の ?auto= と ?mute は必ず無音（シミュレーターで撮る時に鳴らさない）
let muted = store.get('dp_mute') === '1' || params.has('auto') || params.has('mute')
Snd.setMute(muted)
function sfx(name, o) { if (!SIM) Snd.play(name, o) }

// ============================================================ 3D のレストラン（夜・窓ぎわの2人席）
const canvas = $('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1))
const scene = new THREE.Scene()
scene.background = new THREE.Color('#1a1210')
const camera = new THREE.PerspectiveCamera(60, 1, 0.05, 30)
setupLook(renderer, scene, { exposure: 1.0, sun: 0.35, sunPos: [1, 3, 1], target: [0, 0.7, -0.5], hemi: 0.45, fill: 0.15 })
const fx = createFx(scene, camera, renderer)
const texLoader = new THREE.TextureLoader()
const TEX = {}
const PAPERS = []
function tex(name) {
  if (TEX[name]) return TEX[name]
  const t = texLoader.load('img/' + name + '.webp', tt => { tt.userData.ok = true; for (const m of PAPERS) if (m.userData.tex === name) fitPaper(m) })
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX[name] = t; return t
}
// 切り絵（足元＝切れ目が原点。高さ h、縦横比は画像から）
function paper(name, h, o = {}) {
  const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0)
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex(name), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, toneMapped: false, color: o.tint || '#ffffff' }))
  m.userData = { tex: name, h, flip: false, face: o.face !== false }; PAPERS.push(m); fitPaper(m); (o.parent || scene).add(m); return m
}
function fitPaper(m) { const t = TEX[m.userData.tex], img = t && t.image; const a = img && img.width ? img.width / img.height : 0.7; m.scale.set(m.userData.h * a * (m.userData.flip ? -1 : 1), m.userData.h, 1) }
function setPaper(m, name, h) { if (h) m.userData.h = h; if (m.userData.tex !== name) { m.userData.tex = name; m.material.map = tex(name); m.material.needsUpdate = true } fitPaper(m) }
function plane(w, h, mat, pos, rot, parent = scene) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); if (rot) m.rotation.set(...rot); parent.add(m); return m }
function box(w, h, d, mat, pos, parent = scene) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(...pos); parent.add(m); return m }
function cyl(rt, rb, h, mat, pos, seg = 28, parent = scene) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(...pos); parent.add(m); return m }
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.85, metalness: o.m ?? 0, ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}), ...(o.map ? { map: o.map } : {}), ...(o.tr ? { transparent: true, opacity: o.tr } : {}) })
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.userData.c = c; return t }

const TOP = 0.74   // テーブルの天板の高さ
// 床（濃い木）
const floorTex = surfaceTex({ w: 512, h: 512, base: '#4a3022', repeat: [3, 5], grime: 0.08, noise: 0.05, draw(x, w, h, r) {
  for (let i = 0; i < 6; i++) { x.fillStyle = `rgba(${30 + r() * 30},${18 + r() * 14},10,${0.18 + r() * 0.12})`; x.fillRect(i * w / 6, 0, w / 6 - 2, h); x.fillStyle = 'rgba(10,6,4,.5)'; x.fillRect(i * w / 6 - 1, 0, 2, h) }
} })
plane(6, 7, std('#ffffff', { map: floorTex, r: 0.55 }), [0, 0, -1.2], [-Math.PI / 2, 0, 0])
// 奥の壁: 大きな窓（夜景）と、腰の高さの羽目板
const wallTex = surfaceTex({ w: 256, h: 256, base: '#5b3a2c', repeat: [4, 2], grime: 0.1, noise: 0.04 })
const matWall = std('#ffffff', { map: wallTex, r: 0.95 })
const WZ = -2.7
plane(1.0, 3, matWall, [-1.75, 1.5, WZ]); plane(1.0, 3, matWall, [1.75, 1.5, WZ])
plane(2.5, 0.85, std('#3b2418', { r: 0.6 }), [0, 0.425, WZ])
plane(2.5, 0.6, matWall, [0, 2.7, WZ])
const nightTex = canvasTex(1024, 512, (x, w, h) => {
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b1230'); g.addColorStop(0.55, '#1d2450'); g.addColorStop(1, '#3a2c48'); x.fillStyle = g; x.fillRect(0, 0, w, h)
  const r = mulberry(7)
  for (let i = 0; i < 26; i++) { const bw = 30 + r() * 70, bh = 120 + r() * 300, bx = r() * w, by = h - bh; x.fillStyle = `rgb(${14 + r() * 14},${16 + r() * 16},${34 + r() * 20})`; x.fillRect(bx, by, bw, bh)
    for (let k = 0; k < bh / 14; k++) for (let j = 0; j < bw / 12; j++) if (r() < 0.35) { x.fillStyle = r() < 0.7 ? 'rgba(255,214,140,.85)' : 'rgba(180,220,255,.7)'; x.fillRect(bx + 3 + j * 12, by + 6 + k * 14, 5, 6) } }
  // ぼけた灯り
  for (let i = 0; i < 60; i++) { const bx = r() * w, by = h * (0.45 + r() * 0.55), rr = 8 + r() * 26; const gg = x.createRadialGradient(bx, by, 0, bx, by, rr); const c = r() < 0.6 ? '255,190,110' : r() < 0.5 ? '255,120,120' : '160,200,255'; gg.addColorStop(0, `rgba(${c},.55)`); gg.addColorStop(1, `rgba(${c},0)`); x.fillStyle = gg; x.fillRect(bx - rr, by - rr, rr * 2, rr * 2) }
})
plane(2.5, 1.55, new THREE.MeshBasicMaterial({ map: nightTex, toneMapped: false, color: '#c8c8d8' }), [0, 1.62, WZ - 0.02])
const frameM = std('#2a1a12', { r: 0.5 })
for (const fx0 of [-1.25, -0.42, 0.42, 1.25]) box(0.05, 1.6, 0.06, frameM, [fx0, 1.62, WZ])
box(2.6, 0.06, 0.08, frameM, [0, 0.85, WZ]); box(2.6, 0.06, 0.08, frameM, [0, 2.4, WZ])
// 横の壁
plane(7, 3, matWall, [-2.2, 1.5, -0.8], [0, Math.PI / 2, 0]); plane(7, 3, matWall, [2.2, 1.5, -0.8], [0, -Math.PI / 2, 0])
// 奥のカウンター（店員がスマホを見る場所）
box(1.2, 1.0, 0.4, std('#3a2216', { r: 0.5 }), [-1.45, 0.5, -2.15]); box(1.3, 0.05, 0.5, std('#6b4a32', { r: 0.35 }), [-1.45, 1.02, -2.15])
const waiterBack = paper('w_phone', 1.0); waiterBack.position.set(-1.5, 0.62, -2.42); waiterBack.visible = false
// まわりの席（ぼかした人影）
const silTex = canvasTex(256, 256, (x, w, h) => {
  x.filter = 'blur(6px)'; x.fillStyle = 'rgba(20,12,10,.92)'
  x.beginPath(); x.ellipse(128, 70, 40, 46, 0, 0, 7); x.fill(); x.beginPath(); x.ellipse(128, 200, 82, 80, 0, Math.PI, 0); x.fill(); x.fillRect(46, 200, 164, 56)
  x.filter = 'none'
})
const silM = new THREE.MeshBasicMaterial({ map: silTex, transparent: true, depthWrite: false, toneMapped: false })
const tableM = std('#efe8dc', { r: 0.9 })
for (const [tx, tz, n] of [[-1.35, -1.45, 2], [1.35, -1.75, 1], [-0.75, -2.2, 2]]) {
  cyl(0.38, 0.38, 0.03, tableM, [tx, TOP, tz]); cyl(0.38, 0.32, 0.26, tableM, [tx, TOP - 0.14, tz], 28)
  const c = cyl(0.04, 0.04, 0.06, std('#fff', { e: '#ffb35a', ei: 0.9 }), [tx, TOP + 0.04, tz], 10)
  for (let i = 0; i < n; i++) { const s = plane(0.55, 0.55, silM, [tx + (n === 2 ? (i ? 0.38 : -0.38) : 0.35), TOP - 0.1, tz + (i ? 0.1 : -0.1)]); s.userData.sil = true }
}
// 吊りランプ（自分の席と奥）
const lampM = std('#d9a65a', { m: 0.6, r: 0.35, e: '#ffcf8a', ei: 0.35 })
for (const [lx, lz] of [[0, -0.45], [-1.35, -1.45], [1.35, -1.75]]) {
  const sh = cyl(0.05, 0.16, 0.14, lampM, [lx, 1.95, lz], 24); sh.material.side = THREE.DoubleSide
  box(0.006, 0.9, 0.006, std('#222'), [lx, 2.45, lz])
  const pl = new THREE.PointLight('#ffc98a', lx === 0 ? 0.9 : 0.8, lx === 0 ? 2.6 : 2.2, 1.6); pl.position.set(lx, 1.85, lz); scene.add(pl)
}
// 自分たちのテーブル（白いクロス）
const clothTex = surfaceTex({ w: 256, h: 256, base: '#f4efe6', repeat: [1, 1], grime: 0.03, noise: 0.03, draw(x, w, h) { x.strokeStyle = 'rgba(160,140,120,.25)'; x.lineWidth = 2; for (let i = 0; i < 8; i++) { x.beginPath(); x.moveTo(0, i * 32 + 16); x.lineTo(w, i * 32 + 16); x.stroke() } } })
const clothM = std('#ffffff', { map: clothTex, r: 0.95 })
box(0.96, 0.02, 1.12, clothM, [0, TOP - 0.01, -0.12])
box(0.96, 0.3, 0.01, clothM, [0, TOP - 0.16, 0.44])
box(0.01, 0.3, 1.12, clothM, [-0.48, TOP - 0.16, -0.12]); box(0.01, 0.3, 1.12, clothM, [0.48, TOP - 0.16, -0.12])
// 彼女の椅子の背
const chairM = std('#5a3522', { r: 0.6 })
box(0.5, 0.62, 0.05, chairM, [0, 1.0, -1.02]); box(0.06, 1.3, 0.06, chairM, [-0.24, 0.65, -1.02]); box(0.06, 1.3, 0.06, chairM, [0.24, 0.65, -1.02])
// 彼女（切り絵。腰の切れ目はテーブルの奥の縁に隠れる）
const HER = { x: 0, y: 0.5, z: -0.82, h: 1.0 }
const H_SCALE = { h_eat: 1.06, h_startle: 1.12, h_smitten: 1.06, h_leave: 1.06, h_show: 1.0 }
const her = paper('h_talk', HER.h); her.position.set(HER.x, HER.y, HER.z)
// 店員（彼女の右うしろに立つ）
const waiter = paper('w_tray', 1.0); waiter.position.set(0.4, 0.55, -1.05); waiter.visible = false
// プロポーズする人（右奥の席）
const proposer = paper('propose', 0.6); proposer.position.set(0.78, 0, -1.7); proposer.visible = false
// 皿と料理
const plateM = std('#fbfbf8', { r: 0.3 })
const myPlate = cyl(0.13, 0.11, 0.012, plateM, [0, TOP + 0.006, 0.14], 32)
const herPlate = cyl(0.13, 0.11, 0.012, plateM, [0, TOP + 0.006, -0.42], 32)
const myFood = paper('d_soup', 0.16); myFood.position.set(-0.02, TOP + 0.01, 0.1); myFood.visible = false
const herFood = paper('d_soup', 0.16); herFood.position.set(0, TOP + 0.01, -0.44); herFood.visible = false
// グラス
function wineGlass(x, z, wine) {
  const g = new THREE.Group(); g.position.set(x, TOP, z); scene.add(g)
  const glassM = new THREE.MeshStandardMaterial({ color: '#dfe8ee', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 })
  cyl(0.035, 0.035, 0.004, glassM, [0, 0.002, 0], 16, g); cyl(0.004, 0.004, 0.09, glassM, [0, 0.05, 0], 8, g)
  cyl(0.04, 0.025, 0.09, glassM, [0, 0.14, 0], 18, g)
  if (wine) cyl(0.034, 0.025, 0.04, std('#7a1424', { r: 0.2, tr: 0.85 }), [0, 0.115, 0], 18, g)
  return g
}
wineGlass(-0.3, 0.0, true); wineGlass(0.22, -0.4, true)
// フォークとナイフ
const silverM = std('#c8c8c8', { m: 0.8, r: 0.3 })
box(0.012, 0.004, 0.17, silverM, [-0.17, TOP + 0.003, 0.12]); box(0.014, 0.004, 0.19, silverM, [0.1, TOP + 0.003, 0.05])
// ろうそく（彼女の気分）。炎の大きさ・明るさ・色が気分そのもの
const candle = new THREE.Group(); candle.position.set(-0.16, TOP, -0.16); scene.add(candle)
cyl(0.045, 0.05, 0.035, new THREE.MeshStandardMaterial({ color: '#c9a35a', roughness: 0.3, metalness: 0.5 }), [0, 0.018, 0], 20, candle)
const wax = cyl(0.026, 0.026, 0.12, std('#f6efe0', { r: 0.6, e: '#ffcf8a', ei: 0.12 }), [0, 0.095, 0], 18, candle)
const flameTex = canvasTex(64, 128, (x, w, h) => {
  const g = x.createRadialGradient(32, 84, 2, 32, 76, 46); g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(0.25, 'rgba(255,214,120,.95)'); g.addColorStop(0.6, 'rgba(255,130,40,.5)'); g.addColorStop(1, 'rgba(255,90,20,0)')
  x.fillStyle = g; x.beginPath(); x.moveTo(32, 6); x.bezierCurveTo(56, 52, 54, 120, 32, 122); x.bezierCurveTo(10, 120, 8, 52, 32, 6); x.fill()
})
const flameM = new THREE.SpriteMaterial({ map: flameTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
const flame = new THREE.Sprite(flameM); flame.center.set(0.5, 0.05); candle.add(flame)
const glowM = new THREE.SpriteMaterial({ map: canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,190,110,.55)'); g.addColorStop(1, 'rgba(255,160,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64) }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })
const glow = new THREE.Sprite(glowM); candle.add(glow)
const candleLight = new THREE.PointLight('#ffb060', 1.2, 2.4, 1.5); candleLight.position.set(0, 0.25, 0); candle.add(candleLight)
const smokeM = new THREE.SpriteMaterial({ map: canvasTex(32, 64, (x) => { x.strokeStyle = 'rgba(220,220,230,.6)'; x.lineWidth = 3; x.beginPath(); x.moveTo(16, 62); x.bezierCurveTo(4, 44, 28, 28, 14, 2); x.stroke() }), transparent: true, depthWrite: false, opacity: 0 })
const smoke = new THREE.Sprite(smokeM); smoke.center.set(0.5, 0); smoke.scale.set(0.05, 0.12, 1); smoke.position.set(0, 0.16, 0); candle.add(smoke)
// 伏せたスマホ（右手前）。通知が来ると縁が光って震える
const PHONE_POS = new THREE.Vector3(0.2, TOP + 0.006, 0.2)
const phone3 = new THREE.Group(); phone3.position.copy(PHONE_POS); phone3.rotation.y = -0.18; scene.add(phone3)
box(0.075, 0.009, 0.152, std('#2b2d33', { r: 0.35, m: 0.3 }), [0, 0.0045, 0], phone3)
box(0.026, 0.004, 0.03, std('#15161a', { r: 0.3 }), [-0.018, 0.011, -0.052], phone3)
const phoneGlowM = new THREE.MeshBasicMaterial({ map: canvasTex(64, 128, (x) => { const g = x.createRadialGradient(32, 64, 10, 32, 64, 64); g.addColorStop(0, 'rgba(150,200,255,.9)'); g.addColorStop(1, 'rgba(150,200,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 128) }), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false })
plane(0.12, 0.2, phoneGlowM, [0, 0.001, 0], [-Math.PI / 2, 0, 0], phone3)

// ---- カメラ（向かいに座っている自分の目。縦長ほど画角を広げる。遊びの最中は動かさない）
const CAM = { p: new THREE.Vector3(0, 1.2, 0.8), t: new THREE.Vector3(0, 0.86, -0.6) }
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h
  renderer.setSize(w, h, false); camera.aspect = a
  const hf = 44 * Math.PI / 180
  camera.fov = clamp(2 * Math.atan(Math.tan(hf / 2) / a) * 180 / Math.PI, 46, 86)
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()

// ============================================================ 遊びの状態（sim でも同じ処理を回す）
const TUT_KEY = 'dp_tut1'
const UMAX = 8          // 未読がこれだけたまると手が勝手につかむ
const GRACE = 0.5       // こっちを見てから、画面を見ていると気づかれるまで
const TURN = 1.1        // 振り向く前のちらっ（予告）
const COURSES = 4
const G = { mode: 'boot', t: 0, clock: 0, texts: { bubble: null, hint: null }, paused: false, speed: 1, playNo: 0, food: { me: null, her: null }, temp: 72, likes: 0, unread: [], phoneSec: [0, 0, 0, 0], course: 0, herImg: 'h_talk', look: 'you' }
let rng = mulberry(1)
const rnd = (a, b) => a + (b - a) * rng()
const pick = a => a[Math.floor(rng() * a.length)]
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] } return a }
const dur = s => Math.max(1.5, 0.95 + s.length * (lang === 'en' ? 0.05 : 0.1))

// ---- 彼女の台本: 区間の列。区間は {k, d, img, look, line, ...}。look: you=こっちを見る / away=見ていない / turn=振り向く途中 / gone=いない
function buildScript(learn) {
  const S = []
  const add = (k, o) => { S.push({ k, ...o }); return S[S.length - 1] }
  const talk = (lines, o = {}) => { for (let i = 0; i < lines.length; i++) add('talk', { img: o.img || (i % 2 ? 'h_talk' : 'h_talk'), look: 'you', line: lines[i], fact: i === (o.factAt ?? lines.length - 1) ? o.fact : null, d: dur(lines[i]) + 0.35 }) }
  const away = (img, d, line) => add('away', { img, look: 'away', d, line })
  const course = n => add('course', { n, d: 0 })
  const tp = shuffle(Object.keys(DP.TOPICS)).slice(0, 4)
  G.topics = tp
  G.name = pick(DP.NAMES)
  const fill = (k, x) => { const tpc = DP.TOPICS[k]; G.ans[k] = x; return tpc.say.map(p => L(p).replace('{x}', L(x))) }
  for (const k of tp) G.ans[k] = pick(DP.TOPICS[k].pool)
  G.ans.name = G.name
  const say = k => fill(k, G.ans[k])
  // 1. 前菜（19:00〜）
  course(0)
  talk(DP.LINES.hello.map(p => L(p).replace('{name}', L(G.name))), { fact: 'name', factAt: 0 })
  add('waiter', { img: 'h_window', look: 'away', d: learn ? 4.6 : 3.4, dish: 'd_soup', line: L(pick(DP.LINES.waiter)) })
  talk(say(tp[0]), { fact: tp[0] })
  away('h_menu', learn ? 5.5 : rnd(3.6, 4.6), L(pick(DP.LINES.menu)))
  talk([L(DP.LINES.small[0])])
  talk(say(tp[1]), { fact: tp[1] })
  add('q', { topic: tp[0], img: 'h_talk', look: 'you' })
  // 2. メイン（19:30〜）
  course(1)
  add('waiter', { img: 'h_window', look: 'away', d: 3.2, dish: 'd_steak', line: L(pick(DP.LINES.dish)), photo: 1 })
  away('h_eat', rnd(2.6, 3.4), L(pick(DP.LINES.eat)))
  talk([L(pick(DP.LINES.small.slice(1)))])
  add('restroom', { img: 'h_talk', look: 'you', line: L(DP.LINES.restroom[0]), d: 2.2 })
  const early = rng() < 0.35
  if (early) { add('gone', { look: 'gone', d: 3.2 }); add('back', { img: 'h_glance', look: 'turn', d: TURN }); add('talk', { img: 'h_talk', look: 'you', line: L(DP.LINES.backEarly[0]), d: 2.0 }); add('gone', { look: 'gone', d: 3.4 }) }
  else add('gone', { look: 'gone', d: rnd(6.4, 7.6) })
  add('back', { img: 'h_glance', look: 'turn', d: TURN })
  talk([L(DP.LINES.back[0])])
  away('h_eat', rnd(2.2, 2.8), L(pick(DP.LINES.eat)))
  talk(say(tp[2]), { fact: tp[2] })
  away('h_window', rnd(3.0, 4.0), L(pick(DP.LINES.window)))
  add('q', { topic: tp[1], img: 'h_talk', look: 'you' })
  // 3. デザート（20:00〜）: 彼女もスマホを見る・見て見て・隣の席のプロポーズ
  course(2)
  add('waiter', { img: 'h_window', look: 'away', d: 3.0, dish: 'd_parfait', line: L(DP.LINES.waiter[1]), photo: 1 })
  away('h_phone', rnd(3.4, 4.4), L(pick(DP.LINES.ownphone)))
  add('show', { img: 'h_show', look: 'you', line: L(DP.LINES.showme[0]), d: 2.8 })
  talk(say(tp[3]), { fact: tp[3] })
  if (rng() < 0.6) add('proposal', { img: 'h_window', look: 'away', d: 5.0, line: L(DP.LINES.proposal[0]) })
  else { away('h_eat', rnd(3, 3.8), L(pick(DP.LINES.eat))); G.noProposal = true }
  add('q', { topic: tp[2], img: 'h_talk', look: 'you' })
  away('h_phone', rnd(2.8, 3.6), L(DP.LINES.ownphone[1]))
  // 4. お会計（20:30〜）: ずっとこっちを見る。通知は一番多い
  course(3)
  talk([L(pick(DP.LINES.small.slice(2)))])
  add('q', { topic: tp[3], img: 'h_talk', look: 'you' })
  add('waiter', { img: 'h_window', look: 'away', d: 3.2, check: 1, line: L(DP.LINES.check[0]) })
  add('seal', { img: 'h_talk', look: 'you', line: L(DP.LINES.seal[0]), d: 7.5 })
  talk([L(DP.LINES.small[4])])
  add('q', { topic: 'name', img: 'h_talk', look: 'you', line: L(DP.LINES.nameQ[0]) })
  add('end', { img: 'h_talk', look: 'you', d: 3.2 })
  // 目をそらしていた区間から、こっちを見る区間に戻る前には必ず「ちらっ」を挟む
  const out = []
  for (let i = 0; i < S.length; i++) {
    const s = S[i]; out.push(s)
    const nx = S.slice(i + 1).find(z => z.k !== 'course')
    if ((s.look === 'away') && nx && nx.look === 'you') out.push({ k: 'turn', img: 'h_glance', look: 'turn', d: TURN })
  }
  return out
}

function newGame(seed, learn = false) {
  G.seed = seed; rng = mulberry(seed)
  G.t = 0; G.mode = 'play'; G.over = null; G.endT = 0
  G.temp = 72; G.likes = 0; G.up = false; G.upT = 0; G.forceT = 0; G.watchT = 0; G.caughtN = 0; G.grabN = 0
  G.unread = []; G.cardId = 0; G.nextNotif = 2.2; G.viral = []; G.seenDecoy = {}; G.decoyCard = {}; G.heard = {}; G.hearT = {}; G.ans = {}
  G.phoneSec = [0, 0, 0, 0]; G.course = 0; G.courseAt = [0, 0, 0, 0]; G.dish = null; G.photos = 0; G.photoSeen = 0
  G.qRes = []; G.q = null; G.react = null; G.events = []; G.hist = []; G.cleared = 0; G.noProposal = false
  // 前の回の残り（あとで起きること・演出の旗）を必ず消す
  G.later = []; G.goneBurst = false; G.showChecked = false; G.sealing = false; G.sealBroke = false; G.grabAt = null; G.leftGone = false
  G.learn = learn ? { t: 0, shown: null, done: {}, firstCaught: false } : null
  G.script = buildScript(learn); G.si = -1; G.segT = 0; G.seg = null
  G.herImg = 'h_talk'; G.look = 'you'; G.waiterOn = false; G.waiterImg = 'w_tray'; G.proposeOn = false; G.backWaiter = false
  G.food = { me: null, her: null }
  G.texts = { bubble: null, hint: null }
  nextSeg()
}
function ev(e) { if (G.events.length < 800) G.events.push([Math.round(G.t * 10) / 10, e]) }
const courseNo = () => G.course

// ---- 区間を進める
function nextSeg() {
  G.si++; G.segT = 0
  const s = G.seg = G.script[G.si]
  if (!s) return
  if (s.k === 'course') { G.course = s.n; G.courseAt[s.n] = G.t; ev('new:course' + s.n); if (s.n && !SIM) courseBanner(s.n); return nextSeg() }
  ev('seg:' + s.k)
  G.look = s.look || 'you'
  if (s.img) G.herImg = s.img
  if (s.line) sayHer(s.line, s.fact ? 'fact' : '')
  if (s.fact) G.hearT[s.fact] = 0
  if (s.k === 'talk' && s.fact && s.fact !== 'name') scheduleDecoy(s.fact)
  if (s.k === 'waiter') {
    G.waiterOn = true; G.waiterImg = 'w_tray'; sfx('step', { vol: 0.5 })
  }
  if (s.k === 'restroom') { /* 言ってから立つ */ }
  if (s.k === 'gone') { G.herImg = null; if (!G.goneBurst) { G.goneBurst = true; for (let i = 0; i < 3; i++) setLater(0.5 + i * 0.7, () => notify()) } ev('new:gone') }
  if (s.k === 'back') { sfx('step', { vol: 0.7 }); setLater(0.45, () => sfx('step', { vol: 0.8 })) }
  if (s.k === 'show') { G.showChecked = false; ev('new:show') }
  if (s.k === 'proposal') { G.proposeOn = true; ev('new:proposal'); sfx('applause', { vol: 0.55 }); for (let i = 0; i < 2; i++) setLater(0.8 + i * 1.1, () => notify({ prop: i })) }
  if (s.k === 'q') startQ(s)
  if (s.k === 'seal') { G.sealing = true; G.sealBroke = false; G.nextNotif = 1.0; ev('new:seal') }
  if (s.k === 'end') finishDate()
}
function setLater(sec, f) { (G.later = G.later || []).push({ at: G.t + sec, f }) }

// ---- 彼女の話: スマホを見ている間に出た話は聞こえない（吹き出しは「ごにょごにょ」）
function hearStep(dt) {
  const s = G.seg
  if (!s || !s.fact || s.k !== 'talk') return
  if (!G.up && !G.react) { G.hearT[s.fact] = (G.hearT[s.fact] || 0) + dt; if (G.hearT[s.fact] > 0.7) G.heard[s.fact] = true }
}

// ---- 通知
function cardFrom(o) {
  const id = ++G.cardId
  return { id, user: o.user, text: o.text, img: o.img || '', n: o.n || 0, gold: !!o.gold, mom: !!o.mom, sys: !!o.sys, decoy: o.decoy || null, born: G.t }
}
const unreadN = () => G.unread.reduce((a, c) => a + (c.glance ? 0 : 1), 0)
function notify(o = {}) {
  if (G.over) return
  let c
  if (o.decoy) c = o.decoy
  else if (o.viral) { const v = DP.VIRAL[Math.floor(rng() * DP.VIRAL.length)]; const n = Math.round(rnd(14, 34) * (1 + G.course * 0.25)); c = cardFrom({ user: DP.T.app, text: [v[0].replace('{n}', n), v[1].replace('{n}', n)], n, gold: true }) }
  else if (o.prop != null) { const v = DP.PROPOSAL_FEED[o.prop % 2]; const n = Math.round(rnd(6, 14)); c = cardFrom({ user: DP.T.app, text: [v[0].replace('{n}', n), v[1].replace('{n}', n)], n, sys: true }) }
  else {
    let f; do { f = DP.FEED[Math.floor(rng() * DP.FEED.length)] } while (G.unread.some(c => c.text === f.text) && rng() < 0.9)
    const base = f.n ? Math.round(f.n * rnd(2.2, 3.6) * (1 + G.course * 0.3)) : 0
    c = cardFrom({ ...f, n: base })
  }
  G.unread.push(c); ev('notif:' + (c.gold ? 'gold' : c.decoy ? 'decoy' : 'n'))
  if (!SIM) { sfx(G.up ? 'notif' : 'buzz', { vol: G.up ? 0.4 : 0.55 }); buzzT = 0.45 }
  if (unreadN() >= UMAX && !G.up) autoGrab()
}
// 話題を言った後、まぎらわしい投稿がスマホに流れてくる
function scheduleDecoy(k) {
  if (G.decoyCard[k]) return
  const tpc = DP.TOPICS[k], d = tpc.decoy[Math.floor(rng() * tpc.decoy.length)]
  G.decoyCard[k] = d
  const n = Math.round(rnd(3, 8) * (1 + G.course * 0.3))
  const c = cardFrom({ user: tpc.feed.user, text: [tpc.feed.text[0].replace('{d}', d[0]), tpc.feed.text[1].replace('{d}', d[1])], img: tpc.feed.img, n, decoy: k })
  setLater(rnd(1.5, 4.5), () => notify({ decoy: c }))
}
const notifGap = () => G.sealing ? rnd(1.0, 1.4) : [3.4, 2.5, 2.0, 1.5][G.course] * rnd(0.75, 1.25)

// ---- スマホを見る / 伏せる / 手が勝手に
function pickUp(forced = false) {
  if (G.mode !== 'play' || G.over || G.up) return false
  G.up = true; G.upT = 0; if (!forced) G.forceT = 0
  ev(forced ? 'grab' : 'up'); sfx('cloth', { vol: 0.35 })
  markSeen()
  return true
}
function putDown() {
  if (!G.up || G.forceT > 0) return false
  G.up = false; G.unread = G.unread.filter(c => !c.glance); ev('down'); sfx('cloth', { vol: 0.3, rate: 1.2 })
  return true
}
function autoGrab() {
  G.grabN++; G.forceT = 1.0; G.grabAt = G.t; pickUp(true); ev('new:grab')
  // つかんだ瞬間に全部目に入る。あわてて見ただけなので、いいねは数えない（伏せると消える）
  for (const c of G.unread) { c.glance = true; c.n = 0; if (c.decoy) G.seenDecoy[c.decoy] = true }
  if (!SIM) { hint(T('grab'), 'warn', 1.6); fx.shake && fx.shake(0.15) }
}
function markSeen() { for (const c of G.unread) if (c.decoy) G.seenDecoy[c.decoy] = true }
function tapCard(id) {
  if (!G.up || G.over) return false
  const i = id == null ? 0 : G.unread.findIndex(c => c.id === id)
  if (i < 0 || !G.unread[i]) return false
  const c = G.unread.splice(i, 1)[0]
  G.likes += c.n; G.cleared++; ev('clear')
  if (!SIM) { sfx('click', { vol: 0.25, rate: 1 + Math.min(0.4, G.cleared % 6 * 0.06) }); popLike(c.n, c.gold) }
  return true
}
// 料理を撮って載せる（シャッター音は彼女に聞こえる）
function shoot() {
  if (!G.up || !G.dish || G.over) return false
  const d = G.dish; G.dish = null; G.photos++
  sfx('shutter', { vol: 0.9 }); if (!SIM) flash(0.6)
  ev('photo')
  G.likes += 20
  for (let i = 0; i < 5; i++) setLater(1.2 + i * 1.4, () => notify({ viral: 1 }))
  if (G.look === 'you' || G.look === 'turn') { G.photoSeen++; react('h_startle', L(DP.LINES.photoSeen[0]), 1.8); hurt(10, 'photo') }
  return d
}

// ---- 気分（ろうそく）
function hurt(v, why) {
  if (G.learn && G.t < 30 && why === 'caught' && !G.learn.firstCaught) { G.learn.firstCaught = true; return }
  G.temp = clamp(G.temp - v, 0, 100); if (why !== 'stare') ev('hurt:' + why)
  if (G.temp <= 0 && !G.over) leave()
}
function warm(v) { G.temp = clamp(G.temp + v, 0, 100) }
function react(img, line, d, cls) { G.react = { img, until: G.t + d }; if (line) sayHer(line, cls || '') }

// ---- 質問（答えの候補: 正解・まぎらわしい投稿の答え・ほかの1つ）
function startQ(s) {
  const k = s.topic
  const right = G.ans[k]
  let decoy, other
  if (k === 'name') { decoy = DP.NAME_DECOY[Math.floor(rng() * DP.NAME_DECOY.length)]; other = pick(DP.NAMES.filter(n => n !== right)) }
  else { decoy = G.decoyCard[k] || DP.TOPICS[k].decoy[0]; other = pick(DP.TOPICS[k].pool.filter(n => n !== right)) }
  const opts = shuffle([{ v: right, kind: 'right' }, { v: decoy, kind: 'decoy' }, { v: other, kind: 'other' }])
  G.q = { topic: k, opts, t: 0, limit: G.learn && G.t < 40 ? 9 : 7, answered: false }
  sayHer(s.line || L(k === 'name' ? DP.LINES.nameQ[0] : DP.TOPICS[k].q), 'q', 99)
  ev('new:q')
}
function answer(i) {
  const q = G.q
  if (!q || q.answered || G.up || G.over) return false
  const o = q.opts[i]; if (!o) return false
  q.answered = true; G.q = null
  const seenFeed = k => k === 'name' ? G.cleared > 0 : !!G.seenDecoy[k]
  let res
  if (o.kind === 'right') { res = 'right'; warm(9); react('h_laugh', L(pick(DP.LINES.right)), 1.7); sfx('clink', { vol: 0.4 }) }
  else if (o.kind === 'decoy' && seenFeed(q.topic)) { res = 'feed'; hurt(15, 'feed'); react('h_jito', L(pick(DP.LINES.feedWrong)), 2.2, 'cold'); if (!SIM) cutin('h_jito') }
  else { res = 'wrong'; hurt(11, 'wrong'); react('h_jito', L(pick(DP.LINES.wrong)), 1.9, 'cold') }
  G.qRes.push({ topic: q.topic, res, heard: !!G.heard[q.topic] }); ev('ans:' + res)
  return res
}
function qTimeout() {
  const q = G.q; q.answered = true; G.q = null
  hurt(12, 'noans'); react('h_jito', L(DP.LINES.noAnswer[0]), 1.9, 'cold')
  G.qRes.push({ topic: q.topic, res: 'none', heard: !!G.heard[q.topic] }); ev('ans:none')
}

// ---- 1コマ
function stepGame(dt) {
  if (G.mode !== 'play') return
  if (G.over) { G.endT += dt; return }
  G.t += dt
  if (G.learn) G.learn.t += dt
  // あとで起きること
  if (G.later && G.later.length) { const now = G.later.filter(l => l.at <= G.t); G.later = G.later.filter(l => l.at > G.t); for (const l of now) l.f() }
  // 通知
  G.nextNotif -= dt
  if (G.nextNotif <= 0) { notify(); G.nextNotif = notifGap() }
  // スマホ
  if (G.up) { G.upT += dt; G.phoneSec[G.course] += dt; if (G.forceT > 0) G.forceT -= dt; markSeen() }
  // 料理が来てから9秒は撮れる
  if (G.dish && G.t > G.dish.until) G.dish = null
  // 彼女の反応（怒る・笑う）の間は台本を止める
  if (G.react) { if (G.t >= G.react.until) G.react = null }
  const look = G.react ? 'you' : G.look
  // 見られている
  if (G.up && look === 'you') {
    G.watchT += dt
    if (G.watchT > GRACE && !(G.react && G.react.caught)) caught()
    else if (G.react && G.react.caught) hurt(dt * 3, 'stare')
  } else G.watchT = 0
  // 見て見て: 出して1.4秒の時点でスマホを見ていたら
  const s = G.seg
  if (s && s.k === 'show' && !G.showChecked && G.segT > 1.4 && !G.react) {
    G.showChecked = true
    if (G.up) { hurt(10, 'show'); react('h_jito', L(DP.LINES.showNg[0]), 1.8, 'cold') }
    else { warm(4); react('h_laugh', L(DP.LINES.showOk[0]), 1.4) }
  }
  // スマホ封印: 最後まで見なかったら喜ぶ
  if (s && s.k === 'seal' && G.segT >= s.d - 0.05 && !G.react && G.sealing) { G.sealing = false; if (!G.sealBroke) { warm(12); react('h_smitten', L(DP.LINES.sealOk[0]), 1.8); ev('seal:ok'); sfx('clink', { vol: 0.5 }) } else ev('seal:ng') }
  // 質問の時間
  if (G.q && !G.react) { G.q.t += dt; if (G.q.t >= G.q.limit) qTimeout() }
  hearStep(dt)
  // 気分は話を聞いているだけで少しずつ戻る
  if (!G.up && look === 'you' && s && s.k === 'talk') warm(dt * 1.0)
  // 台本
  if (!G.react && !G.q && s) {
    G.segT += dt
    if (s.k === 'waiter' && !s.served && G.segT > 1.0) { s.served = true; serve(s) }
    if (s.k === 'waiter' && G.segT > s.d - 0.4) G.waiterOn = false
    if (G.segT >= (s.d || 0) && s.k !== 'q' && s.k !== 'end') nextSeg()
    else if (s.k === 'q' && G.q == null) nextSeg()
  }
  if (Math.floor(G.t) > G.hist.length - 1) G.hist.push(Math.round(G.temp))
}
function caught() {
  G.caughtN++; ev('caught')
  const lr = G.learn && G.t < 30 && !G.learn.firstCaught
  const first = G.caughtN === 1 || lr
  const grabbed = G.grabAt != null && G.t - G.grabAt < 1.6
  const seal = G.sealing && !G.sealBroke
  const line = lr ? L(DP.LINES.learnCaught[0]) : seal ? L(DP.LINES.sealNg[0]) : L(pick(G.caughtN >= 3 ? DP.LINES.caught2 : DP.LINES.caught))
  react('h_jito', line, 2.2, 'cold'); G.react.caught = true
  G.watchT = -3.4   // 怒っている間と、そのあと少しは続けて数えない
  if (seal) G.sealBroke = true
  hurt(lr ? 0 : seal ? 18 : grabbed ? 8 : 12, 'caught')
  if (!SIM && !lr && (first || G.caughtN % 2 === 0)) cutin('h_jito')
  if (!SIM) sfx('j_buzz', { vol: 0.35 })
}
// 料理・お会計
function serve(s) {
  sfx('dish', { vol: 0.6 })
  if (s.dish) { G.food.me = s.dish; G.food.her = s.dish; if (s.photo) { G.dish = { kind: s.dish, until: G.t + 9 }; ev('new:dish') } }
  if (s.check) { G.food.me = null; G.food.her = null; ev('new:check') }
}
function leave() {
  G.over = 'left'; G.endT = 0; G.q = null; G.react = null; G.herImg = 'h_leave'; G.look = 'you'
  if (!SIM) $('cutin').classList.remove('on')
  sayHer(L(pick(DP.LINES.leave)), 'cold', 9); ev('leave')
  if (!SIM) { sfx('j_bad', { vol: 0.6 }); Snd.duck(0.2, 4) }
}
function finishDate() {
  G.over = 'done'; G.endT = 0
  const r = verdictKey()
  G.herImg = r === 'good' ? 'h_smitten' : r === 'mid' ? 'h_talk' : 'h_jito'
  sayHer(L(r === 'good' ? DP.LINES.endGood[0] : r === 'mid' ? DP.LINES.endMid[0] : DP.LINES.endBad[0]), r === 'bad' ? 'cold' : '', 9)
  if (!SIM) sfx(r === 'good' ? 'j_good' : r === 'mid' ? 'j_mid' : 'j_bad', { vol: 0.6 })
  ev('end')
}
const verdictKey = () => G.over === 'left' ? 'left' : G.temp >= 70 ? 'good' : G.temp >= 35 ? 'mid' : 'bad'
function result() {
  const vk = verdictKey()
  const phoneSec = G.phoneSec.reduce((a, b) => a + b, 0)
  const left = G.over === 'left'
  const points = Math.round(G.likes + (left ? 0 : G.temp * 5))
  let title = L(DP.TITLES[DP.TITLES.length - 1][2])
  for (const [tm, lk, tt] of DP.TITLES) if (G.temp >= tm && G.likes >= lk) { title = L(tt); break }
  if (left) title = G.likes >= 260 ? L(DP.TITLES[4][2]) : L(DP.TITLES[5][2])
  const hp = DP.HERPOST[vk === 'left' ? 'left' : vk]
  const herLikes = vk === 'bad' || vk === 'left' ? Math.round(hp[1] * (0.7 + phoneSec / 60)) : hp[1]
  const heardN = G.qRes.filter(q => q.res === 'right').length
  return { verdict: vk, left, sec: Math.round(G.t), likes: Math.round(G.likes), temp: Math.round(G.temp), points, title, phoneSec: Math.round(phoneSec), phoneByCourse: G.phoneSec.map(v => Math.round(v)), caught: G.caughtN, grabs: G.grabN, photos: G.photos, right: heardN, asked: G.qRes.length, qRes: G.qRes.slice(), herPost: L(hp[0]), herLikes, name: L(G.name) }
}

// ============================================================ 初めての1回: 遊びの中で、その時に合わせて教える（止まって待たない）
function learnStep() {
  const l = G.learn; if (!l || SIM || G.over) return
  if (l.t > 42) { if (G.texts.hint && G.texts.hint.learn) G.texts.hint = null; return }
  const want = (() => {
    if (G.q && !G.up) return 'answer'
    if (G.q && G.up) return 'answerUp'
    const look = G.react ? 'you' : G.look
    if (G.up && look === 'turn') return 'turn'
    if (G.up && G.unread.length) return 'tap'
    if (G.up) return 'down'
    if (!G.up && (look === 'away' || look === 'gone') && G.unread.length) return 'peek'
    if (G.unread.length >= 4) return 'pile'
    if (l.t < 7) return 'listen'
    return null
  })()
  if (!want) { if (G.texts.hint && G.texts.hint.learn && G.clock > G.texts.hint.until - 0.1) G.texts.hint = null; return }
  if (l.shown !== want || !G.texts.hint) { l.shown = want; hint(L(LEARN[want]), 'learn', 99); G.texts.hint.learn = true }
}
const LEARN = {
  listen: ['通知が鳴っても、まず話を聞く', 'Phone buzzing? Listen to her first'],
  peek: ['目をそらした！\n今のうちにスマホをタップ', 'She looked away.\nTap your phone now'],
  tap: ['通知をタップで片づける', 'Tap notifications to clear them'],
  turn: ['こっちを見る！顔を上げて', 'She is turning! Look up!'],
  down: ['顔を上げれば、話が聞こえる', 'Look up to hear what she says'],
  pile: ['ためすぎると、手が勝手につかむ', 'Let them pile up and your hand grabs it'],
  answer: ['聞いた話から答える', 'Answer from what you heard'],
  answerUp: ['顔を上げて答える', 'Look up to answer'],
}

// ============================================================ 文字（同時に2つまで: 彼女の吹き出し＋案内の一文）
function sayHer(text, cls = '', sec) { if (SIM) return; G.texts.bubble = { text, cls, until: G.clock + (sec || Math.max(1.5, dur(text) + 0.2)), born: G.clock } }
function hint(text, cls = '', sec) { if (SIM) return; G.texts.hint = { text, cls, until: G.clock + (sec || 2.2), born: G.clock } }
function flash(a = 0.8) { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = String(a); requestAnimationFrame(() => requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = '0' })) }
function cutin(img) {
  if (SIM) return
  const c = $('cutin'); c.querySelector('img').src = 'img/' + img + '.webp'
  c.classList.remove('on'); void c.offsetWidth; c.classList.add('on'); G.cutUntil = G.clock + 1.0
}
let bannerT = 0
function courseBanner(n) { const b = $('banner'); b.textContent = L([DP.T.course[n * 2], DP.T.course[n * 2 + 1]]); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); sfx('paper', { vol: 0.4 }) }

// ============================================================ 画面（DOM）
const VIEWS = ['vTitle', 'vHow', 'vPlay', 'vResult']
function show(id) { for (const v of VIEWS) $(v).hidden = v !== id; $('bMute').hidden = id === 'vResult' }
const v3 = new THREE.Vector3()
function toScreen(p) { v3.copy(p).project(camera); return { x: (v3.x + 1) / 2 * innerWidth, y: (1 - v3.y) / 2 * innerHeight } }
function headXY() { return toScreen(new THREE.Vector3(HER.x, HER.y + HER.h * 1.0, HER.z)) }
function phoneXY() { return toScreen(PHONE_POS) }
let buzzT = 0, lastFeedKey = ''
function textsDom() {
  const now = G.clock
  for (const k in G.texts) { const v = G.texts[k]; if (v && now > v.until) G.texts[k] = null }
  const b = G.texts.bubble, e = $('bubble')
  if (!b) e.hidden = true
  else {
    // スマホを見ている間は、話が聞こえない
    const muffled = G.up && G.mode === 'play' && !G.over && !b.cls.includes('cold') && b.cls !== 'q'
    const text = muffled ? T('muffled') : b.text
    if (e.dataset.t !== text || e.hidden) { e.dataset.t = text; e.textContent = text; e.hidden = false }
    e.className = 'bubble ' + b.cls + (muffled ? ' muffled' : '')
    const p = headXY(), W = innerWidth, w = e.offsetWidth, h = e.offsetHeight
    const left = clamp(p.x - w / 2, 12, W - w - 12), top = clamp(p.y - h - 14, 70, innerHeight * 0.5)
    e.style.left = Math.round(left) + 'px'; e.style.top = Math.round(top) + 'px'
    e.style.setProperty('--tail', clamp(p.x - left, 18, w - 18) + 'px')
  }
  const h = G.texts.hint, he = $('hint')
  if (!h) he.hidden = true
  else { if (he.dataset.t !== h.text || he.hidden) { he.dataset.t = h.text; he.textContent = h.text; he.hidden = false } he.className = 'hint ' + h.cls + (G.up ? ' over' : '') }
}
// 伏せたスマホ・通知の山・自分の手
function tableDom(dt) {
  const p = phoneXY(), W = innerWidth
  const hit = $('phoneHit'), n = unreadN()
  hit.style.left = Math.round(p.x - 70) + 'px'; hit.style.top = Math.round(p.y - 90) + 'px'
  hit.hidden = G.up || G.mode !== 'play' || !!G.over
  // 通知の山: 伏せたスマホの上に積み上がる
  const pile = $('pile')
  pile.style.left = Math.round(Math.min(W - 130, p.x - 50)) + 'px'; pile.style.top = Math.round(p.y - 30) + 'px'
  const show = G.mode === 'play' && !G.up && !G.over
  while (pile.children.length < UMAX) { const i = document.createElement('i'); pile.appendChild(i) }
  ;[...pile.children].forEach((i, k) => { const on = show && k < n; i.classList.toggle('on', on); i.style.setProperty('--k', k); if (on && G.unread[k]) i.dataset.g = G.unread[k].gold ? '1' : '' })
  $('pileN').textContent = n ? n + T('unread') : ''
  $('pileN').hidden = !show || !n
  $('pileN').style.left = Math.round(Math.min(W - 70, p.x + 20)) + 'px'; $('pileN').style.top = Math.round(p.y - 30 - Math.min(n, UMAX) * 17 - 34) + 'px'
  $('pileN').classList.toggle('hot', n >= UMAX - 2)
  // 手: 未読が増えるほどスマホへ伸びる
  const hand = $('hand'), k = clamp(n / UMAX, 0, 1)
  const hx = lerp(-40, p.x - 120, k), hy = p.y - 10 + (1 - k) * 30
  const tremble = n >= 5 && show ? Math.sin(G.clock * 40) * 2.5 : 0
  hand.style.transform = `translate(${hx + tremble}px,${hy}px) rotate(${lerp(-8, 6, k)}deg)`
  hand.hidden = !show
  // 3D のスマホの光と震え
  buzzT = Math.max(0, buzzT - dt)
  phoneGlowM.opacity = G.mode === 'play' && !G.up ? Math.min(0.8, buzzT * 1.8) : 0
  phone3.position.x = PHONE_POS.x + (buzzT > 0 ? Math.sin(G.clock * 90) * 0.003 : 0)
  phone3.visible = !G.up
}
// 手に持ったスマホの画面
function phoneDom() {
  const ph = $('phone'), up = G.mode === 'play' && G.up && !G.over
  ph.classList.toggle('up', up); $('upZone').hidden = !up
  ph.classList.toggle('force', up && G.forceT > 0)
  const look = G.react ? 'you' : G.look
  ph.classList.toggle('danger', up && (look === 'turn' || look === 'you'))
  if (!up) return
  $('pLikes').textContent = Math.round(G.likes).toLocaleString()
  const d = new Date(2026, 0, 1, 19, 0); d.setMinutes(Math.round(G.t)); $('pTime').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
  $('shoot').hidden = !G.dish
  const key = G.unread.map(c => c.id).join(',') + '|' + lang
  if (key === lastFeedKey) return
  lastFeedKey = key
  const list = $('feed')
  const have = new Map([...list.children].map(el => [el.dataset.id, el]))
  const want = G.unread.slice().reverse()
  for (const [id, el] of have) if (!want.some(c => String(c.id) === id)) el.remove()
  want.forEach((c, i) => {
    let el = have.get(String(c.id))
    if (!el) {
      el = document.createElement('button'); el.className = 'card' + (c.gold ? ' gold' : '') + (c.mom ? ' mom' : '') + (c.sys || c.user === DP.T.app ? ' sys' : ''); el.dataset.id = c.id
      const u = L(c.user), ini = u.replace(/[（(].*$/, '').slice(0, 1)
      el.innerHTML = '<span class="av"></span><span class="tx"><b></b><span></span></span>' + (c.img ? '<img alt="">' : '') + '<em></em>'
      el.querySelector('.av').textContent = ini; el.querySelector('.av').style.background = avColor(u)
      el.querySelector('b').textContent = u; el.querySelector('.tx span').textContent = L(c.text)
      if (c.img) el.querySelector('img').src = 'img/' + c.img + '.webp'
      el.querySelector('em').textContent = c.n ? '+' + c.n : ''
      el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); firstTouch(); tapCard(c.id) })
    }
    list.insertBefore(el, list.children[i] || null)
  })
}
// 人ごとの色（暖色と青緑だけ。紫は使わない）
const AV = ['#d9825b', '#c9a35a', '#6fa58c', '#5f95b8', '#b86a6a', '#8fa35a', '#c77d9a']
function avColor(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 997; return AV[h % AV.length] }
function popLike(n, gold) {
  if (!n) return
  const e = document.createElement('i'); e.className = 'likepop' + (gold ? ' gold' : ''); e.textContent = '+' + n
  const r = $('pLikes').getBoundingClientRect(); e.style.left = (r.left + r.width / 2) + 'px'; e.style.top = (r.bottom + 4) + 'px'
  document.body.appendChild(e); setTimeout(() => e.remove(), 800)
}
function chipsDom() {
  const box = $('chips'), q = G.q, show = q && !G.up && !G.react && G.mode === 'play' && !G.over
  box.hidden = !show
  if (!show) { box.dataset.q = ''; return }
  const key = q.topic + G.si + lang
  if (box.dataset.q !== key) {
    box.dataset.q = key; box.innerHTML = ''
    q.opts.forEach((o, i) => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = L(o.v); b.addEventListener('pointerdown', e => { e.preventDefault(); firstTouch(); answer(i) }); box.appendChild(b) })
  }
  box.style.setProperty('--left', Math.max(0, 1 - q.t / q.limit))
}
function courseDom() {
  const m = $('course')
  const k = Math.round(G.t)
  if (m.dataset.k === k + lang) return; m.dataset.k = k + lang
  const d = new Date(2026, 0, 1, 19, 0); d.setMinutes(k)
  m.querySelector('b').textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0')
  ;[...m.querySelectorAll('li')].forEach((li, i) => { li.textContent = L([DP.T.course[i * 2], DP.T.course[i * 2 + 1]]); li.classList.toggle('on', i === G.course); li.classList.toggle('done', i < G.course) })
}

// ---- 指の操作
$('phoneHit').addEventListener('pointerdown', e => { if (G.mode !== 'play' || G.over) return; e.preventDefault(); firstTouch(); pickUp() })
$('upZone').addEventListener('pointerdown', e => { if (G.mode !== 'play' || G.over) return; e.preventDefault(); firstTouch(); putDown() })
$('upBtn').addEventListener('pointerdown', e => { if (G.mode !== 'play' || G.over) return; e.preventDefault(); e.stopPropagation(); firstTouch(); putDown() })
$('shoot').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); firstTouch(); shoot() })

// ============================================================ 毎フレームの見た目
function herLook() {
  let img = G.react ? G.react.img : G.herImg
  if (G.mode !== 'play') img = G.mode === 'title' ? 'h_talk' : img
  her.visible = !!img && G.mode !== 'boot' && !(G.mode === 'play' && G.clock < (G.cutUntil || 0))
  if (img) { setPaper(her, img, HER.h * (H_SCALE[img] || 1)); her.position.x = HER.x + (img === 'h_leave' ? 0.12 : 0) }
  // 戻ってくる途中は横から
  if (G.seg && G.seg.k === 'back' && G.mode === 'play' && !G.react) { her.position.x = HER.x + (1 - G.segT / TURN) * 0.45; her.material.opacity = 0.6 + 0.4 * G.segT / TURN } else her.material.opacity = 1
  her.material.transparent = true
  waiter.visible = G.mode === 'play' && G.waiterOn
  proposer.visible = G.mode === 'play' && G.proposeOn
  waiterBack.visible = G.mode === 'play' && G.course >= 1 && G.course <= 2 && !G.waiterOn
  const f = G.food
  for (const [m, k] of [[myFood, f.me], [herFood, f.her]]) { m.visible = G.mode === 'play' && !!k; if (k) setPaper(m, k, (k === 'd_parfait' ? 0.22 : 0.15) * (m === myFood ? 0.8 : 1)) }
}
function candleLook() {
  const k = clamp((G.mode === 'play' || G.mode === 'result' ? G.temp : 72) / 100, 0, 1)
  const out = G.mode === 'play' && G.over === 'left'
  const fl = 1 + Math.sin(G.clock * 13) * 0.06 + Math.sin(G.clock * 31) * 0.03
  const s = out ? 0 : (0.03 + 0.11 * k) * fl
  flame.scale.set(s * 0.55, s, 1); flame.position.y = 0.155 + 0.004
  flameM.color.setRGB(1, 0.65 + 0.35 * k, 0.45 + 0.55 * k)
  glow.scale.setScalar(out ? 0 : 0.12 + 0.5 * k); glow.position.y = 0.17
  candleLight.intensity = out ? 0 : 0.15 + 0.85 * k
  smokeM.opacity = out ? 0.7 : k < 0.25 ? 0.45 : 0
}
function render(dtR) {
  fx.update(dtR)
  herLook(); candleLook()
  for (const m of PAPERS) { if (!m.visible || !m.userData.face) continue; m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z) }
  camera.position.copy(CAM.p); camera.lookAt(CAM.t)
  look.update(); fx.applyCamera()
  renderer.render(scene, camera)
  if (G.mode === 'play') { textsDom(); tableDom(dtR); phoneDom(); chipsDom(); courseDom(); learnStep() }
  else { $('bubble').hidden = true; $('hint').hidden = true; $('chips').hidden = true; $('phone').classList.remove('up'); $('upZone').hidden = true; $('phoneHit').hidden = true; $('hand').hidden = true; $('pileN').hidden = true; for (const i of $('pile').children) i.classList.remove('on') }
}

// ============================================================ 遊びの開始・終わり
function firstTouch() {
  if (params.has('auto')) return   // 確認用は音の仕組みごと起こさない
  Snd.init()
  if (!Snd.loops.amb && !SIM) { Snd.loop('amb', S_('amb_rest'), 0.16); Snd.loop('bgm', S_('bgm_bossa'), 0.14) }
}
let resultShown = false
function startPlay(learn = false) {
  const seed = params.has('seed') ? +params.get('seed') + G.playNo : (Date.now() % 100000) + G.playNo * 7
  resultShown = false; lastFeedKey = ''; $('feed').innerHTML = ''
  newGame(seed, learn); G.mode = 'play'
  $('cutin').classList.remove('on')
  if (window.TM) TM.start()
  show('vPlay')
  if (learn) store.set(TUT_KEY, '1')
}
function begin() {
  firstTouch(); sfx('click', { vol: 0.6 }); G.playNo++
  startPlay(!store.get(TUT_KEY) && !params.has('notut'))
}
function stepEnd() {
  if (!G.over || G.mode !== 'play') return
  const t = G.endT
  if (G.over === 'left' && t > 0.6 && !G.leftGone) { G.leftGone = true; sfx('step', { vol: 0.7 }) }
  if (t > (G.over === 'left' ? 3.4 : 3.0) && !resultShown) { resultShown = true; showResult() }
}
async function showResult() {
  const r = result()
  G.mode = 'result'; show('vResult'); $('cutin').classList.remove('on')
  if (window.TM) TM.end(r.points, r.verdict === 'good')
  await drawCard(r)
  fitCard()
  const text = lang === 'en'
    ? `Phone time on my date: ${r.phoneSec} min. Likes ${r.likes}. ${L(DP.VERDICT[r.verdict])}. Her post got ${r.herLikes.toLocaleString()} likes. #PhoneOnAFirstDate`
    : `デート中のスマホ ${r.phoneSec}分・いいね${r.likes}。${L(DP.VERDICT[r.verdict])}。彼女の投稿は${r.herLikes.toLocaleString()}いいね。 #デート中のスマホ`
  $('bPost').href = 'https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent('https://tom3games.com/play/date-phone/')
  window.__lastResult = r
}
const CARD_H = 1080
function fitCard() {
  const box = $('cardBox'), c = $('card'), bw = box.clientWidth, bh = box.clientHeight
  const s = Math.min(bw / 720, bh / CARD_H); c.style.width = Math.floor(720 * s) + 'px'; c.style.height = Math.floor(CARD_H * s) + 'px'
}
addEventListener('resize', () => { if (!$('vResult').hidden) fitCard() })
if (window.ResizeObserver) new ResizeObserver(() => { if (!$('vResult').hidden) fitCard() }).observe($('cardBox'))
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src }) }
function heart(x, cx, cy, s, fill) { x.save(); x.translate(cx, cy); x.scale(s / 32, s / 32); x.beginPath(); x.moveTo(0, 10); x.bezierCurveTo(-26, -6, -14, -26, 0, -12); x.bezierCurveTo(14, -26, 26, -6, 0, 10); x.closePath(); x.fillStyle = fill; x.fill(); x.restore() }
function rrect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath() }
// 結果: スマホの「スクリーンタイム」の画面＋彼女の投稿
async function drawCard(r) {
  const c = $('card'), x = c.getContext('2d'), W = 720, H = CARD_H
  const sans = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif'
  const min = '"Zen Old Mincho", "Hiragino Mincho ProN", serif'
  try { await document.fonts.load('700 40px "Zen Old Mincho"') } catch (e) {}
  x.fillStyle = '#f2f2f6'; x.fillRect(0, 0, W, H)
  x.textBaseline = 'alphabetic'
  x.fillStyle = '#111'; x.textAlign = 'left'
  x.font = `700 46px ${sans}`; x.fillText(lang === 'en' ? 'Screen Time' : 'スクリーンタイム', 40, 82)
  x.font = `500 24px ${sans}`; x.fillStyle = '#6b6b72'; x.fillText(lang === 'en' ? `Tonight's date  7:00 - 9:00 PM  with ${r.name}` : `今夜のデート　19:00〜21:00　${r.name}さんと`, 40, 122)
  // 合計
  rrect(x, 28, 146, W - 56, 290, 22); x.fillStyle = '#fff'; x.fill()
  x.fillStyle = '#6b6b72'; x.font = `600 22px ${sans}`; x.fillText(lang === 'en' ? 'PHONE DURING THE DATE' : 'デート中のスマホ', 56, 190)
  x.fillStyle = '#111'; x.font = `700 72px ${sans}`; x.fillText(lang === 'en' ? `${r.phoneSec} min` : `${r.phoneSec}分`, 54, 262)
  const tot = r.left ? r.sec : 120
  x.fillStyle = '#6b6b72'; x.font = `500 22px ${sans}`; x.fillText(lang === 'en' ? `of ${tot} min` : `${tot}分のうち`, 56, 294)
  // 料理ごとの棒
  const gx = 60, gy = 312, gw = W - 120, gh = 80, bw = gw / 4 - 26
  x.strokeStyle = '#e4e4ea'; x.lineWidth = 2; x.beginPath(); x.moveTo(gx, gy + gh); x.lineTo(gx + gw, gy + gh); x.stroke()
  r.phoneByCourse.forEach((v, i) => {
    const bh = Math.max(3, Math.min(1, v / 30) * gh), bx = gx + i * (gw / 4) + 13
    rrect(x, bx, gy + gh - bh, bw, bh, 6); x.fillStyle = i === r.phoneByCourse.indexOf(Math.max(...r.phoneByCourse)) && v > 0 ? '#3478f6' : '#9cc0fa'; x.fill()
    x.fillStyle = '#6b6b72'; x.font = `600 20px ${sans}`; x.textAlign = 'center'; x.fillText(L([DP.T.course[i * 2], DP.T.course[i * 2 + 1]]), bx + bw / 2, gy + gh + 28)
  })
  x.textAlign = 'left'
  // 内訳の行
  const rows = [
    [lang === 'en' ? 'Likes you checked' : '見たいいね', r.likes.toLocaleString()],
    [lang === 'en' ? 'Times she caught you' : '見つかった', lang === 'en' ? `${r.caught}` : `${r.caught}回`],
    [lang === 'en' ? 'Questions you got right' : '話をちゃんと聞けた', `${r.right} / ${r.asked}`],
  ]
  if (r.grabs) rows.push([lang === 'en' ? 'Hand moved on its own' : '手が勝手に', lang === 'en' ? `${r.grabs}x` : `${r.grabs}回`])
  rrect(x, 28, 452, W - 56, 26 + rows.length * 54, 22); x.fillStyle = '#fff'; x.fill()
  rows.forEach(([a, b], i) => {
    const y = 494 + i * 54
    x.fillStyle = '#111'; x.font = `500 27px ${sans}`; x.textAlign = 'left'; x.fillText(a, 56, y)
    x.textAlign = 'right'; x.font = `700 28px ${sans}`; x.fillText(b, W - 56, y)
    if (i < rows.length - 1) { x.strokeStyle = '#ececf0'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(56, y + 22); x.lineTo(W - 56, y + 22); x.stroke() }
  })
  x.textAlign = 'left'
  // 彼女の投稿（オチ）
  const py = 452 + 26 + rows.length * 54 + 16
  rrect(x, 28, py, W - 56, 236, 22); x.fillStyle = '#fff'; x.fill()
  const face = await loadImg('img/' + (r.verdict === 'good' ? 'h_smitten' : r.verdict === 'mid' ? 'h_talk' : r.left ? 'h_leave' : 'h_jito') + '.webp')
  x.save(); x.beginPath(); x.arc(92, py + 64, 38, 0, 7); x.clip(); x.fillStyle = '#f4e3d0'; x.fillRect(54, py + 26, 76, 76); if (face) { const s = 76 / face.width * 1.6; x.drawImage(face, 92 - face.width * s / 2, py + 26 - 4, face.width * s, face.height * s) } x.restore()
  x.fillStyle = '#111'; x.font = `700 26px ${sans}`; x.fillText(r.name, 146, py + 58)
  x.fillStyle = '#6b6b72'; x.font = `500 21px ${sans}`; x.fillText(lang === 'en' ? 'posted just now' : 'たった今', 146, py + 88)
  x.fillStyle = '#111'; x.font = `500 28px ${sans}`
  let line = r.herPost, fs = 28; while (x.measureText(line).width > W - 120 && fs > 18) { fs--; x.font = `500 ${fs}px ${sans}` }
  x.fillText(line, 56, py + 150)
  heart(x, 72, py + 202, 34, '#e5484d')
  x.fillStyle = '#e5484d'; x.font = `700 34px ${sans}`; x.fillText(r.herLikes.toLocaleString(), 98, py + 214)
  x.fillStyle = '#6b6b72'; x.font = `500 20px ${sans}`; x.textAlign = 'right'; x.fillText(lang === 'en' ? `yours: ${r.likes.toLocaleString()}` : `あなたのいいね ${r.likes.toLocaleString()}`, W - 56, py + 212)
  // 判定のハンコと称号
  x.save(); x.translate(W - 170, 236); x.rotate(-0.16)
  const vcol = r.verdict === 'good' ? '#2f8f5b' : r.verdict === 'mid' ? '#c98a12' : '#c2342e'
  x.strokeStyle = vcol; x.lineWidth = 6; rrect(x, -130, -46, 260, 92, 12); x.stroke()
  x.fillStyle = vcol; x.textAlign = 'center'; x.font = `700 26px ${min}`
  const vt = L(DP.VERDICT[r.verdict]).split(' ')
  if (vt.length > 1 && lang === 'ja') { x.font = `700 20px ${min}`; x.fillText(vt[0], 0, -8); x.font = `700 34px ${min}`; x.fillText(vt.slice(1).join(' '), 0, 32) }
  else { let f2 = 30; x.font = `700 ${f2}px ${min}`; while (x.measureText(vt.join(' ')).width > 236 && f2 > 16) { f2--; x.font = `700 ${f2}px ${min}` } x.fillText(vt.join(' '), 0, 12) }
  x.restore()
  x.textAlign = 'center'; x.fillStyle = '#111'; x.font = `700 40px ${min}`
  x.fillText(r.title, W / 2, py + 236 + 62)
  x.font = `600 24px ${sans}`; x.fillStyle = '#6b6b72'; x.fillText((lang === 'en' ? 'Score ' : '点数 ') + r.points.toLocaleString(), W / 2, py + 236 + 98)
  x.textAlign = 'right'; x.font = `600 20px ${min}`; x.fillStyle = 'rgba(0,0,0,.6)'; x.fillText(lang === 'en' ? 'Phone on a First Date' : 'デート中のスマホ、バレたら冷める', W - 24, H - 8)
}

// ============================================================ ボタン
function applyLang() {
  document.documentElement.lang = lang
  $('t1').textContent = T('title1'); $('t2').textContent = T('title2'); $('tSub').textContent = T('sub')
  $('bStart').textContent = T('start'); $('bHow').textContent = T('how'); $('bLang').textContent = T('lang')
  $('howH').textContent = T('how'); $('howWarn').textContent = L(DP.HOWTO.warn); $('bHowClose').textContent = T('close'); $('lPrivacy').textContent = T('privacy')
  $('howCredit').textContent = lang === 'en' ? 'Sounds: Gravity Sound (CC BY 4.0), SpringySpringo, Kenney, rubberduck, themightyglider and Wikimedia Commons contributors (CC0 / PD)' : '音: Gravity Sound（CC BY 4.0）、SpringySpringo・Kenney・rubberduck・themightyglider ほか CC0 とパブリックドメインの録音'
  const ruleImg = ['img/h_jito.webp', 'img/h_talk.webp', 'img/h_phone.webp']
  $('howRules').innerHTML = ''
  DP.HOWTO.rules.forEach(([a, b], i) => {
    const li = document.createElement('li')
    const pic = Object.assign(document.createElement('img'), { src: ruleImg[i], alt: '' })
    const t = document.createElement('div'); t.innerHTML = '<b></b><span></span>'; t.querySelector('b').textContent = L(a); t.querySelector('span').textContent = L(b)
    li.append(pic, t); $('howRules').append(li)
  })
  $('bAgain').textContent = T('again'); $('bSave').textContent = T('save'); $('bPost').textContent = T('post')
  $('upBtn').textContent = T('up'); $('shoot').textContent = T('shoot'); $('pApp').textContent = T('app')
  $('course').dataset.k = ''; lastFeedKey = ''
}
$('bStart').onclick = begin
$('bAgain').onclick = begin
$('bHow').onclick = () => { firstTouch(); show('vHow') }
$('bHowClose').onclick = () => show('vTitle')
$('bLang').onclick = () => { lang = lang === 'ja' ? 'en' : 'ja'; store.set('dp_lang', lang); applyLang() }
$('bMute').onclick = () => { muted = !muted; store.set('dp_mute', muted ? '1' : '0'); Snd.setMute(muted); $('bMute').classList.toggle('off', muted) }
$('bMute').classList.toggle('off', muted)
$('bSave').onclick = () => { if (window.TM) TM.share('save'); $('card').toBlob(b => { if (!b) return; const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'date-phone.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000) }) }
$('bPost').onclick = () => { if (window.TM) TM.share('x') }

// ============================================================ ループ
const STEP = 1 / 60
let last = performance.now(), acc = 0
function logic(dt) {
  G.clock += dt
  if (G.mode === 'play') {
    if (G.bot && !SIM && !G.over) G.bot(api, G.botSt || (G.botSt = { r: mulberry(5) }), dt)
    stepGame(dt); stepEnd()
  }
}
function loop(now) {
  requestAnimationFrame(loop)
  let dt = (now - last) / 1000; last = now
  if (dt > 0.25) dt = 0.25
  if (!G.paused) { acc += dt * (G.speed || 1); let n = 0; while (acc >= STEP && n < 240) { logic(STEP); acc -= STEP; n++ } }
  try { render(G.paused ? 0 : dt) } catch (e) { console.error(e) }
}

// ============================================================ 検証用の窓口と bot
function elXY(el) { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } }
const api = {
  get state() {
    const s = G.seg
    return { mode: G.mode, t: G.t, temp: G.temp, likes: G.likes, up: G.up, force: G.forceT, look: G.react ? 'you' : G.look, seg: s && s.k, segT: G.segT, unread: unreadN(), q: G.q && { topic: G.q.topic, t: G.q.t, opts: G.q.opts.map(o => o.kind) }, react: !!G.react, dish: !!G.dish, over: G.over, caught: G.caughtN, grabs: G.grabN, course: G.course, heard: { ...G.heard }, seenDecoy: { ...G.seenDecoy }, cards: G.unread.map(c => c.id), learn: G.learn && { ...G.learn } }
  },
  pickUp, putDown, tapCard, shoot, answer, result,
  phoneXY() { return elXY($('phoneHit')) },
  upXY() { const r = $('upZone').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + Math.min(60, r.height / 2) } },
  cardXY(i = 0) { const el = $('feed').children[i]; return el ? elXY(el) : null },
  chipXY(i) { const el = $('chips').children[i]; return el ? elXY(el) : null },
  shootXY() { return elXY($('shoot')) },
  texts: () => Object.values(G.texts).filter(Boolean).map(v => v.text),
  events: () => G.events.slice(),
  sim(botName, seed, o = {}) {
    SIM = true; const keepMode = G.mode
    newGame(seed, !!o.learn); G.mode = 'play'
    const bot = BOTS[botName], st = { r: mulberry(seed * 13 + 3), ...o }
    let n = 0
    while (!G.over && n < 60 * 240) { bot(api, st, STEP); stepGame(STEP); n++ }
    const r = result(); r.events = o.events ? G.events.slice() : undefined
    SIM = false; G.mode = keepMode === 'play' ? 'title' : keepMode; G.over = null
    return r
  },
  dbg: {
    pause(v = true) { G.paused = v; if (!v) last = performance.now() },
    step(n = 1) { for (let i = 0; i < n; i++) logic(STEP); render(0) },
    tick(n = 1) { for (let i = 0; i < n; i++) logic(STEP) },
    speed(k) { G.speed = k },
    render() { render(0) },
    G, newGame, startPlay, showResult, notify, autoGrab, caught, leave, cutin,
    set(o) { Object.assign(G, o) },
    camera, scene, CAM, sayHer, toScreen, headXY,
    skipTo(k) { let n = 0; while (G.seg && G.seg.k !== k && !G.over && n < 60 * 200) { stepGame(STEP); n++ } return G.seg && G.seg.k },
    calm(v = true) { G.nextNotif = v ? 1e9 : 1; if (v) G.unread = [] },
  },
}
window.dp = api
// bot: 人間の速さで動く。react 秒たってから気づく
const BOTS = {
  idle() {},
  // ずっとスマホ: 開いて片づけ続ける。顔は上げない（質問の時だけ上げて適当に答える）
  addict(api, st, dt) {
    const s = api.state; st.cool = (st.cool || 0) - dt
    if (s.q && s.up) { if (st.cool <= 0) { api.putDown(); st.cool = 0.6 } return }
    if (s.q && !s.up && st.cool <= 0) { api.answer(Math.floor(st.r() * 3)); st.cool = 0.5; return }
    if (!s.up && st.cool <= 0) { api.pickUp(); st.cool = 0.3 }
    if (s.up && s.unread && st.cool <= 0) { api.tapCard(); st.cool = 0.3 }
    if (s.up && s.dish) api.shoot()
  },
  // スマホを見ない: 勝手につかんだら、すぐ伏せる。話は全部聞く
  never(api, st, dt) {
    const s = api.state; st.cool = (st.cool || 0) - dt
    if (s.up && s.force <= 0 && st.cool <= 0) { st.w = (st.w || 0) + dt; if (st.w > 0.5) { api.putDown(); st.w = 0; st.cool = 0.3 } }
    if (s.q && !s.up && st.cool <= 0) { st.qa = (st.qa || 0) + dt; if (st.qa > 1.2) { const i = s.q.opts.indexOf(s.heard[s.q.topic] ? 'right' : s.q.opts[Math.floor(st.r() * 3)]); api.answer(Math.max(0, i)); st.qa = 0; st.cool = 0.4 } }
  },
  // 適当: でたらめに開いて閉じて押す
  random(api, st, dt) {
    const s = api.state
    if (st.r() < 0.9 * dt) s.up ? api.putDown() : api.pickUp()
    if (s.up && st.r() < 2 * dt) api.tapCard()
    if (s.q && st.r() < 0.8 * dt) api.answer(Math.floor(st.r() * 3))
    if (s.up && s.dish && st.r() < 0.5 * dt) api.shoot()
  },
  // 上手い / 人: 目をそらしたら react 秒後に開く。振り向きを見たら react 秒後に伏せる。質問は聞いていれば当てる
  good(api, st, dt) {
    const s = api.state
    st.cool = (st.cool || 0) - dt
    const react = st.react ?? 0.4
    // 見え方が変わってから気づくまで
    if (s.look !== st.lastLook) { st.lastLook = s.look; st.seenT = 0; st.thisReact = (Array.isArray(react) ? react[0] + st.r() * (react[1] - react[0]) : react) + (st.r() < (st.ignore ?? 0) ? 1.2 : 0) }
    st.seenT = (st.seenT || 0) + dt
    const noticed = st.seenT >= st.thisReact
    if (s.q) {
      if (s.up) { if (noticed && st.cool <= 0) { api.putDown(); st.cool = 0.3 } return }
      st.qa = (st.qa || 0) + dt
      if (st.qa > (st.think ?? 1.3) && st.cool <= 0) {
        let i = s.q.opts.indexOf('right')
        const know = s.heard[s.q.topic] && st.r() < (st.recall ?? 1)
        if (!know) i = Math.floor(st.r() * 3)
        else if (st.decoyed && s.seenDecoy[s.q.topic] && st.r() < st.decoyed) i = s.q.opts.indexOf('decoy')
        api.answer(i); st.qa = 0; st.cool = 0.4
      }
      return
    }
    st.qa = 0
    const safe = s.look === 'away' || s.look === 'gone'
    if (s.up) {
      if (!safe && noticed && s.force <= 0 && st.cool <= 0) { api.putDown(); st.cool = 0.35; return }
      if (s.dish && safe && st.cool <= 0 && st.r() < (st.photo ?? 1)) { api.shoot(); st.cool = 0.4; return }
      if (s.unread && st.cool <= 0) { if (st.r() < (st.slip ?? 0)) { st.cool = 0.5; return } api.tapCard(); st.cool = st.tap ?? 0.32 }
      return
    }
    // 開く: そらしている時（気づいてから）。我慢できない人は見られていても開く
    if (st.cool <= 0 && ((safe && noticed && s.unread > 0) || (st.impatient && s.unread >= 6 && st.r() < st.impatient * dt))) { api.pickUp(); st.cool = 0.3 }
  },
}
// 人の速さ: 反応0.5〜1.0秒・ときどき見落とす・押し損ねる・思い出せない・紛らわしい方を選ぶ・待ちきれず開く
BOTS.human = (api, st, dt) => { st.react = st.react ?? [0.5, 1.0]; st.ignore = st.ignore ?? 0.05; st.slip = st.slip ?? 0.15; st.recall = st.recall ?? 0.85; st.decoyed = st.decoyed ?? 0.25; st.think = st.think ?? 2.0; st.tap = st.tap ?? 0.45; st.impatient = st.impatient ?? 0.15; st.photo = st.photo ?? 0.7; BOTS.good(api, st, dt) }
BOTS.slow = (api, st, dt) => { st.react = st.react ?? [0.9, 1.3]; BOTS.human(api, st, dt) }

// ============================================================ 起動
applyLang()
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => applyLang())
const PRE = ['h_talk', 'h_glance', 'h_menu', 'h_window', 'd_soup']
const LATER = ['h_jito', 'h_laugh', 'h_phone', 'h_show', 'h_leave', 'h_eat', 'h_startle', 'h_smitten', 'w_tray', 'w_phone', 'propose', 'd_steak', 'd_parfait', 'f_cat', 'f_ramen', 'f_dog']
let readyDone = false
function ready() {
  if (readyDone) return; readyDone = true
  for (const n of LATER) { tex(n); const i = new Image(); i.src = 'img/' + n + '.webp' }
  window.__bootDone = true; $('boot').classList.add('gone')
  G.mode = 'title'; show('vTitle')
  window.__dpReady = true
  // 確認用: ?auto=<bot> で人の bot が遊ぶ（シミュレーターで撮る用）。?auto=human&go=1 でタイトルを飛ばす
  if (params.has('auto')) { G.bot = BOTS[params.get('auto')] || BOTS.human; G.botSt = { r: mulberry(9) }; if (params.has('go')) setTimeout(() => begin(), 600) }
  if (params.has('again')) setInterval(() => { if (G.mode === 'result' && params.has('auto')) { G.botSt = { r: mulberry(G.playNo * 31) }; begin() } }, 6000)
}
let pending = PRE.length
for (const n of PRE) { const t = tex(n); const chk = () => { if (t.image && t.image.complete !== false && t.image.width) { if (window.__bootStep) __bootStep(); if (--pending <= 0) ready() } else setTimeout(chk, 50) }; chk() }
setTimeout(ready, 9000)
G.mode = 'boot'
requestAnimationFrame(t => { last = t; loop(t) })
