// Código de acesso (Sec-MS-GEC v2) da voz grátis da Microsoft (a mesma do "Ler em voz alta" do Edge).
// Em 2026 a Microsoft trocou o cálculo; sem ele a voz natural é recusada e o jogo cai na voz robótica do Windows.
// Tradução fiel do projeto edge-tts (github.com/rany2/edge-tts, src/edge_tts/drm.py), conferida com os mesmos valores de teste.
'use strict';
const M = 0xFFFFFFFFn;
const TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const VERSAO = '143.0.3650.75';
const B = (a) => a.map((x) => BigInt(x));

const INICIAL = B([0x6A09E667, 0xBB67AE85, 0x3C6EF372, 0xA54FF53A, 0x510E527F, 0x9B05688C, 0x1F83D9AB, 0x5BE0CD19]);
const ESTADO = B([0xFD9FBEA2, 0x91243CE7, 0xBE499094, 0xCD2E1E0A, 0x6C006F49, 0x04BD35AB, 0xFEB0A7E4, 0x03EFFBD2]);
const AGENDA = B([0xEB24BF9E, 0x1558691F, 0xA0C09EE2, 0x0CFA32BA, 0xA622EE8C, 0xD1DD9491, 0xC0DD25A0, 0xF9E70AB6, 0xF0C31573, 0x7058CE4E, 0x7188E606, 0x00E5AB33, 0xD258B060, 0x72766564]);
const K = B([0x428A2F98, 0x71374491, 0xB5C0FBCF, 0xE9B5DBA5, 0x3956C25B, 0x59F111F1, 0x923F82A4, 0xAB1C5ED5, 0xD807AA98, 0x12835B01, 0x243185BE, 0x550C7DC3,
  0x72BE5D74, 0x80DEB1FE, 0x9BDC06A7, 0xC19BF174, 0xE49B69C1, 0xEFBE4786, 0x0FC19DC6, 0x240CA1CC, 0x2DE92C6F, 0x4A7484AA, 0x5CB0A9DC, 0x76F988DA,
  0x983E5152, 0xA831C66D, 0xB00327C8, 0xBF597FC7, 0xC6E00BF3, 0xD5A79147, 0x06CA6351, 0x14292967, 0x27B70A85, 0x2E1B2138, 0x4D2C6DFC, 0x53380D13,
  0x650A7354, 0x766A0ABB, 0x81C2C92E, 0x92722C85, 0xA2BFE8A1, 0xA81A664B, 0xC24B8B70, 0xC76C51A3, 0xD192E819, 0xD6990624, 0xF40E3585, 0x106AA070,
  0x19A4C116, 0x1E376C08, 0x2748774C, 0x34B0BCB5, 0x391C0CB3, 0x4ED8AA4A, 0x5B9CCA4F, 0x682E6FF3, 0x748F82EE, 0x78A5636F, 0x84C87814, 0x8CC70208,
  0x90BEFFFA, 0xA4506CEB, 0xBEF9A3F7, 0xC67178F2]);
const AJUSTE = 0xC9DC06A7n;
const K_BLOCO = [...K.slice(0, 14), AJUSTE, ...K.slice(15)];
const AJ_SIGMA0 = 0x059C0B80n, AJ_SIGMA1 = 0x000B92C0n;
const CS64 = [[0xE82E91B1, 0xB32700D0], [0x44DE24C6, 0x88DFF51D], [0x3BEB65BC, 0x29514038], [0xC89C5933, 0xB328CBDF], [0x8D1EC211, 0xD405B4D5],
  [0x314EF5D5, 0x26E55F3C], [0xE92491B1, 0x607801C6], [0xF0A5B9D5, 0x82B2C1FB], [0x06064CF3, 0xFA51A3DA], [0xDA79FA60, 0x207CC464],
  [0xBED20560, 0x3C3C74F3], [0x89F9C9F8, 0xD2D14B61], [0x35FA38C6, 0xBB04A2C1], [0xCB49E3C6, 0xC5626167]].map(([a, b]) => [BigInt(a), BigInt(b)]);
const CS64_FATOR = 0x82893933n, CS64_AJ0 = 0xF2F90B1An, CS64_AJ1 = 0x0B1A0000n;

const rol16 = (v) => { v &= M; return ((v << 16n) | (v >> 16n)) & M; };
const sigma0 = (v) => ((v >> 7n) ^ (v << 25n) ^ (v >> 18n) ^ (v << 14n) ^ (v >> 3n)) & M;
const sigma1 = (v) => ((v >> 17n) ^ (v << 15n) ^ (v >> 19n) ^ (v << 13n) ^ (v >> 10n)) & M;
const S1 = (e) => { const r = e * 0x100000001n; return (r >> 6n) ^ (r >> 11n) ^ (r >> 25n); };
const S0 = (a) => { const r = a * 0x100000001n; return (r >> 2n) ^ (r >> 13n) ^ (r >> 22n); };

function rodadas(estado, w, primeira = 0) {
  let [a, b, c, d, e, f, g, h] = estado;
  const k = primeira === 14 ? K_BLOCO : K;
  for (let i = primeira; i < 64; i++) { // mesmo resultado das rodadas desenroladas do original
    const t1 = h + S1(e) + (g ^ (e & (f ^ g))) + k[i] + w[i];
    const t2 = S0(a) + ((a & b) | (c & (a | b)));
    h = g; g = f; f = e; e = (d + t1) & M; d = c; c = b; b = a; a = (t1 + t2) & M;
  }
  return [a, b, c, d, e, f, g, h];
}
function expandir(w, primeira = 16) {
  for (let i = primeira; i < 64; i++) {
    const x = w[i - 2], y = w[i - 15];
    const s1 = (x >> 17n) ^ (x << 15n) ^ (x >> 19n) ^ (x << 13n) ^ (x >> 10n);
    const s0 = (y >> 7n) ^ (y << 25n) ^ (y >> 18n) ^ (y << 14n) ^ (y >> 3n);
    w.push((s1 + w[i - 7] + s0 + w[i - 16]) & M);
  }
}
const be = (buf, ini, fim) => { let v = 0n; for (let i = ini; i < fim; i++) v = (v << 8n) | BigInt(buf[i]); return v; };
function iniciar(dados) { // dados = 7 primeiros bytes
  const w = [...Array(14).fill(0n), be(dados, 0, 3), be(dados, 3, 7)];
  for (let i = 16; i < 30; i++) {
    let v = AGENDA[i - 16];
    if (i - 2 >= 14) v += i === 16 ? (sigma1(w[i - 2]) ^ AJ_SIGMA1) : sigma1(w[i - 2]);
    if (i - 7 >= 14) v += w[i - 7];
    if (i - 15 >= 14) v += i === 29 ? (sigma0(w[i - 15]) ^ AJ_SIGMA0) : sigma0(w[i - 15]);
    w.push(v & M);
  }
  w.push((sigma1(w[28]) + w[23] + sigma0(w[15]) + w[14] + AJUSTE - K[14]) & M);
  expandir(w, 31);
  const trab = rodadas(ESTADO, w, 14);
  return INICIAL.map((x, i) => (x + trab[i]) & M);
}
function sha(dados) {
  const tam = 57 + dados.length;
  const resto = dados.subarray(7);
  const zeros = (((55 - tam) % 64) + 64) % 64;
  const pad = Buffer.concat([resto, Buffer.from([0x80]), Buffer.alloc(zeros), Buffer.alloc(8)]);
  pad.writeBigUInt64BE(BigInt(tam * 8), pad.length - 8);
  let estado = iniciar(dados.subarray(0, 7));
  for (let o = 0; o < pad.length; o += 64) {
    const w = []; for (let i = 0; i < 16; i++) w.push(BigInt(pad.readUInt32BE(o + i * 4)));
    expandir(w);
    const trab = rodadas(estado, w);
    estado = estado.map((x, i) => (x + trab[i]) & M);
  }
  const out = Buffer.alloc(32); estado.forEach((x, i) => out.writeUInt32BE(Number(x), i * 4)); return out;
}
function palavrasLE(dados) {
  const p = Buffer.concat([dados, Buffer.alloc((4 - (dados.length % 4)) % 4)]);
  const w = []; for (let i = 0; i < p.length; i += 4) w.push(BigInt(p.readUInt32LE(i)));
  if (w.length % 2) w.push(0n); return w;
}
function cs64(dados, digest) {
  let ka = BigInt(digest.readUInt32LE(0)) | 1n, kb = BigInt(digest.readUInt32LE(4)) | 1n;
  const fat = [(ka * CS64_FATOR) & M, (kb * CS64_FATOR) & M];
  const termos = CS64.map(([c], i) => (c * fat[i % 2]) & M);
  const desl = CS64.map(([, o]) => o);
  palavrasLE(Buffer.concat([Buffer.from([0]), dados])).forEach((w, i) => {
    let t = w * (i % 2 === 0 ? ka : kb);
    let o = rol16(w) * (i % 2 === 0 ? 0xEF0569FBn : 0xC31713DBn);
    if (i === 0) { t += CS64_AJ0 * fat[0]; o += CS64_AJ1; }
    termos.push(t & M); desl.push(o & M);
  });
  let swapAcc = 0n, swapUlt = 0n, st = 0n, acc = 0n;
  for (let i = 0; i < termos.length; i += 2) {
    const x = termos[i], y = termos[i + 1];
    let t = rol16((desl[i] + x) & M); let q = (t * 0x76F50F34n) & M;
    swapAcc += (rol16(q) * 0xC3EFEA97n + q) & M;
    t = rol16((desl[i + 1] + y) & M); q = (t * 0x1881CE3Cn) & M;
    swapUlt = (rol16(q) * 0x35BD1EC9n + q) & M;
    swapAcc = (swapAcc + swapUlt) & M;
    st = (st * ka + x) & M;
    st = (rol16(st) * 0xCF98B111n) & M; st = (rol16(st) * 0x87085B9Fn) & M;
    st = (rol16(st) * 0x12CEB96Dn) & M; st = (rol16(st) * 0x257E1D83n) & M;
    acc += st;
    t = (st * kb + y) & M;
    t = (rol16(t) * 0xA27416F5n) & M; t = (rol16(t) * 0xD38396FFn) & M;
    st = (rol16((rol16(t) * 0x7C932B89n) & M) * 0xBFA49F69n) & M;
    acc = (acc + st) & M;
  }
  return [swapUlt ^ st, swapAcc ^ acc];
}
let cache = { chave: null, valor: null };
function secMsGecV2(unixSegundos) {
  let s = Math.floor(unixSegundos) + 11644473600; // segundos inteiros bastam: o resultado é arredondado para 5 minutos
  s -= s % 300;
  const texto = (BigInt(s) * 10000000n).toString() + TOKEN;
  if (cache.chave === texto) return cache.valor;
  const dados = Buffer.from(texto, 'ascii');
  const dig = sha(dados);
  const [w0, w1] = cs64(dados, dig);
  const c = Buffer.alloc(8); c.writeUInt32LE(Number(w0), 0); c.writeUInt32LE(Number(w1), 4);
  const valor = c.toString('hex').toUpperCase() + '-' + dig.toString('hex').toUpperCase();
  cache = { chave: texto, valor };
  return valor;
}
module.exports = { secMsGecV2, VERSAO, TOKEN };
