// Baile do Abismo — servidor
// Conecta na LIVE do TikTok (sem login), recebe comentários, presentes, curtidas, seguidores
// e manda tudo para a tela do baile (baile.html) pelo WebSocket.

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 3000);
const CFG = require('./config');
// usuário: o do painel; se ainda não tiver, o que o iniciar.bat passou
{ const doBat = (process.argv[2] || process.env.TIKTOK_USER || '').replace(/^@/, '').trim(); if (doBat && !CFG.get().usuario) CFG.atualizar({ usuario: doBat }); }
let USERNAME = CFG.get().usuario || (process.argv[2] || process.env.TIKTOK_USER || '').replace(/^@/, '');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.get('/', (_req, res) => res.redirect('/baile.html'));
app.use(express.static(path.join(__dirname, 'public'), { setHeaders: (res, f) => { if (/\.(html|js)$/.test(f)) res.set('Cache-Control', 'no-cache'); } })); // sempre pega a versão nova depois de atualizar

// um erro inesperado não derruba o jogo no meio da live
process.on('unhandledRejection', (e) => console.error('Erro:', e?.message || e));
process.on('uncaughtException', (e) => console.error('Erro:', e?.message || e));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
let tiktokStatus = { connected: false, username: USERNAME, error: null };
function broadcast(msg) {
  const s = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(s);
}

// ---------- filtro: palavrões comuns + palavras-proibidas.txt (recarrega sozinho) ----------
const Texto = require('./public/texto.js');
const ARQ_PROIBIDAS = path.join(__dirname, 'palavras-proibidas.txt');
let proibidasExtra = [], proibidasMtime = 0;
function carregarProibidas() {
  try {
    const st = fs.statSync(ARQ_PROIBIDAS); if (st.mtimeMs === proibidasMtime) return; proibidasMtime = st.mtimeMs;
    proibidasExtra = fs.readFileSync(ARQ_PROIBIDAS, 'utf8').split(/\r?\n/).map((l) => Texto.semAcento(l.replace(/#.*/, '').trim())).filter((l) => l.length >= 2);
  } catch { proibidasExtra = []; proibidasMtime = 0; }
}
carregarProibidas(); setInterval(carregarProibidas, 10000).unref?.();
Texto.setExtraProibido((t) => {
  if (!proibidasExtra.length) return false;
  const n = ' ' + Texto.semAcento(t).replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
  return proibidasExtra.some((w) => n.includes(' ' + w.replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' '));
});

// ---------- o baile ----------
const BaileMotor = require('./public/baile-motor.js');
const baile = BaileMotor.criar({ texto: Texto, cfg: CFG.get().baile, emitir: (m) => broadcast(m) });
baile.iniciar();
// músicas e personagens próprios (Meshy + Mixamo): pastas suas, que a atualização não apaga
const MUS_DIR = path.join(__dirname, 'musicas-baile'), PERS_DIR = path.join(__dirname, 'baile-personagens');
for (const d of [MUS_DIR, PERS_DIR, path.join(PERS_DIR, 'dancas')]) { try { fs.mkdirSync(d, { recursive: true }); } catch {} }
app.use('/musicas-baile', express.static(MUS_DIR));
app.use('/baile-personagens', express.static(PERS_DIR));
const listarPastas = (dir) => { try { return fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; } };
const listar = (dir, re) => { try { return fs.readdirSync(dir).filter((f) => re.test(f)).sort((a, b) => a.localeCompare(b, 'pt-BR')); } catch { return []; } };
// Todas as danças por padrão. Se o PC sofrer pra abrir: crie o arquivo baile-personagens/poucas-dancas.txt
// e cada personagem carrega só 8 danças (as mesmas pra todos) + andar, correr, parado e comemorar.
const DANCAS_LEVE = ['Samba Dancing', 'Hip Hop Dancing', 'Macarena Dance', 'Gangnam Style', 'Chicken Dance', 'Twist Dance', 'Silly Dancing', 'Salsa Dancing'];
const BASICOS = /walk|andar|run|corr|idle|parad|cheer|comemor/i;
function dancasLeves(arqs) {
  if (!fs.existsSync(path.join(PERS_DIR, 'poucas-dancas.txt'))) return arqs;
  const sem = (f) => f.replace(/\.(glb|gltf|fbx)$/i, '');
  const escolhidas = DANCAS_LEVE.filter((n) => arqs.some((f) => sem(f).toLowerCase() === n.toLowerCase()));
  if (escolhidas.length < 4) return arqs; // pasta com outras danças: usa todas
  return arqs.filter((f) => BASICOS.test(f) || escolhidas.some((n) => sem(f).toLowerCase() === n.toLowerCase()));
}
// foto do TikTok pelo próprio servidor (pra desenhar no outdoor 3D sem bloqueio do navegador). Só imagens do TikTok.
const fotosCache = new Map();
app.get('/api/foto', async (req, res) => {
  try {
    const u = new URL(String(req.query.u || ''));
    if (u.protocol !== 'https:' || !/(^|\.)(tiktokcdn(-us|-eu)?\.com|ibyteimg\.com|byteimg\.com|tiktokv\.com|muscdn\.com)$/i.test(u.hostname)) return res.status(400).end();
    let f = fotosCache.get(u.href);
    if (!f) {
      const r = await fetch(u.href, { signal: AbortSignal.timeout(8000) });
      const tipo = r.headers.get('content-type') || '';
      if (!r.ok || !/^image\//i.test(tipo)) return res.status(404).end();
      const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 3e6) return res.status(413).end();
      f = { tipo, buf }; fotosCache.set(u.href, f); if (fotosCache.size > 60) fotosCache.delete(fotosCache.keys().next().value);
    }
    res.set('Content-Type', f.tipo); res.set('Cache-Control', 'max-age=3600'); res.send(f.buf);
  } catch (e) { res.status(404).end(); }
});
app.get('/api/baile/arquivos', (_req, res) => {
  let credito = ''; try { credito = fs.readFileSync(path.join(PERS_DIR, 'credito.txt'), 'utf8').trim().slice(0, 160); } catch {}
  res.json({
    musicas: listar(MUS_DIR, /\.(mp3|ogg|m4a|wav)$/i).map((f) => 'musicas-baile/' + encodeURIComponent(f)),
    modelos: listar(PERS_DIR, /\.(glb|gltf|fbx)$/i).map((f) => 'baile-personagens/' + encodeURIComponent(f)),
    dancas: listar(path.join(PERS_DIR, 'dancas'), /\.(glb|gltf|fbx)$/i).map((f) => 'baile-personagens/dancas/' + encodeURIComponent(f)),
    // roupas: imagens com o mesmo nome do boneco (palhacinho-menino.jpg, palhacinho-menino-azul.jpg...) trocam a cor da roupa
    texturas: listar(PERS_DIR, /\.(jpe?g|png|webp)$/i).map((f) => 'baile-personagens/' + encodeURIComponent(f)),
    // danças de cada boneco: pasta baile-personagens/dancas/<nome do boneco>
    dancasPorBoneco: Object.fromEntries(listarPastas(path.join(PERS_DIR, 'dancas')).map((d) => [d, dancasLeves(listar(path.join(PERS_DIR, 'dancas', d), /\.(glb|gltf|fbx)$/i)).map((f) => 'baile-personagens/dancas/' + encodeURIComponent(d) + '/' + encodeURIComponent(f))]).filter(([, l]) => l.length)),
    credito,
  });
});

// ---------- estatísticas e registro para o painel ----------
const stats = { espectadores: 0, curtidas: 0, presentes: 0, diamantes: 0, seguidores: 0, compartilhamentos: 0, comentarios: 0, entradas: 0, inicio: Date.now() };
const registro = [];
function registrar(tipo, user, texto) {
  registro.push({ t: Date.now(), tipo, nome: user ? user.name : '', foto: user ? user.avatar : null, texto: String(texto || '').slice(0, 200) });
  if (registro.length > 80) registro.shift();
}
function userInfo(u = {}) {
  return {
    id: u.uniqueId || u.displayId || u.userId || u.id || 'anon',
    name: u.nickname || u.uniqueId || u.displayId || 'Anônimo',
    avatar: u.profilePicture?.url?.[0] || u.profilePicture?.urls?.[0] || u.avatarThumb?.urlList?.[0] || u.avatarThumb?.url?.[0] || null,
  };
}
function handleGift(user, giftName, diamonds, count) {
  const coins = Math.max(1, diamonds) * count;
  stats.presentes += count; stats.diamantes += coins; registrar('presente', user, `${count}x ${giftName} (${coins} moedas)`);
  baile.presente(user, giftName, Math.max(1, diamonds), count);
}
function handleFollow(user) { stats.seguidores++; registrar('seguiu', user, 'seguiu'); baile.seguiu(user); }
function handleLike(user, likes) { stats.curtidas += likes; broadcast({ type: 'like', likes }); baile.curtidas(user, likes); }
function handleChat(user, text) { stats.comentarios++; registrar('comentario', user, Texto.podeLer(text) || '***'); baile.chat(user, text); }
function handleShare(user) { stats.compartilhamentos++; registrar('compartilhou', user, 'compartilhou a live'); baile.compartilhou(user); }
function handleJoin(user) { stats.entradas++; baile.entrou(user); }

const telas = new Map(); // tela do baile aberta -> a música está tocando?
function somTelas() { const v = [...telas.values()].filter((t) => Date.now() - t.em < 10000); return { abertas: v.length, tocando: v.some((t) => t.ok) }; }
wss.on('connection', (ws) => {
  ws.on('message', (m) => { try { const d = JSON.parse(m); if (d.type === 'som') { telas.set(ws, { ok: !!d.ok, em: Date.now() }); } } catch {} });
  ws.on('close', () => telas.delete(ws));
  ws.send(JSON.stringify({ type: 'snapshot', tiktok: tiktokStatus, musica: CFG.get().musica, baile: baile.estado() }));
});

// Teste sem live: curl -X POST localhost:3000/api/sim -H 'content-type: application/json' -d '{"type":"chat","text":"oi"}'
function simular(b) {
  const user = { id: String(b.id || 'tester').slice(0, 40), name: String(b.name || 'Tester').slice(0, 40), avatar: b.avatar || null };
  if (b.type === 'gift') handleGift(user, b.giftName || 'Rose', Number(b.diamonds || 1), Number(b.count || 1));
  else if (b.type === 'follow') handleFollow(user);
  else if (b.type === 'like') handleLike(user, Number(b.likes || 1));
  else if (b.type === 'chat') handleChat(user, String(b.text || 'eu'));
  else if (b.type === 'join') handleJoin(user);
  else if (b.type === 'share') handleShare(user);
  else return false;
  return true;
}
app.post('/api/sim', (req, res) => {
  const ip = String(req.socket.remoteAddress || '');
  if (!(ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1')) return res.status(403).json({ ok: false });
  if (!simular(req.body || {})) return res.status(400).json({ ok: false, error: 'tipo desconhecido' });
  res.json({ ok: true });
});
app.get('/api/status', (_req, res) => res.json({ tiktok: tiktokStatus, naRoda: baile.tamanho }));

// ---------- conexão com o TikTok (liga e desliga pelo painel) ----------
let tk = null; // { conn, watchdog, timer, parado }
function pararTikTok() {
  if (!tk) return;
  tk.parado = true; clearInterval(tk.watchdog); clearTimeout(tk.timer);
  try { tk.conn.removeAllListeners && tk.conn.removeAllListeners(); } catch {}
  try { tk.conn.disconnect(); } catch {}
  tk = null;
  tiktokStatus = { connected: false, username: USERNAME, error: null };
  broadcast({ type: 'tiktok', ...tiktokStatus });
}
async function connectTikTok() {
  pararTikTok();
  if (!USERNAME) { console.log('ℹ️  Nenhum usuário do TikTok informado. Coloque no painel (http://localhost:' + PORT + '/painel.html).'); return; }
  let TikTokLiveConnection, WebcastEvent;
  try { ({ TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector')); }
  catch (e) { console.error('❌ Biblioteca do TikTok não instalada. Rode o INSTALAR.bat de novo.'); tiktokStatus = { connected: false, username: USERNAME, error: 'biblioteca ausente' }; return; }
  const conn = new TikTokLiveConnection(USERNAME, { processInitialData: false, enableExtendedGiftInfo: false, fetchRoomInfoOnConnect: true });
  const meu = tk = { conn, parado: false };

  conn.on(WebcastEvent.GIFT, (d) => {
    // presentes em sequência (combo) contam uma vez só, quando o combo termina
    const giftType = d.gift?.type ?? d.giftDetails?.giftType ?? d.giftType;
    if (giftType === 1 && !d.repeatEnd) return;
    const diamonds = d.gift?.diamondCount ?? d.diamondCount ?? d.giftDetails?.diamondCount ?? d.extendedGiftInfo?.diamond_count ?? 1;
    const name = d.gift?.name ?? d.giftDetails?.giftName ?? d.giftName ?? d.extendedGiftInfo?.name ?? 'Gift';
    handleGift(userInfo(d.user), name, Number(diamonds), Number(d.repeatCount || 1));
  });
  conn.on(WebcastEvent.FOLLOW, (d) => handleFollow(userInfo(d.user)));
  conn.on(WebcastEvent.LIKE, (d) => handleLike(userInfo(d.user), Number(d.count ?? d.likeCount ?? 1)));
  conn.on(WebcastEvent.CHAT, (d) => handleChat(userInfo(d.user), d.comment || ''));
  conn.on(WebcastEvent.MEMBER, (d) => handleJoin(userInfo(d.user)));
  conn.on(WebcastEvent.SHARE, (d) => handleShare(userInfo(d.user)));
  conn.on(WebcastEvent.ROOM_USER, (d) => { const n = Number(d.total ?? d.viewerCount ?? d.totalUser ?? 0); if (n) stats.espectadores = n; });
  conn.on(WebcastEvent.STREAM_END, () => { tiktokStatus = { ...tiktokStatus, connected: false, error: 'stream ended' }; broadcast({ type: 'tiktok', ...tiktokStatus }); });
  conn.on('disconnected', () => {
    if (meu.parado) return;
    tiktokStatus = { ...tiktokStatus, connected: false }; broadcast({ type: 'tiktok', ...tiktokStatus });
    console.log('⚠️  Desconectado, reconectando em 10s');
    meu.timer = setTimeout(tryConnect, 10000);
  });
  conn.on('error', (e) => console.error('Erro do TikTok:', e?.message || e));

  let connecting = false;
  async function tryConnect() {
    if (meu.parado || connecting || conn.isConnected) return;
    connecting = true;
    try {
      const state = await conn.connect();
      if (meu.parado) { try { conn.disconnect(); } catch {} return; }
      tiktokStatus = { connected: true, username: USERNAME, error: null, roomId: state.roomId };
      console.log(`✅ Conectado a @${USERNAME} (sala ${state.roomId})`);
    } catch (e) {
      tiktokStatus = { connected: false, username: USERNAME, error: e?.message || String(e) };
      console.error('❌ Não conectou (a live já está no ar?):', tiktokStatus.error, '- tentando de novo em 20s');
      if (!meu.parado) meu.timer = setTimeout(tryConnect, 20000);
    } finally { connecting = false; }
    broadcast({ type: 'tiktok', ...tiktokStatus });
  }
  tryConnect();
  // se você fizer uma live nova, o número da sala muda: reconecta sozinho
  const probe = new TikTokLiveConnection(USERNAME, { processInitialData: false, fetchRoomInfoOnConnect: false });
  meu.watchdog = setInterval(async () => {
    try {
      const rid = String(await probe.fetchRoomId());
      if (!meu.parado && rid && rid !== String(tiktokStatus.roomId || '')) {
        console.log(`🔄 Nova live detectada, reconectando...`);
        try { await conn.disconnect(); } catch {}
        meu.timer = setTimeout(tryConnect, 1000);
      }
    } catch (e) { /* sem internet ou live fora do ar: tenta de novo depois */ }
  }, 45000);
}

// ---------- painel (só funciona neste computador) ----------
require('./painel')({ app, express, CFG, stats, registro, broadcast, PORT, baile, somTelas,
  tiktok: () => tiktokStatus, conectar: () => connectTikTok(), desconectar: () => pararTikTok(),
  trocarUsuario: (u) => { USERNAME = u; tiktokStatus = { connected: false, username: u, error: null }; },
  sim: (b) => simular(b) });

server.listen(PORT, () => {
  console.log(`💃 Baile do Abismo: http://localhost:${PORT}/baile.html  (no LIVE Studio use http://localtest.me:${PORT}/baile.html, 1080x1920)`);
  console.log(`🎛️  Painel: http://localhost:${PORT}/painel.html`);
  connectTikTok();
});
