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
const VOZ_NATURAL = (process.env.VOZ || 'pt-BR-FranciscaNeural').trim();          // voz da cobra
const VOZ_NARRADOR = (process.env.VOZ_NARRADOR || 'pt-BR-AntonioNeural').trim();  // voz que lê os comentários
const EDGE_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_VER = '130.0.2849.68';
let edgeSkew = 0;            // diferença de relógio com o servidor da Microsoft (segundos)
let edgeFalhas = 0, edgePausaAte = 0, edgeAvisou = false;
function secMsGec() {
  let s = BigInt(Math.floor(Date.now() / 1000 + edgeSkew)) + 11644473600n;
  s -= s % 300n;
  return crypto.createHash('sha256').update((s * 10000000n).toString() + EDGE_TOKEN, 'ascii').digest('hex').toUpperCase();
}
const xml = (t) => String(t).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
function carimbo() { return new Date().toUTCString().replace(/^(\w+), (\d+) (\w+) (\d+) ([\d:]+) GMT$/, '$1 $3 $2 $4 $5 GMT+0000 (Coordinated Universal Time)'); }
function synthNatural(text, voz = VOZ_NATURAL, tentativa = 0) {
  return new Promise((resolve) => {
    let WebSocket; try { WebSocket = require('ws'); } catch { return resolve(null); }
    const id = crypto.randomUUID().replace(/-/g, '');
    const url = (process.env.VOZ_TESTE_URL || 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1')
      + `?TrustedClientToken=${EDGE_TOKEN}&ConnectionId=${id}&Sec-MS-GEC=${secMsGec()}&Sec-MS-GEC-Version=1-${EDGE_VER}`;
    const ws = new WebSocket(url, { headers: {
      'Pragma': 'no-cache', 'Cache-Control': 'no-cache', 'Origin': 'chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold',
      'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${EDGE_VER.split('.')[0]}.0.0.0 Safari/537.36 Edg/${EDGE_VER.split('.')[0]}.0.0.0`,
      'Accept-Encoding': 'gzip, deflate, br', 'Accept-Language': 'en-US,en;q=0.9',
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
      if (res.statusCode === 403 && d && tentativa === 0) { edgeSkew += (d - Date.now()) / 1000; return synthNatural(text, voz, 1).then(resolve); }
      resolve(null);
    });
    ws.on('error', () => acabar(false));
    ws.on('close', () => acabar(partes.length > 0));
    ws.on('open', () => {
      ws.send(`X-Timestamp:${carimbo()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n`
        + '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n');
      ws.send(`X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${carimbo()}Z\r\nPath:ssml\r\n\r\n`
        + `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='pt-BR'><voice name='${xml(voz)}'>`
        + `<prosody pitch='+0Hz' rate='+8%' volume='+0%'>${xml(text)}</prosody></voice></speak>`);
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

async function synth(text, voz = VOZ_NATURAL) {
  // tenta a voz natural; se falhar 3 vezes seguidas, descansa 5 minutos e usa a do Windows
  if (Date.now() >= edgePausaAte) {
    const url = await synthNatural(text, voz);
    if (url) {
      if (!edgeAvisou) { edgeAvisou = true; console.log('🗣️  Voz natural ativada: ' + VOZ_NATURAL); }
      edgeFalhas = 0; return url;
    }
    if (++edgeFalhas >= 3) { edgePausaAte = Date.now() + 5 * 60000; edgeFalhas = 0; edgeAvisou = false;
      console.log('ℹ️  Voz natural indisponível agora (sem internet?). Usando a voz do Windows por 5 minutos.'); }
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
const OPENAI_KEY = (process.env.OPENAI_API_KEY || '').trim();
const OPENAI_MODEL = (process.env.OPENAI_MODEL || 'gpt-4.1-mini').trim();
let iaAvisou = false, iaFalhas = 0, iaPausaAte = 0;
async function respostaIA(texto, n) {
  if (!OPENAI_KEY || Date.now() < iaPausaAte || typeof fetch !== 'function') return null;
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
  try {
    const r = await fetch((process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1') + '/chat/completions', {
      method: 'POST', signal: ctl.signal,
      headers: { 'content-type': 'application/json', authorization: 'Bearer ' + OPENAI_KEY },
      body: JSON.stringify({
        model: OPENAI_MODEL, max_tokens: 70, temperature: 0.9,
        messages: [
          { role: 'system', content: 'Você é a Cobrinha, uma cobra divertida e carinhosa de um jogo ao vivo no TikTok. '
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
function criarVoz(broadcast) {
  const fila = []; let falando = false, ultimaFala = Date.now(), seq = 0, atual = 0;
  const cooldownChat = new Map(); let ultimoBemVindo = 0, ultimoMarco = 0;

  function por(pri, texto, extra = {}) {
    if (!texto) return;
    if (fila.length >= 6) {
      // fila cheia: tira o item de menor prioridade, se o novo for mais importante
      let low = -1; for (let i = 0; i < fila.length; i++) if (low < 0 || fila[i].pri < fila[low].pri) low = i;
      if (fila[low].pri >= pri) return;
      fila.splice(low, 1);
    }
    let i = fila.length; while (i > 0 && fila[i - 1].pri < pri) i--; // mais importante passa na frente
    fila.splice(i, 0, { pri, texto: Array.isArray(texto) ? texto.map((p) => p.texto).join(' ') : texto,
      partes: Array.isArray(texto) ? texto : [{ texto, voz: VOZ_NATURAL }], ...extra });
    proxima();
  }
  async function proxima() {
    if (falando || !fila.length) return;
    falando = true;
    const it = fila.shift();
    const urls = [];
    for (const p of it.partes) urls.push(await synth(p.texto, p.voz));
    const ok = urls.every(Boolean);
    const dur = Math.min(14000, 900 + it.texto.length * 70); // estimativa (o jogo avisa quando termina)
    atual = ++seq;
    broadcast({ type: 'say', id: atual, text: it.texto, urls: ok ? urls : null, url: ok ? urls[0] : null, user: it.user || null, kind: it.kind || 'fala', ms: dur });
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
    if (falando || fila.length || Date.now() - ultimaFala < proximaSolta) return;
    const opcoes = FALAS_DA_COBRA.filter((f) => !recentes.includes(f));
    const f = rnd(opcoes); recentes.push(f); if (recentes.length > 8) recentes.shift();
    proximaSolta = 20000 + Math.random() * 10000;
    por(0, f, { kind: 'cobra' });
  }, 2000);

  return {
    fim,
    presente(user, giftName, count, diamonds, bomba) {
      por(3, F.textoPresente(user, giftName, count, diamonds, bomba), { user, kind: bomba ? 'bomba' : 'presente' });
    },
    seguiu(user) {
      por(2, F.textoSeguiu(user), { user, kind: 'seguiu' });
    },
    comentario(user, texto) {
      const agora = Date.now();
      if (agora - (cooldownChat.get(user.id) || 0) < 25000) return; // não responde a mesma pessoa toda hora
      if (fila.length >= 3) return;                                   // live agitada: prioriza presentes
      const t = podeLer(texto); if (!t) return;
      cooldownChat.set(user.id, agora);
      const n = nomeFalado(user);
      const lido = F.textoLido(n, t);
      respostaIA(t, n).then((ia) => {
        por(1, [{ texto: lido, voz: VOZ_NARRADOR }, { texto: ia || responder(t, n), voz: VOZ_NATURAL }], { user, kind: 'comentario' });
      });
    },
    compartilhou(user) {
      const agora = Date.now();
      if (agora - (cooldownChat.get('share:' + user.id) || 0) < 60000) return;
      cooldownChat.set('share:' + user.id, agora);
      por(2, F.textoCompartilhou(user), { user, kind: 'seguiu' });
    },
    entrou(user) {
      const agora = Date.now();
      if (agora - ultimoBemVindo < 30000 || falando || fila.length) return;
      ultimoBemVindo = agora;
      por(1, F.textoEntrou(user), { user, kind: 'entrou' });
    },
    curtidas(total) {
      const marco = Math.floor(total / 500) * 500;
      if (marco >= 500 && marco > ultimoMarco) { ultimoMarco = marco; por(1, `Chegamos a ${marco} curtidas! Continua curtindo!`, { kind: 'cobra' }); }
    },
    DIR,
  };
}

module.exports = { criarVoz, nomeFalado, slugsPresente, DIR };
