// Caveiras dançantes do Baile do Abismo (personagens "KayKit Skeletons" de Kay Lousberg, licença CC0).
// 4 tipos: caveira simples, mago (chapéu), encapuzada (capa) e guerreira (capacete).
// As animações prontas do pacote (andar, correr, comemorar, pular, deitar, desmontar e remontar...) vêm do caveira.glb;
// os passos de dança do baile (requebrar, agachar até o chão, passinho...) são somados por cima, osso por osso.
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const TIPOS = [['caveira', 'caveira.glb'], ['mago', 'caveira-mago.glb'], ['capuz', 'caveira-capuz.glb'], ['guerreiro', 'caveira-guerreiro.glb']];
let T = null;

// carrega os 4 tipos; "carregar(url)" devolve o glTF já lido (permite a página de demonstração usar arquivos embutidos)
export async function carregarCaveiras(THREE, carregar, base = 'esqueletos/') {
  T = THREE;
  const lib = { modelos: [], clips: new Map(), calib: null };
  for (const [nome, arq] of TIPOS) {
    try { const g = await carregar(base + arq); g.scene.traverse((o) => { if (o.isMesh) { o.frustumCulled = false; } }); lib.modelos.push({ nome, cena: g.scene });
      for (const c of g.animations || []) lib.clips.set(c.name, c); } catch (e) { console.warn('caveira não carregou', arq, e); }
  }
  if (!lib.modelos.length) throw new Error('sem caveiras');
  lib.calib = calibrar(lib.modelos[0].cena, lib.clips.get('Idle'));
  return lib;
}

// descobre, em cada osso, qual eixo leva o membro para a frente, para o lado e gira (na pose parada)
const OSSOS = { hips: 'spine', spine: 'chest', chest: 'head', head: null, upperarml: 'lowerarml', lowerarml: 'wristl', upperarmr: 'lowerarmr', lowerarmr: 'wristr',
  upperlegl: 'lowerlegl', lowerlegl: 'footl', upperlegr: 'lowerlegr', lowerlegr: 'footr' };
function calibrar(cena, idle) {
  const c = SkeletonUtils.clone(cena); const mixer = new T.AnimationMixer(c);
  if (idle) { mixer.clipAction(idle).play(); mixer.update(0.01); }
  c.updateMatrixWorld(true);
  const osso = (n) => { let r = null; c.traverse((o) => { if (!r && o.isBone && o.name === n) r = o; }); return r; };
  const res = {};
  for (const [n, filho] of Object.entries(OSSOS)) {
    const b = osso(n); if (!b) continue;
    const pb = new T.Vector3(); b.getWorldPosition(pb);
    let v; if (filho && osso(filho)) { const pf = new T.Vector3(); osso(filho).getWorldPosition(pf); v = pf.sub(pb); } else v = new T.Vector3(0, 0.4, 0);
    const q = new T.Quaternion(); b.getWorldQuaternion(q);
    const eixos = [new T.Vector3(1, 0, 0), new T.Vector3(0, 1, 0), new T.Vector3(0, 0, 1)];
    const info = eixos.map((e) => { const w = e.clone().applyQuaternion(q); const d = w.clone().cross(v); return { e, w, d }; });
    const frente = info.reduce((a, b2) => (Math.abs(b2.d.z) > Math.abs(a.d.z) ? b2 : a));
    const resto = info.filter((x) => x !== frente);
    const lado = resto.reduce((a, b2) => (Math.abs(b2.d.x) > Math.abs(a.d.x) ? b2 : a));
    const giro = resto.find((x) => x !== lado);
    res[n] = { frente: [frente.e, Math.sign(frente.d.z) || 1], lado: [lado.e, Math.sign(lado.d.x) || 1], giro: [giro.e, Math.sign(giro.w.y) || 1], comp: v.length() };
  }
  return res;
}

const sorteador = (sem) => { let s = (sem >>> 0) || 1; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); r.de = (a) => a[Math.floor(r() * a.length)]; r.chance = (p) => r() < p; return r; };
const OLHOS = [0xffff77, 0xffff77, 0xff2a2a, 0x3bff6a, 0x3bd5ff, 0xff4fd8, 0xb45bff, 0xff8a1e];
const OSSO_COR = [null, null, null, null, 0xd8ffd0, 0xffd8f0, 0xd8e4ff, 0xfff0b0, 0xc8b8ff];
const CORES = [0xff3d8b, 0x7a3cff, 0x2f7bff, 0x16b37a, 0xffb02e, 0x00e5ff, 0xb8ff2e, 0xffe600, 0xff6a00, 0xe23b4b, 0xffffff, 0x1c1c28];

// enfeites na cabeça (anos 80 e de festa)
export function enfeite(tipo, cor) {
  if (!T) T = enfeite.THREE;
  const g = new T.Group(); const m = (c) => new T.MeshToonMaterial({ color: c });
  const M = (geo, mat, x = 0, y = 0, z = 0) => { const o = new T.Mesh(geo, mat); o.position.set(x, y, z); g.add(o); return o; };
  if (tipo === 'oculos') { const o = M(new T.BoxGeometry(0.78, 0.17, 0.05), m(cor), 0, 0.02, 0); for (let i = -2; i <= 2; i++) M(new T.BoxGeometry(0.76, 0.022, 0.06), m(0x111111), 0, 0.02 + i * 0.032, 0.01); g.userData.frente = true; }
  else if (tipo === 'faixa') { const f = M(new T.TorusGeometry(0.47, 0.06, 8, 24), m(cor)); f.rotation.x = Math.PI / 2; f.scale.set(1, 0.85, 1); }
  else if (tipo === 'cartola' || tipo === 'noivo') { const c = tipo === 'noivo' ? 0x111111 : cor; M(new T.CylinderGeometry(0.42, 0.42, 0.05, 20), m(c)); M(new T.CylinderGeometry(0.28, 0.28, 0.55, 20), m(c), 0, 0.3, 0); M(new T.CylinderGeometry(0.285, 0.285, 0.1, 20), m(tipo === 'noivo' ? 0xffffff : 0xff3d8b), 0, 0.1, 0); g.rotation.z = -0.15; }
  else if (tipo === 'coroa') { const o = m(0xffc83d); M(new T.CylinderGeometry(0.3, 0.3, 0.14, 12, 1, true), o).material.side = T.DoubleSide; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; M(new T.ConeGeometry(0.07, 0.18, 6), o, Math.cos(a) * 0.29, 0.15, Math.sin(a) * 0.29); M(new T.SphereGeometry(0.045, 8, 6), m(0xff2a55), Math.cos(a) * 0.3, 0.02, Math.sin(a) * 0.3); } }
  else if (tipo === 'laco') { for (const l of [-1, 1]) { const c = M(new T.ConeGeometry(0.16, 0.3, 10), m(cor), 0.17 * l, 0, 0); c.rotation.z = (Math.PI / 2) * l; } M(new T.SphereGeometry(0.08, 10, 8), m(0xffffff)); g.position.x = 0.25; g.rotation.z = -0.4; }
  else if (tipo === 'flor') { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; M(new T.SphereGeometry(0.1, 8, 6), m(cor), Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0); } M(new T.SphereGeometry(0.08, 8, 6), m(0xffd23f), 0, 0, 0.03); g.userData.lado = true; }
  else if (tipo === 'cone') { const c = M(new T.ConeGeometry(0.24, 0.62, 16), m(cor), 0, 0.31, 0); M(new T.SphereGeometry(0.08, 8, 6), m(0xffffff), 0, 0.64, 0); g.rotation.z = 0.25; }
  else if (tipo === 'black') { const b = M(new T.SphereGeometry(0.62, 16, 12), m(0x2a1a12), 0, -0.05, -0.08); b.scale.set(1, 0.82, 0.95); }
  else if (tipo === 'moicano') { for (let i = 0; i < 7; i++) M(new T.ConeGeometry(0.07, 0.38, 6), m(cor), 0, 0.12, -0.36 + i * 0.12); }
  else if (tipo === 'fone') { const a = M(new T.TorusGeometry(0.5, 0.04, 6, 20, Math.PI), m(0x222222)); for (const l of [-1, 1]) { const c = M(new T.CylinderGeometry(0.15, 0.15, 0.1, 14), m(cor), 0.5 * l, -0.05, 0); c.rotation.z = Math.PI / 2; } }
  else if (tipo === 'veu') { const v = M(new T.ConeGeometry(0.7, 1.4, 20, 1, true), new T.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: T.DoubleSide }), 0, -0.55, -0.2); v.scale.z = 0.8;
    for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI; M(new T.SphereGeometry(0.07, 8, 6), m(0xffd1e3), Math.cos(a) * 0.36, 0.05 + Math.sin(a) * 0.06, 0.08); } }
  return g;
}

export function criarCaveira(lib, { semente = 1, sexo = 'm' } = {}) {
  const r = sorteador(semente), menina = sexo === 'f';
  const tipo = r.de(lib.modelos);
  const modelo = SkeletonUtils.clone(tipo.cena);
  const raiz = new T.Group(), giro = new T.Group(), base = new T.Group(); raiz.add(giro); giro.add(base); base.add(modelo);
  const PIV = 1.05; giro.position.y = PIV; base.position.y = -PIV;
  // cor dos olhos e dos ossos (uma por pessoa)
  const corOlho = r.de(OLHOS), corOsso = r.de(OSSO_COR);
  modelo.traverse((o) => {
    if (!o.isMesh) return;
    if (/Eyes/.test(o.name)) { o.material = o.material.clone(); o.material.color.setHex(corOlho); o.material.emissive.setHex(corOlho); o.material.emissiveIntensity = 1.6; }
    else if (corOsso) { o.material = o.material.clone(); o.material.color.setHex(corOsso); }
  });
  const ossos = {}; modelo.traverse((o) => { if (o.isBone) ossos[o.name] = o; });
  const chapeus = []; modelo.traverse((o) => { if (o.isMesh && /Hat|Hood|Helmet/.test(o.name)) chapeus.push(o); });
  // enfeite: quem não tem chapéu ganha um (menina: laço, flor, coroa...)
  let enf = null;
  const cabeca = ossos.head;
  const pode = chapeus.length ? ['oculos', 'oculos', 'faixa', null] : menina ? ['laco', 'laco', 'flor', 'coroa', 'oculos', 'black', null] : ['oculos', 'faixa', 'cartola', 'cone', 'coroa', 'black', 'moicano', 'fone', null, null];
  const tEnf = r.de(pode);
  function por(tipoE, cor) {
    if (!cabeca) return null; const g = enfeite(tipoE, cor); cabeca.add(g);
    // a cabeça do osso fica no pescoço: o crânio vai até ~0,9 acima
    if (g.userData.frente) g.position.set(0, 0.42, 0.42); else if (g.userData.lado) g.position.set(0.45, 0.62, 0.15); else if (tipoE === 'faixa') g.position.set(0, 0.62, 0); else if (tipoE === 'black' || tipoE === 'veu') g.position.set(0, 0.72, 0); else if (tipoE === 'fone') g.position.set(0, 0.55, 0); else g.position.y += 0.86;
    return g;
  }
  if (tEnf) enf = por(tEnf, r.de(CORES));
  if (enf && tEnf === 'black') chapeus.forEach((c) => (c.visible = false));
  let par = null;
  function setPar(t) {
    if (par) { par.parent && par.parent.remove(par); par = null; }
    if (enf) enf.visible = !t || enf.userData.frente;
    chapeus.forEach((c) => (c.visible = !t && !(enf && tEnf === 'black')));
    if (t) par = por(t === 'noivo' ? 'noivo' : 'veu', 0xffffff);
  }
  // animações do pacote
  const mixer = new T.AnimationMixer(modelo);
  let atual = null, clipAtual = '';
  function clip(nome, { loop = true, fade = 0.25, vel = 1 } = {}) {
    if (clipAtual === nome && loop) return atual;
    const c = lib.clips.get(nome); if (!c) return null;
    const a = mixer.clipAction(c); a.reset(); a.setLoop(loop ? T.LoopRepeat : T.LoopOnce, Infinity); a.clampWhenFinished = !loop; a.timeScale = vel; a.enabled = true; a.setEffectiveWeight(1);
    if (atual && atual !== a) atual.crossFadeTo(a, fade, false); a.play(); atual = a; clipAtual = nome; return a;
  }
  clip('Idle'); if (atual) atual.time = r() * 2;
  // passos de dança somados por cima da animação
  const C = lib.calib, qd = new T.Quaternion(), qt = new T.Quaternion();
  function gira(nome, frente, lado, roda) {
    const b = ossos[nome], k = C[nome]; if (!b || !k) return;
    if (frente) { qt.setFromAxisAngle(k.frente[0], frente * k.frente[1]); b.quaternion.multiply(qt); }
    if (lado) { qt.setFromAxisAngle(k.lado[0], lado * k.lado[1]); b.quaternion.multiply(qt); }
    if (roda) { qt.setFromAxisAngle(k.giro[0], roda * k.giro[1]); b.quaternion.multiply(qt); }
  }
  const L1 = (C.upperlegl && C.upperlegl.comp) || 0.2, L2 = (C.lowerlegl && C.lowerlegl.comp) || 0.2;
  // guarda a pose original dos ossos que a dança mexe (para não acumular de um quadro para o outro)
  const MEXE = Object.keys(C).filter((n) => ossos[n]); const rep = MEXE.map((n) => ossos[n].quaternion.clone());
  function aplicar(P, dt, soClip) {
    MEXE.forEach((n, i) => ossos[n].quaternion.copy(rep[i]));
    mixer.update(dt);
    if (!soClip && P) {
      const hE = P.qE - P.ag * 1.35, kE = P.jE + P.ag * 2.4, hD = P.qD - P.ag * 1.35, kD = P.jD + P.ag * 2.4;
      gira('upperlegl', -hE, -P.aE, 0); gira('lowerlegl', -kE, 0, 0); gira('upperlegr', -hD, P.aD, 0); gira('lowerlegr', -kD, 0, 0);
      gira('upperarml', -P.eX, -P.eZ, 0); gira('lowerarml', P.eC * 0.8, 0, 0); gira('upperarmr', -P.dX, P.dZ, 0); gira('lowerarmr', P.dC * 0.8, 0, 0);
      gira('hips', P.ag * 0.15, -P.pz, P.py);
      gira('spine', (P.tx + P.ag * 0.35) * 0.5, -P.tz * 0.5, (P.ty - P.py * 0.6) * 0.5); gira('chest', (P.tx + P.ag * 0.35) * 0.5, (-P.tz + P.pz * 0.7) * 0.5, (P.ty - P.py * 0.6) * 0.5);
      gira('head', P.cx, -P.cz, P.cy);
      const ext = Math.max(L1 * Math.cos(hE) + L2 * Math.cos(hE + kE), L1 * Math.cos(hD) + L2 * Math.cos(hD + kD)) * Math.cos(Math.max(Math.abs(P.aE), Math.abs(P.aD)));
      modelo.position.y = ext - (L1 + L2);
      giro.position.y = PIV + P.y; giro.rotation.set(P.rx, P.ry, P.rz);
    } else { modelo.position.y = 0; giro.position.y = PIV; giro.rotation.set(0, 0, 0); }
  }
  return { raiz, aplicar, clip, setPar, altura: chapeus.length ? 2.35 : (tEnf === 'cartola' || tEnf === 'cone' ? 2.5 : 2.2), tipo: tipo.nome, duracao: (n) => (lib.clips.get(n) ? lib.clips.get(n).duration : 1) };
}
