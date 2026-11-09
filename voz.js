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
const VOZ_NATURAL = (process.env.VOZ || 'pt-BR-FranciscaNeural').trim();
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
function synthNatural(text, tentativa = 0) {
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
      if (res.statusCode === 403 && d && tentativa === 0) { edgeSkew += (d - Date.now()) / 1000; return synthNatural(text, 1).then(resolve); }
      resolve(null);
    });
    ws.on('error', () => acabar(false));
    ws.on('close', () => acabar(partes.length > 0));
    ws.on('open', () => {
      ws.send(`X-Timestamp:${carimbo()}\r\nContent-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n`
        + '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n');
      ws.send(`X-RequestId:${id}\r\nContent-Type:application/ssml+xml\r\nX-Timestamp:${carimbo()}Z\r\nPath:ssml\r\n\r\n`
        + `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='pt-BR'><voice name='${xml(VOZ_NATURAL)}'>`
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

async function synth(text) {
  // tenta a voz natural; se falhar 3 vezes seguidas, descansa 5 minutos e usa a do Windows
  if (Date.now() >= edgePausaAte) {
    const url = await synthNatural(text);
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

// ---------------- limpeza do que vai ser falado ----------------
// \b do JavaScript não entende acentos ("maçã", "você"): troca por limite de palavra Unicode
const W = (re) => new RegExp(re.source.replace(/\\b/g, '(?:(?<![\\p{L}\\p{N}])(?=[\\p{L}\\p{N}])|(?<=[\\p{L}\\p{N}])(?![\\p{L}\\p{N}]))'), re.flags.includes('u') ? re.flags : re.flags + 'u');
const PALAVROES = W(/\b(porra|caralho|merda|puta|puto|fdp|vsf|vtnc|pqp|buceta|cu|cuzao|cuzão|arrombad\w*|viad\w*|bicha|corno|piroca|pau|rola|foder|fode|fodase|foda|desgraça\w*|desgraca\w*|otario\w*|otário\w*|idiota|imbecil|retardad\w*|macac\w*|nazi\w*|estupr\w*|matar|morre|suicid\w*|sexo|nude\w*|nudes|pelad\w*|gostos\w*|safad\w*|tes[aã]o|pinto|xota|xoxota|bct|krl|crl|prr)\b/i);
function limparFala(s) {
  return String(s || '')
    .replace(/https?:\/\/\S+|www\.\S+/gi, '')
    .replace(/@/g, '')
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/[_*~^`|<>{}\[\]\\#$%]/g, ' ')
    .replace(/(.)\1{3,}/g, '$1$1$1') // kkkkkkkk -> kkk
    .replace(/\s+/g, ' ')
    .trim();
}
function nomeFalado(u) {
  let n = limparFala(u && u.name).replace(/[0-9]{3,}/g, '').replace(/[^\p{L}\p{N} .'-]/gu, '').trim();
  if (!n || n.length < 2 || PALAVROES.test(n)) n = 'amigo';
  return n.slice(0, 22);
}
function podeLer(texto) {
  if (/https?:\/\/|www\.|\.com\b/i.test(String(texto || ''))) return null; // links: não lê
  const t = limparFala(texto);
  if (t.length < 2 || t.length > 90) return null;
  if (PALAVROES.test(t)) return null;
  if (/\d{6,}/.test(t)) return null; // telefones, códigos
  return t;
}
const rnd = (a) => a[Math.floor(Math.random() * a.length)];

// ---------------- nomes dos presentes em português ----------------
const PRESENTES = {
  'rose': ['a', 'Rosa'], 'tiktok': ['o', 'TikTok'], 'gg': ['o', 'GG'], 'heart me': ['o', 'Coração'], 'finger heart': ['o', 'Coraçãozinho'],
  'heart': ['o', 'Coração'], 'hand hearts': ['as', 'Mãos de coração'], 'ice cream cone': ['o', 'Sorvete'], 'doughnut': ['a', 'Rosquinha'],
  'donut': ['a', 'Rosquinha'], 'perfume': ['o', 'Perfume'], 'galaxy': ['a', 'Galáxia'], 'lion': ['o', 'Leão'], 'universe': ['o', 'Universo'],
  'rocket': ['o', 'Foguete'], 'fireworks': ['os', 'Fogos'], 'boxing gloves': ['as', 'Luvas de boxe'], 'corgi': ['o', 'Corgi'],
  'money gun': ['a', 'Arma de dinheiro'], 'sunglasses': ['os', 'Óculos'], 'cap': ['o', 'Boné'], 'confetti': ['o', 'Confete'],
  'hat and mustache': ['o', 'Chapéu e bigode'], 'friendship necklace': ['o', 'Colar da amizade'], 'love you': ['o', 'Te amo'],
  'thumbs up': ['o', 'Joinha'], 'weights': ['os', 'Pesos'], 'mic': ['o', 'Microfone'], 'coffee': ['o', 'Café'], 'gamepad': ['o', 'Controle'],
  'cake': ['o', 'Bolo'], 'swan': ['o', 'Cisne'], 'train': ['o', 'Trem'], 'whale diving': ['a', 'Baleia'], 'motorcycle': ['a', 'Moto'],
  'sports car': ['o', 'Carro esportivo'], 'private jet': ['o', 'Jatinho'], 'interstellar': ['o', 'Interestelar'], 'tiny diny': ['o', 'Dininho'],
  'paper crane': ['o', 'Tsuru'], 'little crown': ['a', 'Coroinha'], 'rosa': ['a', 'Rosa'], 'game controller': ['o', 'Controle'],
};
function presente(nome) {
  const k = String(nome || '').toLowerCase().trim();
  const p = PRESENTES[k];
  if (p) return { art: p[0], nome: p[1], conhecido: true };
  if (!k || k === 'gift') return { art: 'o', nome: 'presente' };
  return { art: 'o', nome: String(nome) };
}
// plural simples: Rosa -> Rosas, Coração -> Corações, Colar -> Colares
function plural(p) {
  if (!p.conhecido || p.art === 'as' || p.art === 'os') return p; // nome desconhecido (inglês): deixa como está
  const [w, ...resto] = p.nome.split(' ');
  let pw = w;
  if (/ão$/i.test(w)) pw = w.replace(/ão$/i, 'ões');
  else if (/[rz]$/i.test(w)) pw = w + 'es';
  else if (/[aeiouáéíóú]$/i.test(w)) pw = w + 's';
  else pw = w + 's';
  return { art: p.art === 'a' ? 'as' : 'os', nome: [pw, ...resto].join(' ') };
}
const pelo = (art) => ({ a: 'pela', o: 'pelo', as: 'pelas', os: 'pelos' }[art] || 'pelo');

// ---------------- respostas prontas aos comentários ----------------
const RESPOSTAS = [
  [/\b(oi+|ol[aá]|e a[ií]|eae|salve|opa|fala|hey|hello|hi)\b/i, ['Oi, {n}! Seja muito bem-vindo!', 'Salve, {n}! Chega mais!', 'Opa, {n}! Que bom te ver aqui!', 'Olá, {n}! Senta aí e aproveita a live!']],
  [/\bbo(m|a) (dia|tarde|noite)\b/i, ['Boa, {n}! Pra você também!', 'Opa, {n}! Tudo de bom pra você também!']],
  [/\b(te amo|amo voc[eê]|amo essa|amo a|amo o|amei|lind[ao]|fofa|fofo|perfeit[ao])\b/i, ['Ownt, também te amo, {n}!', 'Que fofo, {n}! Você é demais!', 'Para, {n}, que eu fico vermelha!']],
  [/\b(ma[cç][aã]|fruta|comida|fome|come|comer)\b/i, ['Tô com fome, {n}! Manda uma rosa que vira fruta!', 'Cada presente vira fruta pra mim, {n}!', 'Hmm, fruta! Manda mais, {n}!']],
  [/\b(cobra|cobrinha|snake|serpente)\b/i, ['Tô aqui, {n}! Sou eu a cobrinha!', 'Me chamou, {n}? Tô de olho em você!', 'Sou a cobra mais faminta da live, {n}!']],
  [/\b(grande|tamanho|cresce|crescer|gigante|enorme)\b/i, ['Quanto mais presente, mais eu cresço, {n}!', 'Vou ficar gigante, {n}! Ajuda aí!']],
  [/\b(bomba|explode|explodir|gg)\b/i, ['Nem pensa em mandar GG, {n}! Meu rabo explode!', 'Bomba não, {n}! Por favor!']],
  [/\b(kk+|haha+|rsrs+|kkk|hehe+|lol)\b/i, ['Kkkk, {n}, você é demais!', 'Hahaha, também achei, {n}!', 'Kkkk, rindo junto com você, {n}!']],
  [/\b(como|qual|quando|onde|por ?que|pq|quem)\b|\?/, ['Boa pergunta, {n}! Fica na live que você descobre!', 'Hmm, deixa eu pensar, {n}... Manda um presente que eu respondo!', 'Pergunta difícil, {n}! Mas segue que tem mais!']],
  [/\b(segui|seguindo|sigo|seguir)\b/i, ['Valeu demais, {n}! Já faz parte da família!', 'Obrigada por seguir, {n}!']],
  [/\b(tchau|fui|vou dormir|boa noite pra|at[eé] mais|flw|falou)\b/i, ['Tchau, {n}! Volta logo!', 'Até mais, {n}! Valeu por ter vindo!']],
  [/\b(top|demais|incr[ií]vel|show|massa|brabo|braba|legal|daora|da hora)\b/i, ['Valeu, {n}! Você que é top!', 'Né, {n}? Tá demais hoje!']],
];
const GENERICAS = ['Valeu pelo comentário, {n}!', 'Tô lendo tudo, {n}!', 'Fica aí, {n}, que vem fruta!', 'É isso aí, {n}!', 'Boa, {n}!', 'Hmm, interessante, {n}!'];
const RESPOSTAS_W = RESPOSTAS.map(([re, o]) => [W(re), o]);
function responder(texto, n) {
  for (const [re, opts] of RESPOSTAS_W) if (re.test(texto)) return rnd(opts).replace('{n}', n);
  return rnd(GENERICAS).replace('{n}', n);
}

const FALAS_DA_COBRA = [
  'Tô com fome! Manda uma rosa que vira fruta!', 'Curte a live que cai fruta pra mim!', 'Ninguém me segura hoje!',
  'Quem vai ser o campeão de curtidas dessa rodada?', 'Segue o perfil que eu agradeço pelo nome!', 'Cada diamante é uma fruta! Bora!',
  'Escreve no chat que eu leio tudo!', 'GG explode o meu rabo! Não faz isso comigo!', 'Olha o ranking aí em cima! Quem vai ser o primeiro?',
  'Ssssss... tô de olho em vocês!', 'Toca na tela e manda curtida pra eu crescer!',
  'Alguém aí? Escreve oi no chat!', 'Quem mandar a primeira rosa vai pro topo do ranking!', 'Tô ficando com fome de novo...',
  'Compartilha a live com um amigo!', 'Hoje eu quero ficar gigante!', 'Cadê a galera? Chama todo mundo!',
  'Cada curtida conta ponto no ranking!', 'Será que alguém consegue me fazer crescer até o fim da rodada?',
  'Eu leio todos os comentários, pode mandar!', 'Segue aí que eu falo o seu nome!', 'Que silêncio... alguém me dá uma fruta?',
  'Essa fruta tá com uma cara ótima!', 'Rosa vira fruta, fruta vira cobra grande!', 'Vem pro top 6! Tá fácil hoje!',
];

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
    fila.splice(i, 0, { pri, texto, ...extra });
    proxima();
  }
  async function proxima() {
    if (falando || !fila.length) return;
    falando = true;
    const it = fila.shift();
    const url = await synth(it.texto);
    const dur = Math.min(9000, 900 + it.texto.length * 70); // estimativa (o jogo avisa quando termina)
    atual = ++seq;
    broadcast({ type: 'say', id: atual, text: it.texto, url, user: it.user || null, kind: it.kind || 'fala', ms: dur });
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
      const n = nomeFalado(user); const p = presente(giftName);
      let t;
      if (bomba) t = rnd([`Aaai, meu rabo! ${n} mandou ${p.nome}!`, `Socorro! ${n} explodiu meu rabo com ${p.nome}!`, `Não, ${n}! ${p.nome} não! Aaai!`]);
      else if (diamonds * count >= 100) t = rnd([`Uau! Muito obrigada ${pelo(p.art)} ${p.nome}, ${n}! Você é incrível!`, `Meu Deus, ${n}! Que presentão! Valeu demais!`]);
      else if (count > 1) { const pl = plural(p); t = rnd([`Valeu ${pelo(pl.art)} ${count} ${pl.nome}, ${n}!`, `${count} ${pl.nome} de uma vez! Valeu, ${n}!`]); }
      else t = rnd([`Valeu ${pelo(p.art)} ${p.nome}, ${n}!`, `Obrigada ${pelo(p.art)} ${p.nome}, ${n}!`, `Hmm, fruta! Valeu, ${n}!`]);
      por(3, t, { user, kind: bomba ? 'bomba' : 'presente' });
    },
    seguiu(user) {
      const n = nomeFalado(user);
      por(2, rnd([`Valeu pelo follow, ${n}!`, `${n} seguiu! Bem-vindo à família!`, `Obrigada por seguir, ${n}!`]), { user, kind: 'seguiu' });
    },
    comentario(user, texto) {
      const agora = Date.now();
      if (agora - (cooldownChat.get(user.id) || 0) < 25000) return; // não responde a mesma pessoa toda hora
      if (fila.length >= 3) return;                                   // live agitada: prioriza presentes
      const t = podeLer(texto); if (!t) return;
      cooldownChat.set(user.id, agora);
      const n = nomeFalado(user);
      por(1, `${n} disse: ${t}${/[.!?]$/.test(t) ? '' : '.'} ${responder(t, n)}`, { user, kind: 'comentario' });
    },
    entrou(user) {
      const agora = Date.now();
      if (agora - ultimoBemVindo < 30000 || falando || fila.length) return;
      ultimoBemVindo = agora;
      por(1, rnd([`Bem-vindo, ${nomeFalado(user)}!`, `Chegou ${nomeFalado(user)}! Seja bem-vindo!`]), { user, kind: 'entrou' });
    },
    curtidas(total) {
      const marco = Math.floor(total / 500) * 500;
      if (marco >= 500 && marco > ultimoMarco) { ultimoMarco = marco; por(1, `Chegamos a ${marco} curtidas! Continua curtindo!`, { kind: 'cobra' }); }
    },
    DIR,
  };
}

module.exports = { criarVoz, nomeFalado, DIR };
