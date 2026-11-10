// Dançarinos do Baile do Abismo: PALHAÇOS e COBRINHAS feitos só com código (não precisa de arquivo 3D).
// Cada pessoa ganha um visual sorteado pela "semente": cara, cabelo, roupa, chapéu, cor...
// Todos usam o mesmo jeito de dançar (POSES): pular, agachar até o chão, deitar, cambalhota, requebrar, passinho...
//   criarDancarino(THREE, {semente, sexo, tipo?}) -> { raiz, aplicar(pose, batida), setPar('noivo'|'noiva'|null), altura, tipo }
//   PASSOS[nome] = { dur (em batidas), f(b, pose) }   ·   poseVazia()   ·   poseAndar(fase, velocidade, pose)

let T = null;
const cacheGeo = new Map(), cacheMat = new Map(), cacheTex = new Map();
const geo = (k, f) => { if (!cacheGeo.has(k)) cacheGeo.set(k, f()); return cacheGeo.get(k); };
const ESF = () => geo('esf', () => new T.SphereGeometry(1, 16, 12));
const CAP = () => geo('cap', () => new T.CapsuleGeometry(0.5, 1, 4, 10));
const CIL = () => geo('cil', () => new T.CylinderGeometry(1, 1, 1, 16));
const CONE = () => geo('cone', () => new T.ConeGeometry(1, 1, 14));
const TORO = () => geo('toro', () => new T.TorusGeometry(1, 0.3, 8, 20));
const MEIA = () => geo('meia', () => new T.SphereGeometry(1, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2));
const MEIALUA = () => geo('meialua', () => new T.CircleGeometry(1, 20, Math.PI, Math.PI));
const ARCO = () => geo('arco', () => new T.TorusGeometry(1, 0.16, 6, 20, Math.PI));
let gradiente = null;
function mat(cor, extra) {
  const k = cor + (extra ? JSON.stringify(Object.keys(extra)) + (extra.map ? extra.map.uuid : '') : '');
  if (cacheMat.has(k)) return cacheMat.get(k);
  if (!gradiente) {
    gradiente = new T.DataTexture(new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]), 3, 1, T.RGBAFormat);
    gradiente.minFilter = gradiente.magFilter = T.NearestFilter; gradiente.needsUpdate = true;
  }
  const m = new T.MeshToonMaterial({ color: cor, gradientMap: gradiente, ...(extra || {}) }); cacheMat.set(k, m); return m;
}
const basico = (cor) => { const k = 'b' + cor; if (!cacheMat.has(k)) cacheMat.set(k, new T.MeshBasicMaterial({ color: cor })); return cacheMat.get(k); };
const nariz = (cor) => { const k = 'n' + cor; if (!cacheMat.has(k)) cacheMat.set(k, new T.MeshStandardMaterial({ color: cor, roughness: 0.3, emissive: 0x200008 })); return cacheMat.get(k); };
let preto = null;
function peca(pai, g, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, linha = 0) {
  const o = new T.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); pai.add(o);
  if (linha) { // contorno preto de desenho
    if (!preto) preto = new T.MeshBasicMaterial({ color: 0x0b0610, side: T.BackSide });
    const c = new T.Mesh(g, preto); const k = 1 + linha / Math.max(sx, sy, sz); c.scale.setScalar(k); o.add(c);
  }
  return o;
}
// estampas da roupa (desenhadas uma vez e guardadas)
const hex = (c) => '#' + c.toString(16).padStart(6, '0');
function estampa(tipo, c1, c2) {
  const k = tipo + c1 + '_' + c2; if (cacheTex.has(k)) return cacheTex.get(k);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
  g.fillStyle = hex(c1); g.fillRect(0, 0, 128, 128); g.fillStyle = hex(c2);
  if (tipo === 'listras') for (let i = 0; i < 8; i += 2) g.fillRect(i * 16, 0, 16, 128);
  else if (tipo === 'deitadas') for (let i = 0; i < 8; i += 2) g.fillRect(0, i * 16, 128, 16);
  else if (tipo === 'bolinhas') for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc(16 + x * 32 + (y % 2) * 16, 16 + y * 32, 8, 0, 7); g.fill(); }
  else if (tipo === 'xadrez') for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { if ((x + y) % 2) g.fillRect(x * 32, y * 32, 32, 32); }
  else if (tipo === 'losango') for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) { if ((x + y) % 2) continue; const cx = x * 64, cy = y * 64; g.beginPath(); g.moveTo(cx, cy - 32); g.lineTo(cx + 32, cy); g.lineTo(cx, cy + 32); g.lineTo(cx - 32, cy); g.fill(); }
  else if (tipo === 'metade') g.fillRect(64, 0, 64, 128);
  else if (tipo === 'zigue') { g.lineWidth = 12; g.strokeStyle = hex(c2); for (let y = 16; y < 128; y += 40) { g.beginPath(); for (let x = 0; x <= 128; x += 16) g.lineTo(x, y + ((x / 16) % 2 ? 12 : -12)); g.stroke(); } }
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; cacheTex.set(k, t); return t;
}
function sorteador(sem) { let s = (sem >>> 0) || 1; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296); r.de = (a) => a[Math.floor(r() * a.length)]; r.chance = (p) => r() < p; return r; }

const CORES = [0xff3d8b, 0x7a3cff, 0x2f7bff, 0x16b37a, 0xffb02e, 0xff5a3d, 0x00c2d1, 0xb8f03a, 0xe23b4b, 0xffffff, 0x1c1c28, 0xf4d35e, 0xff9ec7, 0x9b5de5, 0x00e5ff, 0xff6a00];
const CABELOS = [0x55e07a, 0xff3d8b, 0xffd23b, 0xff6a00, 0x2f7bff, 0x9b5de5, 0x1c1c28, 0xe23b4b, 0x00e5ff, 0xffffff, 0x8a4b2a, 0xb8f03a, 0xff9ec7];
const PELES = [0xf4ece6, 0xf4ece6, 0xe3e8d6, 0xffe2ea, 0xdfe7ff, 0xf2d3b3, 0xc89f7f, 0x8a5e45, 0xd8f0d0];
const NARIZES = [0xff1e3c, 0xff1e3c, 0xff1e3c, 0xff4fa0, 0x7a3cff, 0x2fd56a, 0xffc83d, 0x00c2d1];

// ======================= PALHAÇO =======================
function criarPalhaco(r, sexo) {
  const menina = sexo === 'f';
  const corpo = r.de(['normal', 'normal', 'gordo', 'magro', 'baixinho']);
  const larg = corpo === 'gordo' ? 1.3 : corpo === 'magro' ? 0.8 : 1;
  const alto = corpo === 'magro' ? 1.12 : corpo === 'baixinho' ? 0.86 : 1;
  const c1 = r.de(CORES), c2 = r.de(CORES.filter((c) => c !== c1)), c3 = r.de(CORES);
  const pele = r.de(PELES), terror = r.chance(0.4);
  const roupa = mat(0xffffff, { map: estampa(r.de(['listras', 'bolinhas', 'xadrez', 'losango', 'metade', 'deitadas', 'zigue', 'liso']), c1, c2) });
  const calca = r.chance(0.5) ? roupa : mat(r.de([c2, c3, 0x1c1c28, 0xffffff]));
  const L1 = 0.46 * alto, L2 = 0.44 * alto, PE = 0.1;
  const raiz = new T.Group(), giro = new T.Group(), base = new T.Group(); raiz.add(giro); giro.add(base);
  const PIV = 1.15 * alto; giro.position.y = PIV; base.position.y = -PIV;
  const pelve = new T.Group(); base.add(pelve);
  // quadril e calça (ou saia)
  if (menina && r.chance(0.7)) { // saia rodada / tutu
    const saia = peca(pelve, CONE(), r.chance(0.5) ? roupa : mat(c3), 0, -0.12, 0, 0.62 * larg, 0.55, 0.62 * larg, 0.03); saia.rotation.x = Math.PI; saia.position.y = -0.1;
    if (r.chance(0.5)) peca(pelve, TORO(), mat(0xffffff), 0, -0.36, 0, 0.6 * larg, 0.6 * larg, 0.5, 0).rotation.x = Math.PI / 2;
  } else peca(pelve, ESF(), calca, 0, -0.05, 0, 0.36 * larg, 0.24, 0.3 * larg, 0.04);
  const pernas = [];
  const sapato = mat(r.de([0xe0233a, 0x1c1c28, 0xffd23b, 0x2f7bff, 0xff3d8b, 0xffffff, 0x16b37a]));
  const meia = r.chance(0.5) ? mat(0xffffff, { map: estampa('deitadas', 0xffffff, r.de(CORES)) }) : calca;
  for (const lado of [-1, 1]) {
    const q = new T.Group(); q.position.set(0.18 * lado * larg, -0.05, 0); pelve.add(q);
    peca(q, CAP(), calca, 0, -L1 / 2, 0, 0.26 * Math.max(0.85, larg * 0.85), L1 * 0.85, 0.26, 0.03);
    const j = new T.Group(); j.position.y = -L1; q.add(j);
    peca(j, CAP(), meia, 0, -L2 / 2, 0, 0.2, L2 * 0.8, 0.2, 0.03);
    peca(j, ESF(), sapato, 0, -L2 - 0.02, 0.12, 0.17, 0.11, 0.3, 0.03); // sapatão de palhaço
    pernas.push({ q, j });
  }
  // tronco
  const tronco = new T.Group(); tronco.position.y = 0.05; pelve.add(tronco);
  const gordo = corpo === 'gordo';
  peca(tronco, ESF(), roupa, 0, 0.36, 0, 0.42 * larg, 0.46 * alto, 0.36 * (gordo ? 1.25 : 1), 0.04);
  for (let i = 0; i < 3; i++) peca(tronco, ESF(), mat(r.de([0xff1e3c, 0xffd23b, 0x2fd56a, 0xffffff, 0x2f7bff])), 0, 0.55 - i * 0.18, 0.35 * (gordo ? 1.25 : 1), 0.06, 0.06, 0.04);
  const gola = r.de(menina ? ['babado', 'babado', 'laco'] : ['babado', 'babado', 'gravata', 'borboleta']);
  if (gola === 'babado') { const g = peca(tronco, TORO(), mat(r.chance(0.5) ? 0xffffff : c3), 0, 0.78, 0, 0.36 * larg, 0.36 * larg, 0.5, 0.03); g.rotation.x = Math.PI / 2; }
  else if (gola === 'gravata') { peca(tronco, CONE(), mat(c3), 0, 0.45, 0.37, 0.09, 0.42, 0.04).rotation.x = Math.PI; peca(tronco, ESF(), mat(c3), 0, 0.72, 0.33, 0.08, 0.07, 0.05); }
  else { for (const l of [-1, 1]) { const c = peca(tronco, CONE(), mat(c3), 0.12 * l, 0.74, 0.33, 0.1, 0.2, 0.06, 0.02); c.rotation.z = Math.PI / 2 * l; } peca(tronco, ESF(), mat(c3), 0, 0.74, 0.35, 0.05, 0.05, 0.05); }
  // braços (luvas grandes)
  const luva = mat(r.chance(0.7) ? 0xffffff : r.de(CORES));
  const bracos = [];
  for (const lado of [-1, 1]) {
    const o = new T.Group(); o.position.set(0.4 * lado * larg, 0.66 * alto, 0); tronco.add(o);
    peca(o, CAP(), roupa, 0, -0.2, 0, 0.18, 0.4, 0.18, 0.03);
    const c = new T.Group(); c.position.y = -0.4; o.add(c);
    peca(c, CAP(), roupa, 0, -0.18, 0, 0.16, 0.34, 0.16, 0.03);
    peca(c, ESF(), luva, 0, -0.42, 0, 0.15, 0.14, 0.14, 0.03);
    bracos.push({ o, c });
  }
  // cabeça
  const cab = new T.Group(); cab.position.y = 0.86 * alto; tronco.add(cab);
  const tamCab = r.de([1, 1, 1.12, 0.92]);
  const cabeca = new T.Group(); cabeca.scale.setScalar(tamCab); cab.add(cabeca);
  peca(cabeca, ESF(), mat(pele), 0, 0.36, 0, 0.38, 0.4, 0.36, 0.04);
  // maquiagem e olhos
  const olhoTipo = terror ? 'terror' : r.de(['redondo', 'redondo', 'sono', 'doido', 'feliz', 'oculos']);
  const maq = r.chance(0.6) ? mat(r.de([0x2a1240, 0x2f7bff, 0xff3d8b, 0x16b37a, 0x1c1c28])) : null;
  for (const lado of [-1, 1]) {
    const g = new T.Group(); g.position.set(0.14 * lado, 0.44, 0.31); cabeca.add(g);
    if (maq && olhoTipo !== 'oculos') { const m = peca(g, ESF(), maq, 0, 0, -0.01, 0.1, 0.15, 0.04); m.rotation.z = 0.5 * lado; }
    const tam = olhoTipo === 'doido' ? (lado < 0 ? 1.35 : 0.8) : 1;
    if (olhoTipo === 'terror') {
      peca(g, ESF(), mat(0x2a0508), 0, 0, 0.02, 0.08, 0.09, 0.05, 0.01);
      peca(g, ESF(), basico(0xff1a1a), 0, 0, 0.05, 0.06, 0.065, 0.03);
      peca(g, ESF(), basico(0x000000), 0, 0, 0.075, 0.014, 0.055, 0.015);
      const s = peca(g, CAP(), mat(0x15101c), 0, 0.13, 0.03, 0.03, 0.12, 0.02); s.rotation.z = Math.PI / 2 + 0.8 * lado;
    } else if (olhoTipo === 'oculos') {
      peca(g, CIL(), basico(r.de([0x111111, 0xff3d8b, 0x00e5ff, 0xffd23b])), 0, 0, 0.04, 0.1, 0.03, 0.1).rotation.x = Math.PI / 2;
      if (lado > 0) peca(cabeca, CAP(), basico(0x111111), 0, 0.46, 0.35, 0.03, 0.14, 0.03).rotation.z = Math.PI / 2;
    } else {
      peca(g, ESF(), mat(0xffffff), 0, 0, 0.02, 0.08 * tam, (olhoTipo === 'feliz' ? 0.05 : 0.1) * tam, 0.05, 0.01);
      peca(g, ESF(), basico(0x111111), 0.01 * lado, olhoTipo === 'sono' ? -0.03 : 0, 0.06, 0.035 * tam, 0.045 * tam, 0.02);
      if (olhoTipo === 'sono') peca(g, ESF(), mat(pele), 0, 0.05, 0.035, 0.085, 0.06, 0.05);
      if (menina) for (let k = 0; k < 3; k++) { const c = peca(g, CAP(), basico(0x111111), (0.03 + k * 0.03) * lado, 0.1, 0.04, 0.012, 0.06, 0.01); c.rotation.z = -0.5 * lado - k * 0.2 * lado; }
      const s = peca(g, CAP(), mat(0x15101c), 0, 0.14 * tam, 0.03, 0.025, 0.1, 0.02); s.rotation.z = Math.PI / 2 + r.de([0.2, -0.3, 0.5]) * lado;
    }
  }
  // nariz
  const nz = r.de([0.08, 0.1, 0.13]);
  peca(cabeca, ESF(), nariz(r.de(NARIZES)), 0, 0.34, 0.37, nz, nz, nz, 0.01);
  // boca
  const bocaTipo = terror ? 'dentes' : r.de(['sorriso', 'sorriso', 'aberta', 'lingua', 'dentes']);
  const bg = new T.Group(); bg.position.set(0, 0.22, 0.32); bg.rotation.x = -0.3; cabeca.add(bg);
  if (bocaTipo === 'aberta') { peca(bg, ESF(), basico(0x3a0612), 0, 0, 0.01, 0.08, 0.1, 0.03); peca(bg, TORO(), mat(0xe0233a), 0, 0, 0.02, 0.09, 0.11, 0.1); }
  else {
    const d = new T.Mesh(MEIALUA(), basico(0x3a0612)); d.scale.set(0.19, 0.13, 1); d.position.z = 0.03; bg.add(d);
    const lab = new T.Mesh(ARCO(), mat(menina ? 0xff2a6a : 0xe0233a)); lab.scale.set(0.2, 0.2, 0.25); lab.rotation.z = Math.PI; lab.position.z = 0.02; bg.add(lab);
    if (bocaTipo === 'dentes') for (let i = 0; i < 7; i++) { const dt = peca(bg, CONE(), mat(0xf2ecd8), -0.13 + i * 0.043, -0.015, 0.04, 0.018, 0.05, 0.018); dt.rotation.z = Math.PI; }
    if (bocaTipo === 'lingua') peca(bg, ESF(), mat(0xff6a8a), 0.03, -0.1, 0.04, 0.06, 0.08, 0.03);
  }
  if (!terror) for (const l of [-1, 1]) peca(cabeca, ESF(), mat(0xff7a9a), 0.23 * l, 0.27, 0.27, 0.07, 0.05, 0.03);
  // cabelo
  const corCab = r.de(CABELOS), mc = mat(corCab);
  const cabTipo = r.de(menina ? ['chiquinha', 'liso', 'black', 'cachos', 'liso', 'coque', 'chiquinha'] : ['lados', 'lados', 'careca', 'black', 'moicano', 'espetado', 'topete', 'cachos', 'liso']);
  let topo = 0.76;
  if (cabTipo === 'lados' || cabTipo === 'careca') { if (cabTipo === 'lados') for (const l of [-1, 1]) for (let i = 0; i < 3; i++) peca(cabeca, ESF(), mc, (0.34 + (i % 2) * 0.08) * l, 0.42 + (i - 1) * 0.1, -0.05 - i * 0.05, 0.13, 0.12, 0.13, 0.015); }
  else if (cabTipo === 'black') { peca(cabeca, ESF(), mc, 0, 0.52, -0.06, 0.55, 0.5, 0.52, 0.03); topo = 1.02; }
  else if (cabTipo === 'moicano') { for (let i = 0; i < 6; i++) { const c = peca(cabeca, CONE(), mc, 0, 0.78, -0.25 + i * 0.09, 0.06, 0.32, 0.06, 0.01); c.rotation.x = -0.3 + i * 0.1; } topo = 1.0; }
  else if (cabTipo === 'espetado') { for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; const c = peca(cabeca, CONE(), mc, Math.cos(a) * 0.26, 0.66, Math.sin(a) * 0.24 - 0.04, 0.07, 0.3, 0.07, 0.01); c.rotation.set(Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7); } topo = 0.95; }
  else if (cabTipo === 'topete') { peca(cabeca, ESF(), mc, 0, 0.74, 0.12, 0.26, 0.17, 0.3, 0.02); peca(cabeca, ESF(), mc, 0, 0.6, -0.12, 0.36, 0.24, 0.3, 0.02); topo = 0.92; }
  else if (cabTipo === 'cachos') { for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; peca(cabeca, ESF(), mc, Math.cos(a) * 0.36, 0.5 + Math.sin(i * 1.7) * 0.18, Math.sin(a) * 0.32 - 0.05, 0.12, 0.12, 0.12, 0.01); } peca(cabeca, ESF(), mc, 0, 0.7, -0.03, 0.3, 0.14, 0.28, 0.01); topo = 0.86; }
  else if (cabTipo === 'liso') { peca(cabeca, ESF(), mc, 0, 0.56, -0.03, 0.41, 0.28, 0.4, 0.02); peca(cabeca, CAP(), mc, 0, 0.22, -0.24, 0.66, 0.75, 0.22, 0.02); peca(cabeca, ESF(), mc, 0, 0.66, 0.22, 0.32, 0.1, 0.12, 0.01); topo = 0.86; }
  else if (cabTipo === 'chiquinha') { peca(cabeca, ESF(), mc, 0, 0.56, -0.03, 0.4, 0.26, 0.39, 0.02); for (const l of [-1, 1]) { peca(cabeca, ESF(), mc, 0.46 * l, 0.5, -0.1, 0.16, 0.22, 0.16, 0.015); peca(cabeca, ESF(), mat(r.de(CORES)), 0.38 * l, 0.6, -0.08, 0.06, 0.06, 0.06); } topo = 0.84; }
  else if (cabTipo === 'coque') { peca(cabeca, ESF(), mc, 0, 0.56, -0.03, 0.4, 0.26, 0.39, 0.02); peca(cabeca, ESF(), mc, 0, 0.86, -0.08, 0.17, 0.17, 0.17, 0.015); topo = 1.02; }
  // chapéu
  const chapeu = new T.Group(); cabeca.add(chapeu);
  const chTipo = r.de(menina ? [null, null, 'laco', 'laco', 'flor', 'cone', 'coroa'] : [null, null, 'cartola', 'cone', 'coco', 'bone', 'coroa', 'cartola']);
  const cc = mat(r.de([c1, c2, c3, 0x1c1c28, 0x5b2a86]));
  if (chTipo === 'cartola') { chapeu.position.set(0.05, topo - 0.06, 0); chapeu.rotation.z = -0.2; peca(chapeu, CIL(), cc, 0, 0, 0, 0.34, 0.04, 0.34, 0.02); peca(chapeu, CIL(), cc, 0, 0.2, 0, 0.22, 0.4, 0.22, 0.02); peca(chapeu, CIL(), mat(r.de(CORES)), 0, 0.06, 0, 0.225, 0.07, 0.225); topo += 0.42; }
  else if (chTipo === 'cone') { chapeu.position.set(0, topo - 0.04, 0); chapeu.rotation.z = r.de([-0.3, 0.25, 0]); peca(chapeu, CONE(), mat(0xffffff, { map: estampa('listras', c3, 0xffffff) }), 0, 0.22, 0, 0.18, 0.46, 0.18, 0.02); peca(chapeu, ESF(), mat(0xffffff), 0, 0.47, 0, 0.06, 0.06, 0.06); topo += 0.5; }
  else if (chTipo === 'coco') { chapeu.position.set(0, topo - 0.08, 0); peca(chapeu, MEIA(), cc, 0, 0, 0, 0.26, 0.24, 0.26, 0.02); peca(chapeu, CIL(), cc, 0, 0, 0, 0.36, 0.025, 0.36, 0.015); topo += 0.18; }
  else if (chTipo === 'bone') { chapeu.position.set(0, topo - 0.12, 0); chapeu.rotation.y = r.de([0, Math.PI, 0.6]); peca(chapeu, MEIA(), cc, 0, 0, 0, 0.36, 0.26, 0.36, 0.02); peca(chapeu, CIL(), cc, 0, 0.01, 0.3, 0.2, 0.02, 0.18); topo += 0.1; }
  else if (chTipo === 'coroa') { chapeu.position.set(0, topo - 0.05, 0); const o = mat(0xffc83d); peca(chapeu, CIL(), o, 0, 0, 0, 0.2, 0.1, 0.2, 0.015); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; peca(chapeu, CONE(), o, Math.cos(a) * 0.17, 0.1, Math.sin(a) * 0.17, 0.04, 0.12, 0.04); } topo += 0.18; }
  else if (chTipo === 'laco') { chapeu.position.set(0.18, topo - 0.06, 0); for (const l of [-1, 1]) { const c = peca(chapeu, CONE(), mat(c3), 0.1 * l, 0, 0, 0.09, 0.16, 0.05, 0.015); c.rotation.z = Math.PI / 2 * l; } peca(chapeu, ESF(), mat(0xffffff), 0, 0, 0, 0.045, 0.045, 0.045); topo += 0.08; }
  else if (chTipo === 'flor') { chapeu.position.set(0.22, topo - 0.12, 0.1); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; peca(chapeu, ESF(), mat(r.de([0xff2a55, 0xffd23b, 0xff9ec7])), Math.cos(a) * 0.07, Math.sin(a) * 0.07, 0, 0.05, 0.05, 0.03); } peca(chapeu, ESF(), mat(0xffd23b), 0, 0, 0.01, 0.04, 0.04, 0.03); }
  // noivo/noiva
  const par = new T.Group(); par.visible = false; cabeca.add(par); par.position.y = topo - 0.05;
  const altura = L1 + L2 + PE + 0.15 + 0.86 * alto + (topo + 0.05) * tamCab; // até o topo da cabeça/chapéu
  function setPar(tipo) {
    par.clear(); chapeu.visible = !tipo; par.visible = !!tipo; if (!tipo) return;
    if (tipo === 'noivo') { const p = basico(0x15151c); peca(par, CIL(), p, 0, 0, 0, 0.34, 0.04, 0.34); peca(par, CIL(), p, 0, 0.22, 0, 0.22, 0.44, 0.22, 0.02); peca(par, CIL(), mat(0xffffff), 0, 0.07, 0, 0.225, 0.07, 0.225); }
    else { const v = new T.Mesh(CONE(), new T.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, side: T.DoubleSide })); v.scale.set(0.52, 1.1, 0.5); v.position.set(0, -0.4, -0.15); par.add(v);
      for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI; peca(par, ESF(), mat(0xffd1e3), Math.cos(a) * 0.22, 0.03 + Math.sin(a) * 0.05, 0.05, 0.05, 0.05, 0.05); } }
  }
  // aplica a pose
  function aplicar(P) {
    let extMax = 0;
    pernas.forEach((p, i) => {
      const lado = i === 0 ? -1 : 1, h = (i === 0 ? P.qE : P.qD) - P.ag * 1.35, k = (i === 0 ? P.jE : P.jD) + P.ag * 2.4, ab = (i === 0 ? P.aE : P.aD);
      p.q.rotation.set(h, 0, ab * lado); p.j.rotation.x = k;
      extMax = Math.max(extMax, (L1 * Math.cos(h) + L2 * Math.cos(h + k)) * Math.cos(ab));
    });
    pelve.position.y = extMax + PE + 0.1; pelve.rotation.set(P.ag * 0.15, P.py, P.pz);
    tronco.rotation.set(P.tx + P.ag * 0.35, P.ty - P.py * 0.6, P.tz - P.pz * 0.7);
    bracos.forEach((b, i) => {
      const lado = i === 0 ? -1 : 1;
      b.o.rotation.set(i === 0 ? P.eX : P.dX, 0, (i === 0 ? P.eZ : P.dZ) * lado);
      b.c.rotation.x = -(i === 0 ? P.eC : P.dC);
    });
    cab.rotation.set(P.cx, P.cy, P.cz);
    giro.position.y = PIV + P.y; giro.rotation.set(P.rx, P.ry, P.rz);
  }
  return { raiz, aplicar, setPar, altura, tipo: 'palhaco' };
}

// ======================= COBRINHA DANÇANTE =======================
const COBRAS = [
  { nome: 'preta', c: 0x23232d, b: 0x6a6a80 }, { nome: 'verde', c: 0x2fbf4a, b: 0xc9f5a8 }, { nome: 'amarela', c: 0xffd23b, b: 0xfff2b8 },
  { nome: 'vermelha', c: 0xe02a3a, b: 0xffb8a8 }, { nome: 'coral', c: 0xe02a3a, b: 0xffd23b, faixa: 0x15151c }, { nome: 'azul', c: 0x2f7bff, b: 0xb8d8ff },
  { nome: 'roxa', c: 0x7a3cff, b: 0xd8c8ff }, { nome: 'laranja', c: 0xff6a00, b: 0xffd8a8 }, { nome: 'branca', c: 0xf4f4f8, b: 0xffd8e8 },
  { nome: 'rosa', c: 0xff6fb5, b: 0xffd8ec }, { nome: 'verde-limão', c: 0xb8f03a, b: 0xf2ffd0 }, { nome: 'cascavel', c: 0xb08a55, b: 0xf2e2c0, mancha: 0x5a3a1e },
];
function criarCobra(r, sexo) {
  const menina = sexo === 'f';
  const tipo = r.de(COBRAS), N = 10;
  const mc = mat(tipo.c), mb = mat(tipo.b), mf = tipo.faixa ? mat(tipo.faixa) : null, mm = tipo.mancha ? mat(tipo.mancha) : (r.chance(0.35) ? mat(r.de([0x15151c, 0xffd23b, 0xffffff])) : null);
  const listrada = !!mf || r.chance(0.3); const corListra = mf || mat(r.de([tipo.b, 0x15151c, 0xffffff]));
  const raiz = new T.Group(), giro = new T.Group(), base = new T.Group(); raiz.add(giro); giro.add(base);
  const PIV = 0.9; giro.position.y = PIV; base.position.y = -PIV;
  // rodinha do rabo no chão
  const roda = peca(base, TORO(), mc, 0, 0.14, 0, 0.42, 0.42, 0.45, 0.03); roda.rotation.x = Math.PI / 2;
  const ponta = peca(base, CONE(), mc, 0.42, 0.12, 0.25, 0.08, 0.35, 0.08, 0.02); ponta.rotation.set(0, 0, -1.2);
  const gomos = [];
  for (let i = 0; i < N; i++) {
    const f = i / (N - 1), rr = 0.3 - f * 0.08;
    const m = listrada && i % 2 ? corListra : mc;
    const g = peca(base, ESF(), m, 0, 0, 0, rr, rr * 0.95, rr, 0.03);
    if (i % 2 === 0) peca(g, ESF(), mb, 0, 0, 0.55, 0.7, 0.75, 0.5); // barriga clarinha
    if (mm && i % 2 === 1 && !listrada) peca(g, ESF(), mm, 0, 0.3, -0.6, 0.45, 0.35, 0.35); // manchinha nas costas
    gomos.push(g);
  }
  // cabeça
  const cab = new T.Group(); base.add(cab);
  const larga = r.chance(0.4);
  peca(cab, ESF(), mc, 0, 0.12, 0.06, larga ? 0.36 : 0.3, 0.26, 0.36, 0.03);
  peca(cab, ESF(), mb, 0, 0.02, 0.24, 0.24, 0.12, 0.2);
  const olhoTipo = r.de(['fofo', 'fofo', 'fenda', 'sono', 'oculos', 'doido']);
  for (const l of [-1, 1]) {
    const g = new T.Group(); g.position.set(0.15 * l, 0.3, 0.16); cab.add(g);
    if (olhoTipo === 'oculos') { peca(g, CIL(), basico(r.de([0x111111, 0xff3d8b, 0x00e5ff])), 0, 0, 0.06, 0.11, 0.03, 0.11).rotation.x = Math.PI / 2; continue; }
    const t = olhoTipo === 'doido' ? (l < 0 ? 1.3 : 0.8) : 1;
    peca(g, ESF(), mat(olhoTipo === 'fenda' ? 0xffd23b : 0xffffff), 0, 0, 0, 0.11 * t, 0.12 * t, 0.1 * t, 0.015);
    if (olhoTipo === 'fenda') peca(g, ESF(), basico(0x111111), 0, 0, 0.08, 0.02, 0.09, 0.03);
    else peca(g, ESF(), basico(0x111111), 0, 0.01, 0.08, 0.05 * t, 0.06 * t, 0.03);
    if (olhoTipo === 'sono') peca(g, ESF(), mc, 0, 0.06, 0.03, 0.12, 0.08, 0.1);
    if (menina) for (let k = 0; k < 3; k++) { const c = peca(g, CAP(), basico(0x111111), (0.03 + k * 0.035) * l, 0.12, 0.05, 0.014, 0.07, 0.01); c.rotation.z = -0.5 * l - k * 0.25 * l; }
  }
  // boca sorrindo e língua bifurcada
  const lab = new T.Mesh(ARCO(), basico(0x3a0612)); lab.scale.set(0.15, 0.1, 0.15); lab.rotation.z = Math.PI; lab.position.set(0, 0.06, 0.4); cab.add(lab);
  const lingua = new T.Group(); lingua.position.set(0, 0.03, 0.38); cab.add(lingua);
  peca(lingua, CAP(), mat(0xe0233a), 0, 0, 0.1, 0.03, 0.2, 0.02).rotation.x = Math.PI / 2;
  for (const l of [-1, 1]) { const p = peca(lingua, CAP(), mat(0xe0233a), 0.025 * l, 0, 0.21, 0.02, 0.08, 0.015); p.rotation.set(Math.PI / 2, 0, 0.5 * l); }
  if (r.chance(0.35)) for (const l of [-1, 1]) { const d = peca(cab, CONE(), mat(0xffffff), 0.08 * l, -0.02, 0.36, 0.025, 0.08, 0.025); d.rotation.x = Math.PI; }
  if (menina || r.chance(0.3)) for (const l of [-1, 1]) peca(cab, ESF(), mat(0xff7a9a), 0.22 * l, 0.12, 0.24, 0.05, 0.035, 0.02);
  // enfeite na cabeça
  const enfeite = new T.Group(); enfeite.position.set(0, 0.36, 0.02); cab.add(enfeite);
  const eTipo = r.de(menina ? ['laco', 'laco', 'flor', 'coroa', 'peruca', null] : ['cartola', 'bone', 'coroa', 'peruca', 'fone', null, null]);
  const ce = mat(r.de(CORES));
  if (eTipo === 'cartola') { enfeite.rotation.z = -0.2; peca(enfeite, CIL(), ce, 0, 0, 0, 0.26, 0.03, 0.26, 0.015); peca(enfeite, CIL(), ce, 0, 0.16, 0, 0.17, 0.32, 0.17, 0.015); }
  else if (eTipo === 'bone') { enfeite.rotation.y = r.de([0, Math.PI]); peca(enfeite, MEIA(), ce, 0, -0.06, 0, 0.27, 0.18, 0.27, 0.015); peca(enfeite, CIL(), ce, 0, -0.05, 0.24, 0.16, 0.02, 0.15); }
  else if (eTipo === 'coroa') { const o = mat(0xffc83d); peca(enfeite, CIL(), o, 0, 0, 0, 0.15, 0.08, 0.15); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; peca(enfeite, CONE(), o, Math.cos(a) * 0.13, 0.08, Math.sin(a) * 0.13, 0.035, 0.1, 0.035); } }
  else if (eTipo === 'laco') { enfeite.position.x = 0.14; for (const l of [-1, 1]) { const c = peca(enfeite, CONE(), ce, 0.09 * l, 0, 0, 0.08, 0.15, 0.05, 0.012); c.rotation.z = Math.PI / 2 * l; } peca(enfeite, ESF(), mat(0xffffff), 0, 0, 0, 0.04, 0.04, 0.04); }
  else if (eTipo === 'flor') { enfeite.position.set(0.16, -0.02, 0.05); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; peca(enfeite, ESF(), mat(r.de([0xff2a55, 0xffd23b, 0xffffff])), Math.cos(a) * 0.06, Math.sin(a) * 0.06, 0, 0.045, 0.045, 0.03); } }
  else if (eTipo === 'peruca') { peca(enfeite, ESF(), mat(r.de(CABELOS)), 0, 0.02, -0.06, 0.4, 0.3, 0.38, 0.02); }
  else if (eTipo === 'fone') { peca(enfeite, ARCO(), basico(0x222222), 0, -0.1, 0, 0.3, 0.3, 0.3); for (const l of [-1, 1]) peca(enfeite, CIL(), ce, 0.3 * l, -0.12, 0, 0.09, 0.05, 0.09).rotation.z = Math.PI / 2; }
  const par = new T.Group(); par.visible = false; cab.add(par); par.position.set(0, 0.38, 0.02);
  function setPar(t) {
    par.clear(); enfeite.visible = !t; par.visible = !!t; if (!t) return;
    if (t === 'noivo') { const p = basico(0x15151c); peca(par, CIL(), p, 0, 0, 0, 0.26, 0.03, 0.26); peca(par, CIL(), p, 0, 0.17, 0, 0.17, 0.34, 0.17, 0.015); peca(par, CIL(), mat(0xffffff), 0, 0.05, 0, 0.175, 0.06, 0.175); }
    else { const v = new T.Mesh(CONE(), new T.MeshToonMaterial({ color: 0xffffff, transparent: true, opacity: 0.82, side: T.DoubleSide })); v.scale.set(0.42, 0.9, 0.4); v.position.set(0, -0.3, -0.18); par.add(v);
      for (let i = 0; i < 7; i++) { const a = (i / 6) * Math.PI; peca(par, ESF(), mat(0xffd1e3), Math.cos(a) * 0.18, Math.sin(a) * 0.05, 0.03, 0.045, 0.045, 0.045); } }
  }
  const altura = 1.95;
  const fase = r() * 6;
  let tLingua = 0;
  function aplicar(P, b) {
    // corpo em S que balança no ritmo; agachar = encolher; requebrar = balançar muito
    const enc = 1 - P.ag * 0.55, amp = P.onda, w = b * Math.PI + fase;
    let x = 0, y = 0.28, z = 0, ultX = 0, ultZ = 0;
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      x = Math.sin(w + f * 2.6) * amp * f * 0.7 + P.pz * f * 1.1 + P.eZ * 0.05 * f;
      z = Math.cos(w * 0.5 + f * 2) * amp * 0.25 * f + P.tx * f * 0.8;
      y = 0.28 + f * 1.35 * enc;
      gomos[i].position.set(x, y, z); ultX = x; ultZ = z;
    }
    roda.scale.set(0.42 + P.ag * 0.12, 0.42 + P.ag * 0.12, 0.45);
    cab.position.set(ultX, y + 0.2, ultZ + 0.04);
    cab.rotation.set(P.cx - P.tx * 0.5, P.cy + P.py * 0.5, P.cz - ultX * 0.6);
    tLingua += 0.016; lingua.scale.z = Math.max(0.05, Math.sin(tLingua * 5 + fase) > 0.6 ? 1 : 0.05);
    giro.position.y = PIV + P.y; giro.rotation.set(P.rx, P.ry, P.rz);
  }
  return { raiz, aplicar, setPar, altura, tipo: 'cobra' };
}

export function criarDancarino(THREE, { semente = 1, sexo = 'm', tipo = null } = {}) {
  T = THREE;
  const r = sorteador(semente);
  const t = tipo || (r() < 0.62 ? 'palhaco' : 'cobra');
  const d = t === 'cobra' ? criarCobra(r, sexo) : criarPalhaco(r, sexo);
  d.raiz.scale.setScalar(t === 'cobra' ? 1.05 : 0.92);
  d.altura *= t === 'cobra' ? 1.05 : 0.92;
  return d;
}

// ======================= PASSOS DE DANÇA =======================
// pose: quadris/joelhos (qE,jE,aE / qD,jD,aD), braços (eX,eZ,eC / dX,dZ,dC), tronco (tx,ty,tz), pelve (py,pz), cabeça (cx,cy,cz),
// corpo inteiro (y = pulo, rx/ry/rz = deitar, cambalhota, giro), ag = agachar (0 a 1), onda = quanto a cobrinha balança
export function poseVazia(P = {}) {
  for (const k of ['qE', 'jE', 'aE', 'qD', 'jD', 'aD', 'eX', 'eZ', 'eC', 'dX', 'dZ', 'dC', 'tx', 'ty', 'tz', 'py', 'pz', 'cx', 'cy', 'cz', 'y', 'rx', 'ry', 'rz', 'ag']) P[k] = 0;
  P.eZ = P.dZ = 0.15; P.eC = P.dC = 0.3; P.onda = 0.25; return P;
}
const s = Math.sin, PI = Math.PI, abs = Math.abs;
const cl = (x) => (x < 0 ? 0 : x > 1 ? 1 : x), ease = (x) => { x = cl(x); return x * x * (3 - 2 * x); };
export const PASSOS = {
  balanco: { dur: 8, f(b, P) { const o = s(PI * b); P.ag = 0.12 + 0.18 * (1 - abs(o)); P.eX = -0.4 + 0.5 * o; P.dX = -0.4 - 0.5 * o; P.eC = P.dC = 0.8; P.tz = 0.12 * o; P.cz = 0.15 * s(PI * b + 0.6); P.pz = 0.18 * o; P.onda = 0.3; } },
  pula: { dur: 4, f(b, P) { const ph = b % 1, up = s(PI * ph); P.y = up * 0.8; P.ag = ph < 0.12 || ph > 0.88 ? 0.35 : 0; P.qE = P.qD = -0.6 * up; P.jE = P.jD = 1.1 * up; P.eX = P.dX = -2.7 * up - 0.2; P.eZ = P.dZ = 0.5; P.eC = P.dC = 0.2; P.cx = -0.2 * up; P.onda = 0.15; } },
  agacha: { dur: 8, f(b, P) { const a = Math.min(1, 1.35 * s(PI * cl(b / 8))); P.ag = 0.05 + 0.92 * a; P.eX = P.dX = -2.3 + 0.35 * s(2 * PI * b); P.eZ = P.dZ = 0.4; P.pz = 0.25 * s(2 * PI * b) * a; P.tx = 0.1 * a; P.cz = 0.2 * s(PI * b); P.onda = 0.35; } },
  deita: { dur: 8, f(b, P) { const L = ease(b / 1.4) * (1 - ease((b - 6.6) / 1.4)); P.rx = (-PI / 2) * L; P.y = -0.78 * L;
    P.qE = -1.2 * L + 0.7 * s(2 * PI * b) * L; P.jE = (1.1 + 0.7 * s(2 * PI * b)) * L; P.qD = -1.2 * L - 0.7 * s(2 * PI * b) * L; P.jD = (1.1 - 0.7 * s(2 * PI * b)) * L;
    P.eX = P.dX = -2.8 * L + 0.4 * s(2 * PI * b); P.eZ = P.dZ = 0.6; P.cx = -0.3 * L; P.onda = 0.5; } },
  cambalhota: { dur: 2, f(b, P) { const k = cl(b / 2), m = s(PI * k); P.rx = 2 * PI * ease(k); P.y = m * 1.4; P.qE = P.qD = -1.7 * m; P.jE = P.jD = 2.3 * m; P.eX = P.dX = -1.3 * m; P.eC = P.dC = 1.2 * m; P.cx = 0.5 * m; P.onda = 0.1; } },
  requebra: { dur: 8, f(b, P) { const o = s(2 * PI * b); P.ag = 0.32; P.pz = 0.45 * o; P.py = 0.35 * s(2 * PI * b + 1); P.eX = P.dX = 0.25; P.eZ = P.dZ = 0.95; P.eC = P.dC = 1.9; P.tz = -0.2 * o; P.cz = 0.2 * o; P.onda = 0.75; } },
  passinho: { dur: 8, f(b, P) { const lado = Math.floor(b) % 2, ph = b % 1, k = s(PI * ph);
    if (lado) { P.qE = -1.0 * k; P.jE = 0.25; P.aE = 0.25 * k; } else { P.qD = -1.0 * k; P.jD = 0.25; P.aD = 0.25 * k; }
    P.y = 0.14 * k; P.ry = 0.4 * (lado ? 1 : -1) * ease(ph * 3); P.eX = lado ? -1.3 * k : 0.2; P.dX = lado ? 0.2 : -1.3 * k; P.eC = P.dC = 1.4; P.onda = 0.45; } },
  gira: { dur: 4, f(b, P) { P.ry = 4 * PI * ease(b / 4); P.eZ = P.dZ = 1.4; P.eC = P.dC = 0.1; P.ag = 0.1; P.y = 0.12 * abs(s(PI * b)); P.onda = 0.35; } },
  bracos: { dur: 8, f(b, P) { const o = s(PI * b); P.eX = P.dX = -2.9; P.eZ = 0.35 + 0.35 * o; P.dZ = 0.35 - 0.35 * o; P.eC = P.dC = 0.1; P.tz = 0.2 * o; P.ag = 0.15 * abs(o); P.cz = -0.15 * o; P.onda = 0.5; } },
  robo: { dur: 8, f(b, P) { const q = Math.floor(b * 2) % 4, h = Math.floor(b) % 2;
    P.eX = [-1.57, 0, -1.57, -3][q]; P.dX = [0, -1.57, -3, -1.57][q]; P.eC = [1.57, 0, 0, 1.57][q]; P.dC = [0, 1.57, 1.57, 0][q]; P.cy = h ? 0.6 : -0.6; P.ry = h ? 0.3 : -0.3; P.ag = q % 2 ? 0.2 : 0; P.onda = 0.08; } },
  corre: { dur: 8, f(b, P) { const ph = 2 * PI * b * 2, o = s(ph); P.qE = -1.0 * o; P.qD = 1.0 * o; P.jE = 1.2 * Math.max(0, -o) + 0.2; P.jD = 1.2 * Math.max(0, o) + 0.2; P.eX = 0.9 * o; P.dX = -0.9 * o; P.eC = P.dC = 1.5; P.y = 0.14 * abs(o); P.tx = 0.22; P.onda = 0.55; } },
  aviaozinho: { dur: 8, f(b, P) { P.eZ = P.dZ = 1.55; P.eC = P.dC = 0; P.rz = 0.35 * s((PI * b) / 2); P.ry = (PI * b) / 4; P.ag = 0.15; P.qE = -0.4 * abs(s(PI * b)); P.onda = 0.4; } },
  bateCabeca: { dur: 8, f(b, P) { const o = abs(s(PI * b)); P.cx = 0.55 * o - 0.1; P.tx = 0.3 * o; P.eX = -1.3; P.eZ = 0.5; P.eC = 0.4; P.dX = -0.7 + 0.35 * s(4 * PI * b); P.dC = 1.3; P.ag = 0.25; P.onda = 0.6; } },
  estrela: { dur: 4, f(b, P) { const k = cl((b % 2) / 2); P.rz = -2 * PI * ease(k); P.y = 0.3 * s(PI * k); P.eZ = P.dZ = 2.7; P.eC = P.dC = 0; P.aE = P.aD = 0.55; P.onda = 0.2; } },
  polichinelo: { dur: 4, f(b, P) { const a = abs(s(PI * b)); P.eZ = P.dZ = 0.2 + 2.6 * a; P.eC = P.dC = 0.1; P.aE = P.aD = 0.45 * a; P.y = 0.28 * a; P.onda = 0.3; } },
  treme: { dur: 4, f(b, P) { const o = s(8 * PI * b); P.pz = 0.15 * o; P.tz = -0.12 * o; P.eX = -1.6 + 0.3 * o; P.dX = -1.6 - 0.3 * o; P.eZ = P.dZ = 0.6; P.eC = P.dC = 0.6; P.cz = 0.2 * o; P.ag = 0.25; P.onda = 0.9; } },
  acena: { dur: 4, f(b, P) { P.dX = -2.7; P.dZ = 0.3 + 0.35 * s(3 * PI * b); P.dC = 0.3; P.eX = -0.3; P.cz = 0.2; P.ag = 0.1 * abs(s(PI * b)); P.onda = 0.3; } },
};
// passos que todo mundo consegue fazer junto (o "coreógrafo" do baile escolhe um e a roda inteira faz)
export const JUNTOS = ['pula', 'agacha', 'requebra', 'passinho', 'bracos', 'gira', 'polichinelo', 'bateCabeca', 'aviaozinho', 'robo', 'treme', 'cambalhota', 'deita'];
// passos de destaque (solo / dupla)
export const SOLOS = ['cambalhota', 'estrela', 'deita', 'agacha', 'gira', 'treme', 'requebra', 'robo'];
// andar e correr (fase em radianos, avança com o tempo)
export function poseAndar(fase, correndo, P) {
  poseVazia(P); const o = s(fase), a = correndo ? 1.1 : 0.55;
  P.qE = -a * o; P.qD = a * o; P.jE = (correndo ? 1.3 : 0.6) * Math.max(0, -o) + 0.1; P.jD = (correndo ? 1.3 : 0.6) * Math.max(0, o) + 0.1;
  P.eX = a * 0.9 * o; P.dX = -a * 0.9 * o; P.eC = P.dC = correndo ? 1.5 : 0.4; P.y = (correndo ? 0.14 : 0.05) * abs(o); P.tx = correndo ? 0.25 : 0.05; P.onda = correndo ? 0.5 : 0.25;
  return P;
}
