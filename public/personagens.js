// Personagens do Abismo, em 3D estilo desenho (cartoon), montados só com código.
//   criarPalhaco(THREE)  -> Palhaço do Abismo (anda, fala, ri, dança, voa com balões, canta...)
//   criarSerpente(THREE) -> Serpente das Trevas (rasteja, fala, sibila, dá bote...)
// Cada um devolve { raiz, atualizar(dt, t), andarPara(x, z), acao(nome, segundos), falar(nivel 0..1), ... }

// ---------- materiais "cartoon" (sombra em 3 faixas + contorno preto) ----------
let gradiente = null;
function toon(THREE, cor, extra = {}) {
  if (!gradiente) {
    const d = new Uint8Array([70, 70, 70, 255, 160, 160, 160, 255, 255, 255, 255, 255]);
    gradiente = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
    gradiente.minFilter = gradiente.magFilter = THREE.NearestFilter; gradiente.needsUpdate = true;
  }
  return new THREE.MeshToonMaterial({ color: cor, gradientMap: gradiente, ...extra });
}
const PRETO = new Map();
function contorno(THREE, mesh, esp = 0.06) {
  let m = PRETO.get('c'); if (!m) { m = new THREE.MeshBasicMaterial({ color: 0x0b0610, side: THREE.BackSide }); PRETO.set('c', m); }
  const o = new THREE.Mesh(mesh.geometry, m);
  // contorno proporcional ao tamanho da peça
  mesh.geometry.computeBoundingSphere(); const r = mesh.geometry.boundingSphere.radius || 1;
  const k = 1 + esp / r; o.scale.set(k, k, k); o.renderOrder = -1;
  mesh.add(o); return mesh;
}
function peca(THREE, geo, mat, { x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, linha = 0.05 } = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.set(sx, sy, sz);
  m.castShadow = true; if (linha) contorno(THREE, m, linha / Math.max(sx, sy, sz));
  return m;
}
function texturaListras(THREE, c1, c2, n = 6, vertical = true) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? c2 : c1; if (vertical) g.fillRect(i * 128 / n, 0, 128 / n + 1, 128); else g.fillRect(0, i * 128 / n, 128, 128 / n + 1); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
const suave = (a, b, k) => a + (b - a) * Math.min(1, k);
const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);

// ======================= PALHAÇO DO ABISMO =======================
// cores: { roupa:[cor1,cor2], cabelo, chapeu, nariz } (para a trupe de palhaços dançarinos)
export function criarPalhaco(THREE, cores = {}) {
  const C = { roupa: ['#6d2fa3', '#1c0d2b'], cabelo: 0x55e07a, chapeu: 0x5b2a86, pele: 0xf4ece6, ...cores };
  const SFERA = new THREE.SphereGeometry(1, 28, 20);
  const CAPS = new THREE.CapsuleGeometry(0.5, 1, 8, 16);
  const CIL = new THREE.CylinderGeometry(1, 1, 1, 24);
  const pele = toon(THREE, C.pele), roxo = toon(THREE, C.chapeu), roxoEsc = toon(THREE, 0x2a1240),
    verde = toon(THREE, C.cabelo), vermelho = toon(THREE, 0xe0233a), branco = toon(THREE, 0xffffff), preto = toon(THREE, 0x15101c),
    boca = toon(THREE, 0x3a0612), luva = toon(THREE, 0xfdfdfd), sapato = toon(THREE, 0xc4162c), amarelo = toon(THREE, 0xffc83d);
  const listrado = toon(THREE, 0xffffff, { map: texturaListras(THREE, C.roupa[0], C.roupa[1], 8) });

  const raiz = new THREE.Group();           // posição no chão + direção
  const corpo = new THREE.Group(); raiz.add(corpo); // sobe/desce, inclina
  const P = {};

  // pernas (pivô no quadril)
  for (const lado of [-1, 1]) {
    const quadril = new THREE.Group(); quadril.position.set(0.3 * lado, 1.15, 0); corpo.add(quadril);
    quadril.add(peca(THREE, CAPS, listrado, { y: -0.45, sx: 0.42, sy: 0.62, sz: 0.42 }));
    quadril.add(peca(THREE, SFERA, sapato, { y: -1.0, z: 0.22, sx: 0.3, sy: 0.2, sz: 0.5 }));
    P[lado < 0 ? 'pernaE' : 'pernaD'] = quadril;
  }
  // tronco (barrigudo) e gola de babados
  const tronco = new THREE.Group(); tronco.position.y = 1.25; corpo.add(tronco); P.tronco = tronco;
  tronco.add(peca(THREE, SFERA, listrado, { y: 0.75, sx: 0.85, sy: 0.95, sz: 0.75 }));
  for (let i = 0; i < 3; i++) tronco.add(peca(THREE, SFERA, [vermelho, amarelo, verde][i], { y: 1.15 - i * 0.4, z: 0.74 - Math.abs(i - 1) * 0.03, sx: 0.11, sy: 0.11, sz: 0.06, linha: 0.02 }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    tronco.add(peca(THREE, SFERA, i % 2 ? branco : vermelho, { x: Math.sin(a) * 0.62, y: 1.62, z: Math.cos(a) * 0.55, sx: 0.26, sy: 0.14, sz: 0.26, linha: 0.02 }));
  }
  // braços (pivô no ombro) + luvas
  for (const lado of [-1, 1]) {
    const ombro = new THREE.Group(); ombro.position.set(0.8 * lado, 1.4, 0); tronco.add(ombro);
    const sup = peca(THREE, CAPS, listrado, { y: -0.4, sx: 0.32, sy: 0.55, sz: 0.32 }); ombro.add(sup);
    const cot = new THREE.Group(); cot.position.y = -0.8; ombro.add(cot);
    cot.add(peca(THREE, CAPS, listrado, { y: -0.3, sx: 0.28, sy: 0.42, sz: 0.28 }));
    const mao = peca(THREE, SFERA, luva, { y: -0.72, sx: 0.27, sy: 0.25, sz: 0.25 }); cot.add(mao);
    mao.add(peca(THREE, SFERA, luva, { x: -0.7 * lado, y: 0.4, sx: 0.45, sy: 0.3, sz: 0.3, linha: 0.02 })); // polegar
    P[lado < 0 ? 'ombroE' : 'ombroD'] = ombro; P[lado < 0 ? 'cotoveloE' : 'cotoveloD'] = cot; P[lado < 0 ? 'maoE' : 'maoD'] = mao;
  }
  // cabeça (pivô no pescoço)
  const cabeca = new THREE.Group(); cabeca.position.y = 1.75; tronco.add(cabeca); P.cabeca = cabeca;
  cabeca.add(peca(THREE, SFERA, pele, { y: 0.75, sx: 0.82, sy: 0.85, sz: 0.78 }));
  // bochechas rosadas
  for (const lado of [-1, 1]) cabeca.add(peca(THREE, SFERA, toon(THREE, 0xff7a9a), { x: 0.48 * lado, y: 0.55, z: 0.55, sx: 0.17, sy: 0.12, sz: 0.06, linha: 0 }));
  // olhos: maquiagem escura em losango + branco + pupila
  P.olhos = [];
  for (const lado of [-1, 1]) {
    const olho = new THREE.Group(); olho.position.set(0.28 * lado, 0.95, 0.62); cabeca.add(olho);
    const maq = peca(THREE, SFERA, roxoEsc, { sx: 0.24, sy: 0.32, sz: 0.08, linha: 0 }); maq.rotation.z = 0.5 * lado; olho.add(maq);
    olho.add(peca(THREE, SFERA, branco, { z: 0.06, sx: 0.17, sy: 0.2, sz: 0.1, linha: 0.02 }));
    const pup = peca(THREE, SFERA, preto, { z: 0.15, sx: 0.08, sy: 0.1, sz: 0.04, linha: 0 }); olho.add(pup);
    pup.add(peca(THREE, SFERA, branco, { x: 0.35, y: 0.4, z: 0.6, sx: 0.35, sy: 0.35, sz: 0.3, linha: 0 })); // brilho
    const sob = peca(THREE, CAPS, preto, { y: 0.32, z: 0.08, sx: 0.06, sy: 0.16, sz: 0.04, linha: 0 }); sob.rotation.z = Math.PI / 2 + 0.45 * lado; olho.add(sob); // sobrancelha marota
    P.olhos.push({ olho, pup, sob, lado });
  }
  // nariz vermelho brilhante
  P.nariz = peca(THREE, SFERA, new THREE.MeshStandardMaterial({ color: 0xff1e3c, roughness: 0.25, emissive: 0x400010 }), { y: 0.68, z: 0.82, sx: 0.2, sy: 0.19, sz: 0.19 });
  cabeca.add(P.nariz);
  // boca: sorriso largo que abre quando fala
  const bocaG = new THREE.Group(); bocaG.position.set(0, 0.5, 0.7); bocaG.rotation.x = -0.25; cabeca.add(bocaG); P.boca = bocaG;
  // sorriso: meia-lua escura (abre quando fala) com dentes, e lábio vermelho em arco por fora
  const meiaLua = new THREE.CircleGeometry(1, 32, Math.PI, Math.PI);
  const dentro = new THREE.Mesh(meiaLua, boca); dentro.scale.set(0.42, 0.3, 1); dentro.position.z = 0.1; bocaG.add(dentro); P.bocaDentro = dentro;
  const dentes = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), branco); dentes.scale.set(0.7, 0.07, 1); dentes.position.set(0, -0.035, 0.11); bocaG.add(dentes);
  const labio = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.07, 10, 32, Math.PI), vermelho); labio.rotation.z = Math.PI; labio.position.z = 0.08; labio.scale.y = 0.75; bocaG.add(labio);
  for (const lado of [-1, 1]) bocaG.add(peca(THREE, SFERA, vermelho, { x: 0.44 * lado, y: 0.02, z: 0.08, sx: 0.08, sy: 0.08, sz: 0.06, linha: 0 })); // cantinhos
  // cabelo verde espetado dos lados e atrás
  const cabelo = new THREE.Group(); cabeca.add(cabelo); P.cabelo = cabelo;
  for (const lado of [-1, 1]) for (let i = 0; i < 5; i++) {
    cabelo.add(peca(THREE, SFERA, verde, { x: (0.72 + (i % 2) * 0.22) * lado, y: 0.95 + (i - 2) * 0.17, z: -0.1 - (i % 3) * 0.12, sx: 0.28, sy: 0.24, sz: 0.26, linha: 0.03 }));
  }
  // chapéu cartola roxa inclinada
  const chapeu = new THREE.Group(); chapeu.position.set(0.12, 1.5, -0.05); chapeu.rotation.z = -0.22; cabeca.add(chapeu); P.chapeu = chapeu;
  chapeu.add(peca(THREE, CIL, roxo, { sx: 0.62, sy: 0.07, sz: 0.62 }));
  chapeu.add(peca(THREE, CIL, roxo, { y: 0.38, sx: 0.4, sy: 0.72, sz: 0.4 }));
  chapeu.add(peca(THREE, CIL, verde, { y: 0.12, sx: 0.41, sy: 0.12, sz: 0.41, linha: 0 }));
  chapeu.add(peca(THREE, SFERA, amarelo, { x: 0.36, y: 0.16, z: 0.15, sx: 0.12, sy: 0.12, sz: 0.12, linha: 0.02 }));

  // balões (aparecem quando ele voa)
  const baloes = new THREE.Group(); baloes.visible = false; raiz.add(baloes); P.baloes = baloes;
  const cordaMat = new THREE.LineBasicMaterial({ color: 0xffffff });
  [[0xff3b6b, -0.7, 5.3], [0x3bd5ff, 0.2, 5.8], [0xffd23b, 0.9, 5.2], [0x9b5bff, 0.0, 6.4]].forEach(([cor, x, y]) => {
    const b = peca(THREE, SFERA, toon(THREE, cor), { x: 1.1 + x, y, z: 0, sx: 0.55, sy: 0.65, sz: 0.55 }); baloes.add(b);
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(1.1 + x, y - 0.65, 0), new THREE.Vector3(1.45, 3.0, 0.3)]);
    baloes.add(new THREE.Line(g, cordaMat));
  });

  return montarAnimacao(THREE, raiz, corpo, P, 'palhaco');
}

// ======================= SERPENTE DAS TREVAS =======================
export function criarSerpente(THREE) {
  const N = 26;                              // gomos do corpo
  const SFERA = new THREE.SphereGeometry(1, 24, 16);
  const escamaTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#5b2a8c'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#8a4fc4';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.beginPath(); g.arc(x * 16 + (y % 2) * 8, y * 16 + 8, 7, 0, Math.PI); g.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const escama = toon(THREE, 0xffffff, { map: escamaTex }), barriga = toon(THREE, 0xb8f06a), verdeVeneno = toon(THREE, 0x6cff6a),
    branco = toon(THREE, 0xffffff), preto = toon(THREE, 0x0d0612), boca = toon(THREE, 0x3a0612), lingua = toon(THREE, 0xff2b55);
  const olhoMat = new THREE.MeshStandardMaterial({ color: 0xc8ff3a, emissive: 0x88ff00, emissiveIntensity: 0.9, roughness: 0.3 });

  const raiz = new THREE.Group();
  const gomos = [];
  for (let i = 0; i < N; i++) {
    const r = 0.62 * (1 - i / N * 0.75);
    const g = peca(THREE, SFERA, i % 4 === 2 ? barriga : escama, { sx: r, sy: r * 0.9, sz: r });
    if (i % 3 === 0 && i > 0) g.add(peca(THREE, new THREE.ConeGeometry(0.35, 0.8, 8), verdeVeneno, { y: 0.95, sx: 0.5, sy: 0.6, sz: 0.5, linha: 0.02 })); // espinhos
    raiz.add(g); gomos.push(g);
  }
  // cabeça
  const cabeca = new THREE.Group(); raiz.add(cabeca);
  const cranio = peca(THREE, SFERA, escama, { y: 0.25, z: 0.2, sx: 0.95, sy: 0.7, sz: 1.15 }); cabeca.add(cranio);
  const mandSup = new THREE.Group(); mandSup.position.set(0, 0.2, 0.55); cabeca.add(mandSup);
  mandSup.add(peca(THREE, SFERA, escama, { z: 0.35, sx: 0.8, sy: 0.32, sz: 0.75 }));
  for (const lado of [-1, 1]) { // presas
    mandSup.add(peca(THREE, new THREE.ConeGeometry(0.12, 0.45, 8), branco, { x: 0.32 * lado, y: -0.3, z: 0.7, sx: 1, sy: -1, sz: 1, linha: 0.015 }));
  }
  const mandInf = new THREE.Group(); mandInf.position.set(0, 0.05, 0.5); cabeca.add(mandInf);
  mandInf.add(peca(THREE, SFERA, barriga, { z: 0.3, sx: 0.7, sy: 0.18, sz: 0.65 }));
  mandInf.add(peca(THREE, SFERA, boca, { y: 0.1, z: 0.3, sx: 0.55, sy: 0.08, sz: 0.5, linha: 0 }));
  const lin = new THREE.Group(); lin.position.set(0, 0.12, 0.7); mandInf.add(lin);
  lin.add(peca(THREE, new THREE.BoxGeometry(1, 1, 1), lingua, { z: 0.35, sx: 0.08, sy: 0.03, sz: 0.7, linha: 0.01 }));
  for (const lado of [-1, 1]) { const ponta = peca(THREE, new THREE.BoxGeometry(1, 1, 1), lingua, { x: 0.06 * lado, z: 0.75, sx: 0.05, sy: 0.03, sz: 0.25, linha: 0.01 }); ponta.rotation.y = 0.5 * lado; lin.add(ponta); }
  const olhos = [];
  for (const lado of [-1, 1]) {
    // olhos grandes de desenho, em cima e na frente da cabeça
    const o = new THREE.Group(); o.position.set(0.36 * lado, 0.78, 0.62); cabeca.add(o);
    o.add(peca(THREE, SFERA, preto, { sx: 0.36, sy: 0.36, sz: 0.3, linha: 0.03 }));
    o.add(peca(THREE, SFERA, olhoMat, { z: 0.1, sx: 0.31, sy: 0.31, sz: 0.25, linha: 0 }));
    const pup = peca(THREE, SFERA, preto, { z: 0.33, sx: 0.06, sy: 0.22, sz: 0.04, linha: 0 }); o.add(pup); // pupila de fenda
    pup.add(peca(THREE, SFERA, branco, { x: 0.5, y: 0.35, z: 0.8, sx: 0.6, sy: 0.18, sz: 0.5, linha: 0 })); // brilho
    const sob = peca(THREE, new THREE.BoxGeometry(1, 1, 1), preto, { x: 0.04 * lado, y: 0.44, z: 0.1, sx: 0.28, sy: 0.06, sz: 0.06, linha: 0 }); sob.rotation.z = -0.5 * lado; o.add(sob);
    olhos.push({ olho: o, pup, sob, lado });
  }
  // coroa de chifrinhos
  for (const lado of [-1, 1]) cabeca.add(peca(THREE, new THREE.ConeGeometry(0.16, 0.6, 10), verdeVeneno, { x: 0.38 * lado, y: 0.95, z: -0.15, linha: 0.02 }));

  const P = { cabeca, mandSup, mandInf, lingua: lin, olhos, gomos };
  return montarAnimacao(THREE, raiz, null, P, 'serpente');
}

// ======================= ANIMAÇÕES =======================
// Ações: acenar, rir, dancar, voar, girar, cantar, susto, comemorar, pular, bote (serpente), sibilar (serpente)
function montarAnimacao(THREE, raiz, corpo, P, tipo) {
  const st = {
    pos: new THREE.Vector3(), alvo: null, rumo: 0, vel: tipo === 'palhaco' ? 2.2 : 2.8,
    acao: null, tAcao: 0, durAcao: 0, fala: 0, falaAlvo: 0, piscar: 2 + Math.random() * 3, olhar: 0,
    trilha: [], fase: 0, voo: 0,
  };
  // a serpente guarda o caminho da cabeça pra o corpo seguir
  if (tipo === 'serpente') for (let i = 0; i < 400; i++) st.trilha.push(new THREE.Vector3(0, 0, -i * 0.05));

  function andarPara(x, z) { st.alvo = new THREE.Vector3(x, 0, z); }
  function posicionar(x, z, rumo = 0) {
    st.pos.set(x, 0, z); st.rumo = rumo;
    if (tipo === 'serpente') st.trilha = st.trilha.map((_, i) => new THREE.Vector3(x - Math.sin(rumo) * i * 0.05, 0, z - Math.cos(rumo) * i * 0.05));
  }
  function acao(nome, dur) {
    const D = { acenar: 2.2, rir: 2.6, dancar: 4.5, voar: 6, girar: 2, cantar: 7, susto: 2.2, comemorar: 3, pular: 1.4, bote: 1.4, sibilar: 2 };
    st.acao = nome; st.tAcao = 0; st.durAcao = dur || D[nome] || 2;
  }
  const ocupado = () => !!st.acao;
  const falar = (nivel) => { st.falaAlvo = Math.max(0, Math.min(1, nivel)); };

  function andar(dt) {
    // parado e "encarando" alguém (ex.: a câmera quando está falando): vira devagar pra lá
    if (!st.alvo && st.encarar) {
      const rumoAlvo = Math.atan2(st.encarar.x - st.pos.x, st.encarar.z - st.pos.z);
      let dr = rumoAlvo - st.rumo; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2;
      st.rumo += dr * Math.min(1, dt * 4);
    }
    if (!st.alvo || (st.acao && st.acao !== 'cantar' && st.acao !== 'acenar')) return 0;
    const d = new THREE.Vector3().subVectors(st.alvo, st.pos); d.y = 0;
    const dist = d.length();
    if (dist < 0.15) { st.alvo = null; return 0; }
    const rumoAlvo = Math.atan2(d.x, d.z);
    let dr = rumoAlvo - st.rumo; while (dr > Math.PI) dr -= Math.PI * 2; while (dr < -Math.PI) dr += Math.PI * 2;
    st.rumo += dr * Math.min(1, dt * 5);
    const passo = Math.min(dist, st.vel * dt * (Math.abs(dr) > 1.2 ? 0.3 : 1));
    st.pos.x += Math.sin(st.rumo) * passo; st.pos.z += Math.cos(st.rumo) * passo;
    return passo / dt / st.vel; // 0..1 de "estou andando"
  }

  function atualizarPalhaco(dt, t, mov) {
    const a = st.acao, k = st.durAcao ? st.tAcao / st.durAcao : 0, s = Math.sin, c = Math.cos;
    // pose base
    let y = 0, incl = 0, giro = 0, pe = s(t * 9) * 0.6 * mov, bE = -s(t * 9) * 0.5 * mov + 0.1, bD = s(t * 9) * 0.5 * mov - 0.1, cE = -0.3, cD = -0.3,
      cabRx = s(t * 1.3) * 0.05, cabRz = s(t * 0.9) * 0.06, cabRy = st.olhar, aberturaExtra = 0;
    y += Math.abs(s(t * 9)) * 0.12 * mov + s(t * 2) * 0.03; // passos e respiração
    if (a === 'acenar') { bD = -2.6 + s(t * 10) * 0.25; cD = -0.4 + s(t * 10) * 0.5; cabRz = 0.15; }
    else if (a === 'rir') { incl = -0.25 + s(t * 22) * 0.06; cabRx = -0.45 + s(t * 22) * 0.12; bE = 0.6; bD = -0.6; cE = -1.9; cD = -1.9; y += Math.abs(s(t * 22)) * 0.1; aberturaExtra = 0.6 + Math.abs(s(t * 22)) * 0.4; }
    else if (a === 'dancar') { const b = t * 7; y += Math.abs(s(b)) * 0.35; giro = s(b * 0.5) * 0.6; incl = s(b) * 0.15; pe = s(b) * 0.7; bE = -2.2 + s(b) * 0.6; bD = -2.2 - s(b) * 0.6; cE = -0.6; cD = -0.6; cabRz = s(b) * 0.25; }
    else if (a === 'voar') { const sub = ease(k / 0.25) * (1 - ease((k - 0.75) / 0.25)); st.voo = sub; y += sub * 6 + s(t * 2) * 0.3 * sub; bD = -2.9; cD = -0.2; bE = 0.5 + s(t * 6) * 0.3; pe = s(t * 5) * 0.5; incl = s(t * 1.5) * 0.12 * sub; }
    else if (a === 'girar') { giro = ease(k) * Math.PI * 4; y += s(k * Math.PI) * 1.2; bE = -1.4; bD = -1.4; }
    else if (a === 'cantar') { const b = t * 5.2; y += Math.abs(s(b)) * 0.15; bE = -1.2 + s(b) * 0.3; bD = -2.4; cD = -0.9; cabRx = -0.2; cabRz = s(b) * 0.15; incl = s(b * 0.5) * 0.08; }
    else if (a === 'susto') { const e = ease(k / 0.15) * (1 - ease((k - 0.8) / 0.2)); incl = 0.45 * e; y += e * 0.2; bE = -2.4 * e; bD = -2.4 * e; cE = -0.2; cD = -0.2; aberturaExtra = 0.9 * e; }
    else if (a === 'comemorar' || a === 'pular') { const b = (t * 6) % Math.PI; y += s(b) * (a === 'pular' ? 1.4 : 0.9); bE = -2.8; bD = -2.8; cE = -0.2; cD = -0.2; pe = 0.3; }
    if (a !== 'voar') st.voo = suave(st.voo, 0, dt * 3);
    P.baloes.visible = a === 'voar' || st.voo > 0.02;
    corpo.position.y = y; corpo.rotation.x = incl; corpo.rotation.y = giro;
    P.pernaE.rotation.x = pe; P.pernaD.rotation.x = -pe;
    P.ombroE.rotation.x = bE; P.ombroD.rotation.x = bD; P.ombroE.rotation.z = -0.25; P.ombroD.rotation.z = 0.25;
    P.cotoveloE.rotation.x = cE; P.cotoveloD.rotation.x = cD;
    P.cabeca.rotation.set(cabRx, cabRy, cabRz);
    P.chapeu.position.y = 1.5 + (a === 'susto' ? 0.5 * Math.max(0, 1 - Math.abs(k - 0.4) * 3) : 0) + (a === 'rir' ? Math.abs(s(t * 22)) * 0.08 : 0);
    P.cabelo.scale.setScalar(1 + (a === 'susto' ? 0.25 : 0) + Math.abs(s(t * 3)) * 0.02);
    // boca: fala + ações
    const ab = Math.max(st.fala, aberturaExtra);
    P.boca.scale.set(1 + ab * 0.12, 0.7 + ab * 1.3, 1);
    // olhos: piscar e arregalar
    st.piscar -= dt; let fecha = 1; if (st.piscar < 0) { fecha = Math.max(0.08, Math.abs(st.piscar * 8 - 1)); if (st.piscar < -0.25) st.piscar = 2 + Math.random() * 4; }
    const arreg = a === 'susto' ? 1.35 : a === 'rir' ? 0.35 : 1;
    for (const o of P.olhos) { o.olho.scale.set(1, fecha * arreg, 1); o.pup.position.x = s(t * 0.7) * 0.04; o.sob.position.y = 0.32 + (a === 'susto' ? 0.12 : 0) + (a === 'rir' ? -0.05 : 0); }
    P.nariz.scale.setScalar(0.2 * (1 + (a === 'rir' || st.fala > 0.3 ? Math.abs(s(t * 18)) * 0.12 : 0)));
  }

  function atualizarSerpente(dt, t, mov) {
    const a = st.acao, k = st.durAcao ? st.tAcao / st.durAcao : 0, s = Math.sin;
    // cabeça: ondula lateralmente enquanto anda
    const onda = s(t * 6) * 0.35 * Math.max(0.25, mov);
    const lado = new THREE.Vector3(Math.cos(st.rumo), 0, -Math.sin(st.rumo));
    const cab = st.pos.clone().addScaledVector(lado, onda);
    let altura = 0.7 + s(t * 2) * 0.08 + st.fala * 0.5, rx = -0.25 * Math.min(1, st.fala * 3), abre = st.fala * 0.9;
    if (a === 'bote') { const e = s(Math.min(1, k * 1.6) * Math.PI); altura += e * 1.6; rx = -0.6 * e; abre = Math.max(abre, e); }
    else if (a === 'sibilar' || a === 'rir') { altura += 0.6 + s(t * 14) * 0.15; abre = Math.max(abre, 0.6 + s(t * 20) * 0.3); }
    else if (a === 'dancar' || a === 'cantar') { altura += 1.0 + s(t * 6) * 0.5; rx = s(t * 6) * 0.2; }
    else if (a === 'susto') { altura += 1.2 * s(Math.min(1, k * 2) * Math.PI); abre = Math.max(abre, 0.8); }
    else if (a === 'comemorar' || a === 'pular') { altura += Math.abs(s(t * 7)) * 1.8; }
    else if (a === 'voar') { const sub = ease(k / 0.25) * (1 - ease((k - 0.75) / 0.25)); altura += sub * 5; }
    // trilha da cabeça (no chão) para o corpo seguir
    const ult = st.trilha[0];
    if (ult.distanceTo(cab) > 0.05) { st.trilha.unshift(cab.clone()); if (st.trilha.length > 400) st.trilha.pop(); }
    P.cabeca.position.set(cab.x, altura, cab.z);
    P.cabeca.rotation.set(rx, st.rumo + s(t * 6) * 0.25 * mov, 0);
    P.mandInf.rotation.x = abre * 0.7;
    P.mandSup.rotation.x = -abre * 0.25;
    P.lingua.visible = abre > 0.2 || (s(t * 3) > 0.92);
    P.lingua.scale.z = 0.6 + Math.abs(s(t * 30)) * 0.6;
    for (const o of P.olhos) { o.pup.scale.x = a === 'susto' ? 2.5 : 1; o.sob.rotation.z = (a === 'bote' || a === 'sibilar' ? -0.6 : -0.35) * o.lado; }
    // corpo: cada gomo pega um ponto mais antigo da trilha; sobe em direção à cabeça quando ela levanta
    const passo = 7;
    for (let i = 0; i < P.gomos.length; i++) {
      const p = st.trilha[Math.min(st.trilha.length - 1, (i + 1) * passo)];
      const sobe = Math.max(0, altura - 0.6) * Math.pow(1 - i / P.gomos.length, 3);
      P.gomos[i].position.set(p.x, 0.45 * (1 - i / P.gomos.length * 0.6) + sobe, p.z);
    }
  }

  function atualizar(dt, t0) {
    const t = t0 + st.fase;
    const mov = andar(dt);
    if (st.acao) { st.tAcao += dt; if (st.tAcao >= st.durAcao) st.acao = null; }
    st.fala = suave(st.fala, st.falaAlvo, dt * 18);
    if (tipo === 'palhaco') { raiz.position.copy(st.pos); raiz.rotation.y = st.rumo; atualizarPalhaco(dt, t, mov); }
    else atualizarSerpente(dt, t, mov);
  }
  // posição da cabeça (para mostrar nome/foto em cima)
  const cabecaMundo = (v = new THREE.Vector3()) => (tipo === 'palhaco' ? P.cabeca.getWorldPosition(v).add(new THREE.Vector3(0, 2.2, 0)) : P.cabeca.getWorldPosition(v).add(new THREE.Vector3(0, 1.4, 0)));
  const defFase = (f) => { st.fase = f; };
  const encarar = (v) => { st.encarar = v ? v.clone() : null; if (v) st.alvo = null; };
  return { raiz, atualizar, andarPara, posicionar, acao, ocupado, falar, cabecaMundo, defFase, encarar, estado: st, tipo };
}
