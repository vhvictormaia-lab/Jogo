// TikTok Live Snake — server
// Connects to TikTok LIVE (no login needed), listens for gifts/follows/likes
// and relays them to the game over WebSocket. Serves public/ as static files.

const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 3000);
const CFG = require('./config');
// usuário: o do painel; se ainda não tiver, o que o iniciar.bat passou
{ const doBat = (process.argv[2] || process.env.TIKTOK_USER || '').replace(/^@/, '').trim(); if (doBat && !CFG.get().usuario) CFG.atualizar({ usuario: doBat }); }
let USERNAME = CFG.get().usuario || (process.argv[2] || process.env.TIKTOK_USER || '').replace(/^@/, '');
const APPLES_PER_DIAMOND = Number(process.env.APPLES_PER_DIAMOND || 1); // 1 💎 = 1 🍎
const APPLES_PER_FOLLOW = Number(process.env.APPLES_PER_FOLLOW || 1);
// Gifts that blow up the snake's tail instead of dropping apples (case-insensitive gift names).
// Tail loses `diamonds * count` segments.
// Posting into the TikTok LIVE chat (thanks for every follow). Needs your account's
// `sessionid` + `tt-target-idc` cookies and a Euler Stream sign API key (https://www.eulerstream.com).
const CHAT = {
  sessionId: process.env.TIKTOK_SESSION_ID || '',
  targetIdc: process.env.TIKTOK_TARGET_IDC || '',
  signApiKey: process.env.EULER_API_KEY || '',
  followMsg: process.env.FOLLOW_CHAT_MSG || 'Valeu pelo follow, @{name}! 🍎 +1 fruta pra cobrinha',
  minGapMs: Number(process.env.CHAT_MIN_GAP_MS || 3000), // spam guard between messages
};
const chatEnabled = !!(CHAT.sessionId && CHAT.targetIdc && CHAT.signApiKey);
let chatConn = null; const chatQueue = []; let chatBusy = false;
function chatSay(text) {
  if (!chatEnabled || !chatConn) return;
  chatQueue.push(text); if (chatQueue.length > 20) chatQueue.shift();
  if (chatBusy) return;
  chatBusy = true;
  (async () => {
    while (chatQueue.length) {
      const msg = chatQueue.shift();
      try { await chatConn.sendMessage(msg); console.log('💬 chat:', msg); }
      catch (e) { console.error('💬 falha ao enviar no chat:', e?.message || e); }
      await new Promise((r) => setTimeout(r, CHAT.minGapMs));
    }
    chatBusy = false;
  })();
}
const BOMB_GIFTS = (process.env.BOMB_GIFTS || 'GG,Fireworks,Boxing Gloves,Rocket').split(',').map((s) => s.trim().toLowerCase());

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Voz da cobrinha (agradecimentos, respostas aos comentários, falas) — ver voz.js
const { criarVoz, slugsPresente, DIR: VOZ_DIR } = require('./voz');
let voz = null; // criada logo depois do broadcast()
app.use('/voz', express.static(VOZ_DIR));

// Cantorias: MP3 próprio por presente, na pasta "cantorias" (ex.: rose.mp3, rosa-2.mp3)
const fs = require('fs');
const CANT_DIR = path.join(__dirname, 'cantorias');
app.use('/cantorias', express.static(CANT_DIR));
let cantArquivos = [], cantLidoEm = 0;
function cantoriaDe(giftName) {
  if (Date.now() - cantLidoEm > 10000) {
    cantLidoEm = Date.now();
    try { cantArquivos = fs.readdirSync(CANT_DIR).filter((f) => /\.(mp3|ogg|wav|m4a)$/i.test(f)); } catch { cantArquivos = []; }
  }
  const nomes = slugsPresente(giftName);
  const achados = cantArquivos.filter((f) => { const b = f.replace(/\.[^.]+$/, '').toLowerCase(); return nomes.some((n) => b === n || new RegExp('^' + n + '-\\d+$').test(b)); });
  return achados.length ? '/cantorias/' + encodeURIComponent(achados[Math.floor(Math.random() * achados.length)]) : null;
}

// um erro inesperado não derruba o jogo no meio da live
process.on('unhandledRejection', (e) => console.error('Erro:', e?.message || e));
process.on('uncaughtException', (e) => console.error('Erro:', e?.message || e));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Stream-wide state: top supporters (coins = diamonds)
const supporters = new Map(); // uniqueId -> {name, avatar, coins}
let tiktokStatus = { connected: false, username: USERNAME, error: null };

function broadcast(msg) {
  const s = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(s);
}
// MODO=abismo (iniciar-abismo.bat) ou o modo escolhido no painel: Palhaço do Abismo + Serpente das Trevas em /abismo.html
if (process.env.MODO) { const m = process.env.MODO.toLowerCase(); CFG.atualizar({ modo: ['abismo', 'quiz'].includes(m) ? m : 'cobrinha' }); }
voz = criarVoz(broadcast, CFG.get().modo);

// ---------- Quiz do Abismo (quiz.html): o motor roda aqui, a tela só mostra ----------
const QuizMotor = require('./public/quiz-motor.js');
const ARQ_PLACAR = path.join(CFG.DIR, 'quiz-placar.json');
let placarSalvo = null; try { placarSalvo = JSON.parse(fs.readFileSync(ARQ_PLACAR, 'utf8')); } catch {}
let salvarTimer = null;
const quiz = QuizMotor.criar({
  perguntas: require('./public/perguntas-quiz.js'), falas: require('./public/falas.js'), placar: placarSalvo, cfg: CFG.get().quiz,
  emitir: (m) => broadcast(m),
  falar: (partes, o) => voz.quiz(partes, o),
  salvar: (db) => { clearTimeout(salvarTimer); salvarTimer = setTimeout(() => { try { fs.mkdirSync(CFG.DIR, { recursive: true }); fs.writeFileSync(ARQ_PLACAR, JSON.stringify(db)); } catch (e) { console.error('Não salvei o placar do quiz:', e.message); } }, 1500); },
});
function ligarQuiz() { if (CFG.get().modo === 'quiz') { if (!quiz.rodando) { quiz.iniciar(); console.log('🧠 Quiz do Abismo ligado: http://localhost:' + PORT + '/quiz.html'); } } else if (quiz.rodando) quiz.parar(); }
setTimeout(ligarQuiz, 500);
const noQuiz = () => quiz.rodando;

// ---------- estatísticas e registro para o painel ----------
const stats = { espectadores: 0, curtidas: 0, presentes: 0, diamantes: 0, seguidores: 0, compartilhamentos: 0, comentarios: 0, entradas: 0, inicio: Date.now() };
const registro = [];
function registrar(tipo, user, texto) {
  registro.push({ t: Date.now(), tipo, nome: user ? user.name : '', foto: user ? user.avatar : null, texto: String(texto || '').slice(0, 200) });
  if (registro.length > 80) registro.shift();
}

// Ranking da live (TOP 6 na tela): pontos por tudo que a pessoa faz
const PTS = { diamante: 100, seguir: 500, curtida: 10, comentario: 20, compartilhar: 200 };
const pontos = new Map(); // id -> {id, name, avatar, pts}
const chatPtsAt = new Map();
let likesTotal = 0;
function somar(user, pts) {
  const cur = pontos.get(user.id) || { id: user.id, name: user.name, avatar: user.avatar || null, pts: 0 };
  cur.pts += pts; cur.name = user.name; if (user.avatar) cur.avatar = user.avatar;
  pontos.set(user.id, cur);
  agendarRank();
}
function top6() { return [...pontos.values()].sort((a, b) => b.pts - a.pts).slice(0, 6); }
let rankTimer = null;
function agendarRank() {
  if (rankTimer) return;
  rankTimer = setTimeout(() => { rankTimer = null; broadcast({ type: 'rank', top: top6() }); }, 400);
}

function userInfo(u = {}) {
  return {
    id: u.uniqueId || u.displayId || u.userId || u.id || 'anon',
    name: u.nickname || u.uniqueId || u.displayId || 'Anonymous',
    avatar:
      u.profilePicture?.url?.[0] ||
      u.profilePicture?.urls?.[0] ||
      u.avatarThumb?.urlList?.[0] ||
      u.avatarThumb?.url?.[0] ||
      null,
  };
}

function addCoins(user, coins) {
  const cur = supporters.get(user.id) || { ...user, coins: 0 };
  cur.coins += coins;
  cur.name = user.name;
  if (user.avatar) cur.avatar = user.avatar;
  supporters.set(user.id, cur);
}

function handleGift(user, giftName, diamonds, count) {
  const coins = Math.max(1, diamonds) * count;
  stats.presentes += count; stats.diamantes += coins; registrar('presente', user, `${count}x ${giftName} (${coins} 💎)`);
  addCoins(user, coins);
  somar(user, coins * PTS.diamante);
  if (noQuiz()) quiz.presente(user, giftName, Math.max(1, diamonds), count);
  const bomba = BOMB_GIFTS.includes(String(giftName).toLowerCase());
  voz.presente(user, giftName, count, Math.max(1, diamonds), bomba);
  if (bomba) {
    return broadcast({ type: 'bomb', user, giftName, diamonds, count, coins, power: coins });
  }
  broadcast({
    type: 'gift',
    cantoria: cantoriaDe(giftName),
    user,
    giftName,
    diamonds,
    count,
    coins,
    apples: Math.max(1, Math.round(coins * APPLES_PER_DIAMOND)),
  });
}
function handleFollow(user) {
  stats.seguidores++; registrar('seguiu', user, 'seguiu');
  broadcast({ type: 'follow', user, apples: APPLES_PER_FOLLOW });
  somar(user, PTS.seguir);
  voz.seguiu(user); if (noQuiz()) quiz.seguiu(user);
  chatSay(CHAT.followMsg.replace('{name}', user.id).replace('{nickname}', user.name));
}
function handleLike(user, likes) {
  stats.curtidas += likes;
  broadcast({ type: 'like', user, likes });
  somar(user, likes * PTS.curtida);
  likesTotal += likes; voz.curtidas(likesTotal);
  if (noQuiz()) quiz.curtidas(user, likes);
}
function handleChat(user, text) {
  stats.comentarios++; registrar('comentario', user, text);
  broadcast({ type: 'chat', user, text });
  if (Date.now() - (chatPtsAt.get(user.id) || 0) > 10000) { chatPtsAt.set(user.id, Date.now()); somar(user, PTS.comentario); }
  if (noQuiz()) quiz.chat(user, text);
  voz.comentario(user, text);
}
const sharePtsAt = new Map();
function handleShare(user) {
  stats.compartilhamentos++; registrar('compartilhou', user, 'compartilhou a live');
  broadcast({ type: 'share', user });
  if (Date.now() - (sharePtsAt.get(user.id) || 0) > 60000) { sharePtsAt.set(user.id, Date.now()); somar(user, PTS.compartilhar); }
  voz.compartilhou(user); if (noQuiz()) quiz.compartilhou(user);
}
function handleJoin(user) {
  stats.entradas++;
  broadcast({ type: 'join', user });
  voz.entrou(user); if (noQuiz()) quiz.entrou(user);
}

const perf = new Map(); // latest frame stats reported by each game page
wss.on('connection', (ws, req) => {
  const id = Math.random().toString(36).slice(2, 7);
  ws.on('message', (m) => { try { const d = JSON.parse(m); if (d.type === 'perf') perf.set(id, { ...d, at: Date.now() }); else if (d.type === 'falou') voz.fim(d.id); } catch {} });
  ws.on('close', () => perf.delete(id));
  ws.send(
    JSON.stringify({
      type: 'snapshot',
      supporters: [...supporters.values()],
      rank: top6(),
      tiktok: tiktokStatus,
      config: { applesPerDiamond: APPLES_PER_DIAMOND, applesPerFollow: APPLES_PER_FOLLOW, bombGifts: BOMB_GIFTS },
      musica: CFG.get().musica,
      quiz: quiz.estado(),
    })
  );
});

// Test events without a live stream: curl -X POST localhost:3000/api/sim -H 'content-type: application/json' -d '{"type":"gift","diamonds":5}'
function simular(b) {
  const user = { id: b.id || 'tester', name: b.name || 'Tester', avatar: b.avatar || null };
  if (b.type === 'gift') handleGift(user, b.giftName || 'Rose', Number(b.diamonds || 1), Number(b.count || 1));
  else if (b.type === 'follow') handleFollow(user);
  else if (b.type === 'like') handleLike(user, Number(b.likes || 1));
  else if (b.type === 'chat') handleChat(user, String(b.text || 'wow'));
  else if (b.type === 'join') handleJoin(user);
  else if (b.type === 'share') handleShare(user);
  else return false;
  return true;
}
app.post('/api/sim', (req, res) => {
  if (!simular(req.body || {})) return res.status(400).json({ ok: false, error: 'unknown type' });
  res.json({ ok: true });
});
app.get('/api/perf', (_req, res) => res.json([...perf.values()]));
app.get('/api/status', (_req, res) => res.json({ tiktok: tiktokStatus, supporters: supporters.size }));

// ---------- conexão com o TikTok (liga e desliga pelo painel) ----------
let tk = null; // { conn, probe, watchdog, timer, parado }
function pararTikTok() {
  if (!tk) return;
  tk.parado = true; clearInterval(tk.watchdog); clearTimeout(tk.timer);
  try { tk.conn.removeAllListeners && tk.conn.removeAllListeners(); } catch {}
  try { tk.conn.disconnect(); } catch {}
  tk = null; chatConn = null;
  tiktokStatus = { connected: false, username: USERNAME, error: null };
  broadcast({ type: 'tiktok', ...tiktokStatus });
}
async function connectTikTok() {
  pararTikTok();
  if (!USERNAME) {
    console.log('ℹ️  Nenhum usuário do TikTok informado. Coloque no painel (http://localhost:' + PORT + '/painel.html). Modo teste ativo.');
    return;
  }
  let TikTokLiveConnection, WebcastEvent;
  try { ({ TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector')); }
  catch (e) { console.error('❌ Biblioteca do TikTok não instalada. Rode o INSTALAR.bat de novo.'); tiktokStatus = { connected: false, username: USERNAME, error: 'biblioteca ausente' }; return; }
  const conn = new TikTokLiveConnection(USERNAME, {
    processInitialData: false,
    enableExtendedGiftInfo: false, // true needs a paid EulerStream plan; diamondCount comes with every gift anyway
    fetchRoomInfoOnConnect: true,
    ...(chatEnabled
      ? { signApiKey: CHAT.signApiKey, authenticateWs: true,
          session: { cookie: { type: 'cookie', value: { sessionId: CHAT.sessionId, ttTargetIdc: CHAT.targetIdc } } } }
      : {}),
  });
  const meu = tk = { conn, parado: false };
  chatConn = conn;
  console.log(chatEnabled ? '💬 Respostas no chat ligadas: cada seguidor recebe um agradecimento' : 'ℹ️  Respostas no chat desligadas (opcional)');

  conn.on(WebcastEvent.GIFT, (d) => {
    // Streakable gifts (giftType 1) are counted once the streak ends
    const giftType = d.gift?.type ?? d.giftDetails?.giftType ?? d.giftType;
    if (giftType === 1 && !d.repeatEnd) return;
    const diamonds =
      d.gift?.diamondCount ?? d.diamondCount ?? d.giftDetails?.diamondCount ?? d.extendedGiftInfo?.diamond_count ?? 1;
    const name = d.gift?.name ?? d.giftDetails?.giftName ?? d.giftName ?? d.extendedGiftInfo?.name ?? 'Gift';
    const count = Number(d.repeatCount || 1);
    handleGift(userInfo(d.user), name, Number(diamonds), count);
  });
  conn.on(WebcastEvent.FOLLOW, (d) => handleFollow(userInfo(d.user)));
  conn.on(WebcastEvent.LIKE, (d) => handleLike(userInfo(d.user), Number(d.count ?? d.likeCount ?? 1)));
  conn.on(WebcastEvent.CHAT, (d) => handleChat(userInfo(d.user), d.comment || ''));
  conn.on(WebcastEvent.MEMBER, (d) => handleJoin(userInfo(d.user)));
  conn.on(WebcastEvent.SHARE, (d) => handleShare(userInfo(d.user)));
  conn.on(WebcastEvent.ROOM_USER, (d) => { const n = Number(d.total ?? d.viewerCount ?? d.totalUser ?? 0); if (n) stats.espectadores = n; });
  conn.on(WebcastEvent.STREAM_END, () => {
    tiktokStatus = { ...tiktokStatus, connected: false, error: 'stream ended' };
    broadcast({ type: 'tiktok', ...tiktokStatus });
  });
  conn.on('disconnected', () => {
    if (meu.parado) return;
    tiktokStatus = { ...tiktokStatus, connected: false };
    broadcast({ type: 'tiktok', ...tiktokStatus });
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

  // Watchdog: a new "Go LIVE" creates a new room. If the account's current room id changes
  // (or we lost the connection), reconnect so likes/gifts keep flowing without a manual restart.
  const probe = new TikTokLiveConnection(USERNAME, { processInitialData: false, fetchRoomInfoOnConnect: false });
  meu.watchdog = setInterval(async () => {
    try {
      const rid = String(await probe.fetchRoomId());
      if (!meu.parado && rid && rid !== String(tiktokStatus.roomId || '')) {
        console.log(`🔄 Nova live detectada (${tiktokStatus.roomId || '-'} -> ${rid}), reconectando...`);
        try { await conn.disconnect(); } catch {}
        meu.timer = setTimeout(tryConnect, 1000);
      }
    } catch (e) { /* offline or lookup failed: try again next tick */ }
  }, 45000);
}

// ---------- painel (só funciona neste computador) ----------
require('./painel')({ app, express, CFG, stats, registro, top6, voz, broadcast, PORT,
  tiktok: () => tiktokStatus, conectar: () => connectTikTok(), desconectar: () => pararTikTok(),
  trocarUsuario: (u) => { USERNAME = u; tiktokStatus = { connected: false, username: u, error: null }; },
  zerarRanking: () => { pontos.clear(); supporters.clear(); broadcast({ type: 'rank', top: [] }); },
  sim: (b) => simular(b), quiz, ligarQuiz });

server.listen(PORT, () => {
  console.log(`🐍 Jogo: http://localhost:${PORT}  (no LIVE Studio use http://localtest.me:${PORT}, 1080x1920)`);
  console.log(`🎛️  Painel: http://localhost:${PORT}/painel.html`);
  connectTikTok();
});
