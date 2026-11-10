// Personagens próprios do Baile do Abismo (criados no Meshy) dançando com as danças de verdade da Mixamo.
// Pasta "baile-personagens": os bonecos (.fbx ou .glb, baixados da Mixamo "With Skin").
// Pasta "baile-personagens/dancas": as danças (.fbx baixados da Mixamo "Without Skin"), o nome do arquivo vira o nome da dança.
// Sem nenhum boneco na pasta, o baile usa as caveiras (esqueletos.js).
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
let T = null;

const ehAndar = (n) => /walk|andar|caminh/i.test(n), ehCorrer = (n) => /run|corr/i.test(n);
const ehParado = (n) => /idle|parad|respir|breath|standing/i.test(n);
const ehComemora = (n) => /cheer|victory|clap|comemor|palma|happy/i.test(n);
const sexoArq = (u) => { const n = decodeURIComponent(u.split('/').pop()).toLowerCase(); return /menina|femin|mulher|garota|noiva|girl|female|woman/.test(n) ? 'f' : /menino|mascul|homem|garoto|noivo|boy|male|\bman\b/.test(n) ? 'm' : null; };
const nomeArq = (u) => decodeURIComponent(u.split('/').pop()).replace(/\.\w+$/, '');

// tira o deslocamento do quadril para os lados (dança no lugar, sem sair andando)
function noLugar(clip) {
  for (const tr of clip.tracks) {
    if (!/\.position$/.test(tr.name) || !/hips|root|pelvis/i.test(tr.name.split('.')[0])) continue;
    const v = tr.values, x0 = v[0], z0 = v[2]; for (let i = 0; i < v.length; i += 3) { v[i] = x0; v[i + 2] = z0; }
  }
  return clip;
}
function prepararModelo(r, url) {
  const cena = r.scene || r; cena.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; } }); cena.updateMatrixWorld(true);
  // altura pelo esqueleto (a caixa da malha engana em bonecos com ossos escalados, comuns no FBX da Mixamo)
  let minY = Infinity, maxY = -Infinity; const v = new T.Vector3();
  cena.traverse((o) => { if (o.isBone) { o.getWorldPosition(v); minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y); } });
  const box = new T.Box3(); box.setFromObject(cena);
  if (maxY > minY) { box.min.y = Math.min(minY, 0); box.max.y = maxY + (maxY - Math.min(minY, 0)) * 0.12; }
  const alt = Math.max(0.01, box.max.y - box.min.y), escala = 2.2 / alt;
  let cabeca = null; cena.traverse((o) => { if (!cabeca && o.isBone && /head$/i.test(o.name)) cabeca = o.name; });
  let quadril = null; cena.traverse((o) => { if (!quadril && o.isBone && /hips$/i.test(o.name)) quadril = o; });
  return { cena, clips: r.animations || [], escala, baseY: -box.min.y * escala, cabeca, quadrilY: quadril ? quadril.position.y : 0, sexo: sexoArq(url), nome: nomeArq(url) };
}

export async function carregarPersonagens3D(THREE, lista, carregar) {
  T = THREE;
  const lib = { modelos: [], dancas: [], andar: null, correr: null, parado: null, comemora: null, credito: lista.credito || '' };
  for (const u of lista.modelos || []) { try { lib.modelos.push(prepararModelo(await carregar(u), u)); } catch (e) { console.warn('personagem não carregou', u, e); } }
  if (!lib.modelos.length) return null;
  const todos = [];
  for (const m of lib.modelos) for (const c of m.clips) todos.push(c);
  for (const u of lista.dancas || []) {
    try { const r = await carregar(u); for (const c of r.animations || []) { if (!c.name || /mixamo\.com|Take 001|^Armature/i.test(c.name)) c.name = nomeArq(u); todos.push(c); } }
    catch (e) { console.warn('dança não carregou', u, e); }
  }
  for (const c of todos) {
    if (!lib.andar && ehAndar(c.name)) lib.andar = noLugar(c);
    else if (!lib.correr && ehCorrer(c.name)) lib.correr = noLugar(c);
    else if (!lib.parado && ehParado(c.name)) lib.parado = noLugar(c);
    else if (!lib.comemora && ehComemora(c.name)) lib.comemora = noLugar(c);
    else if (!ehAndar(c.name) && !ehCorrer(c.name) && !ehParado(c.name) && !/death|die|hit|punch|kick|fall|tpose|t-pose/i.test(c.name)) lib.dancas.push(noLugar(c));
  }
  if (!lib.dancas.length && lib.parado) lib.dancas.push(lib.parado);
  return lib;
}

// a dança baixada com um boneco serve em outro de altura diferente: ajusta a altura do quadril de cada um
function adaptar(M, clip) {
  M.adapt ||= new Map(); if (M.adapt.has(clip)) return M.adapt.get(clip);
  let out = clip;
  try {
    const tr = clip.tracks.find((t) => /\.position$/.test(t.name) && /hips/i.test(t.name.split('.')[0]));
    if (tr && M.quadrilY) { const r = M.quadrilY / tr.values[1]; if (r > 0.2 && r < 5 && Math.abs(r - 1) > 0.04) { out = clip.clone(); const t2 = out.tracks.find((t) => t.name === tr.name); for (let i = 0; i < t2.values.length; i++) t2.values[i] *= r; } }
  } catch (e) {}
  M.adapt.set(clip, out); return out;
}

export function criarBoneco3D(lib, { semente = 1, sexo = 'm', enfeite = null } = {}) {
  const pool = lib.modelos.filter((m) => !m.sexo || m.sexo === sexo); const lista = pool.length ? pool : lib.modelos;
  const M = lista[(semente >>> 0) % lista.length];
  const obj = SkeletonUtils.clone(M.cena); obj.scale.setScalar(M.escala); obj.position.y = M.baseY;
  const raiz = new T.Group(); raiz.add(obj);
  let cabeca = null; if (M.cabeca) obj.traverse((o) => { if (!cabeca && o.name === M.cabeca) cabeca = o; });
  const mixer = new T.AnimationMixer(obj);
  let atual = null, clipAtual = null;
  function tocar(clip, { loop = true, fade = 0.4, vel = 1, inicio = null } = {}) {
    if (!clip) return null; clip = adaptar(M, clip);
    const a = mixer.clipAction(clip); if (atual === a && loop) return a;
    a.reset(); a.setLoop(loop ? T.LoopRepeat : T.LoopOnce, Infinity); a.clampWhenFinished = !loop; a.timeScale = vel; a.enabled = true; a.setEffectiveWeight(1);
    if (atual && atual !== a) atual.crossFadeTo(a, fade, false); a.play();
    if (inicio != null) a.time = inicio % clip.duration;
    atual = a; clipAtual = clip; return a;
  }
  // noivo/noiva: cartola ou véu na cabeça
  let par = null;
  function setPar(t) {
    if (par) { par.parent && par.parent.remove(par); par = null; }
    if (!t || !cabeca || !enfeite) return;
    par = enfeite(t === 'noivo' ? 'noivo' : 'veu', 0xffffff); cabeca.add(par);
    const ws = new T.Vector3(); cabeca.getWorldScale(ws); par.scale.setScalar(0.62 / (ws.x || 1)); par.position.y = 0.32 / (ws.y || 1);
  }
  return {
    raiz, mixer, setPar, altura: 2.35, mixamo: true,
    dancar(clip, opc) { return tocar(clip || lib.dancas[Math.floor(Math.random() * lib.dancas.length)], opc); },
    andar(correndo) { return tocar((correndo && lib.correr) || lib.andar || lib.correr || lib.parado || lib.dancas[0], { fade: 0.25 }); },
    comemorar() { return tocar(lib.comemora || lib.dancas[0], { loop: !lib.comemora, fade: 0.25 }); },
    get clip() { return clipAtual; },
    atualizar(dt) { mixer.update(dt); },
  };
}
