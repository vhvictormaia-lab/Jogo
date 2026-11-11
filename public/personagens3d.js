// Personagens próprios do Baile do Abismo (criados no Meshy) dançando com as danças de verdade da Mixamo.
// Pasta "baile-personagens": os bonecos (.fbx ou .glb, baixados da Mixamo "With Skin").
// Pasta "baile-personagens/dancas": as danças (.fbx baixados da Mixamo "Without Skin"), o nome do arquivo vira o nome da dança.
// Sem nenhum boneco na pasta, o baile usa as caveiras (esqueletos.js).
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
let T = null;

// nome com "dance/dança/samba..." é sempre dança (ex.: "Dancing Running Man" não é a corrida)
const ehDanca = (n) => /danc|dança|samba|thriller|hip ?hop|salsa|rumba|macarena|twist|gangnam|funk/i.test(n);
const ehAndar = (n) => !ehDanca(n) && /walk|andar|caminh/i.test(n), ehCorrer = (n) => !ehDanca(n) && /run|corr/i.test(n);
const ehParado = (n) => !ehDanca(n) && /idle|parad|respir|breath|standing/i.test(n);
const ehComemora = (n) => !ehDanca(n) && /cheer|victory|clap|comemor|palma/i.test(n);
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
  const cena = r.scene || r;
  // o FBX da Mixamo vem com material brilhante (Phong) e a textura sem a cor certa (fica lavado/rosado):
  // troca por material fosco e marca a textura como sRGB, igual ao que se vê no site
  cena.traverse((o) => {
    if (!o.isMesh) return; o.frustumCulled = false;
    const mats = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => {
      if (!m) return m; const map = m.map || null;
      if (map) { map.colorSpace = T.SRGBColorSpace; map.anisotropy = 4; map.needsUpdate = true; }
      const n = new T.MeshStandardMaterial({ map, color: map ? 0xffffff : (m.color || 0xffffff), roughness: 0.75, metalness: 0 });
      n.name = m.name; m.dispose && m.dispose(); return n;
    });
    o.material = Array.isArray(o.material) ? mats : mats[0];
  });
  cena.updateMatrixWorld(true);
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
  // roupas (texturas) de cada boneco: arquivos de imagem que começam com o nome dele
  const tl = new T.TextureLoader();
  for (const m of lib.modelos) {
    m.texturas = [];
    const base = m.nome.toLowerCase();
    for (const u of lista.texturas || []) {
      const n = nomeArq(u).toLowerCase();
      if (n !== base && !n.startsWith(base + '-') && !n.startsWith(base + '_')) continue;
      try { const t = await tl.loadAsync(lista.resolver ? lista.resolver(u) : u); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.userData.base = n === base; m.texturas.push(t); } catch (e) { console.warn('roupa não carregou', u, e); }
    }
  }
  const todos = [];
  // o boneco baixado "With Skin" traz um clipe parado em T ("mixamo.com"/"Take 001"): esse não é dança
  for (const m of lib.modelos) for (const c of m.clips) if (c.name && !/mixamo\.com|Take 0|^Armature|tpose|t-pose/i.test(c.name)) todos.push(c);
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

// ---------- 35+ visuais diferentes com um boneco só ----------
// a cor original da roupa (roxo) e do cabelo (verde-limão) são trocadas na placa de vídeo, sem pesar nada.
// cor = matiz (0 a 1) + saturação + brilho
const ROUPAS = [
  [0.78, 1, 1], [0.60, 1, 1], [0.00, 1.1, 0.95], [0.33, 1, 0.9], [0.08, 1.15, 1.05], [0.92, 0.9, 1.1], [0.50, 1, 1],
  [0.13, 1, 1.15], [0.70, 1, 0.85], [0.55, 0.35, 1.25], [0.96, 1, 0.75], [0.25, 1.1, 1], [0.0, 0, 0.45], [0.0, 0, 1.6],
];
const CABELOS = [[-1, 1, 1], [0.95, 1, 1], [0.58, 1, 1], [0.08, 1.1, 1.05], [0.80, 1, 1], [0.13, 0.6, 1.2], [0.0, 1.1, 0.8], [0.48, 1, 1]];
const COMBOS = (() => { // todas as combinações, embaralhadas de um jeito fixo e misturando bem as cores vizinhas
  const l = []; for (let r = 0; r < ROUPAS.length; r++) for (let c = 0; c < CABELOS.length; c++) l.push([r, c]);
  let s = 7; const rnd = () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5 | 0) >>> 0) / 4294967296;
  for (let i = l.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [l[i], l[j]] = [l[j], l[i]]; }
  return l;
})();
function proximoVisual(lib, M) {
  lib.proxVisual = (lib.proxVisual || 0) + 1;
  const [r, c] = COMBOS[lib.proxVisual % COMBOS.length];
  const base = M.texturas && M.texturas.length ? (M.texturas.find((t) => t.userData && t.userData.base) || M.texturas[0]) : null;
  return { roupa: ROUPAS[r], cabelo: CABELOS[c], mapa: base };
}
function vestirMaterial(m, v) {
  const c = m.clone(); if (v.mapa) c.map = v.mapa;
  c.userData.troca = { uRoupa: { value: new T.Vector3(...v.roupa) }, uCabelo: { value: new T.Vector3(...v.cabelo) } };
  c.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, c.userData.troca);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
uniform vec3 uRoupa; uniform vec3 uCabelo;
vec3 rgb2hsv(vec3 c){ vec4 K=vec4(0.,-1./3.,2./3.,-1.); vec4 p=mix(vec4(c.bg,K.wz),vec4(c.gb,K.xy),step(c.b,c.g)); vec4 q=mix(vec4(p.xyw,c.r),vec4(c.r,p.yzx),step(p.x,c.r)); float d=q.x-min(q.w,q.y); float e=1.e-10; return vec3(abs(q.z+(q.w-q.y)/(6.*d+e)),d/(q.x+e),q.x); }
vec3 hsv2rgb(vec3 c){ vec4 K=vec4(1.,2./3.,1./3.,3.); vec3 p=abs(fract(c.xxx+K.xyz)*6.-K.www); return c.z*mix(K.xxx,clamp(p-K.xxx,0.,1.),c.y); }
vec3 trocaCor(vec3 cor, vec3 h, vec3 alvo, float peso){ if(alvo.x<0.||peso<=0.) return cor; vec3 n=hsv2rgb(vec3(alvo.x, clamp(h.y*alvo.y,0.,1.), clamp(h.z*alvo.z,0.,1.))); return mix(cor,n,peso); }`)
      .replace('#include <map_fragment>', `#include <map_fragment>
{ vec3 h=rgb2hsv(diffuseColor.rgb);
  float sat=smoothstep(.12,.28,h.y);
  float roxo=smoothstep(.66,.71,h.x)*(1.-smoothstep(.88,.93,h.x))*sat;          // macacão e cartolas
  float limao=smoothstep(.11,.15,h.x)*(1.-smoothstep(.30,.36,h.x))*smoothstep(.25,.4,h.y); // cabelo
  diffuseColor.rgb=trocaCor(diffuseColor.rgb,h,uRoupa,roxo);
  diffuseColor.rgb=trocaCor(diffuseColor.rgb,h,uCabelo,limao); }`);
  };
  c.customProgramCacheKey = () => 'troca-cor-v1';
  c.needsUpdate = true; return c;
}

export function criarBoneco3D(lib, { semente = 1, sexo = 'm', enfeite = null } = {}) {
  const pool = lib.modelos.filter((m) => !m.sexo || m.sexo === sexo); const lista = pool.length ? pool : lib.modelos;
  const M = lista[(semente >>> 0) % lista.length];
  const obj = SkeletonUtils.clone(M.cena); obj.scale.setScalar(M.escala); obj.position.y = M.baseY;
  const raiz = new T.Group(); raiz.add(obj);
  // roupa: cada boneco novo pega a próxima combinação de cor da roupa + cor do cabelo (35 seguidos nunca se repetem; a Rosa dá outra)
  const visual = proximoVisual(lib, M);
  obj.traverse((o) => { if (o.isMesh) { const um = (m) => vestirMaterial(m, visual); o.material = Array.isArray(o.material) ? o.material.map(um) : um(o.material); } });
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
