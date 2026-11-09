// TikTok Live Snake — server
// Connects to TikTok LIVE (no login needed), listens for gifts/follows/likes
// and relays them to the game over WebSocket. Serves public/ as static files.

const express = require('express');
const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = Number(process.env.PORT || 3000);
const USERNAME = (process.argv[2] || process.env.TIKTOK_USER || '').replace(/^@/, '');
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
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Stream-wide state: top supporters (coins = diamonds)
const supporters = new Map(); // uniqueId -> {name, avatar, coins}
let tiktokStatus = { connected: false, username: USERNAME, error: null };

function broadcast(msg) {
  const s = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(s);
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
  addCoins(user, coins);
  if (BOMB_GIFTS.includes(String(giftName).toLowerCase())) {
    return broadcast({ type: 'bomb', user, giftName, diamonds, count, coins, power: coins });
  }
  broadcast({
    type: 'gift',
    user,
    giftName,
    diamonds,
    count,
    coins,
    apples: Math.max(1, Math.round(coins * APPLES_PER_DIAMOND)),
  });
}
function handleFollow(user) {
  broadcast({ type: 'follow', user, apples: APPLES_PER_FOLLOW });
  chatSay(CHAT.followMsg.replace('{name}', user.id).replace('{nickname}', user.name));
}
function handleLike(user, likes) {
  broadcast({ type: 'like', user, likes });
}
function handleChat(user, text) {
  broadcast({ type: 'chat', user, text });
}
function handleJoin(user) {
  broadcast({ type: 'join', user });
}

const perf = new Map(); // latest frame stats reported by each game page
wss.on('connection', (ws, req) => {
  const id = Math.random().toString(36).slice(2, 7);
  ws.on('message', (m) => { try { const d = JSON.parse(m); if (d.type === 'perf') perf.set(id, { ...d, at: Date.now() }); } catch {} });
  ws.on('close', () => perf.delete(id));
  ws.send(
    JSON.stringify({
      type: 'snapshot',
      supporters: [...supporters.values()],
      tiktok: tiktokStatus,
      config: { applesPerDiamond: APPLES_PER_DIAMOND, applesPerFollow: APPLES_PER_FOLLOW, bombGifts: BOMB_GIFTS },
    })
  );
});

// Test events without a live stream: curl -X POST localhost:3000/api/sim -H 'content-type: application/json' -d '{"type":"gift","diamonds":5}'
app.post('/api/sim', (req, res) => {
  const b = req.body || {};
  const user = { id: b.id || 'tester', name: b.name || 'Tester', avatar: b.avatar || null };
  if (b.type === 'gift') handleGift(user, b.giftName || 'Rose', Number(b.diamonds || 1), Number(b.count || 1));
  else if (b.type === 'follow') handleFollow(user);
  else if (b.type === 'like') handleLike(user, Number(b.likes || 1));
  else if (b.type === 'chat') handleChat(user, String(b.text || 'wow'));
  else if (b.type === 'join') handleJoin(user);
  else return res.status(400).json({ ok: false, error: 'unknown type' });
  res.json({ ok: true });
});
app.get('/api/perf', (_req, res) => res.json([...perf.values()]));
app.get('/api/status', (_req, res) => res.json({ tiktok: tiktokStatus, supporters: supporters.size }));

async function connectTikTok() {
  if (!USERNAME) {
    console.log('ℹ️  Nenhum usuário do TikTok informado. Use: node server.js <usuario>. Modo demo ativo (teclas G/F/L no jogo).');
    return;
  }
  const { TikTokLiveConnection, WebcastEvent } = require('tiktok-live-connector');
  const conn = new TikTokLiveConnection(USERNAME, {
    processInitialData: false,
    enableExtendedGiftInfo: false, // true needs a paid EulerStream plan; diamondCount comes with every gift anyway
    fetchRoomInfoOnConnect: true,
    ...(chatEnabled
      ? { signApiKey: CHAT.signApiKey, authenticateWs: true,
          session: { cookie: { type: 'cookie', value: { sessionId: CHAT.sessionId, ttTargetIdc: CHAT.targetIdc } } } }
      : {}),
  });
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
  conn.on(WebcastEvent.STREAM_END, () => {
    tiktokStatus = { ...tiktokStatus, connected: false, error: 'stream ended' };
    broadcast({ type: 'tiktok', ...tiktokStatus });
  });
  conn.on('disconnected', () => {
    tiktokStatus = { ...tiktokStatus, connected: false };
    broadcast({ type: 'tiktok', ...tiktokStatus });
    console.log('⚠️  Desconectado, reconectando em 10s');
    setTimeout(tryConnect, 10000);
  });
  conn.on('error', (e) => console.error('Erro do TikTok:', e?.message || e));

  let connecting = false;
  async function tryConnect() {
    if (connecting || conn.isConnected) return;
    connecting = true;
    try {
      const state = await conn.connect();
      tiktokStatus = { connected: true, username: USERNAME, error: null, roomId: state.roomId };
      console.log(`✅ Conectado a @${USERNAME} (sala ${state.roomId})`);
    } catch (e) {
      tiktokStatus = { connected: false, username: USERNAME, error: e?.message || String(e) };
      console.error('❌ Não conectou (a live já está no ar?):', tiktokStatus.error, '- tentando de novo em 20s');
      setTimeout(tryConnect, 20000);
    }
    connecting = false;
    broadcast({ type: 'tiktok', ...tiktokStatus });
  }
  tryConnect();

  // Watchdog: a new "Go LIVE" creates a new room. If the account's current room id changes
  // (or we lost the connection), reconnect so likes/gifts keep flowing without a manual restart.
  const probe = new TikTokLiveConnection(USERNAME, { processInitialData: false, fetchRoomInfoOnConnect: false });
  setInterval(async () => {
    try {
      const rid = String(await probe.fetchRoomId());
      if (rid && rid !== String(tiktokStatus.roomId || '')) {
        console.log(`🔄 Nova live detectada (${tiktokStatus.roomId || '-'} -> ${rid}), reconectando...`);
        try { await conn.disconnect(); } catch {}
        setTimeout(tryConnect, 1000);
      }
    } catch (e) { /* offline or lookup failed: try again next tick */ }
  }, 45000);
}

server.listen(PORT, () => {
  console.log(`🐍 Jogo: http://localhost:${PORT}  (no LIVE Studio use http://localtest.me:${PORT}, 1080x1920)`);
  connectTikTok();
});
