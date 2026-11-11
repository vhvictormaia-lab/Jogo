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
// textura 2048 -> 1024: 4x menos memória de vídeo, quase igual na tela do celular
function reduzirTextura(t, max = 1024) {
  const im = t.image; if (!im) return;
  // o FBX carrega a imagem depois: espera ela chegar pra reduzir
  if (im.complete === false || !(im.naturalWidth || im.width)) { if (im.addEventListener && !t.userData.esperaReduzir) { t.userData.esperaReduzir = true; im.addEventListener('load', () => { reduzirTextura(t, max); t.needsUpdate = true; }, { once: true }); } return; }
  const w = im.naturalWidth || im.width, h = im.naturalHeight || im.height;
  if (Math.max(w, h) <= max) return;
  try { const k = max / Math.max(w, h); const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); t.image = c; } catch (e) {}
}
function prepararModelo(r, url) {
  const cena = r.scene || r;
  // o FBX da Mixamo vem com material brilhante (Phong) e a textura sem a cor certa (fica lavado/rosado):
  // troca por material fosco e marca a textura como sRGB, igual ao que se vê no site
  cena.traverse((o) => {
    if (!o.isMesh) return; o.frustumCulled = false;
    const mats = (Array.isArray(o.material) ? o.material : [o.material]).map((m) => {
      if (!m) return m; const map = m.map || null;
      if (map) { reduzirTextura(map); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 2; map.needsUpdate = true; }
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
  // danças da pasta "dancas" (servem para todos) + as de cada boneco (pasta dancas/<nome do boneco>, baixadas com ele na Mixamo)
  const lerDancas = async (urls) => {
    const out = [];
    for (const u of urls || []) {
      try { const r = await carregar(u); for (const c of r.animations || []) { if (!c.name || /mixamo\.com|Take 001|^Armature/i.test(c.name)) c.name = nomeArq(u); out.push(c); } }
      catch (e) { console.warn('dança não carregou', u, e); }
    }
    return out;
  };
  const geral = await lerDancas(lista.dancas);
  Object.assign(lib, separar(geral));
  for (const m of lib.modelos) {
    const proprias = (lista.dancasPorBoneco || {})[m.nome] || (lista.dancasPorBoneco || {})[m.nome.toLowerCase()];
    if (proprias && proprias.length) m.mov = separar(await lerDancas(proprias));
  }
  // nomes de todas as danças (o coreógrafo escolhe pelo nome e cada boneco dança a sua versão)
  const nomes = new Set(lib.dancas.map((c) => c.name)); for (const m of lib.modelos) if (m.mov) for (const c of m.mov.dancas) nomes.add(c.name);
  if (!lib.dancas.length) { const m = lib.modelos.find((x) => x.mov && x.mov.dancas.length); if (m) Object.assign(lib, { dancas: m.mov.dancas.slice(), andar: lib.andar || m.mov.andar, correr: lib.correr || m.mov.correr, parado: lib.parado || m.mov.parado, comemora: lib.comemora || m.mov.comemora }); }
  for (const m of lib.modelos) if (m.mov) for (const c of m.mov.dancas) if (!lib.dancas.some((x) => x.name === c.name)) lib.dancas.push(c);
  lib.nomesDancas = [...nomes];
  // texturas dos bonecos: espera as imagens chegarem e reduz de 2048 pra 1024 (4x menos memória de vídeo)
  const mapas = new Set(); for (const m of lib.modelos) (m.cena || m.obj || m.scene || m).traverse?.((o) => { if (o.isMesh) for (const mt of [].concat(o.material)) if (mt && mt.map) mapas.add(mt.map); });
  for (let i = 0; i < 100 && [...mapas].some((t) => !t.image || t.image.complete === false); i++) await new Promise((r) => setTimeout(r, 100));
  for (const t of mapas) { reduzirTextura(t); t.needsUpdate = true; }
  lib.texturasReduzidas = mapas.size;
  try { criarBlocos(lib); } catch (e) { console.warn('bonecos de blocos não montaram', e); }
  return lib;
}

// ---------- BONECOS DE BLOCOS (feitos só com código) ----------
// Pega o esqueleto de um personagem que já dança (mesmos ossos da Mixamo) e prende caixas nos ossos:
// cabeça quadrada, corpo, braços, pernas. Dançam as mesmas danças e são levíssimos (poucas centenas de triângulos).
// Camisa roxa e cabelo verde-limão de propósito: o sistema de roupas troca essas cores, então cada um sai de um jeito.
const BLOCOS = [
  { nome: 'bloquinho-menino', sexo: 'm', camisa: 0x7a3cff, calca: 0x2d5bd6, pele: 0xf1c08f, cabelo: 0x9be22d, sapato: 0x222233, menina: false },
  { nome: 'bloquinha-menina', sexo: 'f', camisa: 0xb43cff, calca: 0xff5fa2, pele: 0xd9a06f, cabelo: 0x8fe03a, sapato: 0xffffff, menina: true },
];
function rostoBloco(pele, menina) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#' + new T.Color(pele).getHexString(); g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffffff'; g.fillRect(28, 44, 26, 26); g.fillRect(74, 44, 26, 26);
  g.fillStyle = '#1b1430'; g.fillRect(36, 50, 14, 18); g.fillRect(82, 50, 14, 18);
  if (menina) { g.fillRect(26, 38, 8, 6); g.fillRect(94, 38, 8, 6); g.fillStyle = '#ff7aa8'; g.fillRect(18, 78, 16, 8); g.fillRect(94, 78, 16, 8); g.fillStyle = '#1b1430'; }
  g.lineWidth = 7; g.strokeStyle = '#1b1430'; g.lineCap = 'round'; g.beginPath(); g.arc(64, 78, 20, 0.2 * Math.PI, 0.8 * Math.PI); g.stroke();
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.magFilter = T.NearestFilter; return t;
}
function criarBlocos(lib) {
  const donor = lib.modelos.find((m) => m.mov && m.mov.dancas.length && /palhac|noel|duende|rena|grilo|barata/.test(m.nome)) || lib.modelos.find((m) => m.mov && m.mov.dancas.length);
  if (!donor) return;
  for (const B of BLOCOS) {
    const cena = SkeletonUtils.clone(donor.cena);
    const sk = []; cena.traverse((o) => { if (o.isMesh) sk.push(o); }); for (const o of sk) o.parent.remove(o);
    cena.updateMatrixWorld(true);
    const ossos = []; cena.traverse((o) => { if (o.isBone) ossos.push(o); });
    const osso = (n) => ossos.find((o) => new RegExp('(^|[^A-Za-z])' + n + '$').test(o.name) || o.name.endsWith(n) && !/Index|Middle|Ring|Pinky|Thumb/.test(o.name));
    const P = (o) => o.getWorldPosition(new T.Vector3());
    const hips = osso('Hips'), neck = osso('Neck'), head = osso('Head');
    if (!hips || !neck || !head) continue;
    const top = osso('HeadTop_End');
    const pe = (L) => osso(L + 'Foot'), ombro = (L) => osso(L + 'Arm');
    const pH = P(hips), pN = P(neck), pHead = P(head);
    const chao = Math.min(P(pe('Left') || hips).y, P(pe('Right') || hips).y);
    const larg = ombro('Left') && ombro('Right') ? P(ombro('Left')).distanceTo(P(ombro('Right'))) : (pN.y - chao) * 0.3;
    const u = larg; // unidade: largura dos ombros
    const mat = (cor, extra = {}) => new T.MeshStandardMaterial({ color: cor, roughness: 0.8, metalness: 0, ...extra });
    const mCamisa = mat(B.camisa), mCalca = mat(B.calca), mPele = mat(B.pele), mCabelo = mat(B.cabelo), mSapato = mat(B.sapato);
    // caixa presa num osso, posicionada no mundo (o osso leva ela junto quando dança)
    const caixa = (pai, w, h, d, centro, material, dir = null) => {
      const m = new T.Mesh(new T.BoxGeometry(w, h, d), material); m.position.copy(centro);
      if (dir) m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.clone().normalize());
      cena.add(m); m.updateMatrixWorld(true); pai.attach(m); m.castShadow = true; return m;
    };
    const membro = (a, b, esp, material, extra = 0) => { if (!a || !b) return; const pa = P(a), pb = P(b); const dir = pb.clone().sub(pa); const len = dir.length() + extra; caixa(a, esp, len, esp, pa.clone().add(pb).multiplyScalar(0.5), material, dir); };
    // corpo
    const altCorpo = pN.y - pH.y;
    caixa(osso('Spine1') || osso('Spine') || hips, u * 0.95, altCorpo * 1.05, u * 0.5, new T.Vector3(pH.x, pH.y + altCorpo * 0.55, pH.z), mCamisa);
    caixa(hips, u * 0.9, altCorpo * 0.32, u * 0.48, new T.Vector3(pH.x, pH.y + altCorpo * 0.02, pH.z), B.menina ? mCamisa : mCalca);
    if (B.menina) caixa(hips, u * 1.15, altCorpo * 0.42, u * 0.68, new T.Vector3(pH.x, pH.y - altCorpo * 0.12, pH.z), mCalca); // saia
    // cabeça quadrada com rosto na frente (+Z)
    const lado = u * 0.92; const cH = new T.Vector3(pN.x, pN.y + lado * 0.55, pN.z);
    const rosto = mat(0xffffff, { map: rostoBloco(B.pele, B.menina) });
    caixa(head, lado, lado, lado, cH, [mPele, mPele, mPele, mPele, rosto, mPele]);
    caixa(head, lado * 1.06, lado * 0.26, lado * 1.06, cH.clone().add(new T.Vector3(0, lado * 0.47, -lado * 0.02)), mCabelo); // cabelo em cima
    caixa(head, lado * 1.06, lado * (B.menina ? 1.15 : 0.6), lado * 0.22, cH.clone().add(new T.Vector3(0, B.menina ? -lado * 0.12 : lado * 0.2, -lado * 0.47)), mCabelo); // nuca
    caixa(neck, u * 0.3, (pHead.y - pN.y) + lado * 0.1, u * 0.3, new T.Vector3(pN.x, (pN.y + pHead.y) / 2, pN.z), mPele);
    // braços, mãos, pernas, pés
    for (const L of ['Left', 'Right']) {
      const a = osso(L + 'Arm'), fa = osso(L + 'ForeArm'), h = osso(L + 'Hand');
      membro(a, fa, u * 0.3, mCamisa, u * 0.1); membro(fa, h, u * 0.27, mPele, u * 0.05);
      if (h) caixa(h, u * 0.3, u * 0.3, u * 0.3, P(h).add(P(h).sub(P(fa)).normalize().multiplyScalar(u * 0.12)), mPele);
      const ul = osso(L + 'UpLeg'), lg = osso(L + 'Leg'), ft = osso(L + 'Foot'), toe = osso(L + 'ToeBase');
      membro(ul, lg, u * 0.4, mCalca, u * 0.08); membro(lg, ft, u * 0.36, B.menina ? mPele : mCalca, u * 0.06);
      if (ft) { const pf = P(ft), pt = toe ? P(toe) : pf.clone().add(new T.Vector3(0, 0, u * 0.3)); const meio = pf.clone().add(pt).multiplyScalar(0.5); meio.y = chao + u * 0.1;
        caixa(ft, u * 0.4, u * 0.2, pf.distanceTo(pt) + u * 0.35, meio, mSapato); }
    }
    let n = 0; cena.traverse((o) => { if (o.isMesh) n++; });
    lib.modelos.push({ ...donor, cena, nome: B.nome, sexo: B.sexo, adapt: new Map(), blocos: true, pecas: n });
  }
}
// separa as animações em andar, correr, parado, comemorar e danças
function separar(todos) {
  const s = { dancas: [], andar: null, correr: null, parado: null, comemora: null };
  for (const c of todos) {
    if (!s.andar && ehAndar(c.name)) s.andar = noLugar(c);
    else if (!s.correr && ehCorrer(c.name)) s.correr = noLugar(c);
    else if (!s.parado && ehParado(c.name)) s.parado = noLugar(c);
    else if (!s.comemora && ehComemora(c.name)) s.comemora = noLugar(c);
    else if (!ehAndar(c.name) && !ehCorrer(c.name) && !ehParado(c.name) && !/death|die|hit|punch|kick|fall|tpose|t-pose/i.test(c.name)) s.dancas.push(noLugar(c));
  }
  if (!s.dancas.length && s.parado) s.dancas.push(s.parado);
  return s;
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
  // cada um que entra vira o próximo bicho da lista (a roda fica toda misturada; a Rosa troca por outro)
  lib.proxModelo ||= {}; const k = pool.length ? sexo : 'todos'; lib.proxModelo[k] = (lib.proxModelo[k] || 0) + 1;
  const M = lista[lib.proxModelo[k] % lista.length];
  const obj = SkeletonUtils.clone(M.cena); obj.scale.setScalar(M.escala); obj.position.y = M.baseY;
  const raiz = new T.Group(); raiz.add(obj);
  // roupa: cada boneco novo pega a próxima combinação de cor da roupa + cor do cabelo (35 seguidos nunca se repetem; a Rosa dá outra)
  const visual = proximoVisual(lib, M);
  obj.traverse((o) => { if (o.isMesh) { const um = (m) => vestirMaterial(m, visual); o.material = Array.isArray(o.material) ? o.material.map(um) : um(o.material); } });
  let cabeca = null; if (M.cabeca) obj.traverse((o) => { if (!cabeca && o.name === M.cabeca) cabeca = o; });
  const mixer = new T.AnimationMixer(obj);
  // movimentos deste boneco: os dele (pasta dancas/<nome>) e, no que faltar, os gerais
  const mv = M.mov || {}; const mov = { dancas: (mv.dancas && mv.dancas.length) ? mv.dancas : lib.dancas, andar: mv.andar || lib.andar, correr: mv.correr || lib.correr, parado: mv.parado || lib.parado, comemora: mv.comemora || lib.comemora };
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
    // a dança pedida (pelo nome) na versão deste boneco; se ele não tiver essa, uma das dele
    dancar(clip, opc) {
      const minhas = mov.dancas.length ? mov.dancas : lib.dancas; const nome = clip && (clip.name || clip);
      const c = (nome && minhas.find((x) => x.name === nome)) || (!M.mov && clip && clip.isAnimationClip ? clip : null) || minhas[Math.floor(Math.random() * minhas.length)];
      return tocar(c, opc);
    },
    andar(correndo) { return tocar((correndo && mov.correr) || mov.andar || mov.correr || mov.parado || mov.dancas[0], { fade: 0.25 }); },
    comemorar() { return tocar(mov.comemora || mov.dancas[0], { loop: !mov.comemora, fade: 0.25 }); },
    get clip() { return clipAtual; },
    atualizar(dt) { mixer.update(dt); },
  };
}
