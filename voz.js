// Voz da cobrinha: decide o que falar (agradecimentos, respostas aos comentários, falas da cobra)
// e transforma o texto em áudio.
//  1) Voz natural (neural) da Microsoft, a mesma do "Ler em voz alta" do Edge — precisa de internet.
//     Padrão: Francisca. Para trocar, antes de "node server.js" no iniciar.bat:  set VOZ=pt-BR-ThalitaNeural
//     (outras: pt-BR-AntonioNeural, voz masculina).
//  2) Reserva: voz do Windows (SAPI, ex.: "Microsoft Maria"), se a natural falhar.
//  3) Última reserva: a voz do navegador, no próprio jogo.
// O áudio vai para o jogo como arquivo, então ele entra na live pela própria fonte "Link".
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const DIR = path.join(os.tmpdir(), 'cobrinha-voz');
try { fs.mkdirSync(DIR, { recursive: true }); } catch {}

// ---------------- texto -> áudio (Windows) ----------------
let ps = null, psReady = false, psFailed = process.platform !== 'win32';
const waiting = new Map(); // arquivo -> callback
function startPs() {
  if (psFailed || ps) return;
  try {
    ps = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'voz.ps1')], { windowsHide: true });
  } catch (e) { psFailed = true; return; }
  let buf = '';
  ps.stdout.setEncoding('utf8');
  ps.stdout.on('data', (d) => {
    buf += d; let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (line.startsWith('VOZ ')) { psReady = true; console.log('🗣️  Voz reserva do Windows: ' + line.slice(4)); }
      else if (line === 'SEMVOZ') {
        psFailed = true;
        console.log('ℹ️  Nenhuma voz em português no Windows. Instale em Configurações > Hora e idioma > Fala (Português Brasil).');
        try { ps.stdin.end(); } catch {}
      } else if (line.startsWith('OK ') || line.startsWith('ERR ')) {
        const f = line.slice(line.indexOf(' ') + 1); const cb = waiting.get(f); waiting.delete(f);
        if (cb) cb(line.startsWith('OK ') ? f : null);
      }
    }
  });
  ps.on('error', () => { psFailed = true; });
  ps.on('exit', () => { ps = null; psReady = false; for (const cb of waiting.values()) cb(null); waiting.clear(); });
}
startPs();

// ---------------- voz natural (Edge / Microsoft neural) ----------------
// Vozes: vêm do painel (privado/config.json). Variáveis de ambiente, se existirem, têm prioridade.
const CFG = require('./config');
const hz = (n) => (n >= 0 ? '+' : '') + Math.round(n) + 'Hz', pc = (n) => (n >= 0 ? '+' : '') + Math.round(n) + '%';
const vozCobra = () => (process.env.VOZ || CFG.get().vozes.cobra || 'pt-BR-FranciscaNeural').trim();
const vozNarrador = () => (process.env.VOZ_NARRADOR || CFG.get().vozes.narrador || 'pt-BR-AntonioNeural').trim();
// Voz de espectador: cada pessoa ganha uma voz própria (sempre a mesma), que lê o comentário dela
function vozEspectador(user) {
  let h = 0; for (const c of String(user && user.id || 'x')) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const V = ['pt-BR-AntonioNeural', 'pt-BR-FranciscaNeural', 'pt-BR-ThalitaMultilingualNeural'];
  return { quem: 'espectador', voz: V[h % V.length], pitch: hz(-20 + (h >>> 3) % 51), rate: pc(-5 + (h >>> 9) % 21) };
}
const usaVozEspectador = () => CFG.get().vozEspectador !== false;
// Abismo: cada personagem com a sua voz (tom e velocidade ajustáveis no painel)
function vozesAbismo() {
  const v = CFG.get().vozes;
  return {
    palhaco: { voz: (process.env.VOZ_PALHACO || v.palhaco.voz).trim(), pitch: process.env.TOM_PALHACO || hz(v.palhaco.tom), rate: pc(v.palhaco.vel) },
    serpente: { voz: (process.env.VOZ_SERPENTE || v.serpente.voz).trim(), pitch: process.env.TOM_SERPENTE || hz(v.serpente.tom), rate: pc(v.serpente.vel) },
  };
}
// código de acesso novo da Microsoft (v2, de 2026) — ver edge-token.js
const { secMsGecV2, VERSAO: EDGE_VER, TOKEN: EDGE_TOKEN } = require('./edge-token');
let edgeMotivo = '';
let edgeSkew = 0;            // diferença de relógio com o servidor da Microsoft (segundos)
let edgeFalhas = 0, edgePausaAte = 0, edgeAvisou = false;
const secMsGec = () => secMsGecV2(Date.now() / 1000 + edgeSkew);
const xml = (t) => String(t).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
function carimbo() { return new Date().toUTCString().replace(/^(\w+), (\d+) (\w+) (\d+) ([\d:]+) GMT$/, '$1 $3 $2 $4 $5 GMT+0000 (Coordinated Universal Time)'); }
const multiEstrangeira = (v) => /Multilingual/i.test(v) && !/^pt-/i.test(v);
let semLang = false; // se a Microsoft não aceitar o <lang>, fala sem ele
function synthNatural(text, voz = vozCobra(), pros = {}, tentativa = 0) {
  if (multiEstrangeira(voz) && !semLang && tentativa === 0) // tenta com <lang>; se não vier áudio, tenta sem
    return synthNatural_(text, voz, pros, 0, true).then((u) => u || synthNatural_(text, voz, pros, 0, false).then((u2) => { if (u2) semLang = true; return u2; }));
  return synthNatural_(text, voz, pros, tentativa, false);
}
function synthNatural_(text, voz, pros, tentativa, forcarPt) {
  return new Promise((resolve) => {
    let WebSocket; try { WebSocket = require('ws'); } catch { return resolve(null); }
    const id = crypto.randomUUID().replace(/-/g, '');
    const url = (process.env.VOZ_TESTE_URL || 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1')
      + `?TrustedClientToken=${EDGE_TOKEN}&ConnectionId=${id}&Sec-MS-GEC=${secMsGec()}&Sec-MS-GEC-Version=2-${EDGE_VER}`;
    const ws = new WebSocket(url, { headers: {
      'Pragma': 'no-cache', 'Cache-Control': 'no-cache', 'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${EDGE_VER.split('.')[0]}.0.0.0 Safari/537.36 Edg/${EDGE_VER.split('.')[0]}.0.0.0`,
      'Accept-Encoding': 'gzip, deflate, br, zstd', 'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': 'muid=' + crypto.randomBytes(16).toString('hex').toUpperCase() + ';',
    } });
    const partes = []; let fim = false;
    const acabar = (ok) => { if (fim) return; fim = true; clearTimeout(t); try { ws.terminate(); } catch {}
      if (!ok || !partes.length) return resolve(null);
      const name = Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.mp3';
      fs.writeFile(path.join(DIR, name), Buffer.concat(partes), (e) => resolve(e ? null : '/voz/' + name)); };
    const t = setTimeout(() => acabar(false), 7000);
    ws.on('unexpected-response', (req, res) => {
      // 403 costuma ser relógio do PC fora da hora: ajusta pela hora do servidor e tenta mais uma vez
      const d = Date.parse(res.headers.date || ''); fim = true; clearTimeout(t); try { ws.terminate(); } catch {}
      if (res.statusCode === 403 && d && tentativa === 0) { edgeSkew += (d - Date.now()) / 1000; return synthNatural_(text, voz, pros, 1, forcarPt).then(resolve); }
      edgeMotivo = 'a Microsoft respondeu ' + res.statusCode; resolve(null);
    });
    ws.on('error', (e) => { edgeMotivo = e && e.code ? 'erro de conexão ' + e.code : 'erro de conexão'; acabar(false); });
    ws.on('close', () => acabar(partes.length > 0));
    ws.on('open', () => {
      ws.send(`X-Timestamp:${carimbo()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n`
        + '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n');
      ws.send(`X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${carimbo()}Z\r\nPath:ssml\r\n\r\n`
        + `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='pt-BR'><voice name='${xml(voz)}'>`
        + `<prosody pitch='${xml(pros.pitch || '+0Hz')}' rate='${xml(pros.rate || '+8%')}' volume='+0%'>`
        // vozes multilíngues de outros países (Andrew, Ava...): pede para falar em português do Brasil
        + (forcarPt ? `<lang xml:lang='pt-BR'>${xml(text)}</lang>` : xml(text)) + `</prosody></voice></speak>`);
    });
    ws.on('message', (data, isBinary) => {
      if (isBinary) {
        const b = Buffer.from(data); if (b.length < 2) return;
        const n = b.readUInt16BE(0); const cab = b.subarray(2, 2 + n).toString();
        if (cab.includes('Path:audio')) partes.push(b.subarray(2 + n));
      } else if (String(data).includes('Path:turn.end')) acabar(true);
    });
  });
}

// tira o "Ssss..." da serpente e as letras esticadas antes de falar: a voz lia isso como um chiado
const semChiado = (t) => String(t || '').replace(/(^|[\s.,!?…])s{3,}[.…!]*(?=\s|$)/gi, '$1').replace(/s{3,}/gi, 's').replace(/\s{2,}/g, ' ').replace(/^[\s.,…]+/, '').trim();
async function synth(text, voz = vozCobra(), pros = {}) {
  text = semChiado(text) || text;
  // tenta a voz natural; se falhar 3 vezes seguidas, descansa 5 minutos e usa a do Windows
  if (Date.now() >= edgePausaAte) {
    const url = await synthNatural(text, voz, pros);
    if (url) {
      if (!edgeAvisou) { edgeAvisou = true; console.log('🗣️  Voz natural ativada: ' + voz); }
      edgeFalhas = 0; return url;
    }
    if (++edgeFalhas >= 3) { edgePausaAte = Date.now() + 5 * 60000; edgeFalhas = 0; edgeAvisou = false;
      console.log('ℹ️  Voz natural indisponível agora (' + (edgeMotivo || 'sem resposta') + '). Usando a voz do Windows (robótica) por 5 minutos.'); }
  }
  return synthWindows(text);
}

function synthWindows(text) {
  return new Promise((resolve) => {
    if (psFailed || !ps) return resolve(null);
    const name = Date.now().toString(36) + Math.random().toString(36).slice(2, 6) + '.wav';
    const file = path.join(DIR, name);
    const t = setTimeout(() => { if (waiting.delete(file)) resolve(null); }, 8000);
    waiting.set(file, (ok) => { clearTimeout(t); resolve(ok ? '/voz/' + name : null); });
    try { ps.stdin.write(file + '|' + Buffer.from(text, 'utf8').toString('base64') + '\n'); }
    catch { waiting.delete(file); clearTimeout(t); resolve(null); }
  });
}
// apaga áudios antigos
setInterval(() => {
  try { for (const f of fs.readdirSync(DIR)) { const p = path.join(DIR, f); if (Date.now() - fs.statSync(p).mtimeMs > 120000) fs.unlinkSync(p); } } catch {}
}, 60000);

// ---------------- frases e filtro (compartilhados com a página) ----------------
const F = require('./public/falas.js');
const { semAcento, proibido, limparFala, nomeFalado, podeLer, rnd, slugsPresente, responder, FALAS_DA_COBRA } = F;
// palavras-proibidas.txt (na pasta do jogo): uma palavra ou frase por linha; recarrega sozinho quando muda
const ARQ_PROIBIDAS = path.join(__dirname, 'palavras-proibidas.txt');
let proibidasExtra = [], proibidasMtime = 0;
function carregarProibidas() {
  try {
    const st = fs.statSync(ARQ_PROIBIDAS); if (st.mtimeMs === proibidasMtime) return; proibidasMtime = st.mtimeMs;
    proibidasExtra = fs.readFileSync(ARQ_PROIBIDAS, 'utf8').split(/\r?\n/).map((l) => semAcento(l.replace(/#.*/, '').trim())).filter((l) => l.length >= 2);
    console.log(`🚫 Palavras proibidas extras: ${proibidasExtra.length}`);
  } catch { proibidasExtra = []; proibidasMtime = 0; }
}
carregarProibidas(); setInterval(carregarProibidas, 10000).unref?.();
F.setExtraProibido((t) => {
  if (!proibidasExtra.length) return false;
  const n = ' ' + semAcento(t).replace(/[^\p{L}\p{N}]+/gu, ' ') + ' ';
  return proibidasExtra.some((w) => n.includes(' ' + w.replace(/[^\p{L}\p{N}]+/gu, ' ').trim() + ' '));
});

// ---------------- IA opcional (OpenAI) ----------------
// Com a chave (set OPENAI_API_KEY=... no iniciar.bat) a cobra responde com IA de verdade.
// Sem a chave, ou se a IA falhar/demorar, usa as frases prontas acima.
const OPENAI_KEY_ = () => (process.env.OPENAI_API_KEY || CFG.get().openai.chave || '').trim();
const OPENAI_MODEL_ = () => (process.env.OPENAI_MODEL || CFG.get().openai.modelo || 'gpt-4.1-mini').trim();
let iaAvisou = false, iaFalhas = 0, iaPausaAte = 0;
async function respostaIA(texto, n, persona) {
  const OPENAI_KEY = OPENAI_KEY_(), OPENAI_MODEL = OPENAI_MODEL_();
  if (!OPENAI_KEY || Date.now() < iaPausaAte || typeof fetch !== 'function') return null;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch((process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1') + '/chat/completions', {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + OPENAI_KEY },
      body: JSON.stringify({
        model: OPENAI_MODEL, max_tokens: 70, temperature: 0.9,
        messages: [
          { role: 'system', content: (persona || 'Você é a Cobrinha, uma cobra divertida e carinhosa de um jogo ao vivo no TikTok. ')
            + 'Responda o comentário do espectador em português do Brasil, em UMA frase curta (no máximo 20 palavras), '
            + 'chamando a pessoa pelo nome. Seja engraçada e simpática, sem palavrões, sem política, sem assuntos adultos, '
            + 'sem pedir dados pessoais e sem prometer prêmios. Pode incentivar curtidas e presentes de leve. Não use emojis.' },
          { role: 'user', content: `${n} comentou: ${texto}` },
        ],
      }),
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    let out = limparFala(j.choices?.[0]?.message?.content || '').replace(/^["']|["']$/g, '').slice(0, 170);
    if (!out || proibido(out)) return null;
    if (!iaAvisou) { iaAvisou = true; console.log('🤖 IA ligada (' + OPENAI_MODEL + '): a cobra responde os comentários com IA'); }
    iaFalhas = 0; return out;
  } catch (e) {
    if (++iaFalhas >= 3) { iaFalhas = 0; iaPausaAte = Date.now() + 5 * 60000; console.log('ℹ️  IA indisponível (' + (e.message || e) + '). Usando frases prontas por 5 minutos.'); }
    return null;
  } finally { clearTimeout(t); }
}


// ---------------- fila de falas ----------------
// prioridade: 3 presente/bomba, 2 seguidor, 1 comentário/entrada, 0 fala solta
function criarVoz(broadcast, modoInicial = 'cobrinha') {
  let modo = modoInicial; let ABISMO = modo === 'abismo' || modo === 'quiz'; let QUIZ = modo === 'quiz';
  // no modo quiz quem decide as falas é o motor do quiz (quiz-motor.js); as automáticas ficam desligadas
  const fila = []; let falando = false, ultimaFala = Date.now(), seq = 0, atual = 0;
  const cooldownChat = new Map();
  const pode = (k, ms) => { const a = Date.now(); if (a - (cooldownChat.get(k) || 0) < ms) return false; cooldownChat.set(k, a); return true; }; let ultimoBemVindo = 0, ultimoMarco = 0;

  function por(pri, texto, extra = {}) {
    if (!texto) return;
    if (extra.limpar) for (let k = fila.length - 1; k >= 0; k--) if (/^quiz-(pergunta|revelar|acerto|cta|entrou)/.test(fila[k].kind || '')) fila.splice(k, 1);
    if (fila.length >= 6) {
      // fila cheia: tira o item de menor prioridade, se o novo for mais importante
      let low = -1; for (let i = 0; i < fila.length; i++) if (low < 0 || fila[i].pri < fila[low].pri) low = i;
      if (fila[low].pri >= pri) return;
      fila.splice(low, 1);
    }
    let i = fila.length; while (i > 0 && fila[i - 1].pri < pri) i--; // mais importante passa na frente
    const VA = vozesAbismo();
    const partes = (Array.isArray(texto) ? texto : [{ texto, voz: vozCobra() }])
      .map((p) => (p.quem && VA[p.quem] ? { ...VA[p.quem], ...p, voz: p.voz || VA[p.quem].voz } : p));
    fila.splice(i, 0, { pri, texto: partes.map((p) => p.texto).join(' '), partes, ...extra });
    proxima();
  }
  async function proxima() {
    if (falando || !fila.length) return;
    falando = true;
    const it = fila.shift();
    const urls = [];
    for (const p of it.partes) urls.push(await synth(p.texto, p.voz, { pitch: p.pitch, rate: p.rate }));
    const ok = urls.every(Boolean);
    const dur = Math.min(14000, 900 + it.texto.length * 70); // estimativa (o jogo avisa quando termina)
    atual = ++seq;
    broadcast({ type: 'say', id: atual, text: it.texto, urls: ok ? urls : null, url: ok ? urls[0] : null, user: it.user || null, kind: it.kind || 'fala', ms: dur,
      partes: it.partes.map((p, k) => ({ quem: p.quem || null, acao: p.acao || null, texto: p.texto, url: urls[k] || null })) });
    ultimaFala = Date.now();
    terminou = () => { falando = false; ultimaFala = Date.now(); setTimeout(proxima, 250); };
    seguranca = setTimeout(() => terminou && terminou(), dur + 4000);
  }
  let terminou = null, seguranca = null;
  function fim(id) { if (id && id !== atual) return; clearTimeout(seguranca); const f = terminou; terminou = null; if (f) f(); }

  // fala solta da cobra quando está tudo quieto (a cada 20 a 30 segundos, sem repetir as últimas)
  const recentes = [];
  let proximaSolta = 20000 + Math.random() * 10000;
  setInterval(() => {
    if (QUIZ || falando || fila.length || Date.now() - ultimaFala < proximaSolta) return;
    const fs_ = CFG.get().falaSolta; const intervalo = () => (fs_.min + Math.random() * Math.max(0, fs_.max - fs_.min)) * 1000;
    if (ABISMO) { proximaSolta = intervalo(); return por(0, F.ABISMO.solta(), { kind: 'solta' }); }
    const opcoes = FALAS_DA_COBRA.filter((f) => !recentes.includes(f));
    const f = rnd(opcoes); recentes.push(f); if (recentes.length > 8) recentes.shift();
    proximaSolta = intervalo();
    por(0, f, { kind: 'cobra' });
  }, 2000);

  return {
    fim,
    setModo(m) { modo = ['abismo', 'quiz'].includes(m) ? m : 'cobrinha'; ABISMO = modo !== 'cobrinha'; QUIZ = modo === 'quiz'; },
    // falas do Quiz do Abismo: partes [{ quem: 'palhaco'|'serpente', texto, acao }]
    quiz(partes, o = {}) {
      const ok = (partes || []).map((p) => ({ ...p, texto: limparFala(p.texto).slice(0, 220) })).filter((p) => p.texto && !proibido(p.texto));
      if (ok.length) por(o.pri ?? 2, ok, { kind: o.kind || 'quiz', user: o.user || null, limpar: !!o.limpar });
    },
    // fala digitada no painel: passa na frente de tudo
    manual(quem, texto) {
      const t = limparFala(texto).slice(0, 400); if (!t) return false;
      if (quem === 'palhaco' || quem === 'serpente') por(4, [{ quem, texto: t, acao: null }], { kind: 'manual' });
      else por(4, [{ texto: t, voz: quem === 'narrador' ? vozNarrador() : vozCobra() }], { kind: 'manual' });
      return true;
    },
    testar(quem) {
      const FR = { palhaco: 'Rá rá rá! Eu sou o Palhaço do Abismo! Manda uma rosa aí!', serpente: 'Ssss... eu sou a Serpente das Trevas. Bem-vindo ao abismo.',
        cobra: 'Oi! Eu sou a cobrinha da live! Tô com fome!', narrador: 'Fulano disse: que live legal!' };
      return this.manual(quem, FR[quem] || FR.cobra);
    },
    presente(user, giftName, count, diamonds, bomba) {
      if (QUIZ) return;
      por(3, ABISMO ? F.ABISMO.presente(user, giftName, count, diamonds, bomba) : F.textoPresente(user, giftName, count, diamonds, bomba), { user, kind: bomba ? 'bomba' : 'presente' });
    },
    seguiu(user) {
      if (QUIZ) return;
      por(2, ABISMO ? F.ABISMO.seguiu(user) : F.textoSeguiu(user), { user, kind: 'seguiu' });
    },
    comentario(user, texto) {
      if (QUIZ) return;
      const agora = Date.now();
      if (agora - (cooldownChat.get(user.id) || 0) < 25000) return; // não responde a mesma pessoa toda hora
      if (fila.length >= 3) return;                                   // live agitada: prioriza presentes
      const t = podeLer(texto); if (!t) return;
      cooldownChat.set(user.id, agora);
      const n = nomeFalado(user);
      const lido = F.textoLido(n, t);
      if (ABISMO) {
        const partes = F.ABISMO.comentario(user, t);
        const quem = partes[1].quem;
        if (usaVozEspectador()) partes[0] = { ...vozEspectador(user), texto: t, acao: null }; // a própria pessoa "lê" o comentário
        const persona = quem === 'palhaco'
          ? 'Você é o Palhaço do Abismo, um palhaço doido, engraçado e carinhoso de uma live interativa no TikTok. Ri muito (rá rá rá). '
          : 'Você é a Serpente das Trevas, uma serpente dramática e divertida de uma live interativa no TikTok. Alonga os S (ssss). ';
        return respostaIA(t, n, persona).then((ia) => { if (ia) partes[1].texto = ia; por(1, partes, { user, kind: 'comentario' }); });
      }
      respostaIA(t, n).then((ia) => {
        const leitura = usaVozEspectador() ? { ...vozEspectador(user), texto: t } : { texto: lido, voz: vozNarrador() };
        por(1, [leitura, { texto: ia || responder(t, n), voz: vozCobra() }], { user, kind: 'comentario' });
      });
    },
    compartilhou(user) {
      if (QUIZ) return;
      const agora = Date.now();
      if (agora - (cooldownChat.get('share:' + user.id) || 0) < 60000) return;
      cooldownChat.set('share:' + user.id, agora);
      por(2, ABISMO ? F.ABISMO.compartilhou(user) : F.textoCompartilhou(user), { user, kind: 'seguiu' });
    },
    entrou(user) {
      if (QUIZ) return;
      const agora = Date.now();
      if (ABISMO) { // no Abismo eles cumprimentam quase todo mundo que entra
        if (agora - ultimoBemVindo < 7000 || fila.length > 1 || !pode('join:' + user.id, 10 * 60000)) return;
        ultimoBemVindo = agora; return por(1, F.ABISMO.entrou(user), { user, kind: 'entrou' });
      }
      if (agora - ultimoBemVindo < 30000 || falando || fila.length) return;
      ultimoBemVindo = agora;
      por(1, F.textoEntrou(user), { user, kind: 'entrou' });
    },
    curtidas(total) {
      if (QUIZ) return;
      const marco = Math.floor(total / 500) * 500;
      if (marco >= 500 && marco > ultimoMarco) { ultimoMarco = marco; por(1, ABISMO ? F.ABISMO.marco(marco) : `Chegamos a ${marco} curtidas! Continua curtindo!`, { kind: 'cobra' }); }
    },
    DIR,
  };
}

module.exports = { criarVoz, nomeFalado, slugsPresente, DIR };
