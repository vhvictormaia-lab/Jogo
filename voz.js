// Voz da cobrinha: decide o que falar (agradecimentos, respostas aos comentários, falas da cobra)
// e transforma o texto em áudio com a voz do Windows (SAPI, ex.: "Microsoft Maria").
// O áudio vai para o jogo como arquivo .wav, então ele entra na live pela própria fonte "Link".
// Fora do Windows (ou sem voz em português) o jogo usa a voz do navegador, quando houver.
const fs = require('fs');
const os = require('os');
const path = require('path');
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
      if (line.startsWith('VOZ ')) { psReady = true; console.log('🗣️  Voz da cobrinha: ' + line.slice(4)); }
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

function synth(text) {
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

  // fala solta da cobra quando está tudo quieto
  setInterval(() => {
    if (!falando && !fila.length && Date.now() - ultimaFala > 50000 + Math.random() * 40000) por(0, rnd(FALAS_DA_COBRA), { kind: 'cobra' });
  }, 5000);

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
